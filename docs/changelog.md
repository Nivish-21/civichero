# Changelog

## 2026-06-26
- **docs/**: Created plan.md, decisions.md, status.md, changelog.md.
  - Read hackathon brief, recorded constraints + evaluation matrix.
  - Chose Track 2 (Community Hero); locked Next.js + Genkit + Gemini + Cloud Run architecture.
  - Why: maximise Agentic Depth (20%) + Innovation (20%) + Google tech (15%) within 3-day window.
- **Scaffold (later reverted)**: built local Next.js 16 + Genkit app with health/ping smoke-test
  routes + Dockerfile. Verified build + local run. NOT pushed to any remote.
- **Pivot (D4)**: after reading the AI Studio deploy doc, switched origin to **AI Studio Build Mode**
  (React + Firebase + Gemini + Maps), free Starter-tier Cloud Run deploy, GitHub export.
  Next.js scaffold superseded. Why: matches mandated Google Cloud deploy + mentor guidance, removes
  the GCP billing blocker, scores higher on Usage of Google Technologies.

## 2026-06-26 (cont.) — civichero (AI Studio export, local dev)
- **Fixed Cloud Run deploy** (server.ts): read process.env.PORT; removed
  import.meta.url/fileURLToPath CJS startup crash. Verified prod start locally.
- **Pushed public repo**: github.com/Nivish-21/civichero. Added Dockerfile + .dockerignore.
- **Step 4 — Agentic Resolution Layer** (the 40% differentiator):
  - /api/agent/resolve (Gemini, structured output) + deterministic simulation fallback.
  - resolveIssuePlan() in AppContext (nearby via haversine <=500m) persists agentPlan.
  - "AI Action Plan" card on IssueDetailPage: authority, priority gauge, duplicate flag,
    recommended actions, copyable draft complaint.
  - Files: server.ts, src/types.ts, src/context/AppContext.tsx, src/components/IssueDetailPage.tsx.
- **Found (user action): Firebase Anonymous Auth disabled** in project neon-mountain-nwrl4 →
  app can't create users/reports until enabled in console. Firestore rules also block reads
  without auth. Must fix before the live app works.

## 2026-06-26 (cont.) — handoff hardening
- **Security audit**: scanned working tree + full git history. No real secret ever committed
  (Gemini key only ever a placeholder). Only the Firebase WEB api key was present (public by design).
- **Firebase config → env vars**: `src/lib/firebase.ts` now reads `VITE_FIREBASE_*`; added
  `src/vite-env.d.ts` typings; removed `firebase-applet-config.json` and **purged it from git
  history** (git-filter-repo) + force-pushed. Local `.env` (gitignored) holds the public values.
- **.gitignore** hardened (env/secrets/build/editor). **.env.example** rewritten with all vars.
- **Dockerfile**: added `VITE_FIREBASE_*` build args (Vite bakes them at build time).
- **Agent docs**: added root `CLAUDE.md` + `AGENTS.md`. Rewrote `docs/status.md` as the resume
  source of truth.
- Verified: `npm run lint` + `npm run build` green; Firebase config injected from `.env` into bundle.

## 2026-06-26 (cont.) — neat handoff: plan, submission, verify script
- Rewrote docs/plan.md clean (removed superseded Next.js/Genkit cruft; reflects real progress).
- Added docs/submission.md — binding submission rules, deliverables, evaluation matrix,
  BlockseBlock steps, pre-submit checklist.
- Added scripts/verify-agent-flow.mjs — verifies Anonymous Auth → Firestore write → agent
  endpoint. Currently reports the live blocker: Anonymous Auth DISABLED.
- Confirmed (REST probe) Anonymous Auth still disabled (ADMIN_ONLY_OPERATION) — cannot be
  enabled without project credentials; documented the 1-step fix.
- CLAUDE.md + status.md reference the verify script + submission doc.
