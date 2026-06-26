# Submission — rules, requirements & checklist

Source: BlockseBlock hackathon brief. **This is the binding reference for submitting.**

## Hard rules
- **Deadline: 2026-06-29, 2:00 PM.** Late entries are NOT accepted.
- Build window was 22 Jun 3pm → 29 Jun 2pm. Pick ONE problem statement — we chose
  **Track 2: Community Hero (Hyperlocal Problem Solver)**.
- The final deployable link **must be deployed on Google Cloud** (Cloud Run qualifies; AI Studio /
  Antigravity are suggested tools, not mandatory). Ref: https://ai.google.dev/gemini-api/docs/aistudio-deploying
- Submit **only** through the BlockseBlock platform you registered on.
- AI tools / open-source / public resources are allowed and encouraged, but the work must be our own.

## Mandatory deliverables (all three required to be eligible)
1. **Deployed Application Link** — publicly accessible, fully functional, on Google Cloud.
   Must stay **active throughout the evaluation period**.
2. **GitHub Repository Link** — source code + documentation. → https://github.com/Nivish-21/civichero
3. **Project Description (Google Doc Link)** — must contain:
   - Problem Statement Selected (Track 2: Community Hero)
   - Solution Overview
   - Key Features
   - Technologies Used
   - Google Technologies Utilized
   Set the doc to **"anyone with the link"**; keep it available through evaluation (organizers may
   review version history).

## Evaluation matrix
| Criterion | Weight |
|---|---|
| Problem Solving & Impact | 20% |
| Agentic Depth | 20% |
| Innovation & Creativity | 20% |
| Usage of Google Technologies | 15% |
| Product Experience & Design | 10% |
| Technical Implementation | 10% |
| Completeness & Usability | 5% |

**Our Google technologies to name in the doc:** Gemini 2.5 Flash (multimodal vision + structured
output for triage and the resolution agent), Firebase (Auth, Firestore, Cloud Storage), Google
Maps Platform, Google Cloud Run, Cloud Build; scaffolded in Google AI Studio Build Mode.

## BlockseBlock submission steps
1. blockseblock.com/dashboard → find the hackathon → **Create Project**.
2. Enter Project Name → select **Track 2 (Community Hero)** → **Save & Next**.
3. Paste the three mandatory links → **Submit Now**.
4. Toggle ON both Notes → **Continue**.
5. **Final Submit** — IRREVERSIBLE. No edit/resubmit after this. Do it only when fully satisfied.

## Pre-submit checklist (verify each before Final Submit)
- [ ] Deployed link opens publicly (incognito) and the core flow works:
      report → Gemini triage → feed → map → detail → **Generate AI Action Plan**.
- [ ] App stays up (not a sleeping/expiring deploy).
- [ ] GitHub repo is public, builds from a clean clone (`.env.example` documented), no secrets.
- [ ] Google Doc filled in, link-shared, reachable in incognito.
- [ ] Firebase rules locked (writes require auth; key restricted).
- [ ] All three links pasted correctly on BlockseBlock, Track 2 selected.
- [ ] Final Submit only after the above are green.
