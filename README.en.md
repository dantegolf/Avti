<p align="center">
  <img src="assets/avti-logo.svg" width="120" alt="Avti logo">
</p>

<h1 align="center">Avti</h1>

<p align="center">
  A desktop AI workspace for local projects.<br>
  Agent, project tools, terminal and plugins in one app.
</p>

<p align="center">
  <a href="https://github.com/dantegolf/Avti/releases/latest"><strong>Download for Windows</strong></a>
  ·
  <a href="#install-from-powershell">Install from PowerShell</a>
</p>

<p align="center"><a href="README.md">中文</a> · <strong>English</strong> · <a href="README.ru.md">Русский</a></p>

## Quick start

1. Install and open Avti.
2. Choose a local project folder.
3. Connect an AI provider and select a model.
4. Create a new session and start working.

Avti users do not need Node.js, Yarn, or a source checkout. Those are development requirements only.

## Install on Windows

### Standard installer

Download the latest `Avti-*-x64-Setup.exe` from [Releases](https://github.com/dantegolf/Avti/releases/latest) and run it.

The installer creates Avti shortcuts and installs for the current user. Windows builds are currently unsigned, so SmartScreen may display a warning until Authenticode signing is added.

### Install from PowerShell

Install the latest release with one command:

```powershell
irm https://raw.githubusercontent.com/dantegolf/Avti/main/install.ps1 | iex
```

The terminal installer:

- detects Windows x64;
- resolves the latest GitHub Release;
- downloads the ready-made Avti Setup package;
- verifies the published SHA-256 checksum;
- installs Avti silently;
- launches the app when it is found in the standard install location.

For diagnostics, download `install.ps1` and run it with `-Verbose`. Use `-Interactive` if you prefer the normal NSIS installer UI.

## What Avti does

- **Local projects** — workspaces, folder selection, drag-and-drop, and the native Windows directory picker.
- **AI agent and project context** — sessions, attachments, commands, tools, code runtime, permissions, and sandbox capabilities.
- **Pluggable models** — configure AI providers and models from the app.
- **Desktop workspace** — sidebar, conversation, and details surfaces in a native window with system tray integration.
- **Local terminal** — terminal and shell services next to the agent workflow.
- **Profiles** — separate runtime, plugin, and environment configurations.
- **Plugin Market** — a built-in community plugin catalog with install, uninstall, and management flows.
- **Diagnostics** — local logs, boot health, crash evidence, diagnostic export, and recovery flows.

## Development

Requirements:

- Node.js `^22.19.0` or `>=24.0.0`
- Yarn `4.18.0`

```bash
git clone https://github.com/dantegolf/Avti.git
cd Avti
corepack enable
yarn install
yarn dev
```

Useful commands:

```bash
yarn build
yarn typecheck
yarn test
yarn check
yarn dist:win
yarn dist:win-portable
yarn dist:mac
```

The Windows release pipeline lives in `.github/workflows/release-windows.yml`. A tag such as `v2.0.1` that matches the desktop package version builds the NSIS installer, generates `SHA256SUMS.txt`, and publishes both files to a GitHub Release.

## Repository layout

- `dsh-plugin-desktop/` — Avti's Electron shell and desktop services
- `dsh-community-market/` — plugin catalog, marketplace UI, and install/uninstall flow
- `dsh-community-fabric/` — plugin compatibility and contracts
- `patches/` — compatibility patches for pinned runtime dependencies
- `install.ps1` — user-facing Windows bootstrap installer

## Open source and attribution

Avti uses DeepSeek Harness runtime packages and other open-source components. Those dependencies remain explicitly disclosed through licenses and third-party notices; the user-facing installation flow simply avoids requiring users to interact with package managers or build commands.

See [`LICENSE`](LICENSE) for the project license and [`dsh-plugin-desktop/THIRD_PARTY_NOTICES.md`](dsh-plugin-desktop/THIRD_PARTY_NOTICES.md) for desktop third-party notices.

## Current limitations

Avti does not yet have its own signed automatic-update channel. The upstream DSH Desktop updater is disabled, and the Windows installer is currently published without Authenticode signing. Adding code signing to the release pipeline is the next production step for Windows distribution.
