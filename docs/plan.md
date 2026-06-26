# V2Ship — BlockseBlock Hackathon Plan

## Goal
Win-targeted submission for the BlockseBlock hackathon. Build a functional,
agentic, Google-Cloud-deployed solution before the deadline.

## Hard constraints (from the brief)
- **Deadline: 29 Jun 2026, 2:00 PM.** Window opened 22 Jun 3pm. Today: 26 Jun. ~3 days left. Late = rejected.
- Final app **must** be deployed on **Google Cloud** (AI Studio one-click → Cloud Run qualifies).
- Deliverables: (1) live deployed link, (2) public GitHub repo, (3) Google Doc writeup
  (problem statement, solution overview, key features, technologies, Google technologies used).
- Submit **only** via BlockseBlock dashboard. Final Submit is irreversible — no edits after.
- AI tools / open-source / public resources allowed and encouraged; work must be our own.

## Evaluation matrix (drives every decision)
| Criterion | Weight |
|---|---|
| Problem Solving & Impact | 20% |
| Agentic Depth | 20% |
| Innovation & Creativity | 20% |
| Usage of Google Technologies | 15% |
| Product Experience & Design | 10% |
| Technical Implementation | 10% |
| Completeness & Usability | 5% |

→ 40% on Agentic Depth + Innovation. The build must be visibly *agentic*, not a prompt wrapper.

## Decision 1 — Architecture
> **UPDATED by D4 (decisions.md):** origin is **AI Studio Build Mode**, stack is **React (Vite) +
> Firebase + Gemini + Maps**, deploy is **AI Studio Publish → Cloud Run (free Starter tier)**.
> The Next.js/Genkit/gcloud detail below is superseded; kept for history.

- AI Studio = **deploy vehicle + UI scaffold on-ramp + Gemini API key source**, NOT the whole architecture.
- Agent engine = **Genkit** (Google's open-source TS agent framework — flows, tools, multi-step
  orchestration → scores Agentic Depth on behavior). Lives inside the Next.js app: one language,
  one deploy. ADK held in reserve as a multi-agent flex if ahead of schedule. (See decisions.md.)
- Frontend + BFF = **Next.js (App Router)** — design points (10%) + clean Cloud Run deploy.
- Model = **Gemini** (multimodal — vision for image/video intake, function-calling for tools).
- Data = **Firestore** (reports, status lifecycle, votes). Files = **Cloud Storage** (images/video).
- Map = **Google Maps Platform** (geo + pins → scores Google tech 15%).
- Deploy = **Cloud Run** (single Next.js service). Satisfies mandatory Google Cloud.
- Google-tech surface scored: Gemini + Genkit + Maps Platform + Cloud Run + Firestore + Cloud Storage.

## Decision 2 — Track: **Track 2, Community Hero (Hyperlocal Problem Solver)**
Chosen over Track 1 (Last-Minute Life Saver) because:
1. Richer open-source base to reuse (Open311 standard, FixMyStreet, Ushahidi, Mark-a-Spot).
2. Natural, broad Google-tech surface (Maps + Gemini Vision + Cloud Run + Firebase) → the 15%.
3. Agentic Depth is real and demoable: photo → classify → geolocate → route to authority →
   track → predict hotspots. Multi-step autonomy, not faked reminders.
4. Strong impact + innovation narrative; Track 1 is the most saturated hackathon category.

### Open-source reuse strategy (borrow schema, not legacy codebase)
- **Open311 / GeoReport v2** — adopt its data model + service-request lifecycle. Don't reinvent it.
- **Ushahidi / FixMyStreet** — category taxonomy + reporting-flow patterns.
- **Leaflet + OpenStreetMap** OR **Google Maps Platform** for geo/mapping (Maps = scores Google tech).
- **Do NOT fork** FixMyStreet (Perl) or Mark-a-Spot (Drupal) wholesale — fights Cloud Run + 3-day window.
- Build fresh on a Cloud-Run-clean stack (Next.js or Python FastAPI + ADK agent service).

## Proposed agentic feature core (the 40%)
- [ ] Multimodal intake: citizen uploads photo/video of an issue.
- [ ] Gemini Vision agent: auto-categorize (pothole / leak / streetlight / waste / etc.) + severity.
- [ ] Geo agent: extract/confirm location, reverse-geocode, map pin.
- [ ] Routing agent: determine responsible authority (Open311-style), draft + dispatch report.
- [ ] Tracking: real-time status lifecycle (reported → acknowledged → in-progress → resolved).
- [ ] Community verification + gamification (upvote/confirm, points).
- [ ] Impact dashboard + predictive hotspot insights (agent over historical reports).

