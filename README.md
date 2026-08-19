<p align="center">
  <img src="assets/avti-logo.svg" width="120" alt="Логотип Avti">
</p>

<h1 align="center">Avti</h1>

<p align="center">
  AI-инструменты для работы с локальными проектами.
</p>

<p align="center">
  <strong>Avti Desktop</strong> · визуальный workflow
  &nbsp;&nbsp;|&nbsp;&nbsp;
  <strong>Avti CLI</strong> · terminal workflow
</p>

<p align="center"><strong>Русский</strong> · <a href="README.en.md">English</a> · <a href="README.zh.md">中文</a></p>

<p align="center"><code>ai-agent</code> · <code>desktop</code> · <code>cli</code> · <code>local-projects</code> · <code>electron</code> · <code>plugins</code> · <code>windows</code> · <code>macos</code></p>

## Два самостоятельных продукта

Avti Desktop и Avti CLI развиваются под одним брендом и могут переиспользовать runtime-код, но не требуют друг друга для установки или работы.

- **Avti Desktop** устанавливается как отдельное desktop-приложение.
- **Avti CLI** устанавливается как отдельный terminal-продукт.
- У каждого продукта свой release artifact и своя версия.
- CLI по умолчанию хранит собственные settings, profiles, credentials, plugins и sessions в `~/.avti/cli`.
- Удаление или перенастройка одного продукта не должно ломать второй.

## Быстрый старт

### Avti Desktop

