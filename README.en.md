<p align="center">
  <img src="assets/avti-logo.svg" width="120" alt="Avti logo">
</p>

<h1 align="center">Avti</h1>

<p align="center">
  A desktop AI coding workspace for local projects: agent conversations, project tools, a terminal and plugin management in one app.
</p>

<p align="center"><a href="README.md">中文</a> · <strong>English</strong></p>

## What is Avti?

Avti is an Electron desktop application built around the DeepSeek Harness runtime packages. This repository owns Avti's desktop shell, native OS integration, profiles, terminal and diagnostics services, and the built-in community plugin market.

The goal is simple: open a local project and keep the AI agent, project context, local tools and extensible plugins in one desktop workflow instead of requiring users to assemble several command-line services manually.

## What works today

- **Projects and workspaces**: create and switch workspaces, select local folders, drag folders into the desktop app, and use the native directory picker on Windows.
- **Agent conversations and local tools**: use Harness sessions, tools, commands, attachments, code runtime, permissions and sandbox capabilities for project work.
- **Desktop three-panel layout**: sidebar, conversation and details surfaces inside the native window; sidebar and details widths are resizable, with native title-bar handling for macOS and Windows.
- **Local terminal**: the desktop runtime integrates terminal and shell services. The terminal plugin is currently disabled by default in the Linux composition.
- **Profiles**: maintain and switch separate desktop/runtime configurations so plugin and project environments can be managed per profile.
- **Built-in plugin market**: `dsh-community-market` is composed into the desktop app and provides plugin catalogs, details, sources, install/uninstall and management flows.
- **Bundled pnpm / plugin installation services**: Avti can manage packages used by plugins and includes rollback/recovery logic for failed configuration changes.
- **System tray and native desktop integration**: tray assets, native window behavior, platform adapters and the desktop startup lifecycle are implemented.
- **Logs and diagnostics**: local logging, diagnostic export, renderer boot health, crash evidence and startup recovery are implemented in the repository.
- **Packaging**: the repository includes Windows x64 NSIS installer and portable build flows, a macOS build flow, and a Linux directory target.

## Current limitations

Avti **does not yet have its own signed automatic-update channel**. The updater is intentionally disabled so Avti builds do not contact the upstream project's update service.

This repository also **does not ship or advertise a mobile remote-control feature**. This README lists only functionality that is present in the current codebase.

## Development

Requirements:

- Node.js `^22.19.0` or `>=24.0.0`
- Yarn `4.18.0`

Install dependencies and start the development app:

```bash
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

## Repository layout

- `dsh-plugin-desktop/` — Avti's Electron shell and desktop services
- `dsh-community-market/` — plugin catalog, marketplace UI and install/uninstall flow
- `dsh-community-fabric/` — plugin compatibility and contract work
- `patches/` — compatibility patches for the pinned runtime dependencies

## Open-source components and attribution

Avti uses DeepSeek Harness runtime packages and other open-source components, but Avti is the separate desktop product maintained in this repository and does not use the upstream DSH Desktop update channel.

See [`LICENSE`](LICENSE) for the project license and [`dsh-plugin-desktop/THIRD_PARTY_NOTICES.md`](dsh-plugin-desktop/THIRD_PARTY_NOTICES.md) for third-party notices used by the desktop package.
