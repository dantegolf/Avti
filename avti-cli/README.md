# Avti CLI

Avti CLI is the standalone terminal product in the Avti ecosystem.

It uses the DeepSeek Harness agent runtime, sessions, tools, providers and command registry, but it does **not** require Avti Desktop to be installed or running.

## Products are independent

- **Avti Desktop** — visual workspace for local projects.
- **Avti CLI** — terminal agent for local projects.

They may reuse runtime code and compatible settings formats, but installation, release artifacts and process lifecycles are independent.

## Windows portable release

The Windows x64 release is published as:

```text
avti-windows-x64.zip
avti-windows-x64.sha256
```

The ZIP contains its own Node runtime and production dependencies. A user does not need to install Node.js, Yarn or Avti Desktop.

After extracting:

```powershell
.\avti.cmd --version
.\avti.cmd
```

For a user-level installation from the repository bootstrap script:

```powershell
irm https://raw.githubusercontent.com/dantegolf/Avti/main/install-cli.ps1 | iex
```

The installer selects only releases tagged `cli-v*`, verifies the published SHA-256, installs under `%LOCALAPPDATA%\Avti\CLI` by default and adds that directory to the user PATH.

## Usage

```text
avti                            interactive session in the current project
avti <task>                     one-shot task
avti status                     project and default model
avti models [provider]          available models
avti model [provider] <model>   show or change the shared default model
avti sessions                   recent sessions for this project
avti resume <session-id>        continue a persisted session
avti doctor                     check CLI runtime and project services
```

Interactive Avti commands include `/status`, `/models`, `/model`, `/sessions`, `/help` and `/exit`. Other registered slash commands such as Harness command plugins are delegated to the native Harness command registry rather than being reimplemented by Avti.

## Development

From the repository root:

```bash
yarn build:cli
yarn typecheck:cli
yarn check:cli
```

On Windows x64:

```bash
yarn dist:cli:win
```

The portable staging directory is created at:

```text
avti-cli/dist/avti-windows-x64/
```

## Release versioning

CLI releases use their own package version from `avti-cli/package.json` and tags of the form:

```text
cli-v0.1.0
```

Desktop tags remain `vX.Y.Z`. The versions are intentionally independent.

## Source layout

The standalone package currently builds the Avti terminal frontend from the shared CLI source that already exists in the repository under `dsh-plugin-desktop/src/avti-*.ts`. This is a **build-time source reuse seam only**: the produced CLI package and portable runtime have no dependency on Avti Desktop or Electron.

A later cleanup may move that shared source into a neutral package without changing the user-facing product boundary.
