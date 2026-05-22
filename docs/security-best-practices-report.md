# Security Best Practices Report

## Executive Summary

No critical or high-severity issues are open in the app-owned code after the
Convex/Confect migration. The app keeps secrets server-side, validates
untrusted payloads with Effect Schema, protects HappyRobot endpoints with
API-key auth, protects the dashboard with Basic auth, protects Convex backend
functions with a server-only backend key, gates the browser live dashboard query
with a separate realtime token, and ships a non-root Docker runtime.

## Critical Findings

None.

## High Findings

None.

## Medium Findings

### SBP-001: In-Memory Rate Limiting Is Per Runtime Instance

- Location: `src/server/rate-limit.ts`
- Impact: limits are process-local, so horizontally scaled Railway replicas
  would each enforce their own counters.
- Current status: acceptable for the current single-instance deployment.
- Production fix: move throttling to an edge/proxy control or durable store.

### SBP-002: Strict CSP Is Not Enabled In App Code

- Location: `src/server/security-headers.ts`
- Impact: CSP would reduce the blast radius of future XSS, but a naive policy
  can break framework inline scripts.
- Current status: response hardening headers are present.
- Production fix: add nonce/hash-based CSP after validating the final SSR build.

## Low Findings

### SBP-003: Generated Chart Code Uses A Raw Style Injection

- Location: `src/components/evilcharts/ui/chart.tsx`
- Impact: risky only if attacker-controlled values are passed into chart CSS.
- Current status: chart config is developer-controlled in `src/routes/index.tsx`.
- Fix: keep stored call payloads out of chart style/config fields.

## Positive Controls

- Server-only env reads: `src/domain/config.ts`
- Public API auth and decode: `src/server/api.ts`
- Railway-to-Convex backend key: `src/server/backend.ts`, `confect/backend.ts`
- Confect typed backend errors: `confect/errors.ts`
- Convex table schemas from Effect schemas: `confect/schema.ts`
- Dashboard Basic auth: `src/server/dashboard.ts`
- Dashboard realtime token gate: `confect/dashboard.impl.ts`
- Docker non-root runtime: `Dockerfile`
- Railway healthcheck config: `railway.json`

## Verification Targets

- `pnpm test`
- `pnpm typecheck`
- `pnpm check`
- `pnpm build`
- `docker build -t acme-logistics .`
