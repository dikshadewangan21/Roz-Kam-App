import { useState, useEffect } from "react";
import { 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut,
  User 
} from "firebase/auth";
import { doc, setDoc, getDoc } from "firebase/firestore";
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
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        // Firestore se user profile record fetch karna
        const userDocRef = doc(db, "users", currentUser.uid);
        const userSnap = await getDoc(userDocRef);
        if (userSnap.exists()) {
          setProfile(userSnap.data() as UserProfile);
        }
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  // Worker Registration
  const registerWorker = async (
    fullName: string,
    phoneNumber: string,
    skillCategory: string,
    pass: string
  ) => {
    // Mobile number ke saath fake email create kar rahe hain jab tak SMS OTP activate na ho
    const dummyEmail = `${phoneNumber}@rozkaam.app`;
    const res = await createUserWithEmailAndPassword(auth, dummyEmail, pass);
    
    const userProfile: UserProfile = {
      uid: res.user.uid,
      role: "WORKER",
      fullName,
      phoneNumber,
      skillCategory,
      createdAt: new Date().toISOString(),
    };

    await setDoc(doc(db, "users", res.user.uid), userProfile);
    setProfile(userProfile);
    return res.user;
  };

  // Company Registration
  const registerCompany = async (
    companyName: string,
    contactInput: string,
    gstNumber: string,
    pass: string
  ) => {
    const isEmail = contactInput.includes("@");
    const email = isEmail ? contactInput : `${contactInput}@rozkaam.app`;
    
    const res = await createUserWithEmailAndPassword(auth, email, pass);
    
    const userProfile: UserProfile = {
      uid: res.user.uid,
      role: "COMPANY",
      fullName: companyName,
      phoneNumber: isEmail ? "" : contactInput,
      email: isEmail ? contactInput : "",
      gstNumber,
      createdAt: new Date().toISOString(),
    };

    await setDoc(doc(db, "users", res.user.uid), userProfile);
    setProfile(userProfile);
    return res.user;
  };

  // Logout Action
  const logout = async () => {
    await signOut(auth);
    setUser(null);
    setProfile(null);
  };

  return {
    user,
    profile,
    loading,
    registerWorker,
    registerCompany,
    logout,
  };
}