#!/bin/bash
set -euo pipefail

artifact_root="${1:-}"
if [[ -z "$artifact_root" || ! -d "$artifact_root" ]]; then
  echo "usage: sign-notarize-macos.sh <artifact-directory>" >&2
  exit 64
fi

required=(
  APPLE_CERTIFICATE_P12_BASE64
  APPLE_CERTIFICATE_PASSWORD
  APPLE_NOTARY_KEY_P8_BASE64
  APPLE_NOTARY_KEY_ID
  APPLE_NOTARY_ISSUER_ID
)
missing=()
for name in "${required[@]}"; do
  if [[ -z "${!name:-}" ]]; then
    missing+=("$name")
  fi
done

if (( ${#missing[@]} > 0 )); then
  if [[ "${GITHUB_REF_TYPE:-}" == "tag" ]]; then
    printf 'Missing required GitHub Actions secret for tagged macOS release: %s\n' "${missing[*]}" >&2
    exit 1
  fi
  printf 'Apple signing secrets are not configured; leaving dev artifact unsigned: %s\n' "${missing[*]}"
  exit 0
fi

artifact_root="$(cd "$artifact_root" && pwd)"
work_dir="$(mktemp -d)"
keychain="$work_dir/avti-signing.keychain-db"
keychain_password="$(openssl rand -hex 24)"
certificate="$work_dir/developer-id.p12"
notary_key="$work_dir/AuthKey_${APPLE_NOTARY_KEY_ID}.p8"
notary_zip="$work_dir/avti-notary.zip"

cleanup() {
  security delete-keychain "$keychain" >/dev/null 2>&1 || true
  rm -rf "$work_dir"
}
trap cleanup EXIT

printf '%s' "$APPLE_CERTIFICATE_P12_BASE64" | /usr/bin/base64 -D > "$certificate"
printf '%s' "$APPLE_NOTARY_KEY_P8_BASE64" | /usr/bin/base64 -D > "$notary_key"
chmod 600 "$certificate" "$notary_key"

security create-keychain -p "$keychain_password" "$keychain"
security set-keychain-settings -lut 21600 "$keychain"
security unlock-keychain -p "$keychain_password" "$keychain"
security import "$certificate" \
  -k "$keychain" \
  -P "$APPLE_CERTIFICATE_PASSWORD" \
  -T /usr/bin/codesign \
  -T /usr/bin/security
security set-key-partition-list \
  -S apple-tool:,apple:,codesign: \
  -s \
  -k "$keychain_password" \
  "$keychain" >/dev/null

identity="$(security find-identity -v -p codesigning "$keychain" | awk '/Developer ID Application/ { print $2; exit }')"
if [[ -z "$identity" ]]; then
  echo "No Developer ID Application identity found in APPLE_CERTIFICATE_P12_BASE64." >&2
  security find-identity -v -p codesigning "$keychain" >&2 || true
  exit 1
fi

echo "Signing Avti CLI with Developer ID identity $identity"

signed_count=0
while IFS= read -r -d '' file_path; do
  if /usr/bin/file -b "$file_path" | grep -q 'Mach-O'; then
    /usr/bin/codesign \
      --force \
      --options runtime \
      --timestamp \
      --sign "$identity" \
      --keychain "$keychain" \
      "$file_path"
    /usr/bin/codesign --verify --strict --verbose=2 "$file_path"
    signed_count=$((signed_count + 1))
  fi
done < <(find "$artifact_root" -type f -print0)

if (( signed_count == 0 )); then
  echo "No Mach-O executables were found in $artifact_root" >&2
  exit 1
fi

echo "Signed $signed_count Mach-O files."

/usr/bin/ditto -c -k --keepParent "$artifact_root" "$notary_zip"

xcrun notarytool submit "$notary_zip" \
  --key "$notary_key" \
  --key-id "$APPLE_NOTARY_KEY_ID" \
  --issuer "$APPLE_NOTARY_ISSUER_ID" \
  --wait

echo "Apple notarization accepted for $(basename "$artifact_root")."
