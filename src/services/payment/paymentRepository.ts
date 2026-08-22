import { db } from "../../constants/firebaseConfig";
import {
  collection,
  addDoc,
  doc,
  setDoc,
  getDoc,
  serverTimestamp,
  increment,
} from "firebase/firestore";
import { PaymentRecord } from "./types";

// 1. Record transaction in 'payments' collection (Company -> Worker)
export const createPaymentRecord = async (data: Omit<PaymentRecord, "createdAt">) => {
  try {
    const docRef = await addDoc(collection(db, "payments"), {
      ...data,
      createdAt: serverTimestamp(),
    });
    return { success: true, paymentId: docRef.id };
  } catch (error) {
    console.error("Firestore Payment Error:", error);
    return { success: false, error };
  }
};

// 2. Update Worker Wallet Balance
export const updateWorkerWallet = async (workerId: string, amount: number) => {
  try {
    const walletRef = doc(db, "wallets", workerId);
    const walletSnap = await getDoc(walletRef);

    if (walletSnap.exists()) {
      await setDoc(
        walletRef,
        { totalBalance: increment(amount), updatedAt: serverTimestamp() },
        { merge: true }
      );
    } else {
      await setDoc(walletRef, {
        workerId,
        totalBalance: amount,
        updatedAt: serverTimestamp(),
      });
    }
    return { success: true };
  } catch (error) {
    console.error("Wallet Update Error:", error);
    return { success: false, error };
  }
};

// 3. Create Withdrawal Request for Worker (Worker -> Bank/UPI)
export const createWithdrawalRequest = async (
  workerId: string,
  amount: number,
  upiId: string
) => {
  try {
    const docRef = await addDoc(collection(db, "withdrawals"), {
      workerId,
      amount,
      upiId,
      status: "PENDING", // Initial status for tracking
      createdAt: serverTimestamp(),
    });

    // Deduct requested amount from Worker's Wallet Balance
    const walletRef = doc(db, "wallets", workerId);
    await setDoc(
      walletRef,
      { totalBalance: increment(-amount), updatedAt: serverTimestamp() },
      { merge: true }
    );

    return { success: true, withdrawalId: docRef.id };
  } catch (error) {
    console.error("Withdrawal Error:", error);
    return { success: false, error };
  }
};