## Build steps (expanded)

### Step 0 — Approved ✅ (architecture + Track 2)

### Step 1 (REVISED per D4) — AI Studio Build Mode: generate + deploy + GitHub export
Goal: a working Community-Hero v1 live on Cloud Run via AI Studio's free Starter deploy, with the
code in GitHub, before deep feature work. De-risks the deploy on day 1 with zero billing setup.
- [ ] 1a. **[USER]** AI Studio → Build Mode → paste the provided prompt → generate v1 app.
- [ ] 1b. **[USER]** Wire/confirm Firebase backend when prompted (Auth + Firestore + Storage).
- [ ] 1c. **[USER]** Publish (Starter tier) → capture the live Cloud Run URL. ← deploy de-risked.
- [ ] 1d. **[USER]** Export to GitHub → send repo URL.
- [ ] 1e. **[ME]** Clone repo, bring docs/ in, verify it builds locally, confirm structure.
  ← Step 1 done-gate.
Superseded sub-steps (old Next.js path): create-next-app / Genkit / Dockerfile / gcloud — DROPPED.

### Step 2 — Multimodal intake + Gemini Vision categorization (first vertical slice)
- [ ] 2a. Upload UI: citizen submits photo/video + optional note. Store file in Cloud Storage.
- [ ] 2b. Genkit flow: Gemini Vision → `{category, severity, summary, confidence}` (structured output).
  Categories from Open311/Ushahidi taxonomy (pothole, water leak, streetlight, waste, etc.).
- [ ] 2c. Persist report to Firestore with Open311-style schema. Show classification back to user.
- [ ] 2d. Redeploy; verify slice works on the live URL. ← demoable end-to-end here.

### Step 3 — Geo + map + report lifecycle
- [ ] 3a. Capture gelocation (device GPS / map pin). Reverse-geocode via Maps Platform.
- [ ] 3b. Public map view: all reports as pins, colored by category/status.
- [ ] 3c. Report detail page + status lifecycle (reported → acknowledged → in-progress → resolved).
- [ ] 3d. Open311 GeoReport v2 field alignment (service_code, status, requested_datetime, lat/long).

### Step 4 — Agentic routing + tracking + community layer
- [ ] 4a. **Routing agent** (Genkit, multi-step): from category + location, determine responsible
  authority/department, draft the formal report text, log dispatch intent. This is the Agentic Depth core.
- [ ] 4b. Community verification: upvote/confirm a report; dedupe near-duplicate reports (agent-assisted).
- [ ] 4c. Gamification: citizen points for reporting/verifying; simple leaderboard.

### Step 5 — Impact dashboard + predictive insights
- [ ] 5a. Dashboard: counts by category/status/area, resolution times, before/after.
- [ ] 5b. **Predictive agent**: over historical reports, surface hotspots / likely-recurring issues.

### Step 6 — Polish + deliverables
- [ ] 6a. Design pass through **impeccable** gate (mandatory before "done"). Mobile-first.
- [ ] 6b. Lint + format (Prettier). Type-check clean.
- [ ] 6c. GitHub README (setup, architecture, Google tech used).
- [ ] 6d. Project-description Google Doc: problem statement, solution overview, key features,
  technologies, Google technologies. Set "anyone with link" access.
- [ ] 6e. Final production deploy; verify all three links live + stable.

### Step 7 — Submission (IRREVERSIBLE)
- [ ] 7a. Verify deployed link, GitHub link, Google Doc link all public + working.
- [ ] 7b. BlockseBlock: Create Project → select Track 2 → paste links → toggles → **Final Submit**.
  Only when fully satisfied. No edits after.

## Credentials needed from user (blockers for deploy, Step 1e/1f)
1. `gcloud auth login` + a Google Cloud **project with billing enabled**.
2. **Gemini API key** (AI Studio) — for Genkit/Gemini calls.
3. (Later) **Google Maps Platform API key** — for Step 3 maps/geocoding.
Everything before deploy (1a–1d) I can build now without these.

## Risks
- 3-day window: scope must stay a working vertical slice end-to-end before adding breadth.
- Irreversible Final Submit: deploy + all three links verified live before submitting.
- ADK + Cloud Run deploy unknowns: de-risk with a deploy smoke-test in Step 1 before building features.

## Status
AWAITING APPROVAL on Decision 1 (architecture) + Decision 2 (Track 2). No code until approved.
