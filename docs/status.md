# Status — Community Hero (civichero)

**Last updated:** 2026-06-30 (end-of-session handoff)
**Deadline:** 2026-06-30 23:59 (hard).
**Live URL:** https://civichero-1051965377286.asia-south1.run.app ✅
**Repo:** https://github.com/Nivish-21/civichero (public) ✅
**Local:** /Users/nivish/development/civichero
**Branch:** main (clean, pushed)

> **Next agent: read this file first, then `docs/plan.md`, then `CLAUDE.md`.**

---

## ⚡ HANDOFF — TWO TASKS REMAIN BEFORE DEADLINE

**The app is fully built, deployed, and E2E verified. Only submission paperwork is left.**

### Task A — Google Doc (HUMAN must do this, agent cannot)
Create a Google Doc describing the project and share it publicly ("Anyone with the link can view").
Contents to include:
1. **Title:** Community Hero — Hyperlocal Civic Issue Reporting Platform
2. **Problem:** Citizens have no easy way to report and track local civic issues (potholes, broken lights, etc.)
3. **Solution:** Mobile-first app — photograph issue → Gemini Vision triages it → AI agent plans resolution → 3-role system (citizen/cleaner/admin) closes the loop with community verification
4. **Agentic flow (key judging criterion — 20%):**
   - `/api/triage` — Gemini Vision classifies photo: category, severity, one-line summary
   - `/api/agent/resolve` — routes to authority, detects duplicates (haversine ≤500m), scores priority, sets SLA, drafts complaint letter
   - `/api/verify-completion` — Gemini Vision checks cleaner's before/after photo for genuine resolution
5. **Tech stack:** React 19 + Vite 6 + TypeScript, Express, Firebase (Auth/Firestore/Storage), Gemini 2.5 Flash, Google Maps, Cloud Run
6. **Live link:** https://civichero-1051965377286.asia-south1.run.app
7. **GitHub:** https://github.com/Nivish-21/civichero
8. **Self-score:** Problem Solving 18/20, Agentic Depth 18/20, Innovation 17/20, Google Tech 13/15, Design 8/10, Tech 9/10, Completeness 5/5

Once created, copy the share link (should look like `https://docs.google.com/document/d/.../edit?usp=sharing`).

### Task B — Final Submit on BlockseBlock (HUMAN must do this — irreversible)
Go to the BlockseBlock hackathon portal → Track 2 ("Community Hero") → submit with:
- **Live URL:** https://civichero-1051965377286.asia-south1.run.app
- **GitHub repo:** https://github.com/Nivish-21/civichero
- **Google Doc:** (the link from Task A)

Verify all three links open before hitting submit. Submission is irreversible.

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

## Step 6 — DEPLOYED ✅ (2026-06-30)

- **latest revision:** civichero-00010-nh5 (next build will be 00011 with Firestore fix)
- **Maps key:** baked into bundle (confirmed via curl grep)
- **Gemini AI:** live — `/api/agent/resolve` returns real authority routing + SLA
- **Root cause note (maps):** Cloud Run ignores `cloudbuild.yaml` build-args; fix was baking public VITE_ vars directly as Dockerfile ARG defaults

### Bug fixes applied this session — ALL CONFIRMED ✅
| Bug | Root cause | Fix | Verified |
|-----|-----------|-----|---------|
| "Publishing..." stuck forever | `uploadString` no timeout; `storage.rules` missing so uploads blocked | `withTimeout(8s)` + `compressToThumbnail` fallback; deployed `storage.rules` | ✅ |
| "Failed to save issue report" | `videoUrl: videoUrl \|\| undefined` → Firestore rejects literal `undefined` | `...(videoUrl ? { videoUrl } : {})` — omit field when empty | ✅ E2E passed |

**E2E test result (2026-06-30):** Full submission flow confirmed on live revision.
- Step 1 (Upload Media) → photo + notes ✅
- Step 2 (Pin Location) → Google Maps + GPS coords ✅
- Step 3 (AI Verification) → Gemini classified "Pothole / Medium" ✅
- "File Official Report" → Firestore write succeeded ✅
- Achievement unlocked: "First Step" +50 XP, badge → "Active Patrol" ✅
- "Report Published Successfully!" screen shown ✅

## Remaining (deadline: 23:59 today)

1. **[DONE]** E2E test — confirmed working on live URL
2. **[NEXT — USER ACTION]** Google Doc — create + share publicly (requires your Google account)
3. **[FINAL — IRREVERSIBLE]** BlockseBlock → Track 2 → paste three links → submit

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
- [x] Live Cloud Run URL: https://civichero-1051965377286.asia-south1.run.app
- [x] Public GitHub repo: https://github.com/Nivish-21/civichero
- [ ] Project-description Google Doc (link-shared publicly) — **USER MUST CREATE**
- [ ] Final Submit on BlockseBlock (irreversible — verify all three links first)
