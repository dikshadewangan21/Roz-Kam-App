import { initializeApp, getApps, getApp } from "firebase/app";
import { initializeAuth, getAuth, inMemoryPersistence } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getFunctions } from "firebase/functions";

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY || "AIzaSyCiWCcIEJaVV6LPrD0c_0sPBmQwkk95OcQ",
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || "rozkaam-fd58e.firebaseapp.com",
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || "rozkaam-fd58e",
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || "rozkaam-fd58e.firebasestorage.app",
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "75608676476",
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID || "1:75608676476:android:f0a38be965a0c522e311f9",
};

// Prevent duplicate initialization on hot reload
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

export const auth = (() => {
  try {
    return initializeAuth(app, {
      persistence: inMemoryPersistence,
    });
  } catch (e) {
    return getAuth(app);
  }
})();

export const db = getFirestore(app);
export const functions = getFunctions(app);

export default app;