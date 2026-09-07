import { initializeApp, getApps, getApp } from "firebase/app";
import { initializeAuth, getAuth, inMemoryPersistence } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getFunctions } from "firebase/functions";

const firebaseConfig = {
  apiKey: "AIzaSyCiWCcIEJaVV6LPrD0c_0sPBmQwkk95OcQ",
  authDomain: "rozkaam-fd58e.firebaseapp.com",
  projectId: "rozkaam-fd58e",
  storageBucket: "rozkaam-fd58e.firebasestorage.app",
  messagingSenderId: "75608676476",
  appId: "1:75608676476:android:f0a38be965a0c522e311f9",
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