# CLAUDE.md — Community Hero (civichero)

Agent context for this repo. Read `docs/status.md` first for live state.

## What this is
Track 2 ("Community Hero — Hyperlocal Problem Solver") submission for the BlockseBlock
hackathon. **Hard deadline: 2026-06-29 14:00.** A mobile-first civic issue reporting platform:
citizens photograph a local problem, Gemini Vision triages it, and an agent plans its resolution.

Mandatory deliverables: live link deployed on **Google Cloud (Cloud Run)**, this public GitHub
repo, and a project-description Google Doc. Judged on: Problem-Solving 20, **Agentic Depth 20**,
**Innovation 20**, Google Tech 15, Design 10, Tech 10, Completeness 5. The 40% on Agentic
Depth + Innovation is the north star.

## Stack
React 19 + Vite 6 + TypeScript + Tailwind 4 (client, `src/`) and an Express server
(`server.ts`) in one app. Firebase (Auth + Firestore + Storage), Gemini via `@google/genai`,
Google Maps via `@vis.gl/react-google-maps`. Origin: scaffolded in Google AI Studio Build Mode,
now developed locally. Deploys to Cloud Run.

## How it runs
`server.ts` is the entrypoint: in dev it serves Vite middleware; in prod it serves the built
`dist/` and the API routes. Build bundles the client (`vite build`) and the server
(`esbuild server.ts --format=cjs --outfile=dist/server.cjs`).

| Command | Purpose |
|---|---|
| `npm run dev` | Dev server (`tsx server.ts`), port 8080 |
| `npm run build` | Build client + server into `dist/` (reads `.env`) |
| `npm start` | Run built server (`node dist/server.cjs`) |
| `npm run lint` | Type-check (`tsc --noEmit`) |

Reproduce the prod container locally: `NODE_ENV=production PORT=8137 node dist/server.cjs`.

## Environment
Copy `.env.example` → `.env` (gitignored). `VITE_FIREBASE_*` are **public by design**
(safe in the client bundle). `GEMINI_API_KEY` is a **real secret** — server-side only; without
it the AI endpoints return deterministic **simulated** output (the app still works for demos).
`VITE_GOOGLE_MAPS_API_KEY` is baked in at build time (pass as Docker `--build-arg` for deploy).

## Key files
- `server.ts` — Express + API: `/api/triage` (Gemini Vision classify), `/api/agent/resolve`
  (Agentic Resolution Layer), `/api/maps-config`. Both AI routes degrade gracefully without a key.
- `src/context/AppContext.tsx` — global state, Firestore sync, `createIssueReport`,
  `upvoteIssue`, `updateIssueStatus`, `resolveIssuePlan` (gathers nearby issues, calls the agent).
- `src/components/IssueDetailPage.tsx` — issue detail + the **AI Action Plan** card.
- `src/components/{ReportIssueForm,CommunityFeed,CivicMap}.tsx` — intake, feed, map.
- `src/lib/firebase.ts` — Firebase init from `import.meta.env.VITE_FIREBASE_*`.
- `src/types.ts` — `CivicIssue`, `AgentPlan`, etc.
- `Dockerfile` — Cloud Run build (Vite client + CJS server).

## Gotchas (do not regress)
- `server.ts` MUST read `process.env.PORT` (Cloud Run injects it). Never hardcode the port.
- Do NOT use `import.meta.url`/`fileURLToPath` in `server.ts` — it bundles to CommonJS where
  `import.meta.url` is undefined and crashes startup. Use `process.cwd()`.
- Firebase web API keys are public; never treat them as secrets. The real secret is `GEMINI_API_KEY`.

## Current blockers (need the human — see docs/status.md)
1. **Firebase**: Anonymous Auth is DISABLED in project `neon-mountain-nwrl4` → the app cannot
   create users/reports until enabled. Console → Authentication → enable Anonymous; set
   Firestore + Storage rules (read public, write requires auth). Confirm with
   `node scripts/verify-agent-flow.mjs` (checks auth → Firestore write → agent endpoint).
2. **Deploy**: needs `gcloud auth login` + a billed GCP project, then
   `gcloud run deploy --source .` with the `VITE_*` build args. Dockerfile is ready.

## Next planned work
Step 5 — impact dashboard + predictive hotspots. Step 6 — move points to Firestore + real
leaderboard. Full plan in `docs/plan.md`; decisions in `docs/decisions.md`; lessons in
`docs/lessons.md`; **submission rules + checklist in `docs/submission.md`**.

## Verification
`node scripts/verify-agent-flow.mjs` — checks Anonymous Auth → authenticated Firestore write →
local agent endpoint, printing PASS/FAIL with the exact fix for whatever is blocked.

## Workflow
Plan before executing, keep `docs/` current (status, changelog, decisions, lessons), run
`npm run lint` + `npm run build` before declaring work done, format with Prettier.
