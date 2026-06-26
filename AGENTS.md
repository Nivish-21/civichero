# AGENTS.md

This repo's agent guidance lives in [CLAUDE.md](./CLAUDE.md) — read it (and `docs/status.md`
for live state) before working. Quick orientation:

- **Project:** Community Hero — civic issue reporting + AI triage + agentic resolution. Track 2,
  BlockseBlock hackathon. Deadline 2026-06-29 14:00.
- **Stack:** React + Vite + Express (`server.ts`) + Firebase + Gemini + Google Maps → Cloud Run.
- **Run:** `npm run dev` (port 8080) · `npm run build` · `npm start` · `npm run lint`.
- **Env:** copy `.env.example` → `.env`. `VITE_FIREBASE_*` public; `GEMINI_API_KEY` secret
  (optional — AI falls back to simulated mode without it).
- **Don't regress:** `server.ts` reads `process.env.PORT`; no `import.meta.url` in `server.ts`
  (CJS bundle); Firebase web keys are public, not secrets.

See CLAUDE.md for the full picture, key files, current blockers, and next steps.
