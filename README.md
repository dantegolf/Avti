<p align="center">
  <img src="assets/avti-logo.svg" width="120" alt="Avti logo">
</p>

<h1 align="center">Avti</h1>

<p align="center">
  面向本地项目的桌面 AI 工作区。<br>
  Agent、项目工具、终端与插件，集中在一个应用中。
</p>

<p align="center">
  <a href="https://github.com/dantegolf/Avti/releases/latest"><strong>下载 Windows 版</strong></a>
  ·
  <a href="#powershell-安装">PowerShell 安装</a>
</p>

<p align="center"><strong>中文</strong> · <a href="README.en.md">English</a> · <a href="README.ru.md">Русский</a></p>

## 快速开始

1. 安装并打开 Avti。
2. 选择一个本地项目文件夹。
3. 连接 AI Provider 并选择模型。
4. 新建会话并开始工作。

普通用户不需要 Node.js、Yarn，也不需要手动构建源码；这些仅用于开发。

## Windows 安装

### 普通安装

从 [Releases](https://github.com/dantegolf/Avti/releases/latest) 下载最新的 `Avti-*-x64-Setup.exe` 并运行。

安装程序会为当前用户安装 Avti 并创建快捷方式。当前 Windows 构建尚未加入 Authenticode 签名，因此在正式接入 code signing 之前，SmartScreen 可能会显示警告。

### PowerShell 安装

使用一条命令安装最新版本：

```powershell
irm https://raw.githubusercontent.com/dantegolf/Avti/main/install.ps1 | iex
```

终端安装器会：

- 检测 Windows x64；
- 获取最新 GitHub Release；
- 下载已经构建好的 Avti Setup；
- 校验发布的 SHA-256；
- 静默安装 Avti；
- 如果在标准安装路径找到应用，则自动启动。

排查问题时，可以下载 `install.ps1` 后使用 `-Verbose` 运行。如果希望看到普通 NSIS 安装界面，可使用 `-Interactive`。

## Avti 能做什么

- **本地项目** — workspaces、文件夹选择、拖放以及 Windows 原生目录选择器。
- **AI Agent 与项目上下文** — sessions、attachments、commands、tools、code runtime、permissions 与 sandbox 能力。
- **可配置模型** — 在应用中配置 AI Providers 与模型。
- **桌面工作区** — 原生窗口中的 sidebar、conversation 与 details surface，并集成 system tray。
- **本地终端** — 与 Agent 工作流并行使用 terminal / shell 服务。
- **Profiles** — 分离管理 runtime、插件与环境配置。
- **Plugin Market** — 内置社区插件目录，支持安装、卸载与管理。
- **诊断能力** — 本地日志、boot health、crash evidence、诊断导出与恢复流程。

## 开发

要求：

- Node.js `^22.19.0` 或 `>=24.0.0`
- Yarn `4.18.0`

```bash
git clone https://github.com/dantegolf/Avti.git
cd Avti
corepack enable
yarn install
yarn dev
```

常用命令：

```bash
yarn build
yarn typecheck
yarn test
yarn check
yarn dist:win
yarn dist:win-portable
yarn dist:mac
```

Windows Release 流程位于 `.github/workflows/release-windows.yml`。例如 `v2.0.1` 这样的 tag 在与 desktop package 版本一致时，会构建 NSIS installer、生成 `SHA256SUMS.txt`，并把两者发布到 GitHub Release。

## 仓库结构

- `dsh-plugin-desktop/` — Avti Electron 外壳与 desktop 服务
- `dsh-community-market/` — 插件目录、marketplace UI 与安装/卸载流程
- `dsh-community-fabric/` — 插件兼容与 contracts
- `patches/` — 固定 runtime 依赖的 compatibility patches
- `install.ps1` — 面向普通用户的 Windows bootstrap installer

## Open source 与署名

Avti 使用 DeepSeek Harness runtime packages 及其他开源组件。相关依赖仍会通过许可证与 third-party notices 明确披露；面向用户的安装流程只是避免要求用户直接处理包管理器和构建命令。

项目许可证见 [`LICENSE`](LICENSE)。Desktop 第三方组件见 [`dsh-plugin-desktop/THIRD_PARTY_NOTICES.md`](dsh-plugin-desktop/THIRD_PARTY_NOTICES.md)。

## 当前限制

Avti 暂时还没有自己的签名自动更新通道。上游 DSH Desktop updater 已被关闭，Windows installer 当前也尚未加入 Authenticode 签名。Windows 发布的下一步 production 工作是把 code signing 接入 release pipeline。
