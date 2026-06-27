# Status — Community Hero (civichero)

**Last updated:** 2026-06-27
**Deadline:** 2026-06-30 23:59 (hard).
**Repo:** https://github.com/Nivish-21/civichero (public)
**Local:** /Users/nivish/development/civichero
**Branch:** main (clean, pushed)

> **Next agent: read this file first, then `docs/plan.md`, then `CLAUDE.md`.**

---

## What's fully done

### Core platform (Steps 1–4)
- React 19 + Vite 6 + TypeScript + Tailwind 4 SPA + Express `server.ts` in one repo
- Firebase Anonymous Auth (enabled), Firestore (rules deployed), Storage (needs Blaze to activate)
- Gemini Vision triage (`/api/triage`) + Agentic Resolution Layer (`/api/agent/resolve`) — both
  degrade gracefully to simulated output without a `GEMINI_API_KEY`
- Google Maps integration (needs `VITE_GOOGLE_MAPS_API_KEY` at build time)
- "AI Action Plan" card on IssueDetailPage — authority routing, priority, SLA, duplicate detection,
  draft complaint
- `node scripts/verify-agent-flow.mjs` → PASS (anon auth → Firestore write → agent endpoint)

### Step 5 — 3-Role System + Gamification (2026-06-27, PUSHED to GitHub)
**Roles:** `citizen` (default) | `cleaner` (enters `VITE_CLEANER_CODE`) | `admin` (`VITE_ADMIN_UID`)

**Resolution flow:**
Reported → Acknowledged (3+ upvotes OR admin override) → Claimed (cleaner takes it) →
Pending Verification (cleaner uploads proof + Gemini checks it) →
Resolved (≥2 clean votes) OR back to Acknowledged (≥2 dirty votes)

**What shipped:**
- `src/types.ts` — `UserRole`, full `IssueStatus` set, `UserProfile` (xp/role/achievements/counts), `AchievementId`
- `src/lib/achievements.ts` — 10 achievements, XP rewards, `checkNewAchievements()`
- `src/context/AppContext.tsx` — `claimIssue`, `submitCompletionPhoto`, `verifyResolution`, `upgradeToCleanerRole`, leaderboard onSnapshot (top-20 by XP), `pendingAchievement` queue, in-memory rate limiting (8/hr + exponential cooldown)
- `server.ts` — `/api/verify-completion` (Gemini Vision completion check + simulated fallback), rate limiting, validation hardening
- `src/components/AchievementModal.tsx` — spring-animated unlock overlay
- `src/components/Leaderboard.tsx` — dual-tab (XP / report count), medals for top 3, role badges
- `src/components/VerificationPrompt.tsx` — before/after photos + AI summary + vote UI (citizens only)
- `src/components/RoleSelector.tsx` — citizen → cleaner code entry (amber UI, leaderboard tab)
- `src/components/CleanerPanel.tsx` — claim / upload proof / pending / claimed-by-other states
- `src/components/IssueDetailPage.tsx` — 5-step progress stepper, role-gated panels
- `src/App.tsx` — 4-tab nav (Issues / Map / Report / Leaderboard), XP display, role badge, UID copy helper, `AchievementModal` global overlay
- `.env.example` — `VITE_ADMIN_UID`, `VITE_CLEANER_CODE=CLEAN2026`, `VITE_VERIFY_THRESHOLD=2`
- `firestore.rules` + `firebase.json` — added to repo; rules allow cross-user XP writes
- `npm run lint` (tsc --noEmit) ✅  `npm run build` ✅

---

## BLOCKED ON HUMAN — DO THIS FIRST

**Enable Blaze billing** on Firebase project `civichero-84074`. This is the single gate.

> Firebase console → project `civichero-84074` → Spark plan badge (bottom-left) → Upgrade to Blaze → add payment method → set a $5 budget alert.

Once done, verify with:
```
gcloud billing projects describe civichero-84074
```
`billingEnabled: true` means the agent can proceed with deployment.

---

## Next agent's task list (in order)

1. **Confirm billing** — run the gcloud billing check above. If not enabled, stop and tell the user.
2. **Deploy to Cloud Run** — see `docs/plan.md` Step 6 for the exact `gcloud run deploy` command.
   All `VITE_*` values are in the local `.env` file. `GEMINI_API_KEY` is also in `.env`.
3. **Set admin UID** — after first deploy, open the live URL, log in, copy the UID from the header
   (tiny clipboard icon next to XP), add `VITE_ADMIN_UID=<uid>` to `.env`, redeploy.
4. **Design polish** — invoke the `impeccable` skill (mandatory per CLAUDE.md for all UI work).
   Focus on mobile layout: IssueDetailPage panels, AchievementModal, CommunityFeed card hierarchy.
5. **README.md** — one-pager: what it is, run locally, deploy, env vars table.
6. **Google Doc** — project description with agent flow, tech stack, self-scored eval matrix, links.
7. **Final Submit** — BlockseBlock → Track 2 → paste three links → submit. IRREVERSIBLE.

---

## Environment / ops notes
- `.env` is local and gitignored. All `VITE_FIREBASE_*` values are already set there.
- `GEMINI_API_KEY` is in `.env` (without it: simulated AI, app still works, judges see "Demo mode").
- `VITE_GOOGLE_MAPS_API_KEY` is missing — map renders disabled state; add it if available.
- `VITE_CLEANER_CODE=CLEAN2026` (default in `.env.example` — set in `.env` if not already).
- `VITE_VERIFY_THRESHOLD=2` — 2 matching citizen votes to resolve/reject.
- Don't leave a backgrounded `node dist/server.cjs &` running — it keeps the shell alive.
- `UID` is a read-only special var in zsh — use a different name in scripts.
- Firebase Rules API needs `x-goog-user-project: civichero-84074` header with gcloud token.

## Deliverable checklist (before Final Submit)
- [ ] Live Cloud Run URL (public, stable through judging)
- [x] Public GitHub repo: https://github.com/Nivish-21/civichero
- [ ] Project-description Google Doc (link-shared publicly)
- [ ] Final Submit on BlockseBlock (irreversible — verify all three links first)
