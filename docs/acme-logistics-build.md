# Acme Logistics HappyRobot Build

## Overview

This build is a small broker-owned companion app for a HappyRobot inbound
carrier-sales demo. HappyRobot owns the voice call. This app owns the public
tool calls, carrier vetting, load search, negotiation policy, final call
ingestion, and dashboard metrics.

## Architecture

- TanStack Start serves both the dashboard route and public server routes.
- Effect Schema validates every untrusted request and external FMCSA response.
- Effect programs keep auth, JSON parsing, upstream calls, and typed domain
  errors explicit at the API boundary.
- SQLite stores cached FMCSA checks, final call records, and offer events.
- Seed loads live in `src/data/loads.json`.
- The dashboard reads only from app-owned SQLite records and does not depend on
  HappyRobot analytics.

## Public API

All HappyRobot-facing endpoints require `x-api-key`.

- `POST /api/carriers/verify`: normalizes an MC number, checks the local cache,
  calls FMCSA on a cache miss, and returns eligibility.
- `POST /api/loads/search`: scores seeded loads by lane, equipment, pickup date,
  and max weight, then returns one selected load and alternatives.
- `POST /api/offers/evaluate`: accepts at or below 108% of loadboard rate
  rounded to $25, counters before turn 3, and rejects after turn 3 or unrealistic
  offers.
- `POST /api/calls`: stores the final HappyRobot extraction and classification
  output for dashboard reporting.

## Dashboard

The `/` dashboard is protected with HTTP Basic auth. It shows total calls,
eligible rate, matched load rate, agreement rate, average agreed-vs-board delta,
mock transfer count, outcome and sentiment distributions, recent calls, and
recent offer decisions.

## Security

- Secrets are server-only environment variables.
- Public API requests require a shared `x-api-key`.
- Dashboard reads require HTTP Basic auth.
- Public API and dashboard attempts use a small in-memory fixed-window rate
  limiter to reduce brute-force and noisy abuse in the demo deployment.
- API and dashboard responses set baseline hardening headers for clickjacking,
  MIME sniffing, and referrer leakage.
- SQLite path is configurable with `DATABASE_PATH`.
- No FMCSA key or HappyRobot key is committed.
- The app does not enable broad CORS.

## HappyRobot Workflow

Use the web-call trigger for the demo.

1. Agent persona: Maya, inbound carrier sales rep for Acme Logistics.
2. Greet the carrier and collect MC number.
3. Call `verify_carrier`; decline politely when ineligible.
4. Ask for lane and equipment preferences; call `search_loads`.
5. Pitch one load with origin, destination, pickup, delivery, equipment, weight,
   commodity, miles, and rate.
6. If the carrier counters, call `evaluate_offer` for up to three turns.
7. On agreement, say: "Transfer was successful and now you can wrap up the
   conversation."
8. After the call, run AI Extract for offer fields, AI Classify for outcome, AI
   Classify or real-time classifier for sentiment, then webhook to `/api/calls`.

## Local Reproduction

```bash
pnpm install
cp .env.example .env.local
pnpm dev
```

Run verification:

```bash
pnpm test
pnpm typecheck
pnpm lint
pnpm build
pnpm verify:dashboard
```

## Docker And Fly.io

Build locally:

```bash
docker build -t acme-logistics .
```

Deploy on Fly.io:

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

## Limitations

- FMCSA availability is external. If FMCSA returns a non-2xx response, the API
  returns a clean `502` response instead of guessing eligibility.
- Transfer is intentionally mocked because the challenge asks for a mock transfer
  message.
- Carrier and load data is intentionally compact for the take-home; production
  would add broker TMS integration, richer lane matching, and audit exports.
