import { initializeApp, getApps, getApp } from "firebase/app";
import { initializeAuth, getAuth, inMemoryPersistence } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyA2DdiCnDPC_OK2xkCp2QwNSUj6okXKimk",
  authDomain: "rozkaam-d26f8.firebaseapp.com",
  projectId: "rozkaam-d26f8",
  storageBucket: "rozkaam-d26f8.firebasestorage.app",
  messagingSenderId: "883459924725",
  appId: "1:883459924725:web:c2da8245d6a3d1707e5bbc",
  measurementId: "G-P9VPCBHX6N"
};

// Hot reload par duplication se bachne ke liye logic
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

export default app;