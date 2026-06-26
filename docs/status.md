# Status — V2Ship (BlockseBlock Hackathon)

**Last updated:** 2026-06-26
**Deadline:** 2026-06-29 14:00 (hard). ~3 days left.

## Current state
- Planning approved (Track 2). **Deploy path pivoted to AI Studio Build Mode (free Starter).** See D4.
- Toolchain verified: node 24, python 3.12, uv, gcloud 565, gh (authed: Nivish-21), docker.
- Hand-scaffolded Next.js exists locally but is **SUPERSEDED** by the AI Studio React export (D4).
  Not pushed anywhere. Will be replaced when the AI Studio GitHub export lands.

## Track
**Track 2 — Community Hero (Hyperlocal Problem Solver).**

## Architecture (locked, post-pivot)
**Origin: AI Studio Build Mode.** Stack: React (Vite) + Firebase (Auth/Firestore/Storage) +
Gemini (multimodal) + Google Maps Platform. Deploy: AI Studio Publish → Cloud Run (Starter, FREE).
Repo: AI Studio GitHub export. Genkit TBD post-export.

## Active step
**Step 1 (revised) — AI Studio Build Mode: generate app + deploy smoke-test + GitHub export.**
USER-driven (Google login). I supply the Build Mode prompt + step-by-step.

## Blocked on user (the AI Studio steps)
1. AI Studio Build Mode: paste the provided prompt, generate the app.
2. Publish (Starter tier) → get live Cloud Run URL.
3. Export to GitHub → send me the repo URL.
(Gemini API key created inside AI Studio; no gcloud/billing needed.)

## Next steps
1. User runs the AI Studio Build Mode flow (prompt provided in chat).
2. User sends me the GitHub repo URL + the live Cloud Run URL.
3. I clone the repo, bring docs/ in, build Step 2 features (Vision categorization slice).

## Known issues / risks
- Irreversible Final Submit — verify all 3 links before submitting.
- 3-day window — keep to a working vertical slice before adding breadth.
- Mentor session (24 Jun) passed; chase recording on BlockseBlock for judge hints.
