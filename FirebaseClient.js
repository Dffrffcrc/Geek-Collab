import { initializeApp, getApps } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

let firestoreDb = null;

const getFirebaseConfig = () => ({
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
});

export const isFirebaseConfigured = () => {
  const config = getFirebaseConfig();
  return Boolean(config.apiKey && config.projectId && config.appId);
};

export const getFirestoreDb = () => {
  if (!isFirebaseConfigured()) {
    return null;
  }
  if (firestoreDb) {
    return firestoreDb;
  }

  const config = getFirebaseConfig();
  const app = getApps().length > 0 ? getApps()[0] : initializeApp(config);
  firestoreDb = getFirestore(app);
  return firestoreDb;
};
