import { useState } from "react";
import { 
  collection, 
  addDoc, 
  onSnapshot
} from "firebase/firestore";
import { db } from "../constants/firebaseConfig";

export interface Job {
  id?: string;
  companyId: string;
  companyName: string;
  title: string;
  category: string;
  dailyPay: string;
  workersNeeded: string;
  workersHired?: string;
  timing: string;
  location: string;
  description?: string;
  status: "ACTIVE" | "COMPLETED";
  createdAt: string;
}

export interface JobApplication {
  id?: string;
  jobId: string;
  workerId: string;
  workerName: string;
  workerPhone: string;
  workerSkill: string;
  status: "PENDING" | "HIRED" | "REJECTED";
  appliedAt: string;
}

export function useJobs() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  // Simple Realtime Listener without complex query index requirement
  const subscribeToActiveJobs = (callback: (jobs: Job[]) => void) => {
    const jobsRef = collection(db, "jobs");

    return onSnapshot(
      jobsRef,
      (snapshot) => {
        const jobList: Job[] = snapshot.docs
          .map((docSnap) => ({
            id: docSnap.id,
            ...docSnap.data(),
          })) as Job[];
        
        // Filter active jobs & sort manually on app side
        const activeJobs = jobList.filter((j) => j.status === "ACTIVE");
        callback(activeJobs);
      },
      (error) => {
        console.error("Firestore Listen Error:", error);
      }
    );
  };

  // Post a New Job (Company Side)
  const postNewJob = async (jobData: Omit<Job, "id" | "createdAt" | "status">) => {
    setLoading(true);
    try {
      const newJob = {
        ...jobData,
        workersHired: "0",
        status: "ACTIVE",
        createdAt: new Date().toISOString(),
      };
      const docRef = await addDoc(collection(db, "jobs"), newJob);
      setLoading(false);
      return docRef.id;
    } catch (error) {
      setLoading(false);
      throw error;
    }
  };

  return {
    jobs,
    loading,
    subscribeToActiveJobs,
    postNewJob,
  };
}