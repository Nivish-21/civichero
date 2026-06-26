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
