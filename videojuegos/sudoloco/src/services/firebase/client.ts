import { getApps, initializeApp, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getDatabase, type Database } from 'firebase/database';

import { env } from '@lib/env';

const firebaseConfig = {
  apiKey: env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: env.EXPO_PUBLIC_FIREBASE_APP_ID,
  databaseURL: env.EXPO_PUBLIC_FIREBASE_DATABASE_URL,
};

export const app: FirebaseApp =
  getApps()[0] ?? initializeApp(firebaseConfig);

export const auth: Auth = getAuth(app);
export const firestore: Firestore = getFirestore(app);
export const realtimeDb: Database = getDatabase(app);
