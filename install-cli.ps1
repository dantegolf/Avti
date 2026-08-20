param(
  [string]$InstallDir = (Join-Path $env:LOCALAPPDATA 'Avti\CLI'),
  [switch]$NoPath
)

$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'

$repo = 'dantegolf/Avti'
$api = "https://api.github.com/repos/$repo/releases?per_page=100"
$headers = @{ 'User-Agent' = 'Avti-CLI-Installer' }

Write-Host 'Avti CLI installer'
Write-Host "Install directory: $InstallDir"

$releases = Invoke-RestMethod -Uri $api -Headers $headers
$release = $releases |
  Where-Object { -not $_.draft -and -not $_.prerelease -and $_.tag_name -like 'cli-v*' } |
  Select-Object -First 1

if (-not $release) {
  throw 'No published Avti CLI release (cli-v*) was found.'
}

$zipAsset = $release.assets | Where-Object { $_.name -eq 'avti-windows-x64.zip' } | Select-Object -First 1
$hashAsset = $release.assets | Where-Object { $_.name -eq 'avti-windows-x64.sha256' } | Select-Object -First 1
if (-not $zipAsset -or -not $hashAsset) {
  throw "Release $($release.tag_name) does not contain the expected Avti CLI Windows assets."
}

$temp = Join-Path ([IO.Path]::GetTempPath()) ("avti-cli-install-" + [Guid]::NewGuid().ToString('N'))
$zipPath = Join-Path $temp $zipAsset.name
$hashPath = Join-Path $temp $hashAsset.name
$extractPath = Join-Path $temp 'extract'

New-Item -ItemType Directory -Path $temp -Force | Out-Null
try {
  Write-Host "Downloading Avti CLI $($release.tag_name)..."
  Invoke-WebRequest -Uri $zipAsset.browser_download_url -Headers $headers -OutFile $zipPath
  Invoke-WebRequest -Uri $hashAsset.browser_download_url -Headers $headers -OutFile $hashPath

  $expectedLine = (Get-Content $hashPath | Select-Object -First 1).Trim()
  if ($expectedLine -notmatch '^([0-9a-fA-F]{64})\s+') {
    throw 'Published CLI checksum manifest has an invalid format.'
  }
  $expected = $Matches[1].ToLowerInvariant()
  $actual = (Get-FileHash -Path $zipPath -Algorithm SHA256).Hash.ToLowerInvariant()
  if ($actual -ne $expected) {
    throw "CLI archive checksum mismatch. Expected $expected, got $actual."
  }

  Expand-Archive -Path $zipPath -DestinationPath $extractPath -Force
  $candidate = Join-Path $extractPath 'avti.cmd'
  if (-not (Test-Path $candidate)) {
    throw 'Downloaded CLI archive does not contain avti.cmd.'
  }

  $parent = Split-Path $InstallDir -Parent
  if ($parent) { New-Item -ItemType Directory -Path $parent -Force | Out-Null }
  if (Test-Path $InstallDir) { Remove-Item $InstallDir -Recurse -Force }
  Move-Item $extractPath $InstallDir

  $reported = & (Join-Path $InstallDir 'avti.cmd') --version
  if ([string]::IsNullOrWhiteSpace($reported)) {
    throw 'Installed Avti CLI did not report a version.'
  }

  if (-not $NoPath) {
    $userPath = [Environment]::GetEnvironmentVariable('Path', 'User')
    $entries = @($userPath -split ';' | Where-Object { -not [string]::IsNullOrWhiteSpace($_) })
    $alreadyPresent = $entries | Where-Object { $_.TrimEnd('\') -ieq $InstallDir.TrimEnd('\') }
    if (-not $alreadyPresent) {
      $nextPath = (@($entries) + $InstallDir) -join ';'
      [Environment]::SetEnvironmentVariable('Path', $nextPath, 'User')
      Write-Host 'Added Avti CLI to the user PATH. Open a new terminal to use `avti` globally.'
    }
  }

  Write-Host "Installed Avti CLI $($reported.Trim()) successfully."
  Write-Host "Run: $InstallDir\avti.cmd"
} finally {
  if (Test-Path $temp) { Remove-Item $temp -Recurse -Force }
}
