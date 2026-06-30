# Status — Community Hero (civichero)

**Last updated:** 2026-06-30
**Deadline:** 2026-06-30 23:59 (hard).
**Live URL:** https://civichero-1051965377286.asia-south1.run.app ✅
**Repo:** https://github.com/Nivish-21/civichero (public) ✅
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

## Step 6 — DEPLOYED ✅ (2026-06-30)

- **latest revision:** civichero-00010-nh5 (next build will be 00011 with Firestore fix)
- **Maps key:** baked into bundle (confirmed via curl grep)
- **Gemini AI:** live — `/api/agent/resolve` returns real authority routing + SLA
- **Root cause note (maps):** Cloud Run ignores `cloudbuild.yaml` build-args; fix was baking public VITE_ vars directly as Dockerfile ARG defaults

### Bug fixes applied this session
| Bug | Root cause | Fix |
|-----|-----------|-----|
| "Publishing..." stuck forever | `uploadString` no timeout; `storage.rules` missing so uploads blocked | `withTimeout(8s)` + `compressToThumbnail` fallback; deployed `storage.rules` |
| "Failed to save issue report" | `videoUrl: videoUrl \|\| undefined` → Firestore rejects literal `undefined` | `...(videoUrl ? { videoUrl } : {})` — omit field when empty |

**Status:** fix committed locally, needs `npm run lint` + build + redeploy.

## Remaining (deadline: 23:59 today)

1. **[NEXT]** `npm run lint` + `npm run build` → redeploy to Cloud Run → end-to-end test
2. **Google Doc** — create + share publicly (user must do this — requires Google account)
3. **Final Submit** — BlockseBlock → Track 2 → paste three links → submit. IRREVERSIBLE.

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
