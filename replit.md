# GiftBot — Telegram Mini App (React + Vite)

## Описание
Telegram-бот с мини-приложением (Mini App) для игр, розыгрышей, кейсов и магазина подарков. Интерфейс на русском языке. Фронтенд переписан на React + Vite.

## Структура проекта
- `bot.js` — основной файл: Express-сервер + Telegram-бот (telegraf)
- `client/` — React-приложение (исходники Vite)
  - `client/index.html` — HTML точка входа
  - `client/src/main.jsx` — точка входа React
  - `client/src/App.jsx` — главный компонент (маршрутизация по страницам)
  - `client/src/context/AppContext.jsx` — глобальное состояние (replaces `S` object)
  - `client/src/hooks/useTelegram.js` — Telegram WebApp SDK
  - `client/src/config/config.js` — данные игры (кейсы, предметы, задания, цвета)
  - `client/src/pages/` — страницы: Home, Tasks, Shop, Inventory, Friends, Draws, PVP, Profile
  - `client/src/components/` — Navigation, Toast, SplashScreen, CoinIcon
  - `client/src/components/modals/` — CaseModal, ShopModal, GenModal, StarsModal, ColorPicker, EffectPicker
- `public/` — статика (CSS, иконки, изображения) + скомпилированный React
  - `public/css/style.css` — стили (подключается в index.html)
  - `public/assets/` — скомпилированный JS/CSS от Vite
  - `public/index.html` — собранный index.html от Vite
- `vite.config.js` — конфигурация Vite (root=client, outDir=../public)
- `db.json` — локальная база данных
- `railway.json` — конфигурация Railway (buildCommand: npm run build:client)

## Технологии
- **Node.js 18+**
- **Express** — HTTP-сервер, API, раздаёт `public/` как статику
- **Telegraf** — Telegram Bot API
- **React 19 + Vite 6** — фронтенд
- **Jimp** — генерация изображений
- **Telegram Web App JS** — интеграция с Telegram Mini App

## Конфигурация (секреты)
- `BOT_TOKEN` — токен Telegram-бота (обязательный)
- `GITHUB_PERSONAL_TOKEN` — токен GitHub для резервного копирования и пушей
- `APP_URL` — URL для webhook (для Railway/деплой); без него бот работает в polling

## Railway (production)
- Деплой автоматический с GitHub (ветка main)
- `railway.json` buildCommand: `npm install && npm run build:client`
- База данных восстанавливается из ветки `db-backup` при каждом старте
- Нужно задать `BOT_TOKEN`, `GITHUB_PERSONAL_TOKEN`, `APP_URL` в Railway Environment Variables

## Команды разработки
```bash
npm install           # установить зависимости
npm run build:client  # собрать React → public/
npm run dev:client    # запустить Vite dev server (порт 5173)
node bot.js           # запустить сервер (порт 5000)
```

## Навигация (React)
- Маршрутизация — state-based, без React Router
- `go(page)` в `AppContext` переключает `currentPage`
- Страницы: `home` | `tasks` | `shop` | `inventory` | `friends` | `raffles` | `pvp` | `profile`

## Команды бота (только для админа UID 6151671553)
- `/repair` — режим тех. работ
- `/cpromo КОД СУММА КОЛ-ВО` — создать промокод
- `/vpromo КОД СУММА КОЛ-ВО` — VIP промокод
- `/promos` — список промокодов
- `/ban @username`, `/unban @username`, `/banlist` — управление банами

## Административная панель
- Доступна только для UID `6151671553`
- Дашборд, Юзеры, Задания, Розыгрыши, Промокоды, Уведомления
