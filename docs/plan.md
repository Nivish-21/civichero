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
