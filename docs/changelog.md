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

## 2026-06-27 — Step 5: 3-Role System + Gamification

**src/types.ts** — Added `UserRole`, extended `IssueStatus` with "Claimed"/"Pending Verification",
  `UserProfile` (xp, role, achievements, reportCount, cleanedCount, verifyCount), `AchievementId`,
  `verificationVotes`/`verificationThreshold`/`claimedByUid`/`completionPhotoUrl` on `CivicIssue`.

**src/lib/achievements.ts** (new) — 10 achievement definitions with XP rewards; `checkNewAchievements()`;
  `hasAchievement()`; `totalXpForAchievements()`.

**src/context/AppContext.tsx** — `claimIssue` (Acknowledged→Claimed, XP award), `submitCompletionPhoto`
  (base64→server→Gemini verify→Pending Verification, XP), `verifyResolution` (citizen vote→Resolved or
  back to Acknowledged), `upgradeToCleanerRole` (code check→Firestore role update), leaderboard
  onSnapshot (top-20 by XP), `pendingAchievement` queue, in-memory rate limiting (8/hr + exponential
  cooldown). Firestore `users/{uid}` stores UserProfile; cross-user XP via `increment()`.

**src/components/AchievementModal.tsx** (new) — Spring-animated overlay (scale + translate) on
  `pendingAchievement` state; dismisses on backdrop or button click.

**src/components/Leaderboard.tsx** (new) — Two-tab (XP Leaders / Top Reporters) leaderboard; top-3
  medals; role badges; sorted client-side from context state.

**src/components/VerificationPrompt.tsx** (new) — Citizens see before/after photos + AI summary + vote
  tally + "It's Clean / Still Dirty" buttons on Pending Verification issues. De-duplication via
  `verificationVotes` arrays + local `voted` state.

**src/components/RoleSelector.tsx** (new) — Citizens enter cleaner code to upgrade role; amber UI;
  success/error/loading states.

**src/components/CleanerPanel.tsx** (new) — 4-state panel for cleaners: claim unclaimed issues, upload
  proof photo (FileReader→base64→submitCompletionPhoto), track pending verification, see "claimed by
  other" message. FileRef reset so same file can be re-selected.

**src/components/IssueDetailPage.tsx** — 5-step progress stepper (Reported/Acknowledged/Claimed/Pending
  Verification/Resolved) with `statusIndexMap` for legacy "In Progress" status. Role-gated panels:
  admin sees "Admin Override" button, cleaners see CleanerPanel, citizens see VerificationPrompt.

**src/App.tsx** — Rewritten: 4-tab nav (Issues Feed / Map / Report / Leaderboard), XP display in
  header (not points), role badge (Admin/Cleaner), UID copy helper for admin setup, `AchievementModal`
  global overlay, `getCitizenLevel()` uses XP thresholds, `RoleSelector` in Leaderboard tab.

**.env.example** — Added `VITE_ADMIN_UID`, `VITE_CLEANER_CODE` (default: CLEAN2026),
  `VITE_VERIFY_THRESHOLD` (default: 2).

Build: `npm run lint` (tsc) + `npm run build` — both pass clean.

## 2026-06-26 (cont.) — new Firebase project + agent flow VERIFIED
- AI Studio Starter project `neon-mountain-nwrl4` is a managed sandbox (no owner rights) — abandoned.
- Created owned project `civichero-84074`; `.env` repointed (config now in env vars, so it was a
  drop-in swap). Enabled Anonymous Auth; deployed Firestore rules (public read, auth write) via
  the Firebase Rules API (needs `x-goog-user-project` header + gcloud token).
- `scripts/verify-agent-flow.mjs` runs GREEN: anon auth → Firestore write → agent endpoint.
- Storage deferred (needs Blaze); app falls back to inline base64. Deploy deferred (needs billing).
- Updated CLAUDE.md + docs/status.md for handoff. gcloud authed as nivishnick2004.
