# Acme Logistics Carrier Sales

TanStack Start app for the HappyRobot FDE take-home. It exposes the public
HappyRobot tool/webhook API, stores carrier sales activity in SQLite, and serves
a basic-auth protected operations dashboard.

## Stack

- TanStack Start with React file routes and server routes
- Effect Schema and Effect programs for validation, errors, and async boundaries
- SQLite through `better-sqlite3`
- Tailwind v4, COSS UI, EvilCharts
- Vitest, Playwright, Docker, Fly.io

## Local Setup

```bash
pnpm install
cp .env.example .env.local
pnpm dev
```

Required server-only variables:

- `HAPPYROBOT_API_KEY`
- `FMCSA_WEB_KEY`
- `DASHBOARD_BASIC_USER`
- `DASHBOARD_BASIC_PASSWORD`
- `DATABASE_PATH`

## Scripts

```bash
pnpm test
pnpm typecheck
pnpm lint
pnpm build
pnpm verify:dashboard
```

`pnpm verify:dashboard` expects a running app and writes desktop/mobile
screenshots to `.screenshots/`.

## API

All HappyRobot-facing endpoints require `x-api-key: HAPPYROBOT_API_KEY`.

- `POST /api/carriers/verify`
- `POST /api/loads/search`
- `POST /api/offers/evaluate`
- `POST /api/calls`

The dashboard is served at `/` and protected by HTTP Basic auth.

## Docker

```bash
docker build -t acme-logistics .
docker run --rm -p 3000:3000 \
  --env-file .env.local \
  -v acme-logistics-data:/data \
  acme-logistics
```

## Fly.io

```bash
fly launch --no-deploy
fly volumes create acme_data --size 1 --region iad
fly secrets set \
  HAPPYROBOT_API_KEY=... \
  FMCSA_WEB_KEY=... \
  DASHBOARD_BASIC_USER=... \
  DASHBOARD_BASIC_PASSWORD=...
fly deploy
```
