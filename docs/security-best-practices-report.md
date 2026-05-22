# Security Best Practices Report

## Executive summary

No critical or high-severity issues were found in the app-owned code after the
security hardening pass. The app keeps secrets server-side, validates untrusted
payloads at runtime with Effect Schema, protects public endpoints with API-key
auth, protects the dashboard with Basic auth, uses prepared SQLite statements,
adds fixed-window rate limiting, and ships a production Docker runtime as a
non-root user. Remaining items are production-hardening considerations rather
than blockers for the take-home demo.

## Critical findings

None.

## High findings

None.

## Medium findings

### SBP-001: In-memory rate limiting is per runtime instance

- Severity: Medium
- Location: `src/server/rate-limit.ts:4`
- Evidence: request counters are stored in a process-local `Map`.
- Impact: if production uses multiple machines, limits are enforced separately
  per machine. This is acceptable for a one-machine demo, but weaker for a
  scaled public deployment.
- Fix: keep `min_machines_running = 1` for the demo or move throttling to Fly
  edge/proxy/durable storage for production.
- Mitigation: monitor 401/429 spikes and unusual IP volume.

### SBP-002: Strict CSP is not enabled in app code

- Severity: Medium
- Location: `src/server/security-headers.ts:1`, `src/server/dashboard.ts:100`
- Evidence: the app sets `X-Frame-Options`, `X-Content-Type-Options`, and
  `Referrer-Policy`, but intentionally does not set a CSP.
- Impact: CSP would reduce the blast radius of a future XSS bug. A naive CSP
  can break TanStack hydration because production HTML may include framework
  inline scripts.
- Fix: add nonce or hash-based CSP once the final hosting path is known and test
  it against the built SSR output.
- Mitigation: keep avoiding raw HTML sinks in app-owned dashboard code.

## Low findings

### SBP-003: Generated chart code uses `dangerouslySetInnerHTML` for CSS variables

- Severity: Low
- Location: `src/components/evilcharts/ui/chart.tsx:205`
- Evidence: EvilCharts injects generated style text for chart CSS variables.
- Impact: this would become risky if attacker-controlled values were allowed into
  chart color config. Current app config is developer-controlled constants in
  `src/routes/index.tsx:55`.
- Fix: keep chart config values local constants; do not pass stored call payloads
  into chart config colors or raw CSS.
- Mitigation: CI grep for `dangerouslySetInnerHTML` before adding new dashboard
  features.

## Positive controls observed

- Secrets are read from server env only: `src/domain/config.ts:6`.
- `.env*`, local SQLite, screenshots, and build output are ignored:
  `.gitignore:3`.
- Public API routes require `x-api-key`: `src/server/api.ts:208`.
- Dashboard requests get a real Basic auth challenge before SSR:
  `src/server/dashboard.ts:13`.
- Runtime schemas cover untrusted request bodies and stored records:
  `src/domain/schemas.ts:38`.
- SQLite writes use prepared statements: `src/server/database.ts:175`.
- Docker runtime uses production mode and a non-root user: `Dockerfile:18`.
- Fly config forces HTTPS and mounts SQLite data at `/data`: `fly.toml:16`.
- Manifest dependency specs are pinned instead of `latest`: `package.json:24`.

## Verification

- `pnpm test`
- `pnpm typecheck`
- `pnpm lint`
- `pnpm check`

Docker build was not rerun during this pass because the Docker daemon was not
available earlier in the session.
