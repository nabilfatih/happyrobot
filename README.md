# Acme Logistics Carrier Sales

TanStack Start app for the HappyRobot FDE submission. It exposes the public
HappyRobot tool/webhook API, serves the basic-auth dashboard, and uses
Convex/Confect for app-owned carrier, load, offer, call, and realtime dashboard
state.

Production dashboard: <https://happyrobot-production-6027.up.railway.app>

## Stack

- TanStack Start with React file routes and server routes
- Convex backend generated and implemented through Confect
- Effect Schema and Effect programs for validation, typed errors, and async work
- Tailwind v4 and COSS UI
- Vitest, Docker, Railway

## Local Setup

```bash
pnpm install
pnpm confect:codegen
cp .env.example .env.local
pnpm convex:dev
pnpm dev
```

Railway/server env:

- `HAPPYROBOT_API_KEY`
- `DASHBOARD_BASIC_USER`
- `DASHBOARD_BASIC_PASSWORD`
- `DASHBOARD_REALTIME_TOKEN`
- `CONVEX_URL`
- `CONVEX_BACKEND_KEY`

Convex env:

- `FMCSA_WEB_KEY`
- `CONVEX_BACKEND_KEY`
- `DASHBOARD_REALTIME_TOKEN`

## Scripts

```bash
pnpm test
pnpm typecheck
pnpm check
pnpm build
```

## API

All HappyRobot-facing endpoints require `x-api-key: HAPPYROBOT_API_KEY`.

- `GET /health`
- `POST /api/carriers/verify`
- `GET /api/carriers/verify`
- `POST /api/loads/search`
- `GET /api/loads/search`
- `POST /api/offers/evaluate`
- `POST /api/calls`

The GET routes support HappyRobot webhook nodes. The POST offer and call routes
accept canonical app payloads plus the HappyRobot aliases used by the live
workflow.

The dashboard is served at `/`, protected by HTTP Basic auth, and uses one
browser-side Convex live query for realtime metrics after the server loader
authorizes the request.

## Docker And Railway

```bash
docker build -t acme-logistics .
docker run --rm -p 3000:3000 --env-file .env.local acme-logistics
```

Railway uses `railway.json`, the committed Dockerfile, and `/health` for
deployment health checks.
