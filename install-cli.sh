#!/bin/sh
set -eu

REPO="dantegolf/Avti"
INSTALL_ROOT="${AVTI_CLI_INSTALL_DIR:-$HOME/.local/share/avti-cli}"
BIN_DIR="${AVTI_CLI_BIN_DIR:-$HOME/.local/bin}"

case "$(uname -s)" in
  Darwin) ;;
  *)
    echo "Avti CLI installer currently supports macOS only." >&2
    exit 1
    ;;
esac

case "$(uname -m)" in
  arm64|aarch64)
    ARCH="arm64"
    ;;
  x86_64|amd64)
    ARCH="x64"
    ;;
  *)
    echo "Unsupported macOS architecture: $(uname -m)" >&2
    exit 1
    ;;
esac

API="https://api.github.com/repos/$REPO/releases?per_page=100"
TAG="$(curl -fsSL "$API" | sed -n 's/.*"tag_name": "\(cli-v[^\"]*\)".*/\1/p' | head -n 1)"
if [ -z "$TAG" ]; then
  echo "Could not find an Avti CLI release tagged cli-v*." >&2
  exit 1
fi

ASSET="avti-macos-$ARCH.tar.gz"
CHECKSUM="$ASSET.sha256"
BASE="https://github.com/$REPO/releases/download/$TAG"
TMP="$(mktemp -d "${TMPDIR:-/tmp}/avti-cli.XXXXXX")"
trap 'rm -rf "$TMP"' EXIT HUP INT TERM

printf 'Installing Avti CLI %s for macOS %s...\n' "$TAG" "$ARCH"
curl -fL "$BASE/$ASSET" -o "$TMP/$ASSET"
curl -fL "$BASE/$CHECKSUM" -o "$TMP/$CHECKSUM"

EXPECTED="$(awk '{print $1}' "$TMP/$CHECKSUM")"
ACTUAL="$(shasum -a 256 "$TMP/$ASSET" | awk '{print $1}')"
if [ "$EXPECTED" != "$ACTUAL" ]; then
  echo "SHA-256 verification failed for $ASSET." >&2
  exit 1
fi

mkdir -p "$TMP/unpack"
tar -xzf "$TMP/$ASSET" -C "$TMP/unpack"
SOURCE="$TMP/unpack/avti-macos-$ARCH"
if [ ! -x "$SOURCE/avti" ]; then
  echo "Downloaded archive does not contain the Avti launcher." >&2
  exit 1
fi

rm -rf "$INSTALL_ROOT"
mkdir -p "$(dirname "$INSTALL_ROOT")"
mv "$SOURCE" "$INSTALL_ROOT"

# GitHub-downloaded unsigned test builds can carry com.apple.quarantine on
# every executable/native addon. Walk regular files only so stale .bin
# symlinks cannot interrupt cleanup. Signed/notarized builds simply have
# nothing to remove here.
if command -v xattr >/dev/null 2>&1; then
  find "$INSTALL_ROOT" -type f -exec xattr -d com.apple.quarantine {} \; 2>/dev/null || true
fi

mkdir -p "$BIN_DIR"
ln -sfn "$INSTALL_ROOT/avti" "$BIN_DIR/avti"

printf '\nAvti CLI installed.\n'
printf '  Runtime: %s\n' "$INSTALL_ROOT"
printf '  Command: %s/avti\n' "$BIN_DIR"

case ":$PATH:" in
  *":$BIN_DIR:"*)
    printf '\nRun: avti --version\n'
    ;;
  *)
    printf '\nAdd this directory to PATH, then open a new terminal:\n  %s\n' "$BIN_DIR"
    printf '\nFor zsh, for example:\n  echo '\''export PATH="$HOME/.local/bin:$PATH"'\'' >> ~/.zshrc\n'
    ;;
esac
