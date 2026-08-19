# Avti CLI

Avti CLI is the standalone terminal product in the Avti ecosystem.

It uses the DeepSeek Harness agent runtime, sessions, tools, providers and command registry, but it does **not** require Avti Desktop to be installed or running.

## Products are independent

- **Avti Desktop** — visual workspace for local projects.
- **Avti CLI** — terminal agent for local projects.

They may reuse runtime code and compatible formats, but installation, release artifacts, process lifecycles and user state are independent.

Avti CLI defaults its Harness home to:

```text
~/.avti/cli
```

That directory owns CLI settings, profiles, credentials, plugins and persisted sessions. Desktop configuration is not read or modified by default.

Advanced overrides:

```text
AVTI_CLI_HOME   Avti-specific CLI home override
DSH_HOME        explicit Harness home override
```

## Portable releases

One `cli-v*` GitHub Release publishes all supported CLI platforms from the same Avti CLI version.

### Windows x64

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

### macOS

For a user-level installation on either Apple Silicon or Intel:

```bash
curl -fsSL https://raw.githubusercontent.com/dantegolf/Avti/main/install-cli.sh | sh
```

The installer detects the native architecture, selects the matching `cli-v*` artifact, verifies SHA-256, installs the runtime under `~/.local/share/avti-cli` by default and creates `~/.local/bin/avti`. If `~/.local/bin` is not already on PATH, it prints the shell configuration line to add it.

#### Apple Silicon

For M1/M2/M3/M4 and later Apple Silicon Macs:

```text
avti-macos-arm64.tar.gz
avti-macos-arm64.sha256
```

Manual extraction:

```bash
tar -xzf avti-macos-arm64.tar.gz
cd avti-macos-arm64
./avti --version
./avti
```

The archive contains its own arm64 Node runtime and native production dependency tree.

#### Intel

For Intel Macs:

```text
avti-macos-x64.tar.gz
avti-macos-x64.sha256
```

Manual extraction:

```bash
tar -xzf avti-macos-x64.tar.gz
cd avti-macos-x64
./avti --version
./avti
```

The Intel archive is built on a native x64 macOS runner so native Harness dependencies match the target architecture.

The macOS releases are intentionally architecture-specific instead of pretending to be one universal archive: this keeps Node and any native npm dependencies aligned with the machine they run on.

## Usage

```text
avti                            interactive session in the current project
avti <task>                     one-shot task
avti status                     project and CLI default model
avti models [provider]          available models
avti model [provider] <model>   show or change the CLI default model
avti sessions                   recent CLI sessions for this project
avti resume <session-id>        continue a persisted CLI session
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

On a native macOS arm64 or x64 machine:

```bash
yarn dist:cli:mac
```

The packaging flow builds the CLI, focuses the Yarn workspace to production dependencies, then copies that dependency tree into the portable runtime. This preserves repository `resolutions` and `patch:` dependencies instead of reinstalling an unpatched runtime through npm.

Portable staging directories are created at:

```text
avti-cli/dist/avti-windows-x64/
avti-cli/dist/avti-macos-arm64/
avti-cli/dist/avti-macos-x64/
```

Only the directory matching the current native architecture is produced by one macOS packaging run.

## Release versioning

CLI releases use their own package version from `avti-cli/package.json` and tags of the form:

```text
cli-v0.1.0
```

Desktop tags remain `vX.Y.Z`. The versions are intentionally independent.

The CLI release workflow builds three artifacts in parallel: Windows x64, macOS arm64 and macOS x64. All three are published into the same `cli-v*` GitHub Release with matching SHA-256 manifests.

## Source layout

The standalone package currently builds the Avti terminal frontend from the shared CLI source that already exists in the repository under `dsh-plugin-desktop/src/avti-*.ts`. This is a **build-time source reuse seam only**: the produced CLI package and portable runtime have no dependency on Avti Desktop or Electron.

A later cleanup may move that shared source into a neutral package without changing the user-facing product boundary.
