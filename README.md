<p align="center">
  <img src="assets/avti-logo.svg" width="120" alt="Логотип Avti">
</p>

<h1 align="center">Avti</h1>

<p align="center">
  Локальное AI-пространство для работы с проектами.
</p>

<p align="center">
  <a href="https://github.com/dantegolf/Avti/releases/latest"><strong>Скачать для Windows</strong></a>
  ·
  <a href="#установка-из-powershell">Установить из PowerShell</a>
</p>

<p align="center"><strong>Русский</strong> · <a href="README.en.md">English</a> · <a href="README.zh.md">中文</a></p>

<p align="center"><code>ai-agent</code> · <code>desktop</code> · <code>cli</code> · <code>local-projects</code> · <code>electron</code> · <code>plugins</code> · <code>windows</code></p>

## Быстрый старт

### Desktop

1. Установите и откройте Avti.
2. Выберите папку локального проекта.
3. Подключите AI-провайдера и выберите модель.
4. Создайте новую сессию и начинайте работать.

### CLI

Откройте терминал в папке проекта и запустите:

```bash
avti
```

Без аргументов Avti открывает интерактивную терминальную сессию и использует текущую папку как workspace. Контекст сохраняется между сообщениями внутри этой сессии.

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

CLI также предоставляет короткие команды управления поверх тех же runtime-настроек:

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

`avti model` читает и сохраняет общий default model через Harness settings. Поэтому выбор модели не хранится во втором Avti-конфиге отдельно от Desktop: новые Desktop/CLI-сессии используют один и тот же default model state.

`avti sessions` показывает последние сохранённые сессии для текущей папки проекта. Продолжить одну из них можно через `avti resume <session-id>`. Перед восстановлением Avti проверяет, что сохранённая сессия принадлежит текущей папке проекта, а затем использует штатный Harness session resume.

`avti doctor` без model call проверяет workspace, agent runtime, persistence, session history, выбранного provider и разрешение выбранной model.

Полезные команды внутри интерактивной сессии:

```text
/help                    показать команды терминала
/status                  показать project, model и session
/models [provider]       показать доступные модели
/model                   показать текущую модель
/model <model>           сменить модель на текущем provider
/model <provider> <id>   сменить provider и модель
/sessions                показать сессии текущего проекта
/exit                    выйти из Avti
/quit                    выйти из Avti
```

Смена модели через `/model` применяется к следующим turn той же живой сессии и одновременно сохраняется как общий default model для следующих сессий.

Avti CLI оставляет agent loop, tools, permissions, sessions и model calls существующему runtime; собственный terminal frontend отвечает за ввод, потоковый вывод, статусы инструментов и approval/question prompts. В pipes и CI декоративная заставка и cursor-анимации не печатаются, чтобы one-shot вывод оставался пригодным для автоматизации.

Пользователю готовой сборки Avti не нужны Node.js, Yarn или ручная сборка проекта — они требуются только разработчикам.

## Установка на Windows

### Обычная установка

Скачайте последний `Avti-*-x64-Setup.exe` на странице [Releases](https://github.com/dantegolf/Avti/releases/latest) и запустите его.

Установщик создаёт ярлык Avti и устанавливает приложение для текущего пользователя. Windows-сборки проекта сейчас не подписаны Authenticode, поэтому до подключения code signing SmartScreen может показать предупреждение.

### Установка из PowerShell

Для установки последнего релиза одной командой:

```powershell
irm https://raw.githubusercontent.com/dantegolf/Avti/main/install.ps1 | iex
```

Терминальный установщик:

- определяет Windows x64;
- получает последний GitHub Release;
- скачивает готовый Avti Setup;
- проверяет опубликованный SHA-256;
- устанавливает Avti в тихом режиме;
- запускает приложение, если оно найдено в стандартной папке установки.

Для диагностики можно скачать `install.ps1` и запустить его с `-Verbose`. Чтобы увидеть обычный интерфейс NSIS-установщика, используйте `-Interactive`.

## Что умеет Avti

- **Работа с локальными проектами** — workspaces, выбор папок, drag-and-drop и нативный directory picker на Windows.
- **Desktop + CLI** — графический интерфейс и терминальный frontend над общими runtime-возможностями проекта.
- **AI-агент и проектный контекст** — сессии, attachments, commands, tools, code runtime, permissions и sandbox-возможности.
- **Подключаемые модели** — конфигурация AI-провайдеров и моделей через интерфейс приложения и CLI-команды поверх общего settings layer.
- **Десктопный интерфейс** — sidebar, conversation и details surface в нативном окне с системным tray.
- **Терминальный режим** — интерактивный `avti`, one-shot задачи, streaming-ответы, tool activity, approvals, вопросы пользователю, session resume и diagnostics.
- **Profiles** — отдельные конфигурации окружения, плагинов и runtime.
- **Plugin Market** — встроенный каталог community-плагинов с установкой, удалением и управлением.
- **Диагностика** — локальные логи, boot health, crash evidence, экспорт диагностики и recovery-потоки.

## Для разработчиков

Требования:

- Node.js `^22.19.0` или `>=24.0.0`
- Yarn `4.18.0`

```bash
git clone https://github.com/dantegolf/Avti.git
cd Avti
corepack enable
yarn install
yarn dev
```

Основные команды:

```bash
yarn build
yarn typecheck
yarn test
yarn check
yarn dist:win
yarn dist:win-portable
yarn dist:mac
```

Windows release pipeline находится в `.github/workflows/release-windows.yml`: tag вида `v2.0.1`, совпадающий с версией desktop package, собирает NSIS installer, создаёт `SHA256SUMS.txt` и публикует оба файла в GitHub Release.

## Структура репозитория

- `dsh-plugin-desktop/` — Electron-оболочка Avti, desktop-сервисы и Avti CLI frontend
- `dsh-community-market/` — каталог плагинов, marketplace UI и install/uninstall flow
- `dsh-community-fabric/` — совместимость плагинов и contracts
- `patches/` — compatibility-патчи для зафиксированных runtime-зависимостей
- `install.ps1` — пользовательский Windows bootstrap installer

## Open source и лицензии

Avti использует runtime-пакеты DeepSeek Harness и другие open-source компоненты. Эти зависимости остаются явно указаны в лицензиях и third-party notices; пользовательский установочный процесс просто не требует вручную работать с их пакетными менеджерами и build-командами.

Лицензия проекта: [`LICENSE`](LICENSE). Сторонние компоненты desktop-пакета: [`dsh-plugin-desktop/THIRD_PARTY_NOTICES.md`](dsh-plugin-desktop/THIRD_PARTY_NOTICES.md).

## Текущие ограничения

Avti пока не имеет собственного подписанного automatic-update канала. Updater исходного DSH Desktop отключён, а Windows installer пока публикуется без Authenticode-подписи. Следующий production-шаг для Windows — добавить code signing в release pipeline.
