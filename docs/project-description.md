# Community Hero — Hyperlocal Civic Issue Reporting Platform

## Executive Summary
Community Hero is a mobile-first civic issue reporting platform built for local neighborhoods and city streets. It lets a resident photograph a problem, automatically triages the issue with Gemini Vision, generates an agentic resolution plan, and then closes the loop through a 3-role workflow of citizen, cleaner, and admin.

The goal is not just to collect complaints. The goal is to turn a raw civic observation into a structured, traceable, and verifiable resolution process. That is why the system combines computer vision, agentic planning, geospatial context, community voting, and live status tracking in one flow.

## Problem
Most civic reporting systems are fragmented, slow, and hard to trust.

Citizens usually face a few common problems:

- reporting a local issue takes too many steps
- complaints are often vague and lack structured context
- duplicate reports get created for the same physical problem
- issues are routed to the wrong department
- there is no simple way to verify whether a cleanup or repair really happened

This creates a gap between a citizen seeing a problem and the city actually resolving it. Community Hero was designed to close that gap.

## Solution
Community Hero turns the reporting journey into a guided workflow:

1. A citizen takes a photo of a civic issue.
2. Gemini Vision classifies the image into a civic category, severity, and one-line summary.
3. The agentic resolution layer determines the proper authority, checks for nearby duplicates, scores urgency, sets an SLA, and drafts a formal complaint.
4. A cleaner can claim the issue, upload a completion photo, and let Gemini verify whether the problem appears resolved.
5. Citizens vote on the final result so the community, not just the system, confirms closure.

The result is a civic operations loop that is transparent, AI-assisted, and designed for real-world follow-through.

## What Makes It Strong For A Hackathon
This project was built to perform well against the hackathon rubric, especially the two categories that matter most here: agentic depth and innovation.

It is strong because it does more than classify images:

- it reasons about who should handle the issue
- it detects likely duplicate reports using distance-based context
- it drafts the next action rather than stopping at a label
- it supports a multi-role workflow instead of a single-user demo
- it verifies cleanup with AI and community voting

That means the AI is not a decorative feature. It is the mechanism that makes the product work.

## How The System Works

### 1. Reporting
The user opens the report flow, takes a photo, optionally adds a short note or video, and pins the location on the map. The form immediately sends the image to the triage endpoint so the app can classify the report before submission is completed.

### 2. AI Triage
The `POST /api/triage` endpoint sends the uploaded image to Gemini 2.5 Flash. The model returns:

- a civic category such as pothole, streetlight, drainage, garbage, or water leak
- a severity level of low, medium, or high
- a concise one-line summary of what is visible

If Gemini is unavailable, the system falls back to a simulated response so the app still functions in demo mode.

### 3. Issue Publication
Once triaged, the issue is stored in Firestore and appears instantly in the community feed and map. This makes the platform feel live and civic, not static.

### 4. Agentic Resolution Plan
The `POST /api/agent/resolve` endpoint is the core of the project’s “agentic depth.” It takes the reported issue and nearby candidate issues, then produces a resolution plan that includes:

- the correct municipal authority
- an explanation for why that authority is responsible
- duplicate detection using nearby reports within 500 meters
- a numeric priority score from 0 to 100
- a target SLA in days
- a formal complaint draft ready to send
- a short list of recommended next actions

This is the part that turns Community Hero from a form into a decision-making system.

### 5. Role-Based Resolution
The platform supports three distinct roles:

- citizen: default role, can report issues, upvote, and vote on verification
- cleaner: can claim acknowledged issues, submit proof, and earn cleanup XP
- admin: can override issue status when needed

The cleaner role is intentionally earned through a code entry flow, which makes the role transition visible in the app.

The status progression is intentionally opinionated:

- Reported is the starting state for every new issue
- Acknowledged is reached when an issue gathers enough civic attention or an admin intervenes
- Claimed means a cleaner has actively taken ownership
- Pending Verification means proof was uploaded and the community still needs to confirm it
- Resolved means the citizen vote threshold was met and the issue is closed

This gives the project a clear operational model instead of a loose status list.

### 6. Proof And Verification
When a cleaner submits a completion photo, the `POST /api/verify-completion` endpoint asks Gemini to judge whether the issue plausibly looks resolved. If the AI believes the cleanup is credible, the issue moves into pending verification.

Then citizens vote:

- clean votes confirm resolution
- dirty votes reopen the issue back to acknowledged

This is important because it blends AI judgment with community validation instead of relying on one opaque automated decision.

## Core Product Experience
The front end is intentionally organized around the user journey:

- Issues Feed for browsing active civic hazards
- Map view for exploring reports geographically
- Report flow for capturing new civic problems
- Leaderboard for XP, community recognition, and cleaner role entry
- Detail page for the full issue lifecycle, including the AI action plan

The issue detail page is where the product’s intelligence is most visible. It shows the report, the triage result, the live status progression, the AI-generated action plan, and the role-specific actions for citizens and cleaners.

## Key Features

