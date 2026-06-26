# Status — Community Hero (civichero)

**Last updated:** 2026-06-26
**Deadline:** 2026-06-29 14:00 (hard).
**Repo:** https://github.com/Nivish-21/civichero (public)
**Local:** /Users/nivish/development/civichero

> Single source of truth for resuming. Read CLAUDE.md for architecture/commands.

## Where we are
- **Track 2 — Community Hero.** App scaffolded in AI Studio Build Mode, exported here, now
  developed locally. React + Vite + Express + Firebase + Gemini + Maps → deploys to Cloud Run.
- **Builds and runs.** `npm run build` + prod start verified locally on an injected PORT.
- **Cloud Run deploy bugs fixed** (server.ts: `process.env.PORT`; removed CJS `import.meta.url`
  crash). Dockerfile ready.
- **Step 4 (Agentic Resolution Layer) shipped** — `/api/agent/resolve`: routes to authority,
  detects duplicates, scores priority + SLA, drafts a complaint, recommends actions. "AI Action
  Plan" card on the issue detail page. Degrades to simulated output without a Gemini key.
- **Security pass done.** No real secret was ever committed (Gemini key never in repo). Firebase
  web config moved to `VITE_FIREBASE_*` env vars; `firebase-applet-config.json` removed and
  purged from git history. `.gitignore` hardened.

## Two blockers — need the human (nothing else is blocked on code)
1. **Firebase (app is non-functional until done).** Anonymous Auth is DISABLED in project
   `neon-mountain-nwrl4`. In console.firebase.google.com → that project:
   - Authentication → Sign-in method → **enable Anonymous**.
   - Firestore → Rules: `match /issues/{id} { allow read: if true; allow create, update: if request.auth != null; }`
   - Storage → Rules: under `match /issues/{p=**}` → `allow read: if true; allow write: if request.auth != null;`
   - (Hygiene) restrict the Firebase web API key in GCP console.
2. **Deploy to Cloud Run.** `gcloud auth login` + a billed GCP project (new accounts get $300
   free; Cloud Run free tier ≈ $0). Then:
   `gcloud run deploy civichero --source . --region asia-south1 --allow-unauthenticated`
   passing `--build-arg`/substitutions for the `VITE_FIREBASE_*` + `VITE_GOOGLE_MAPS_API_KEY`,
   and set `GEMINI_API_KEY` as a runtime env/secret.

## Verify the agent end-to-end (do once Firebase Auth + rules are set)
Run `node scripts/verify-agent-flow.mjs` — it checks Anonymous Auth → authenticated Firestore
write → the local agent endpoint and prints PASS/FAIL with the exact fix. Today it reports
"Anonymous Auth is DISABLED" (the current blocker). After enabling auth + rules, start the app
(`NODE_ENV=production PORT=8137 node dist/server.cjs`) and re-run for a full green; then click
through in the browser: report → open issue → "Generate AI Action Plan".

## Next planned work (see docs/plan.md)
- Step 5 — impact dashboard + predictive hotspots.
- Step 6 — move points from localStorage to Firestore; real cross-user leaderboard.
- Polish: impeccable design pass; README; project-description Google Doc; restrict Firebase rules.

## Deliverable checklist (before Final Submit — irreversible)
- [ ] Live Cloud Run link (public, stays up through judging).
- [x] Public GitHub repo.
- [ ] Project-description Google Doc (problem, solution, features, tech, Google tech) — link-shared.
- [ ] Submit via BlockseBlock → select Track 2 → paste links → Final Submit.

## Risks
- Irreversible Final Submit — verify all 3 links live first.
- Firebase rules: keep writes auth-gated (not wide open).
- Mentor session (24 Jun) passed; check BlockseBlock for a recording with judge hints.
