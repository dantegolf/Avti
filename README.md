<p align="center">
  <img src="assets/avti-logo.svg" width="120" alt="Avti logo">
</p>

<h1 align="center">Avti</h1>

<p align="center">
  面向本地项目的桌面 AI 编程工作区：在一个应用里完成 Agent 对话、项目工具、终端与插件管理。
</p>

<p align="center"><strong>中文</strong> · <a href="README.en.md">English</a> · <a href="README.ru.md">Русский</a></p>

## Avti 是什么

Avti 是一个 Electron 桌面应用，基于 DeepSeek Harness 的运行时包构建。这个仓库负责 Avti 自己的桌面外壳、原生系统集成、工作配置、终端与诊断服务，以及内置的社区插件市场。

目标很简单：打开本地项目后，把 AI Agent、项目上下文、本地工具和可扩展插件放在同一个桌面工作流里，而不是要求用户手动拼接多个命令行服务。

## 目前已经有的功能

- **项目与工作区**：创建和切换工作区，支持选择本地文件夹；桌面端支持文件夹拖放，Windows 还接入了原生目录选择器。
- **Agent 对话与本地工具**：使用 Harness 的会话、工具、命令、附件、代码运行时和权限/沙箱能力完成项目任务。
- **桌面三栏布局**：侧边栏、对话区和详情区组合在原生窗口中；侧边栏与详情栏可调整宽度，并针对 macOS / Windows 的原生标题栏做了适配。
- **本地终端**：桌面运行时集成终端与 shell 服务；当前 Linux 组合中终端插件默认关闭。
- **Profiles**：可维护和切换不同的桌面/运行时配置，插件和项目环境可以按 profile 管理。
- **内置插件市场**：`dsh-community-market` 已接入桌面应用，支持插件目录、详情、数据源、安装/卸载和管理流程。
- **内置 pnpm / 插件安装服务**：应用拥有用于插件安装和配置变更的包管理能力，并带有失败后的回滚与恢复逻辑。
- **系统托盘与原生桌面集成**：包含托盘图标、原生窗口行为、平台适配和桌面启动流程。
- **日志与诊断**：本地日志、诊断导出、启动健康检查、崩溃证据和启动恢复流程已经在代码中实现。
- **打包能力**：仓库包含 Windows x64 的 NSIS 安装包与 portable 构建流程、macOS 构建流程，以及 Linux directory target。

## 当前限制

Avti **还没有自己的签名自动更新通道**。为了避免 Avti 构建访问原项目的更新服务器，自动更新模块目前被明确禁用。

本仓库目前也**没有发布或宣传手机远程控制功能**。README 只列出当前代码中实际存在的能力。

## 开发

要求：

- Node.js `^22.19.0` 或 `>=24.0.0`
- Yarn `4.18.0`

安装依赖并启动开发环境：

```bash
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

## 仓库结构

- `dsh-plugin-desktop/` — Avti 的 Electron 外壳与桌面服务
- `dsh-community-market/` — 插件目录、市场 UI 和安装/卸载流程
- `dsh-community-fabric/` — 插件兼容与 contract 相关工作
- `patches/` — 针对固定运行时依赖的兼容补丁

## 开源组件与署名

Avti 使用 DeepSeek Harness 的运行时包以及其他开源组件，但 Avti 是这个仓库中的独立桌面产品，并且不使用上游 DSH Desktop 的更新通道。

许可证见 [`LICENSE`](LICENSE)。桌面包使用的第三方组件与许可证见 [`dsh-plugin-desktop/THIRD_PARTY_NOTICES.md`](dsh-plugin-desktop/THIRD_PARTY_NOTICES.md)。
