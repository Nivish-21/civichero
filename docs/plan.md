# Plan — Community Hero (civichero)

BlockseBlock hackathon, Track 2. **Deadline: 2026-06-29 14:00.** Live state in `docs/status.md`;
decisions in `docs/decisions.md`; submission steps in `docs/submission.md`.

## Goal
A functional, visibly *agentic*, Google-Cloud-deployed civic issue platform that scores on the
evaluation matrix — especially the 40% on Agentic Depth + Innovation.

## Evaluation matrix (drives priorities)
| Criterion | Weight |
|---|---|
| Problem Solving & Impact | 20% |
| **Agentic Depth** | **20%** |
| **Innovation & Creativity** | **20%** |
| Usage of Google Technologies | 15% |
| Product Experience & Design | 10% |
| Technical Implementation | 10% |
| Completeness & Usability | 5% |

## Architecture (current — see decisions.md D1–D4)
Origin: **AI Studio Build Mode** (satisfies the Google-Cloud requirement + scores Google tech).
Stack: **React + Vite + Express (`server.ts`) + Firebase (Auth/Firestore/Storage) + Gemini +
Google Maps**, deployed to **Cloud Run**. Reuses the Open311 data model + Ushahidi category
taxonomy (not a forked legacy codebase).

## Progress

### Done
- [x] Track + architecture chosen; app generated in AI Studio Build Mode, exported, pushed to
  `github.com/Nivish-21/civichero` (public).
- [x] **Cloud Run deploy bugs fixed** (`server.ts`: `process.env.PORT`; removed CJS
  `import.meta.url` crash). Dockerfile added. Prod start verified locally.
- [x] **Vertical slice already present** (from Build Mode): photo intake + Gemini Vision triage
  (`/api/triage`), Firestore real-time feed, map, issue detail, status timeline, upvotes, points.
- [x] **Step 4 — Agentic Resolution Layer** (`/api/agent/resolve`): routes to authority, detects
  duplicates (haversine ≤500m), scores priority + SLA, drafts a complaint, recommends actions;
  "AI Action Plan" card on the detail page. Degrades to simulated output without a Gemini key.
- [x] Security/handoff: Firebase config → env vars, history purged, `.gitignore` hardened,
  `CLAUDE.md`/`AGENTS.md` added, `scripts/verify-agent-flow.mjs` added.

### Blocked on the human (see docs/status.md)
- [ ] **Enable Firebase Anonymous Auth** + set Firestore/Storage rules. Until done the app can't
  create users/reports. Verify with `node scripts/verify-agent-flow.mjs`.
- [ ] **Deploy to Cloud Run**: `gcloud auth login` + billed project, then `gcloud run deploy`.

### Step 5 — 3-Role System + Gamification (2026-06-27)

**Roles:** `citizen` (default) | `cleaner` (enter `VITE_CLEANER_CODE`) | `admin` (`VITE_ADMIN_UID`).
**Verify threshold:** `VITE_VERIFY_THRESHOLD=2` citizen votes to resolve.
**Dispute path:** 2 "still dirty" votes → status back to `Acknowledged`, `claimedByUid` cleared.

**New statuses:** `Claimed` | `Pending Verification` (inserted between `In Progress` and `Resolved`).

**Flow:**
Reported → Acknowledged (auto at 3+ upvotes OR admin) → Claimed (cleaner) →
Pending Verification (cleaner uploads photo + AI approves) →
Resolved (2 citizen votes) OR back to Acknowledged (2 dirty votes).

#### A — Types (`src/types.ts`)
- [ ] Add `UserRole`, extend `IssueStatus` with `'Claimed' | 'Pending Verification'`
- [ ] Extend `CivicIssue`: `claimedByUid?`, `claimedAt?`, `completionPhotoUrl?`, `aiCompletionVerified?`, `aiCompletionSummary?`, `verificationVotes: { clean: string[], dirty: string[] }`, `verificationThreshold: number`
- [ ] Replace `UserProfile`: add `role`, `xp`, `achievements: Achievement[]`, `reportCount`, `cleanedCount`, `verifyCount`
- [ ] Add `Achievement` + `AchievementId` types

#### B — Server (`server.ts`)
- [ ] Enum validation for `category`/`severity` on `/api/triage` + `/api/agent/resolve`; trim + 500-char cap on summary/userNote
- [ ] Exponential rate limiter: 8 AI calls/IP/hour; 30 s base cooldown doubling each call (in-memory Map)
- [ ] `POST /api/verify-completion`: validate photo prefix `data:image/`; Gemini Vision prompt checks if issue is resolved; simulated fallback; returns `{ isResolved, confidence, summary, isSimulated }`

