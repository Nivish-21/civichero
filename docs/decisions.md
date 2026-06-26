# Decisions

## D1 — Track 2 (Community Hero) over Track 1 (Last-Minute Life Saver)
**Date:** 2026-06-26
**Alternatives:** Track 1 AI productivity companion.
**Reasoning:** Richer open-source base to reuse (Open311, FixMyStreet, Ushahidi); broader
natural Google-tech surface (Maps + Gemini Vision + Cloud Run + Firestore) scoring the 15%;
Agentic Depth is real and demoable (photo→classify→geolocate→route→track→predict) vs Track 1's
mostly-faked "agentic reminders"; Track 1 is the most saturated hackathon category (weak on
Innovation 20%). Civic impact narrative is stronger for Problem Solving & Impact 20%.

## D2 — Genkit (TS) over Google ADK (Python) for the agent engine
**Date:** 2026-06-26
**Alternatives:** ADK (Python/Java), Vercel AI SDK.
**Reasoning:** Frontend is Next.js (TS). ADK would add a second language + a second Cloud Run
service to wire and deploy inside a 3-day window — integration risk. Genkit is Google's own
open-source agent framework in TS: native Gemini, multi-step flows + tools, deploys to Cloud
Run/Firebase, lives in the same app. Agentic Depth is judged on behavior, not framework brand,
so Genkit scores equally. ADK held in reserve as a multi-agent flex only if ahead of schedule.

## D4 — Build + deploy via AI Studio Build Mode (free Starter tier), not custom gcloud
**Date:** 2026-06-26
**Alternatives:** Antigravity → custom Next.js+Genkit on Cloud Run (needs billing); hand-scaffolded
Next.js → gcloud (needs billing).
**Reasoning:** Brief mandates "deployed on Google Cloud" and names AI Studio as the recommended
tool; mentor session was about AI Studio. Build Mode 2026 generates React apps, supports GitHub
export + custom deps, and deploys to Cloud Run. **Starter tier deploys up to 2 apps FREE — no GCP
project or billing** — which removes our blocker (no gcloud auth/billing). Highest-scoring on
"Usage of Google Technologies" (15%) and lowest compliance risk.
**Consequence:** Stack pivots React (Vite) + Firebase + Gemini + Maps. Hand-scaffolded Next.js
is superseded. Repo originates from AI Studio's GitHub export; I develop features on it after.
**Supersedes D2's Next.js assumption.** Genkit re-evaluated post-export: use Gemini via Build
Mode's generated server proxy; add Genkit flows only if the server structure accommodates cleanly.
Agentic Depth comes from multi-step flow behavior regardless of framework.

## D3 — Reuse Open311 schema, do NOT fork FixMyStreet/Mark-a-Spot
**Date:** 2026-06-26
**Alternatives:** Fork FixMyStreet (Perl) or Mark-a-Spot (Drupal 11 + Vue) wholesale.
**Reasoning:** Legacy stacks fight the Cloud Run + Gemini + Next.js flow and the 3-day window.
Borrow the proven Open311 GeoReport v2 data model + Ushahidi category taxonomy; build fresh on
a Cloud-Run-clean stack.

## D5 — Hosting on Cloud Run + media on Firebase Storage (enable Blaze)
**Date:** 2026-06-26
**Decision:** Host on **Cloud Run** (mandated: brief requires Google Cloud; app has an Express
server so static hosts don't fit). Store photos/videos on **Firebase Storage**.
**Billing:** Both require the project on the **Blaze** plan. This is unavoidable for the deploy,
but free in practice — $300 new-account credit + always-free tiers (Cloud Run 2M req/mo,
Storage 5GB, Firestore 1GB) → ≈ $0 for a demo. Just needs a card on file.
**Rejected:** MongoDB free tier — wrong tool for binary blobs, needless second DB. Base64-in-
Firestore is only a stopgap (1 MiB doc limit; no video). Cloudinary free tier (25GB) is a fine
media-only alternative but pointless since billing is required for Cloud Run anyway.
**Follow-ups:** confirm ReportIssueForm uses `<input type=file accept=image/* capture=environment>`
for direct camera capture; responsive audit at 375px in the design pass.
