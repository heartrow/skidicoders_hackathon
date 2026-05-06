# VertiGrow — Vertical Farm Dashboard

An intelligent vertical farming dashboard that monitors IoT sensor data, controls automated systems, tracks predictive alerts, and surfaces AI-driven crop recommendations for urban indoor farms.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080)
- `pnpm --filter @workspace/farm-dashboard run dev` — run the frontend (port 20562)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite, Wouter routing, TanStack Query, Recharts, shadcn/ui
- API: Express 5, OpenAPI-first with Orval codegen
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec → React Query hooks + Zod schemas)
- Build: esbuild (CJS bundle)

## Where things live

- `lib/api-spec/openapi.yaml` — OpenAPI spec (source of truth)
- `lib/api-client-react/src/generated/` — generated React Query hooks
- `lib/api-zod/src/generated/api.ts` — generated Zod schemas (used by server)
- `lib/db/src/schema/` — Drizzle table definitions (zones, sensor_readings, controls, alerts, recommendations)
- `artifacts/api-server/src/routes/` — Express route handlers
- `artifacts/farm-dashboard/src/pages/` — React page components
- `artifacts/farm-dashboard/src/index.css` — theme (dark forest green + warm amber)

## Architecture decisions

- OpenAPI-first: all API contracts defined in `openapi.yaml`, codegen produces both typed React Query hooks and Zod validators — no hand-written types
- `lib/api-spec/package.json` codegen script overwrites `lib/api-zod/src/index.ts` after Orval runs to avoid duplicate export conflicts from the Orval barrel generator
- Queries auto-refresh every 30s (`refetchInterval: 30000`) to simulate live IoT data updates
- Dashboard summary endpoint (`GET /api/dashboard/summary`) uses SQL aggregates (avg, count filter) for efficient single-query stats
- Sensor history uses `DISTINCT ON (zone_id)` PostgreSQL feature to efficiently return latest reading per zone
- Custom plant profiles are stored in `localStorage` (key `vertigrow_custom_profiles`) — no DB round-trip needed; `getAllProfiles()` merges built-in + custom profiles at runtime
- Sensors and Controls pages are removed from the nav; all per-zone sensor/control functionality lives in Zone Detail tabs

## Product

- **Dashboard** — real-time overview: zone counts, active alerts, avg sensor readings, recent alerts and AI insights
- **Farm Zones** — full CRUD for farm zones; crop type is a dropdown (8 built-in + custom crops); custom crops can have user-defined or AI-generated control presets stored in localStorage
- **Zone Detail** — 3-tab layout per zone: Overview (sensor cards + combined chart + control status), Sensors (live gauges + 24h history with "All in One" / "Separate" graph toggle), Controls (auto-mode toggle + full control cards with intensity sliders)
- **Alerts** — severity-coded alerts (critical/warning/info) with acknowledge flow, tabbed by status
- **AI Insights** — categorised recommendations (harvest timing, nutrient adjustment, lighting, watering, environment)
- **Analytics** — resource consumption + cost tracking; monthly trends, zone breakdown, cost analysis tabs; YoY comparison (2025 vs 2026)

## Gotchas

- Always run codegen after changing `openapi.yaml`: `pnpm --filter @workspace/api-spec run codegen`
- The codegen script overwrites `lib/api-zod/src/index.ts` — do not manually edit that file
- `date-fns` is used for relative timestamps on the frontend (already installed via `package.json`)

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
- See `lib/api-spec/openapi.yaml` for the full API contract
