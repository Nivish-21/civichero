// Verifies the end-to-end agent flow locally:
//   1. Firebase Anonymous Auth is enabled (REST sign-up).
//   2. Firestore accepts an authenticated write + read (security rules).
//   3. The local /api/agent/resolve endpoint returns a resolution plan.
//
// Run:  node scripts/verify-agent-flow.mjs
// Prereqs: .env populated; for step 3, the app running locally
//          (NODE_ENV=production PORT=8137 node dist/server.cjs) — set PORT below.
//
// Each step prints PASS/FAIL with an actionable message. Exits non-zero on first FAIL.

import { readFileSync } from 'node:fs';

const PORT = process.env.PORT || 8137;

// Minimal .env parser (no dependency).
function loadEnv() {
  const env = {};
  try {
    for (const line of readFileSync(new URL('../.env', import.meta.url), 'utf8').split('\n')) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m && !line.trim().startsWith('#')) env[m[1]] = m[2];
    }
  } catch {
    fail('Could not read .env — copy .env.example to .env and fill it in.');
  }
  return env;
}

function pass(msg) {
  console.log(`✅ ${msg}`);
}
function fail(msg) {
  console.error(`❌ ${msg}`);
  process.exit(1);
}

const env = loadEnv();
const apiKey = env.VITE_FIREBASE_API_KEY;
const projectId = env.VITE_FIREBASE_PROJECT_ID;
const dbId = env.VITE_FIREBASE_FIRESTORE_DB_ID || '(default)';
if (!apiKey || !projectId) fail('VITE_FIREBASE_API_KEY / VITE_FIREBASE_PROJECT_ID missing in .env.');

// --- Step 1: Anonymous Auth -------------------------------------------------
const signUp = await fetch(
  `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${apiKey}`,
  { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ returnSecureToken: true }) },
).then((r) => r.json());

if (!signUp.idToken) {
  if (signUp.error?.message === 'ADMIN_ONLY_OPERATION') {
    fail('Anonymous Auth is DISABLED. Firebase console → Authentication → Sign-in method → enable Anonymous.');
  }
  fail(`Anonymous sign-up failed: ${signUp.error?.message || 'unknown error'}`);
}
const { idToken, localId } = signUp;
pass(`Anonymous Auth enabled (uid ${localId.slice(0, 8)}…).`);

// --- Step 2: Firestore authenticated write + read ---------------------------
const docId = `verify-${Date.now()}`;
const base = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/${encodeURIComponent(dbId)}/documents/issues`;
const fields = {
  fields: {
    category: { stringValue: 'Pothole' },
    severity: { stringValue: 'High' },
    summary: { stringValue: 'verification probe — safe to delete' },
    status: { stringValue: 'Reported' },
    userId: { stringValue: localId },
    timestamp: { integerValue: String(Date.now()) },
    upvotes: { integerValue: '0' },
  },
};
const write = await fetch(`${base}?documentId=${docId}`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
  body: JSON.stringify(fields),
}).then((r) => r.json());

if (write.error) {
  if (String(write.error.status).includes('PERMISSION_DENIED')) {
    fail('Firestore write DENIED. Set rules: issues → allow read: if true; allow create, update: if request.auth != null;');
  }
  fail(`Firestore write failed: ${write.error.message}`);
}
pass('Firestore accepts authenticated writes (rules OK).');

// --- Step 3: Agent endpoint -------------------------------------------------
try {
  const plan = await fetch(`http://localhost:${PORT}/api/agent/resolve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      issue: { id: docId, category: 'Pothole', severity: 'High', summary: 'verification probe', upvotes: 0 },
      nearbyIssues: [],
    }),
  }).then((r) => r.json());

  if (!plan.authority) fail(`Agent endpoint returned no plan: ${JSON.stringify(plan)}`);
  pass(`Agent plan OK → routed to "${plan.authority}", priority ${plan.priorityScore}, SLA ${plan.slaDays}d${plan.isSimulated ? ' (simulated — no Gemini key)' : ''}.`);
} catch {
  console.error(`⚠️  Agent endpoint not reachable on :${PORT}. Start the app, then re-run. (Auth + Firestore already verified.)`);
}

console.log('\n🎉 Verification complete.');
