import { FirebaseApp, getApps, initializeApp } from 'firebase/app';
import { Auth, getAuth, GoogleAuthProvider } from 'firebase/auth';
import { Firestore, getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

function getMissingFirebaseKeys(): string[] {
  const required = [
    'NEXT_PUBLIC_FIREBASE_API_KEY',
    'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN',
    'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
    'NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET',
    'NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
    'NEXT_PUBLIC_FIREBASE_APP_ID',
  ];

  return required.filter((key) => !process.env[key]);
}

function initFirebaseApp(): FirebaseApp {
  const missing = getMissingFirebaseKeys();
  if (missing.length > 0) {
    throw new Error(`Missing Firebase env keys: ${missing.join(', ')}`);
  }
  return getApps()[0] ?? initializeApp(firebaseConfig);
}

export const firebaseApp = initFirebaseApp();
export const firebaseAuth: Auth = getAuth(firebaseApp);
export const firebaseDb: Firestore = getFirestore(firebaseApp);
export const googleProvider = new GoogleAuthProvider();

