import { useState, useEffect } from "react";
import { onAuthStateChanged, signOut, type User } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "../constants/firebaseConfig";

export interface UserProfile {
  uid: string;
  role: "WORKER" | "COMPANY";
  fullName: string;
  phoneNumber: string;
  email?: string;
  skillCategory?: string;
  gstNumber?: string;
  createdAt: string;
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser: User | null) => {
      setUser(currentUser);
      if (currentUser) {
        // Fetch profile record from Firestore
        try {
          const userDocRef = doc(db, "users", currentUser.uid);
          const userSnap = await getDoc(userDocRef);
          if (userSnap.exists()) {
            setProfile(userSnap.data() as UserProfile);
          }
        } catch (e) {
          console.warn("Error fetching user profile:", e);
        }
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  // Logout Action
  const logout = async () => {
    try {
      await signOut(auth);
    } catch (e) {
      console.warn("SignOut notice:", e);
    }
    setUser(null);
    setProfile(null);
  };

  return {
    user,
    profile,
    loading,
    logout,
  };
}