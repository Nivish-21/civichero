# Lessons (project-local)

## 2026-06-26 — AI Studio Build Mode export fails to deploy on Cloud Run (two defects)
**Incident:** AI Studio Build Mode (React + Express full-stack) exported `server.ts` that failed
Cloud Run deploy with "container failed to start and listen on PORT=3000".

**Root causes (both in `server.ts`):**
1. `const PORT = 3000;` hardcoded — ignored Cloud Run's injected `PORT` env var. Fixed:
   `const PORT = Number(process.env.PORT) || 8080;`.
2. `const __filename = fileURLToPath(import.meta.url);` at module top. The build bundles the
   server to **CommonJS** (`esbuild --format=cjs`), where `import.meta.url` is `undefined`, so
   `fileURLToPath(undefined)` throws at startup (server.cjs:33) before `app.listen`. The derived
   `__dirname`/`__filename` were never used (prod paths use `process.cwd()`). Fixed by removing
   all three lines.

**How verified:** reproduced prod start locally —
`NODE_ENV=production PORT=8137 node dist/server.cjs` — confirmed "Server running on port 8137",
`GET /` → 200, `/api/triage` → 200 (simulated without key).

**Rule:** For any AI Studio Build Mode export deployed to Cloud Run, before deploying: (a) ensure
the server reads `process.env.PORT`, and (b) grep for `import.meta.url` / `fileURLToPath` in code
that gets bundled to CJS — remove or guard it.

## 2026-06-26 — Firebase web key is not a secret; refactor to env anyway for clean handoff
AI Studio export hardcodes Firebase web config in `firebase-applet-config.json` (committed).
Firebase web API keys are PUBLIC by design (identify project, not authorize) — not a leak.
The real secret (`GEMINI_API_KEY`) was never committed. For a clean repo, moved config to
`VITE_FIREBASE_*` env (`import.meta.env`, typed via `src/vite-env.d.ts`), gitignored `.env`,
purged the old JSON from history with git-filter-repo. Vite bakes `VITE_*` at build → Docker
needs them as `--build-arg`.
