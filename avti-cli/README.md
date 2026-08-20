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

That directory owns CLI settings, profiles, credentials, plugins, UI preferences and persisted sessions. Desktop configuration is not read or modified by default.

Advanced overrides:

```text
AVTI_CLI_HOME   Avti-specific CLI home override
DSH_HOME        explicit Harness home override
AVTI_THEME      override the persisted terminal theme for this process
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

## Avti Orbit terminal UI

The terminal presentation uses a small Avti-owned visual system instead of inheriting provider branding. The default **Orbit** theme extends the product's black/white identity with a cool electric accent for interaction, graphite secondary text, and restrained success/warning/error states.

Conversation turns use a distinct Avti marker, tool activity uses the orbit/pulse motion language, prompts use a compact rail, and interactive lists share the same border, muted-text and selected-row vocabulary. `NO_COLOR` and non-TTY output remain plain and automation-safe.

### Slash command shelf

Start interactive Avti and type `/`. A bounded command shelf appears below the prompt. Continue typing to filter it (`/mo` narrows to `/model` and `/models`).

Keyboard behavior:

```text
↑ / ↓       move selection
Enter       accept a partial selected command; submit when already complete
Tab         complete the selected command
Esc         close the shelf for the current slash token
```

The shelf never dumps the entire command registry at once. Escape dismissal stays in effect while you continue editing the same slash token; once you erase/leave slash-command mode, typing `/` again opens discovery normally.

The catalog merges Avti-owned commands with the native Harness command registry, so current and future plugin commands appear automatically without a second hard-coded list.

Interactive Avti commands include `/status`, `/models`, `/model`, `/sessions`, `/theme`, `/help` and `/exit`. Other registered slash commands are delegated to Harness.

### Terminal themes

Run:

```text
/theme
```

Available themes are:

```text
orbit       Avti Orbit      graphite + ice-white + electric cyan
midnight    Avti Midnight   violet/blue dark-terminal variant
forest      Avti Forest     muted green variant
mono        Avti Mono       no color escapes
```

Select one with, for example:

```text
/theme midnight
```

The choice is persisted in the CLI home and affects prompts, command shelves, control panels and activity rows. `AVTI_THEME` can override it for one process, and `NO_COLOR` remains respected. Old preview configs that stored `claude` migrate to `orbit` automatically.

## ClaudeGravity / Antigravity models

Avti ships a provider preset named `antigravity` that mirrors the model catalog used by the ClaudeGravity project. The preset uses Harness' provider-neutral LLM registry and points at the same local Anthropic-compatible Antigravity proxy:

```text
http://127.0.0.1:8080
```

This means Avti does not reimplement Google's Cloud Code/Antigravity transport. Authentication, Google account handling and upstream protocol compatibility stay in `antigravity-claude-proxy`; Avti talks to its local Anthropic Messages surface.

Start/authenticate the proxy through ClaudeGravity (or `acc`) first. Then inspect the catalog:

```bash
avti models antigravity
```

Select a model globally:

```bash
avti model antigravity gemini-3.7-flash-high
```

Or during an interactive session:

```text
/models antigravity
/model antigravity gemini-3.7-flash-high
```

The Google/Antigravity sign-in remains owned by ClaudeGravity/`acc`; Avti only needs the local proxy to be running.
