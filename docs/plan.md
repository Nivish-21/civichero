# Plan — Community Hero (civichero)

BlockseBlock hackathon, Track 2. **Deadline: 2026-06-30 23:59.** Live state in `docs/status.md`;
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

## Architecture
Origin: **AI Studio Build Mode**. Stack: **React 19 + Vite 6 + TypeScript + Tailwind 4 +
Express (`server.ts`) + Firebase (Auth/Firestore/Storage) + Gemini + Google Maps**, deployed
to **Cloud Run**.

---

## DONE

- [x] Track + architecture chosen; app generated in AI Studio Build Mode, pushed to
  `github.com/Nivish-21/civichero` (public).
- [x] Cloud Run deploy bugs fixed (`server.ts`: `process.env.PORT`; no `import.meta.url`). Dockerfile ready.
- [x] **Step 4 — Agentic Resolution Layer** (`/api/agent/resolve`): routes to authority, detects
  duplicates (haversine ≤500m), scores priority + SLA, drafts complaint. "AI Action Plan" card
  on IssueDetailPage. Degrades to simulated output without Gemini key.
- [x] Security: Firebase config → env vars, history purged, `.gitignore` hardened.
- [x] Firebase: owned project `civichero-84074`, Anonymous Auth enabled, Firestore rules deployed,
  agent flow verified green (`node scripts/verify-agent-flow.mjs`).
- [x] **Step 5 — 3-Role System + Gamification** (2026-06-27, pushed to GitHub):
  - Roles: `citizen` | `cleaner` (`VITE_CLEANER_CODE`) | `admin` (`VITE_ADMIN_UID`)
  - Flow: Reported → Acknowledged → Claimed → Pending Verification → Resolved (or back)
  - Gemini Vision completion verification (`/api/verify-completion`)
  - XP system, 10 achievements, animated unlock modal
  - Dual-tab leaderboard (XP + report count), Firestore onSnapshot top-20
  - In-memory rate limiting: 8 AI calls/IP/hr + exponential cooldown
  - New: `src/lib/achievements.ts`, `AchievementModal`, `Leaderboard`, `VerificationPrompt`,
    `RoleSelector`, `CleanerPanel`
  - `npm run lint` + `npm run build` — both pass clean

---

## BLOCKED ON HUMAN (DO FIRST)

- [ ] **Enable Blaze billing** on Firebase project `civichero-84074`.
  Go to: Firebase console → project → Spark plan badge (bottom left) → Upgrade to Blaze.
  Set a $5 budget alert. Required for Cloud Run + Storage.
  Verify: `gcloud billing projects describe civichero-84074` → `billingEnabled: true`

---

## Step 6 — Deploy to Cloud Run (agent can run this autonomously once billing is enabled)

```bash
gcloud run deploy civichero \
  --source . \
  --region asia-south1 \
  --allow-unauthenticated \
  --set-env-vars GEMINI_API_KEY=$GEMINI_API_KEY \
  --build-env-vars VITE_FIREBASE_API_KEY=$VITE_FIREBASE_API_KEY,\
VITE_FIREBASE_AUTH_DOMAIN=$VITE_FIREBASE_AUTH_DOMAIN,\
VITE_FIREBASE_PROJECT_ID=$VITE_FIREBASE_PROJECT_ID,\
VITE_FIREBASE_STORAGE_BUCKET=$VITE_FIREBASE_STORAGE_BUCKET,\
VITE_FIREBASE_MESSAGING_SENDER_ID=$VITE_FIREBASE_MESSAGING_SENDER_ID,\
VITE_FIREBASE_APP_ID=$VITE_FIREBASE_APP_ID,\
VITE_CLEANER_CODE=$VITE_CLEANER_CODE,\
VITE_VERIFY_THRESHOLD=2
```

After first deploy:
1. Open the live URL → log in → copy your UID from the header (the tiny copy button)
2. Add `VITE_ADMIN_UID=<your-uid>` to `.env`
3. Redeploy with `VITE_ADMIN_UID` as an additional `--build-env-vars` entry
4. Update `docs/status.md` with the live URL

- [ ] First deploy (no admin UID yet)
- [ ] Copy UID → set `VITE_ADMIN_UID` → redeploy
- [ ] Confirm live URL is accessible and app boots

---

## Step 7 — Design polish (impeccable gate — mandatory)

CLAUDE.md mandates the `impeccable` skill for all UI work. Run it before calling design done.

- [ ] Run `/impeccable` audit pass on the current UI
- [ ] Fix any critical UX issues surfaced (mobile-first, the judges will use phones)
- [ ] Check CommunityFeed card hierarchy — issue type / severity / status must be scannable at a glance
- [ ] Check IssueDetailPage on mobile — AI Action Plan card + cleaner/citizen panels must not overflow
- [ ] Verify AchievementModal looks good on small screens

---

## Step 8 — Submission deliverables

- [ ] **README.md** — one-pager: what it is, how to run locally, how to deploy, env vars table
- [ ] **Project-description Google Doc** — share link publicly. Include: problem, solution, agent
  flow diagram (text is fine), tech stack, evaluation matrix self-score, live link, repo link.
- [ ] Verify all three links are live: Cloud Run URL, GitHub repo, Google Doc
- [ ] **Final Submit** on BlockseBlock → Track 2 → paste the three links → submit.
  **Irreversible. Do not submit until all three are verified.**

---

## Risks
- Hard deadline 2026-06-30 23:59 — no extensions.
- Blaze billing is the single deployment gate; everything else is agent-executable.
- Irreversible Final Submit — verify all links first.
- `VITE_ADMIN_UID` must be set after first login (can't know it before deploy).
- Without `GEMINI_API_KEY`, AI routes run in simulated mode — app still works but judges see "Demo mode" labels.
