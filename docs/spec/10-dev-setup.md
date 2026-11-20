# 10 · Dev setup, tooling and workflow

## Getting started (target: under 3 minutes from a fresh clone)
```bash
npm i
```
```bash
npm run dev
```
Then open `http://localhost:3000` and click "Run the 15 July demo". No env vars are needed locally: the store uses the in-memory adapter.

## Scripts (`package.json`)
| Script | What it does |
|---|---|
| `dev` | Next dev server (Turbopack) |
| `build` | `next build --webpack` (Serwist needs webpack) |
| `typecheck` | `tsc --noEmit -p tsconfig.test.json`; includes `tests/`, which the Next build's own check skips |
| `test` | `vitest run`, which never watches, so agent terminals don't hang |
| `sim` | precompute the simulation, writing the committed `public/evidence.json` |
| `smoke <url>` | post-deploy checks ([07](07-landing-and-demo.md#checks)) |
| `lint` | includes the rules below |

## Env (`.env.example`; real values live in `.env.local`, which is gitignored)
```
UPSTASH_REDIS_REST_URL=        # or KV_REST_API_URL (Vercel Marketplace)
UPSTASH_REDIS_REST_TOKEN=      # or KV_REST_API_TOKEN
SITE_WORKER_TOKEN=             # live sites only; the demo uses data/seed.json
SITE_SUPERVISOR_TOKEN=
V0_API_KEY=                    # builder tooling only, never shipped to the client
```

## Tests
- The **time-zone matrix** runs through `vitest.config.ts` projects using `test.env.TZ` (UTC and America/New_York). This works on Windows.
- **Lint rules:**
  - no local `Date` getters or `toLocale*` in `lib/`
  - `lib/engine` must not import `lib/sim`
- **Hand-written first (done 14 Nov):** before Antigravity writes the engine, the builder writes the E1 goldens, the WBGT tolerance cases and the `applyStatus`/ack cases. This stops agent code and agent tests from simply agreeing with each other.
  - They live in `tests/`: `wbgt.test.ts`, `status.test.ts`, `engine.test.ts` and `spec-params.ts`.
  - `tests/` is **builder-owned and read-only for Antigravity**: it makes them pass and never edits them.
  - `npm test` stays red until `lib/engine/{index,wbgt,constants}.ts` and `lib/status.ts` exist.
  - The tests were checked green against a throwaway reference implementation of this spec. Deliberate bugs in it (wind units, latch, hysteresis, gaps as Rest, UTF-8 size, same-minute L4) each failed at least one test.
- **Mocks (done):** `mocks/worker/*.json` and `mocks/board/*.json`, checked by `tests/mocks.test.ts`; level contrast by `tests/contrast.test.ts`. One per `WorkerViewState` and `BoardTileState`, typed against `lib/types.ts`, so v0 builds every state and not just the happy path.
- **Fixtures:** a test checks the bundled fixtures contain zero nulls.
- The full test plan is in `~/.gstack/projects/MIcrosoft/` (eng-review test plan).

## Service worker (Serwist, gate d4a)
- Don't spread `defaultCache`. Use exactly two runtime rules:
  - **NetworkFirst** for pages, `networkTimeoutSeconds: 3`
  - **CacheFirst** for `/_next/static/*`
- Never intercept `/api/*`. Every API response is `no-store`, and a test asserts no rule matches `/api/`.
- `/worker`, `/supervisor` and `/evidence` must build **static** (○ in `next build`).
- Build id: `NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA`, mapped in `next.config` env, falling back to a build timestamp.
- **Checked 14 Nov (done):** Next is at **16.4.6** and builds with Turbopack by default. `@serwist/next` 9.5.13 still depends on `@serwist/webpack-plugin`, and lists `@serwist/cli` as a peer dependency.
  - **Decision:** use `@serwist/next` + `@serwist/cli` with `"build": "next build --webpack"`. `next dev` stays on Turbopack; the SW is production-only anyway.
  - **Fallback** if the webpack build breaks: `@serwist/turbopack` 9.5.13 (Turbopack-native, needs `esbuild-wasm`). It serves the SW from a route handler, so the `/sw.js` registration path in [04](04-client-session.md) would change.

## Working with v0 (frontend)
- Each v0 prompt includes the matching spec file:
  - [05-worker-app.md](05-worker-app.md), [06-supervisor-board.md](06-supervisor-board.md) or [07-landing-and-demo.md](07-landing-and-demo.md)
  - plus [09-design-system.md](09-design-system.md), `lib/types.ts` and the mocks
- v0 generates layout only from those files.
- Output is **copied by hand into `components/`** and wired to `lib/client/session.ts`. v0 never syncs to main and never edits `lib/` or `package.json`.
- The v0 MCP server is connected in this project (`.mcp.json`, OAuth). The v0 Platform API key is in `.env.local`.

## Working with Antigravity (backend)
- Inputs:
  - [02-engine.md](02-engine.md)
  - [03-api-and-storage.md](03-api-and-storage.md)
  - [08-evidence-simulator.md](08-evidence-simulator.md)
  - `lib/types.ts`, read-only
  - the hand-written tests
- Antigravity owns: `lib/engine`, `lib/sim`, `lib/weather.ts`, `lib/store.ts`, `lib/status.ts`, `lib/auth.ts`, `lib/problem.ts`, `app/api/*`, `data/*`, `scripts/*`.

## Deploy
- Vercel builds a preview per push and promotes to production each evening. Rollback is "promote previous deployment" (under 1 min), and the SW cache is versioned by build id.
- Run `npm run smoke <url>` after every production deploy.
- The Vercel function region and the Supabase project region are co-located. SQL for the tables lives in `supabase/schema.sql`.
- Test phones only on the HTTPS Vercel URL.

## README (written in the repo)
- install / dev / test
- one example session URL
- curl examples for every route
- where the tokens come from (the demo tokens are public by design)
- MIT licence
- Open-Meteo attribution
