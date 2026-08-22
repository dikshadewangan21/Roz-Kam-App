import {
  collection,
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";

import { db } from "../constants/firebaseConfig";

export interface AttendanceData {
  workerId: string;
  companyId: string;
  jobId: string;
  latitude: number;
  longitude: number;
}

export async function checkInWorker(data: AttendanceData) {
  try {
    const attendanceDocId = `${data.jobId}_${data.workerId}`;
    const attendanceRef = doc(db, "attendance", attendanceDocId);

    const docSnap = await getDoc(attendanceRef);

    if (docSnap.exists() && docSnap.data().scanned === true) {
      return {
        success: false,
        alreadyMarked: true,
      };
    }

    await setDoc(attendanceRef, {
      ...data,
      status: "CHECKED_IN",
      scanned: true,
      scannedAt: serverTimestamp(),
      checkInTime: serverTimestamp(),
    });

    return {
      success: true,
      alreadyMarked: false,
      attendanceId: attendanceDocId,
    };
  } catch (error) {
    console.log("Attendance Error:", error);

    return {
      success: false,
      alreadyMarked: false,
    };
  }
}