1. Скачайте installer из [Releases](https://github.com/dantegolf/Avti/releases).
2. Установите и откройте Avti Desktop.
3. Выберите папку локального проекта.
4. Подключите AI-провайдера и выберите модель.
5. Создайте новую сессию и начинайте работать.

Windows Desktop из PowerShell:

```powershell
irm https://raw.githubusercontent.com/dantegolf/Avti/main/install.ps1 | iex
```

### Avti CLI

CLI устанавливается отдельно от Desktop. На Windows:

```powershell
irm https://raw.githubusercontent.com/dantegolf/Avti/main/install-cli.ps1 | iex
```

Установщик CLI выбирает только releases с тегами `cli-v*`, проверяет SHA-256, устанавливает portable runtime в `%LOCALAPPDATA%\Avti\CLI` и добавляет эту папку в пользовательский PATH.

На macOS скачайте подходящий archive из CLI release: `avti-macos-arm64.tar.gz` для Apple Silicon или `avti-macos-x64.tar.gz` для Intel.

Откройте терминал в папке проекта и запустите:

```bash
avti
```

Без аргументов Avti CLI открывает интерактивную терминальную сессию и использует текущую папку как workspace.

```text
AVTI

C:\Projects\my-app · model-name

› проверь проект и исправь падающие тесты

  ◜ Thinking
  ∙···· Reading files
  ✓ Read files
  ·∙··· Running command
  ✓ Ran command

Исправил проблему в тестах и проверил результат.

› _
```

Для одной задачи без интерактивной сессии:

```bash
avti "объясни архитектуру этого проекта"
```

Команды CLI:

```bash
avti status
avti models
avti models <provider>
avti model
avti model <model>
avti model <provider> <model>
avti sessions
avti resume <session-id>
avti doctor
```

`avti model` читает и сохраняет **CLI default model** в отдельном CLI state. Desktop model settings при этом не изменяются.

`avti sessions` показывает последние сохранённые CLI-сессии для текущей папки проекта. Продолжить одну из них можно через `avti resume <session-id>`. Перед восстановлением Avti проверяет, что сохранённая сессия принадлежит текущей папке проекта, а затем использует штатный Harness session resume.

`avti doctor` без model call проверяет workspace, agent runtime, persistence, session history, выбранного provider и разрешение выбранной model.

Полезные команды внутри интерактивной сессии:

```text
/help                    показать команды терминала
/status                  показать project, model и session
/models [provider]       показать доступные модели
/model                   показать текущую модель
/model <model>           сменить модель на текущем provider
/model <provider> <id>   сменить provider и модель
/sessions                показать CLI-сессии текущего проекта
/exit                    выйти из Avti
/quit                    выйти из Avti
```

Другие зарегистрированные slash-команды Harness, например command plugins, Avti CLI передаёт в нативный Harness command registry вместо собственной повторной реализации.

### CLI state

По умолчанию CLI использует:

```text
~/.avti/cli
```

Можно явно переопределить путь:

```powershell
$env:AVTI_CLI_HOME = 'D:\AvtiCli'
avti
```

или на macOS/Linux shell:

```bash
export AVTI_CLI_HOME="$HOME/.avti/cli-custom"
avti
```

`DSH_HOME` остаётся доступным как advanced Harness override.

## Установка и portable artifacts

### Windows Desktop

Desktop release использует tag вида `v2.0.1` и artifact:

```text
Avti-2.0.1-x64-Setup.exe
SHA256SUMS.txt
```

Desktop bootstrap:

```powershell
irm https://raw.githubusercontent.com/dantegolf/Avti/main/install.ps1 | iex
```

### Avti CLI — Windows x64

CLI release использует независимый tag вида `cli-v0.1.0` и artifacts:

```text
avti-windows-x64.zip
avti-windows-x64.sha256
```

ZIP содержит собственный Node runtime и production dependencies. На пользовательской машине не нужны Avti Desktop, Node.js или Yarn.

CLI bootstrap:

```powershell
irm https://raw.githubusercontent.com/dantegolf/Avti/main/install-cli.ps1 | iex
```

### Avti CLI — macOS Apple Silicon

Для M1/M2/M3/M4 и более новых Apple Silicon Mac:

```text
avti-macos-arm64.tar.gz
avti-macos-arm64.sha256
```

```bash
tar -xzf avti-macos-arm64.tar.gz
cd avti-macos-arm64
./avti
```

### Avti CLI — macOS Intel

Для Intel Mac:

```text
avti-macos-x64.tar.gz
avti-macos-x64.sha256
```

```bash
tar -xzf avti-macos-x64.tar.gz
cd avti-macos-x64
./avti
```

macOS CLI artifacts собираются нативно под каждую архитектуру, чтобы Node runtime и native npm dependencies соответствовали машине пользователя.

Windows CLI пока не подписан Authenticode. macOS CLI пока не подписан и не notarized; signing/notarization будет подключаться отдельно от Desktop release signing.

## Что умеет Avti

### Desktop

- работа с локальными проектами и workspaces;
- desktop conversation UI;
- project context, attachments и tools;
- подключаемые providers/models;
- локальный terminal;
- profiles и Plugin Market;
- diagnostics и recovery flows.

### CLI

- интерактивный `avti` в текущей папке проекта;
- one-shot задачи;
- streaming model output;
- tool activity и tool results;
- approvals и вопросы пользователю;
- native Harness slash commands;
- CLI-only model settings;
- persisted CLI sessions и resume;
- `status`, `models`, `model`, `sessions`, `doctor`;
- отдельные portable runtimes для Windows x64, macOS arm64 и macOS x64.

## Для разработчиков

Требования для разработки репозитория:

- Node.js `^22.19.0` или `>=24.0.0`
- Yarn `4.18.0`

```bash
git clone https://github.com/dantegolf/Avti.git
cd Avti
corepack enable
yarn install
```

Общие проверки:

```bash
yarn build
yarn typecheck
yarn test
yarn check
```

Desktop:

```bash
yarn dev
yarn dist:win
yarn dist:win-portable
yarn dist:mac
```

CLI:

```bash
yarn build:cli
yarn typecheck:cli
yarn check:cli
yarn dist:cli:win
yarn dist:cli:mac
```

`dist:cli:mac` создаёт artifact только для архитектуры текущей macOS-машины. Release CI отдельно запускает его на arm64 и Intel runners.

## Releases

Desktop и CLI публикуются независимо.

### Desktop release

Workflow: `.github/workflows/release-windows.yml`

```text
version: dsh-plugin-desktop/package.json
 tag:    v2.0.1
```

### CLI release

Workflow: `.github/workflows/release-cli-windows.yml`

```text
version: avti-cli/package.json
 tag:    cli-v0.1.0
```

Один `cli-v*` release содержит Windows x64, macOS arm64 и macOS x64 artifacts с отдельными SHA-256 manifests. Версии Desktop и CLI не обязаны совпадать.

## Структура репозитория

- `avti-cli/` — standalone CLI package, cross-platform packaging и CLI release boundary
- `dsh-plugin-desktop/` — Electron-оболочка Avti Desktop и desktop-сервисы
- `dsh-community-market/` — каталог плагинов, marketplace UI и install/uninstall flow
- `dsh-community-fabric/` — совместимость плагинов и contracts
- `patches/` — compatibility-патчи для зафиксированных runtime-зависимостей
- `install.ps1` — bootstrap installer для Desktop
- `install-cli.ps1` — независимый Windows bootstrap installer для CLI

На текущем этапе CLI package переиспользует часть terminal frontend source из `dsh-plugin-desktop/src/avti-*.ts` **только во время сборки**. Готовый CLI artifact не зависит от Desktop или Electron. Следующий внутренний cleanup — вынести этот source seam в нейтральный shared package, не меняя пользовательскую границу продуктов.

## Open source и лицензии

Avti использует runtime-пакеты DeepSeek Harness и другие open-source компоненты. Эти зависимости остаются явно указаны в package metadata и распространяются с собственными license files в production dependency tree.

Лицензия проекта: [`LICENSE`](LICENSE). Сторонние компоненты Desktop: [`dsh-plugin-desktop/THIRD_PARTY_NOTICES.md`](dsh-plugin-desktop/THIRD_PARTY_NOTICES.md). Сторонние компоненты CLI: [`avti-cli/THIRD_PARTY_NOTICES.md`](avti-cli/THIRD_PARTY_NOTICES.md).

## Текущие ограничения

- Desktop и CLI пока публикуются без production code signing.
- macOS CLI пока не notarized.
- CLI source seam ещё физически находится рядом с Desktop source и должен быть вынесен в нейтральный package после стабилизации build boundary.
- Automatic update для Desktop и CLI не включён.
