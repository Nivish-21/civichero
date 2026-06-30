# Community Hero — Hyperlocal Civic Issue Reporter

**Track 2 submission for the BlockseBlock hackathon.**  
Citizens photograph local civic problems, Gemini Vision triages them automatically, an AI agent plans resolution, and a 3-role community loop closes the ticket.

**Live:** https://civichero-1051965377286.asia-south1.run.app

---

## What it does

1. **Report** — take a photo of a local problem (pothole, broken streetlight, graffiti, etc.).
2. **Gemini triage** — `POST /api/triage` sends the image to Gemini 2.5 Flash multimodal; it returns category, severity, and a structured summary in under 2 seconds.
3. **Agentic resolution** — `POST /api/agent/resolve` runs a multi-step Gemini agent that produces an authority-routing plan, SLA estimate, duplicate detection, and a draft citizen complaint.
4. **Community feed & map** — all issues visible in real time via Firestore onSnapshot; pinned on Google Maps.
5. **3-role lifecycle** — citizen upvotes → cleaner claims + uploads proof → Gemini verifies completion photo → citizens vote to resolve.
6. **Gamification** — XP, 10 achievements, global leaderboard.

---

## Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, Vite 6, TypeScript, Tailwind 4 |
| Server | Express (bundled with client into one Cloud Run container) |
| AI | Gemini 2.5 Flash via `@google/genai` (multimodal triage + agent resolution + completion verification) |
| Database | Firebase Firestore (real-time sync) |
| Auth | Firebase Anonymous Auth |
| Storage | Firebase Storage (issue photos, completion proofs) |
| Maps | Google Maps Platform via `@vis.gl/react-google-maps` |
| Deploy | Google Cloud Run (source-based deploy) |

---

## Run locally

```bash
git clone https://github.com/Nivish-21/civichero.git
cd civichero
npm install
cp .env.example .env
# Fill in .env — see table below
npm run dev          # http://localhost:8080
```

### Environment variables

| Variable | Required | Notes |
|---|---|---|
| `VITE_FIREBASE_API_KEY` | yes | Firebase web config (public by design) |
| `VITE_FIREBASE_AUTH_DOMAIN` | yes | Firebase web config |
| `VITE_FIREBASE_PROJECT_ID` | yes | Firebase web config |
| `VITE_FIREBASE_STORAGE_BUCKET` | yes | Firebase web config |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | yes | Firebase web config |
| `VITE_FIREBASE_APP_ID` | yes | Firebase web config |
| `GEMINI_API_KEY` | recommended | Server-side only. Without it: simulated AI responses (app still works) |
| `VITE_GOOGLE_MAPS_API_KEY` | optional | Enables the Map tab |
| `VITE_ADMIN_UID` | optional | Firebase UID for admin role |
| `VITE_CLEANER_CODE` | optional | Code to unlock cleaner role (default: `CLEAN2026`) |
| `VITE_VERIFY_THRESHOLD` | optional | Citizen votes to resolve an issue (default: `2`) |

---

## Build & deploy

```bash
npm run build        # compiles client + CJS server into dist/
npm start            # runs production bundle on PORT (default 8080)

# Deploy to Cloud Run
gcloud run deploy civichero \
  --source . \
  --region asia-south1 \
  --allow-unauthenticated \
  --set-env-vars "GEMINI_API_KEY=<your-key>"
```

---

## Role system

| Role | How to get it | Capabilities |
|---|---|---|
| Citizen | Default (anonymous auth) | Report, upvote, vote on completion verification |
| Cleaner | Enter `CLEAN2026` in the Leaderboard tab | Claim issues, upload completion photos |
| Admin | Firebase UID matches `VITE_ADMIN_UID` build-time env | Override status on any issue |

**Resolution flow:**  
`Reported` → `Acknowledged` (3+ upvotes or admin) → `Claimed` (cleaner) → `Pending Verification` (Gemini checks completion photo) → `Resolved` (≥2 clean votes) or back to `Acknowledged` (≥2 dirty votes)

---

## Agent endpoints

| Endpoint | What it does |
|---|---|
| `POST /api/triage` | Gemini multimodal: classify category, severity, extract summary from photo |
| `POST /api/agent/resolve` | Multi-step agent: authority routing, SLA, duplicate detection, draft complaint |
| `POST /api/verify-completion` | Gemini compares before/after photos to verify cleanup |
| `GET /api/maps-config` | Returns whether Maps key is configured |
