[CmdletBinding()]
param(
  [string]$Version = 'latest',
  [switch]$Interactive,
  [switch]$NoLaunch,
  [switch]$KeepInstaller
)

$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'

$Repo = 'dantegolf/Avti'
$ApiBase = "https://api.github.com/repos/$Repo"
$Headers = @{
  'Accept' = 'application/vnd.github+json'
  'User-Agent' = 'Avti-Installer'
}

function Write-Banner {
  Write-Host ''
  Write-Host '       A V T I' -ForegroundColor White
  Write-Host '  AI workspace for local projects' -ForegroundColor DarkGray
  Write-Host ''
}

function Write-Step([string]$Message) {
  Write-Host ('  > ' + $Message) -ForegroundColor Cyan
}

function Write-Ok([string]$Message) {
  Write-Host ('  + ' + $Message) -ForegroundColor Green
}

function Fail([string]$Message) {
  throw "Avti installer: $Message"
}

function Get-Release {
  if ($Version -eq 'latest') {
    Write-Verbose 'Resolving the latest GitHub release.'
    return Invoke-RestMethod -Uri "$ApiBase/releases/latest" -Headers $Headers
  }

  $Tag = if ($Version.StartsWith('v')) { $Version } else { "v$Version" }
  Write-Verbose "Resolving GitHub release $Tag."
  return Invoke-RestMethod -Uri "$ApiBase/releases/tags/$Tag" -Headers $Headers
}

function Find-Asset($Release, [string]$Pattern, [string]$Description) {
  $Asset = @($Release.assets) | Where-Object { $_.name -match $Pattern } | Select-Object -First 1
  if ($null -eq $Asset) {
    Fail "$Description is missing from release $($Release.tag_name)."
  }
  return $Asset
}

function Download-Asset($Asset, [string]$Destination) {
  Write-Verbose "Downloading $($Asset.browser_download_url) to $Destination"
  Invoke-WebRequest -Uri $Asset.browser_download_url -Headers $Headers -OutFile $Destination
}

function Resolve-InstalledAvti {
  $Candidates = @(
    (Join-Path $env:LOCALAPPDATA 'Programs\Avti\Avti.exe'),
    (Join-Path $env:ProgramFiles 'Avti\Avti.exe')
  )

  if (${env:ProgramFiles(x86)}) {
    $Candidates += (Join-Path ${env:ProgramFiles(x86)} 'Avti\Avti.exe')
  }

  return $Candidates | Where-Object { Test-Path $_ } | Select-Object -First 1
}

try {
  Write-Banner

  if ([System.Environment]::OSVersion.Platform -ne [System.PlatformID]::Win32NT) {
    Fail 'this installer currently supports Windows only.'
  }

  $Architecture = [System.Runtime.InteropServices.RuntimeInformation]::OSArchitecture.ToString()
  if ($Architecture -ne 'X64') {
    Fail "Windows x64 is required; detected $Architecture."
  }
  Write-Ok 'Windows x64 detected'

  Write-Step 'Checking the latest Avti release...'
  $Release = Get-Release
  $InstallerAsset = Find-Asset $Release '^Avti-.+-x64-Setup\.exe$' 'Windows installer'
  $ChecksumAsset = Find-Asset $Release '^SHA256SUMS\.txt$' 'SHA-256 checksum file'
  Write-Ok "Release $($Release.tag_name) found"

  $TempRoot = Join-Path ([System.IO.Path]::GetTempPath()) ('avti-install-' + [guid]::NewGuid().ToString('N'))
  New-Item -ItemType Directory -Path $TempRoot | Out-Null
  $InstallerPath = Join-Path $TempRoot $InstallerAsset.name
  $ChecksumPath = Join-Path $TempRoot $ChecksumAsset.name

  Write-Step 'Downloading Avti...'
  Download-Asset $InstallerAsset $InstallerPath
  Download-Asset $ChecksumAsset $ChecksumPath
  Write-Ok 'Download complete'

  Write-Step 'Verifying package integrity...'
  $ChecksumLine = Get-Content $ChecksumPath | Where-Object { $_ -like "*$($InstallerAsset.name)" } | Select-Object -First 1
  if (-not $ChecksumLine) {
    Fail "no checksum entry was found for $($InstallerAsset.name)."
  }

  $ExpectedHash = (($ChecksumLine.Trim() -split '\s+')[0]).ToUpperInvariant()
  if ($ExpectedHash -notmatch '^[A-F0-9]{64}$') {
    Fail 'the published SHA-256 checksum is malformed.'
  }

  $ActualHash = (Get-FileHash -Path $InstallerPath -Algorithm SHA256).Hash.ToUpperInvariant()
  if ($ActualHash -ne $ExpectedHash) {
    Fail 'SHA-256 verification failed. The downloaded package was not installed.'
  }
  Write-Ok 'SHA-256 verified'

  Write-Step 'Installing Avti...'
  if ($Interactive) {
    $Process = Start-Process -FilePath $InstallerPath -Wait -PassThru
  } else {
    $Process = Start-Process -FilePath $InstallerPath -ArgumentList '/S' -Wait -PassThru
  }
  if ($Process.ExitCode -ne 0) {
    Fail "installer exited with code $($Process.ExitCode)."
  }
  Write-Ok 'Avti installed'

  if (-not $NoLaunch) {
    $AvtiExecutable = Resolve-InstalledAvti
    if ($AvtiExecutable) {
      Write-Step 'Launching Avti...'
      Start-Process -FilePath $AvtiExecutable | Out-Null
      Write-Ok 'Ready to work'
    } else {
      Write-Ok 'Installation complete. Open Avti from the Start menu.'
    }
  }

  if (-not $KeepInstaller) {
    Remove-Item -Path $TempRoot -Recurse -Force -ErrorAction SilentlyContinue
  } else {
    Write-Verbose "Installer files kept at $TempRoot"
  }

  Write-Host ''
} catch {
  Write-Host ''
  Write-Host ('  ! ' + $_.Exception.Message) -ForegroundColor Red
  Write-Host '    Re-run with -Verbose for more detail.' -ForegroundColor DarkGray
  Write-Host ''
  exit 1
}
