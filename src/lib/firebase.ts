import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import firebaseConfig from '../../firebase-applet-config.json';

// Initialize Firebase App
const app = initializeApp({
  apiKey: firebaseConfig.apiKey,
  authDomain: firebaseConfig.authDomain,
  projectId: firebaseConfig.projectId,
  storageBucket: firebaseConfig.storageBucket,
  messagingSenderId: firebaseConfig.messagingSenderId,
  appId: firebaseConfig.appId,
});

// Since the platform uses a multi-database architecture, 
// we must initialize Firestore using the specific database ID.
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId || '(default)');

const auth = getAuth(app);
const storage = getStorage(app);

export { app, db, auth, storage, signInAnonymously };
export default app;
