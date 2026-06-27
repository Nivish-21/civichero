# CLAUDE.md — Community Hero (civichero)

Agent context for this repo. **Read `docs/status.md` first — it has the live handoff state.**
Then read `docs/plan.md` for the ordered task list.

## What this is
Track 2 ("Community Hero — Hyperlocal Problem Solver") submission for the BlockseBlock
hackathon. **Hard deadline: 2026-06-30 23:59.** A mobile-first civic issue reporting platform:
citizens photograph a local problem, Gemini Vision triages it, an agent plans its resolution,
and a 3-role system (citizen / cleaner / admin) closes the loop with community verification.

Mandatory deliverables: live link on **Google Cloud (Cloud Run)**, public GitHub repo, project
Google Doc. Judged on: Problem-Solving 20, **Agentic Depth 20**, **Innovation 20**, Google Tech 15,
Design 10, Tech 10, Completeness 5. The 40% on Agentic Depth + Innovation is the north star.

## Stack
React 19 + Vite 6 + TypeScript + Tailwind 4 (client, `src/`) and an Express server
(`server.ts`) in one app. Firebase (Auth + Firestore + Storage), Gemini via `@google/genai`,
Google Maps via `@vis.gl/react-google-maps`. Deploys to Cloud Run.

## How it runs
`server.ts` is the entrypoint: in dev it serves Vite middleware; in prod it serves the built
`dist/` and the API routes.

| Command | Purpose |
|---|---|
| `npm run dev` | Dev server (`tsx server.ts`), port 8080 |
| `npm run build` | Build client + server into `dist/` (reads `.env`) |
| `npm start` | Run built server (`node dist/server.cjs`) |
| `npm run lint` | Type-check (`tsc --noEmit`) |

Reproduce the prod container locally: `NODE_ENV=production PORT=8137 node dist/server.cjs`.

## Environment
Copy `.env.example` → `.env` (gitignored). `.env` is already populated locally.

| Var | Type | Notes |
|---|---|---|
| `VITE_FIREBASE_*` | public | Safe in client bundle. Already set in `.env`. |
| `GEMINI_API_KEY` | **secret** | Server-side only. Without it: simulated AI (app still works). |
| `VITE_GOOGLE_MAPS_API_KEY` | build-time | Baked in at `vite build`. Map shows disabled without it. |
| `VITE_ADMIN_UID` | build-time | Firebase UID of the admin user. Set after first login. |
| `VITE_CLEANER_CODE` | build-time | Code cleaners enter to unlock cleaner role. Default: `CLEAN2026`. |
| `VITE_VERIFY_THRESHOLD` | build-time | Citizen votes needed to resolve/reject. Default: `2`. |

## Key files
- `server.ts` — `/api/triage` (Gemini Vision), `/api/agent/resolve` (Agentic Resolution Layer),
  `/api/verify-completion` (completion photo verification), `/api/maps-config`. Rate limiting.
- `src/context/AppContext.tsx` — all global state + Firestore sync. Key functions:
  `createIssueReport`, `upvoteIssue`, `updateIssueStatus`, `resolveIssuePlan`, `claimIssue`,
  `submitCompletionPhoto`, `verifyResolution`, `upgradeToCleanerRole`.
- `src/lib/achievements.ts` — 10 achievements, XP defs, `checkNewAchievements()`.
- `src/types.ts` — `CivicIssue`, `AgentPlan`, `UserProfile`, `UserRole`, `AchievementId`, etc.
- `src/components/IssueDetailPage.tsx` — 5-step progress stepper + AI Action Plan + role panels.
- `src/components/{AchievementModal,Leaderboard,VerificationPrompt,RoleSelector,CleanerPanel}.tsx`
- `src/components/{ReportIssueForm,CommunityFeed,CivicMap}.tsx` — intake, feed, map.
- `src/lib/firebase.ts` — Firebase init from `import.meta.env.VITE_FIREBASE_*`.
- `Dockerfile` — Cloud Run build (Vite client + CJS server).
- `firestore.rules` + `firebase.json` — Firestore security rules (in repo).
- `scripts/verify-agent-flow.mjs` — smoke test: anon auth → Firestore write → agent endpoint.

## Gotchas (do not regress)
- `server.ts` MUST read `process.env.PORT` (Cloud Run injects it). Never hardcode the port.
- Do NOT use `import.meta.url`/`fileURLToPath` in `server.ts` — it bundles to CommonJS where
  `import.meta.url` is undefined and crashes startup. Use `process.cwd()`.
- Firebase web API keys are public; never treat them as secrets. The real secret is `GEMINI_API_KEY`.
- `UID` is a read-only special var in zsh — use a different name in scripts.
- Rate limiting is in-memory on the server — it resets on restart. That's intentional.
- `VITE_ADMIN_UID` can't be known before the first deploy; set it after the first login and redeploy.

## 3-Role system (Step 5 — SHIPPED)
- **citizen** — default. Can report, upvote, vote on verification.
- **cleaner** — enters `VITE_CLEANER_CODE` in the Leaderboard tab → role saved to Firestore.
  Can claim Acknowledged issues, upload completion photos, earn cleanup XP.
- **admin** — Firebase UID matches `VITE_ADMIN_UID` build-time env. Can override status on any issue.

Resolution flow: Reported → Acknowledged (3+ upvotes OR admin) → Claimed (cleaner) →
Pending Verification (Gemini Vision checks cleaner's photo) →
Resolved (≥2 citizen clean votes) OR Acknowledged (≥2 dirty votes, claim cleared).

## Firebase (DONE)
Owned project `civichero-84074`. Anonymous Auth enabled. Firestore rules deployed.
`scripts/verify-agent-flow.mjs` → PASS.
**Needs Blaze billing to activate Storage + Cloud Run deploy.**

## Current blocker
**Blaze billing not yet enabled on `civichero-84074`.** The human is enabling it.
Once `gcloud billing projects describe civichero-84074` returns `billingEnabled: true`,
the agent can deploy autonomously. See `docs/plan.md` Step 6 for the exact command.

## Workflow
Read `docs/status.md` → read `docs/plan.md` → execute next unchecked step.
Keep `docs/` current (status, changelog, decisions, lessons).
Run `npm run lint` + `npm run build` before declaring any code work done.
Use the `impeccable` skill for ALL UI/design work — mandatory per global CLAUDE.md.
