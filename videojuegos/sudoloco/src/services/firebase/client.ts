import { getApps, initializeApp, type FirebaseApp } from 'firebase/app';
import { getAuth, initializeAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getDatabase, type Database } from 'firebase/database';
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';

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

function buildAuth(): Auth {
  // getReactNativePersistence is present at runtime in firebase/auth but absent
  // from the main TS declaration file — the require() bypasses that gap.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { getReactNativePersistence } = require('firebase/auth') as {
    getReactNativePersistence: (s: typeof ReactNativeAsyncStorage) => unknown;
  };
  try {
    return initializeAuth(app, {
      // Cast needed because TS types for this bundle don't expose Persistence.
      persistence: getReactNativePersistence(ReactNativeAsyncStorage) as never,
    });
  } catch {
    // initializeAuth throws on hot reload if auth was already initialized.
    return getAuth(app);
  }
}

export const auth: Auth = buildAuth();
export const firestore: Firestore = getFirestore(app);
export const realtimeDb: Database = getDatabase(app);
