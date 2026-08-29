<p align="center">
  <img src="assets/avti-logo.svg" width="120" alt="Avti">
</p>

<h1 align="center">Avti</h1>

<p align="center">
  Десктопное приложение для работы с AI-агентом прямо в локальных проектах.
</p>

<p align="center">
  <a href="https://github.com/dantegolf/Avti/releases/latest"><strong>Скачать для Windows</strong></a>
  ·
  <a href="#установка-через-powershell">PowerShell</a>
</p>

<p align="center"><strong>Русский</strong> · <a href="README.en.md">English</a> · <a href="README.zh.md">中文</a></p>

## Что это

Avti — приложение, в котором можно открыть папку проекта, подключить AI-модель и работать с кодом в одном окне.

Агент видит контекст проекта, может использовать инструменты и терминал, а сессии остаются привязаны к конкретному workspace. Никакой отдельной веб-панели для повседневной работы не нужно.

Если рядом запущен [ClaudeGravity](https://github.com/dantegolf/ClaudeGravity-), Avti автоматически показывает его как локального провайдера вместе с доступными моделями.

## Быстрый старт

1. [Скачайте последний релиз](https://github.com/dantegolf/Avti/releases/latest) и установите Avti.
2. Откройте папку проекта.
3. Добавьте AI-провайдера и выберите модель.
4. Создайте сессию и начинайте работать.

Для обычной установки Node.js и Yarn не нужны.

## Возможности

- работа с локальными папками и проектами;
- отдельные AI-сессии для разных задач;
- подключение разных провайдеров и моделей;
- встроенные tools, commands и attachments;
- терминал рядом с диалогом;
- profiles для разных окружений и конфигураций;
- установка и управление community-плагинами через Plugin Market;
- локальные логи и экспорт диагностики, если что-то пошло не так.

## Установка на Windows

### Через установщик

Скачайте файл `Avti-*-x64-Setup.exe` из [последнего релиза](https://github.com/dantegolf/Avti/releases/latest) и запустите его.

Сборки пока не подписаны Authenticode, поэтому Windows SmartScreen может показать предупреждение при первом запуске.

### Установка через PowerShell

Последний релиз можно установить одной командой:

```powershell
irm https://raw.githubusercontent.com/dantegolf/Avti/main/install.ps1 | iex
```

Скрипт сам скачает актуальный Windows x64 installer, сверит SHA-256 и запустит установку.

Если нужна диагностика:

```powershell
./install.ps1 -Verbose
```

Чтобы открыть обычный интерфейс установщика:

```powershell
./install.ps1 -Interactive
```

## Разработка

Нужны:

- Node.js `^22.19.0` или `>=24.0.0`;
- Yarn `4.18.0`.

```bash
git clone https://github.com/dantegolf/Avti.git
cd Avti
corepack enable
yarn install
yarn dev
```

Полезные команды:

```bash
yarn build
yarn typecheck
yarn test
yarn check
yarn dist:win
yarn dist:win-portable
yarn dist:mac
```

Релизы для Windows собираются через `.github/workflows/release-windows.yml`. Тег версии запускает сборку NSIS installer и публикацию `SHA256SUMS.txt` в GitHub Releases.

## Что лежит в репозитории

- `dsh-plugin-desktop/` — Electron-приложение и desktop-сервисы;
- `dsh-community-market/` — Plugin Market;
- `dsh-community-fabric/` — contracts и совместимость плагинов;
- `patches/` — патчи для runtime-зависимостей;
- `install.ps1` — PowerShell-установщик для Windows.

## Ограничения

Сейчас у Avti нет собственного подписанного канала автообновлений. Windows installer также пока публикуется без Authenticode-подписи.

## Лицензия

Avti распространяется по лицензии [MIT](LICENSE).

Проект использует DeepSeek Harness и другие open-source зависимости. Информация о сторонних компонентах desktop-пакета находится в [`dsh-plugin-desktop/THIRD_PARTY_NOTICES.md`](dsh-plugin-desktop/THIRD_PARTY_NOTICES.md).
