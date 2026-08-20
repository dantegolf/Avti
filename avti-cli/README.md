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
avti                            interactive session with Quantum Singularity HUD
avti <task>                     one-shot task
avti demo                       run live presentation & autonomous agent showcase
avti presentation               run live interactive presentation walkthrough
avti status                     show telemetry HUD, active model and context
avti models [provider]          list available models
avti model [provider] <model>   show or change the CLI default model
avti sessions                   list recent CLI sessions for this project
avti resume <session-id>        continue a persisted CLI session
avti doctor                     check CLI runtime and project services
```

### Quantum Singularity HUD & Telemetry Deck

On launch, Avti renders its signature Quantum Singularity Core (a precision ANSI half-block `▀▄` geometric emblem) alongside an interactive Holographic Telemetry Deck showing:
- **Active Model & Provider Bridge** (e.g. Antigravity Local Proxy / Gemini 3.7 Flash High)
- **Git Branch & Workspace Horizon**
- **Segmented Context Progress Bar** with memory pressure indicators (`[████████░░░░] 52%`)
- **Real-time TPS Speed Gauge & ASCII Sparklines** (` ▂▃▅▆▇█ 95.2 tps`)
- **Pro-Tips Carousel**

### Interactive Presentation Mode

Run:

```bash
avti demo
# or within an interactive session:
/presentation
```

This launches a live, scripted autonomous software engineering showcase demonstrating multi-stage cognitive planning, AST analysis, grep discovery, code modification with syntax-colored ANSI diff cards, test suite execution, and a verified high-throughput runtime scorecard in under 2 seconds.

### Slash Command Palette

Start interactive Avti and type `/`. Avti opens a floating popover palette categorized into `[Core]`, `[Model]`, `[Theme]`, `[Session]`, `[Showcase]` and `[Diagnostics]`. Continue typing to filter or press `Tab` to autocomplete.

Interactive Avti commands include `/status`, `/presentation`, `/demo`, `/models`, `/model`, `/sessions`, `/theme`, `/doctor`, `/help` and `/exit`.

### Terminal Themes

Run:

```text
/theme
```

Available themes in the Avti Aurora Spectrum:

```text
aurora          Avti Aurora (Signature Electric Cyan & Quantum Purple on Obsidian)
antigravity     Antigravity Core (Deep Cyber Violet & Neon Magenta Singularity)
solar-amber     Solar Amber (Warm Cyberpunk Golden CRT phosphor glow)
cyber-matrix    Cyber Matrix (Phosphor Matrix Green & High-Tech Terminal Jade)
ice-slate       Ice Slate (Nordic Frost & Arctic Glacial Slate Blue)
clean-mono      Clean Mono (Minimalist high-contrast monochrome)
orbit           Avti Orbit (graphite + ice-white + electric cyan)
claude          Claude Warm (Warm orange accent)
midnight        Midnight (Cool cyan accent)
forest          Forest (Muted green accent)
mono            Mono (Plain text without styling)
```

Select one with, for example:

```text
/theme aurora
/theme antigravity
```

The choice is persisted in the CLI home (`~/.avti/cli/ui.json`) and applies to all future sessions. `AVTI_THEME` can override it for a single process, and `NO_COLOR` is strictly respected.

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
