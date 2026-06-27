# Status — Community Hero (civichero)

**Last updated:** 2026-06-27
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

## Step 5 — COMPLETE (2026-06-27)
3-Role system + gamification shipped and build-verified:

**Roles:** citizen (default) | cleaner (`VITE_CLEANER_CODE`) | admin (`VITE_ADMIN_UID`)

**Resolution flow:** Reported → Acknowledged (3+ upvotes OR admin) → Claimed (cleaner) →
Pending Verification (cleaner uploads proof + Gemini verifies) → Resolved (2 clean votes) OR
back to Acknowledged (2 dirty votes).

**Files changed:**
- `src/types.ts` — `UserRole`, `IssueStatus` (Claimed / Pending Verification), `UserProfile` (xp, achievements, role)
- `src/lib/achievements.ts` — 10 achievements, XP reward defs, `checkNewAchievements()`
- `src/context/AppContext.tsx` — `claimIssue`, `submitCompletionPhoto`, `verifyResolution`, `upgradeToCleanerRole`, leaderboard subscription, `pendingAchievement`, rate limiting
- `src/components/AchievementModal.tsx` — animated unlock overlay
- `src/components/Leaderboard.tsx` — XP + report-count dual-tab leaderboard
- `src/components/VerificationPrompt.tsx` — before/after photo + community vote UI
- `src/components/RoleSelector.tsx` — citizen → cleaner upgrade via code
- `src/components/CleanerPanel.tsx` — claim / upload proof / pending states
- `src/components/IssueDetailPage.tsx` — 5-step progress stepper, role-gated panels
- `src/App.tsx` — 4-tab nav (Leaderboard tab), XP display, role badge, `AchievementModal` overlay
- `.env.example` — `VITE_ADMIN_UID`, `VITE_CLEANER_CODE`, `VITE_VERIFY_THRESHOLD`

## Remaining work (priority order)
1. **Live AI:** put a real `GEMINI_API_KEY` in `.env`. Without it: simulated triage + simulated completion verification.
2. **Maps:** add `VITE_GOOGLE_MAPS_API_KEY` to `.env` (build-time).
3. **Storage:** needs Blaze plan — app falls back to inline base64 in Firestore (watch 1 MiB limit).
4. **Deploy to Cloud Run:** `gcloud run deploy civichero --source . --region asia-south1 --allow-unauthenticated`
   Pass `VITE_FIREBASE_*` + `VITE_CLEANER_CODE` + `VITE_ADMIN_UID` + `VITE_VERIFY_THRESHOLD` as build args;
   `GEMINI_API_KEY` as runtime secret.
5. **Admin setup:** after first deploy, copy your UID from the app header → set `VITE_ADMIN_UID` → rebuild.
6. **Design polish + README + Google Doc** → then Final Submit.
7. **Submit** — see `docs/submission.md`.

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
