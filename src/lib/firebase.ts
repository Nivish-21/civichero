import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// Firebase web config is supplied via build-time env vars (VITE_FIREBASE_*),
// see .env.example. These values are public by design — a Firebase web API key
// identifies the project, it does not grant access. Access is controlled by
// Firebase Auth + Firestore/Storage security rules. Do NOT put the server-side
// GEMINI_API_KEY here; that stays a server secret (see server.ts).
const app = initializeApp({
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
});

// Multi-database project: initialize Firestore against the specific database ID.
const db = getFirestore(app, import.meta.env.VITE_FIREBASE_FIRESTORE_DB_ID || '(default)');

const auth = getAuth(app);
const storage = getStorage(app);

export { app, db, auth, storage, signInAnonymously };
export default app;
