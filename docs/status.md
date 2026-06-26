# Status — Community Hero (civichero)

**Last updated:** 2026-06-26
**Deadline:** 2026-06-29 14:00 (hard).
**Repo:** https://github.com/Nivish-21/civichero (public)
**Local:** /Users/nivish/development/civichero

> Resume here. Read CLAUDE.md for architecture/commands. The agent flow is VERIFIED green.

## VERIFIED working (this session)
- New **owned** Firebase project **`civichero-84074`** (the old AI Studio `neon-mountain-nwrl4`
  was a managed Starter-Tier sandbox — no owner rights, abandoned).
- **Anonymous Auth enabled**, **Firestore rules deployed** (public read, auth-gated write on
  `issues`). `.env` (gitignored) points at the new project.
- **`node scripts/verify-agent-flow.mjs` → all green**: anon auth → Firestore write → agent
  endpoint (`/api/agent/resolve` routes to authority, scores priority/SLA). Simulated output
  until a Gemini key is set.
- gcloud is authenticated as `nivishnick2004@gmail.com`, project set to `civichero-84074`.

## How the new session starts
1. `cd /Users/nivish/development/civichero`; read CLAUDE.md.
2. `.env` is already set (local, gitignored). `npm install` if needed, `npm run build`.
3. Re-verify any time: start app (`NODE_ENV=production PORT=8137 node dist/server.cjs`) then
   `node scripts/verify-agent-flow.mjs`.

## Remaining work (priority order)
1. **Live AI (optional but recommended):** put a real `GEMINI_API_KEY` in `.env` to replace the
   simulated triage/agent output. Without it the app still works (simulated).
2. **Browser click-through** (not done this session): submit a report → open it → "Generate AI
   Action Plan" → confirm the card renders. A demo issue was being seeded via Firestore REST;
   finish that or just use the report form in the running app.
3. **Maps:** add `VITE_GOOGLE_MAPS_API_KEY` to `.env` (build-time) for the live map.
4. **Storage:** needs the **Blaze (paid) plan** — currently the app falls back to inline base64
   in Firestore (works for small images; watch the 1 MiB doc limit). Upgrade to Blaze for real
   Storage (also needed for Cloud Run billing).
5. **Deploy to Cloud Run:** project needs billing (Blaze). Then
   `gcloud run deploy civichero --source . --region asia-south1 --allow-unauthenticated`
   passing the `VITE_FIREBASE_*` (+ `VITE_GOOGLE_MAPS_API_KEY`) build args and `GEMINI_API_KEY`
   as a runtime env/secret. Dockerfile is ready.
6. **Step 5** — impact dashboard + predictive hotspots. **Step 6** — points to Firestore +
   leaderboard. Then design polish (impeccable), README, project-description Google Doc.
7. **Submit** — see `docs/submission.md` (checklist + BlockseBlock steps; irreversible Final Submit).

## Notes / gotchas (operational)
- Don't leave a backgrounded server (`node dist/server.cjs &`) running at the end of a shell
  command — it keeps the command alive and hits the 2-min timeout. Start+test+kill in one
  command, or use a real background runner.
- `UID` is a read-only special var in zsh — use a different name when seeding Firestore.
- Firebase Rules API needs the `x-goog-user-project: civichero-84074` header with a gcloud token.

## Deliverable checklist (before Final Submit)
- [ ] Live Cloud Run link (public, stable).
- [x] Public GitHub repo.
- [ ] Project-description Google Doc (link-shared).
- [ ] BlockseBlock → Track 2 → paste links → Final Submit.