- Mobile-first issue reporting
- Photo-based AI triage
- Optional video attachment for richer context
- Real-time feed backed by Firestore
- Interactive Google Maps issue visualization
- Agent-generated authority routing and complaint drafting
- Duplicate detection using geospatial proximity
- Cleaner claim and completion proof workflow
- Gemini-based completion verification
- Community voting for final resolution
- XP, achievements, and leaderboard mechanics
- Graceful fallback to simulated AI when API keys are missing
- A built-in verification threshold of 2 citizen votes for final resolution or rejection

## Detailed Agentic Flow

### Triage Endpoint
`POST /api/triage` is a multimodal vision classification step. It reads the uploaded image, validates the input, and asks Gemini to return a structured civic classification.

### Resolution Endpoint
`POST /api/agent/resolve` is a planning step. It does not merely label the issue. It reasons about:

- responsibility
- urgency
- duplicate likelihood
- next actions
- formal communication to the authority

The app calculates nearby candidates on the client side using haversine distance and passes only close reports into the agent prompt, which keeps the plan grounded in location-aware context.

### Verification Endpoint
`POST /api/verify-completion` is the closure step. It compares the issue context with the submitted completion photo and returns a structured verification result. That result informs whether the issue proceeds to community confirmation or remains unresolved.

## Reliability And Fallbacks
The project was designed so the demo still works even when some external services are unavailable.

- If Gemini is missing, the triage, resolution, and verification routes return simulated outputs.
- If Firebase Storage upload fails, the app falls back to inline image handling so issue submission can still complete.
- If the maps key is absent, the map view degrades to a graceful unavailable state rather than crashing.
- The server uses in-memory rate limiting to protect the AI endpoints during the demo: 8 AI calls per IP per hour, with an exponential cooldown between requests.
- When Storage is unavailable, image uploads fall back to a compressed thumbnail so Firestore writes still stay under document size limits.

These fallbacks matter in a hackathon environment because a strong submission needs to fail gracefully, not just work in the happy path.

## Technology Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, Vite 6, TypeScript, Tailwind 4 |
| Backend | Express in `server.ts` |
| AI | Gemini 2.5 Flash via `@google/genai` |
| Auth | Firebase Anonymous Auth |
| Database | Firebase Firestore |
| Media | Firebase Storage |
| Maps | Google Maps Platform |
| Deployment | Google Cloud Run |
| Build pipeline | Cloud Build / Cloud Run source deploy |

## Google Technologies Used

- Gemini 2.5 Flash for vision triage, resolution planning, and completion verification
- Firebase Authentication for anonymous sign-in
- Firestore for live issue data and leaderboard data
- Firebase Storage for image and completion media
- Google Maps Platform for location-aware civic reports
- Cloud Run for public deployment on Google Cloud
- Cloud Build as part of the containerized source deploy pipeline

## Data And Workflow Model
The app stores issues in Firestore with fields for category, severity, summary, note, media URL, location, status, voting state, and the generated agent plan. User profiles track XP, role, report count, resolution count, cleanup count, and verification count. This makes it possible to reward the right behaviors while keeping the workflow auditable.

The lifecycle is:

Reported -> Acknowledged -> Claimed -> Pending Verification -> Resolved

If community votes disagree with the cleanup proof, the issue can be reopened back to Acknowledged so another cleaner can claim it.

## Gamification And Community Trust
The platform includes achievements and a leaderboard because civic engagement should feel visible and rewarding.

There are 10 achievements in total, covering reporting, verification, cleaner activity, and fast response behavior. XP is awarded for meaningful actions such as filing reports, upvoting, claiming work, submitting proof, and validating resolutions. The leaderboard surfaces both top XP holders and top reporters so the app rewards contribution, not just activity volume.

Examples of tracked behaviors include:

- first report
- repeated reporting
- verified voting
- first fix as a cleaner
- quick response cleanup

This helps the app reward useful civic behavior rather than only counting raw submissions.

## Why This Is Useful In Practice
Community Hero is designed to be practical, not just impressive.

It helps with:

- faster issue classification
- better routing to the right authority
- reducing duplicate complaints
- clearer status tracking for citizens
- accountability for cleanup work
- community confidence that a fix is real

Those are the exact problems that make civic reporting feel broken in many neighborhoods today.

## Demo Flow
A judge can understand the product in one short run:

1. Open the live app.
2. Submit a report with a photo.
3. Watch Gemini classify the issue.
4. Open the issue detail page and generate the AI action plan.
5. Claim the issue as a cleaner and submit completion proof.
6. Confirm the verification flow and community voting loop.
7. Observe the XP and leaderboard updates.

That sequence demonstrates both the user value and the technical depth.

## Live Links

- Live app: https://civichero-1051965377286.asia-south1.run.app
- GitHub repository: https://github.com/Nivish-21/civichero

## Self-Score

| Criterion | Score |
|---|---:|
| Problem Solving & Impact | 18/20 |
| Agentic Depth | 18/20 |
| Innovation & Creativity | 17/20 |
| Usage of Google Technologies | 13/15 |
| Product Experience & Design | 8/10 |
| Technical Implementation | 9/10 |
| Completeness & Usability | 5/5 |

## Closing Statement
Community Hero is a complete civic resolution loop: report, triage, route, resolve, verify, and reward. It uses Google technologies in a way that is visible in the product itself, and it demonstrates real agentic behavior rather than surface-level AI decoration.