#### C — Firestore + rules
- [ ] `firestore.rules`: write to `users/{uid}` only by own UID; `issues/{id}` claim guard (must be Acknowledged); verify guard (must be Pending Verification, voter not already voted)
- [ ] `firebase.json`: add to repo

#### D — AppContext (`src/context/AppContext.tsx`)
- [ ] Migrate user profile localStorage → Firestore `users/{uid}` (merge on first auth)
- [ ] Expose `userRole`, `leaderboard: UserProfile[]` in context
- [ ] `claimIssue(issueId)`: set status=Claimed, claimedByUid, claimedAt
- [ ] `submitCompletionPhoto(issueId, photoBase64)`: call `/api/verify-completion`; on AI approval → set status=Pending Verification + store url + summary; on AI rejection → return rejection reason to UI
- [ ] `verifyResolution(issueId, vote)`: arrayUnion vote; if clean votes ≥ threshold → Resolved + award XP to reporter + cleaner; if dirty votes ≥ threshold → Acknowledged + clear claim
- [ ] `awardXP(uid, amount)`: Firestore increment; `checkAchievements(profile)`: pure function, returns newly unlocked achievements
- [ ] Leaderboard: onSnapshot `users` query by xp desc limit 20

#### E — Achievements (`src/lib/achievements.ts`)
Ten achievements with XP rewards:
| ID | Trigger | XP |
|---|---|---|
| `first_report` | 1 report | +50 |
| `newcomer` | 1 report gets resolved | +75 |
| `neighborhood_watch` | 5 reports | +100 |
| `community_guardian` | 10 reports | +200 |
| `verified_voice` | 3 verifications done | +80 |
| `quality_reporter` | 3 reports resolved | +150 |
| `first_fix` | cleaner: 1 cleaned | +100 |
| `quick_responder` | cleaner: cleaned within 24h | +75 |
| `cleanup_crew` | cleaner: 5 cleaned | +200 |
| `city_cleaner` | cleaner: 10 cleaned | +400 |

#### F — New components
- [ ] `src/components/AchievementModal.tsx`: unlock notification (badge + name + XP gained + confetti)
- [ ] `src/components/Leaderboard.tsx`: two tabs — XP leaders + Report count leaders; real-time
- [ ] `src/components/VerificationPrompt.tsx`: geo-proximity banner on Map tab; shows before/after photos; Clean / Still Dirty buttons
- [ ] `src/components/RoleSelector.tsx`: enter cleaner code in profile to upgrade role
- [ ] `src/components/CleanerPanel.tsx`: inline on IssueDetailPage — "Claim" button + upload completion photo

#### G — IssueDetailPage + App shell
- [ ] `IssueDetailPage.tsx`: cleaner panel (claim/upload) vs citizen verify panel vs admin override, gated by role + status
- [ ] `App.tsx`: add Leaderboard tab; admin badge + UID display; AchievementModal overlay
- [ ] `.env.example`: add `VITE_ADMIN_UID`, `VITE_CLEANER_CODE`, `VITE_VERIFY_THRESHOLD`

#### H — Build + lint pass
- [ ] `npm run lint` clean
- [ ] `npm run build` clean
- [ ] `docs/status.md` + `docs/changelog.md` updated

### Remaining build work
- [ ] **Step 5 — Impact dashboard + predictive hotspots.** Counts by category/status/area, avg
  resolution time; a predictive agent over all issues surfacing recurring hotspots.
- [ ] **Step 6 — Real gamification.** Move points from `localStorage` → Firestore `users`
  collection; cross-user leaderboard.
- [ ] **Polish:** impeccable design pass (mandatory before "done"), README, restrict Firebase
  rules + API key.

### Deliverables (Step 7 — see docs/submission.md)
- [ ] Live Cloud Run link (public, stable through judging).
- [x] Public GitHub repo.
- [ ] Project-description Google Doc (link-shared).
- [ ] Final Submit on BlockseBlock (irreversible).

## Risks
- Irreversible Final Submit — verify all three links live first.
- 3-day window — keep a working end-to-end slice before adding breadth.
- Starter-tier deploy was abandoned (managed black box failed); we deploy our own container.
- Mentor session (24 Jun) passed; check BlockseBlock for a recording with judge hints.
