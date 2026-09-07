/**
 * Universal Pure Firebase Phone Authentication Service
 * 
 * Works seamlessly across Android Native APK, iOS, Web, and Expo:
 * - Native Android/iOS: Uses @react-native-firebase/auth PhoneAuthProvider
 * - Web / Managed Expo: Uses official firebase/auth & Firebase Identity Toolkit
 * - Dispatches real carrier SMS text messages (Blaze Plan enabled)
 * - Verifies genuine Firebase user sessions & tokens.
 */

import { Platform } from "react-native";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth as jsAuth, db } from "../constants/firebaseConfig";
import { signInWithPhoneNumber as jsSignInWithPhoneNumber, RecaptchaVerifier } from "firebase/auth";

let activeConfirmationResult: any = null;
let activeTargetPhone: string = "";

/**
 * Extracts 10-digit Indian phone number
 */
export function format10DigitPhone(phone: string): string {
  if (!phone) return "";
  const digits = phone.replace(/[^0-9]/g, "");
  return digits.slice(-10);
}

/**
 * Formats E.164 phone (+91XXXXXXXXXX)
 */
export function formatPhoneNumber(phone: string): string {
  const clean10 = format10DigitPhone(phone);
  return `+91${clean10}`;
}

/**
 * Safely resolves Native Firebase Auth function on Android / iOS
 */
function getCallableNativeAuth(): any {
  if (Platform.OS === "web") return null;
  try {
    // @ts-ignore
    const rnAuth = require("@react-native-firebase/auth");
    if (typeof rnAuth === "function") return rnAuth;
    if (rnAuth && typeof rnAuth.default === "function") return rnAuth.default;
    return null;
  } catch (e) {
    return null;
  }
}

/**
 * 1. Sends Real Google Firebase SMS OTP
 */
export async function sendFirebaseSMSOTP(phoneNumber: string): Promise<{
  success: boolean;
  phone: string;
  message: string;
}> {
  const cleanPhone = format10DigitPhone(phoneNumber);

  if (cleanPhone.length !== 10) {
    throw new Error("Please enter a valid 10-digit Indian mobile number.");
  }

  const formattedPhone = `+91${cleanPhone}`;
  activeTargetPhone = cleanPhone;
  activeConfirmationResult = null;

  const nativeAuthFn = getCallableNativeAuth();

  // Branch 1: Native Firebase Auth (For installed Android APK / iOS)
  if (nativeAuthFn) {
    try {
      const confirmation = await nativeAuthFn().signInWithPhoneNumber(formattedPhone);
      if (confirmation && confirmation.confirm) {
        activeConfirmationResult = confirmation;
        return {
          success: true,
          phone: cleanPhone,
          message: `Real Google Firebase SMS OTP sent to ${formattedPhone}.`,
        };
      }
    } catch (nativeErr: any) {
      console.warn("Native Firebase signInWithPhoneNumber notice:", nativeErr?.message);
      const errorMsg = nativeErr?.message || "";
      if (errorMsg.includes("billing-not-enabled") || errorMsg.includes("BILLING_NOT_ENABLED")) {
        throw new Error("Firebase project requires billing. Please link Blaze plan in Firebase Console.");
      }
      if (errorMsg.includes("quota-exceeded") || errorMsg.includes("QUOTA_EXCEEDED")) {
        throw new Error("SMS quota exceeded. Please check Firebase Console phone auth quota.");
      }
      if (errorMsg.includes("invalid-phone-number") || errorMsg.includes("INVALID_PHONE_NUMBER")) {
        throw new Error("Invalid mobile number format. Please enter a valid 10-digit number.");
      }
      if (errorMsg.includes("too-many-requests")) {
        throw new Error("Too many requests from this device. Please try again in a few minutes.");
      }
      if (errorMsg.includes("play-integrity") || errorMsg.includes("app-not-authorized")) {
        throw new Error("App verification required. Please add SHA-256 fingerprint in Firebase Console.");
      }
      throw new Error(nativeErr.message || "Failed to send Firebase SMS OTP.");
    }
  }

  // Branch 2: Web & JS SDK / Identity Toolkit Dispatch
  if (Platform.OS === "web" && typeof window !== "undefined") {
    try {
      // Setup invisible recaptcha verifier on web if available
      let verifier = (window as any).recaptchaVerifier;
      if (!verifier) {
        let container = document.getElementById("recaptcha-container");
        if (!container) {
          container = document.createElement("div");
          container.id = "recaptcha-container";
          document.body.appendChild(container);
        }
        verifier = new RecaptchaVerifier(jsAuth, "recaptcha-container", {
          size: "invisible",
        });
        (window as any).recaptchaVerifier = verifier;
      }

      const confirmation = await jsSignInWithPhoneNumber(jsAuth, formattedPhone, verifier);
      activeConfirmationResult = confirmation;
      return {
        success: true,
        phone: cleanPhone,
        message: `Real Google Firebase SMS OTP sent to ${formattedPhone}.`,
      };
    } catch (webErr: any) {
      console.warn("Web Firebase Phone Auth notice:", webErr?.message);
    }
  }

  // Branch 3: Firebase Identity Toolkit REST API
  try {
    const apiKey = process.env.EXPO_PUBLIC_FIREBASE_API_KEY || "";
    const response = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:sendVerificationCode?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phoneNumber: formattedPhone,
        }),
      }
    );

    const data = await response.json();

    if (data.sessionInfo) {
      activeConfirmationResult = { sessionInfo: data.sessionInfo };
      return {
        success: true,
        phone: cleanPhone,
        message: `Real Google Firebase SMS OTP sent to ${formattedPhone}.`,
      };
    }

    if (data.error?.message) {
      const msg = data.error.message;
      if (msg.includes("BILLING_NOT_ENABLED")) {
        throw new Error("Firebase project requires billing to be enabled. Please link Blaze plan in Firebase Console.");
      }
      if (msg.includes("TOO_MANY_ATTEMPTS_TRY_LATER")) {
        throw new Error("Too many OTP requests. Please wait a few minutes before trying again.");
      }
      if (msg.includes("INVALID_PHONE_NUMBER")) {
        throw new Error("Invalid phone number format. Please check the 10-digit number.");
      }
      if (msg.includes("MISSING_CLIENT_IDENTIFIER")) {
        throw new Error("Firebase SMS requires app verification. Please test on Android device / APK with SHA-256 configured in Firebase Console.");
      }
      throw new Error(msg);
    }
  } catch (restErr: any) {
    throw new Error(restErr?.message || "Failed to connect to Firebase Authentication server.");
  }

  throw new Error("Failed to dispatch Firebase SMS OTP. Please try again.");
}

/**
 * 2. Verifies 6-Digit SMS OTP directly with Firebase Auth
 */
export async function verifyFirebaseSMSOTP(
  userEnteredOTP: string,
  phoneNumber?: string
): Promise<{
  success: boolean;
  user: {
    phoneNumber: string;
    uid: string;
  };
}> {
  const cleanCode = (userEnteredOTP || "").trim().replace(/[^0-9]/g, "");
  const cleanPhone = format10DigitPhone(phoneNumber || activeTargetPhone);

  if (cleanCode.length !== 6) {
    throw new Error("Please enter the complete 6-digit OTP received via SMS.");
  }

  // Branch 1: Confirmation Result (Native SDK & Web JS SDK)
  if (activeConfirmationResult && activeConfirmationResult.confirm) {
    try {
      const userCredential = await activeConfirmationResult.confirm(cleanCode);
      activeConfirmationResult = null;
      return {
        success: true,
        user: {
          uid: userCredential.user?.uid || `phone_${cleanPhone}`,
          phoneNumber: userCredential.user?.phoneNumber || `+91${cleanPhone}`,
        },
      };
    } catch (firebaseErr: any) {
      const msg = firebaseErr.message || "";
      if (msg.includes("invalid-verification-code") || msg.includes("INVALID_CODE")) {
        throw new Error("Incorrect OTP code. Please check your SMS and re-enter.");
      }
      if (msg.includes("session-expired") || msg.includes("SESSION_EXPIRED")) {
        throw new Error("OTP has expired. Please tap 'Resend OTP'.");
      }
      throw new Error(firebaseErr.message || "Firebase OTP verification failed.");
    }
  }

  // Branch 2: Firebase REST Identity Toolkit signInWithPhoneNumber
  if (activeConfirmationResult && activeConfirmationResult.sessionInfo) {
    try {
      const apiKey = process.env.EXPO_PUBLIC_FIREBASE_API_KEY || "";
      const response = await fetch(
        `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPhoneNumber?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionInfo: activeConfirmationResult.sessionInfo,
            code: cleanCode,
          }),
        }
      );

      const data = await response.json();

      if (data.idToken && data.localId) {
        activeConfirmationResult = null;
        return {
          success: true,
          user: {
            uid: data.localId,
            phoneNumber: data.phoneNumber || `+91${cleanPhone}`,
          },
        };
      }

      if (data.error?.message) {
        if (data.error.message.includes("INVALID_CODE")) {
          throw new Error("Incorrect OTP code. Please check your SMS and re-enter.");
        }
        if (data.error.message.includes("SESSION_EXPIRED")) {
          throw new Error("OTP session expired. Please tap 'Resend OTP'.");
        }
        throw new Error(data.error.message);
      }
    } catch (restVerifyErr: any) {
      throw new Error(restVerifyErr?.message || "Failed to verify Firebase OTP.");
    }
  }

  throw new Error("No active Firebase OTP session found. Please tap 'Resend OTP'.");
}

/**
 * 3. Resends Firebase SMS OTP
 */
export async function resendFirebaseSMSOTP(phoneNumber: string): Promise<any> {
  return sendFirebaseSMSOTP(phoneNumber);
}

/**
 * 4. Human-readable error message parser
 */
export function parseFirebaseSMSError(error: any): string {
  if (!error) return "An unexpected error occurred. Please try again.";
  const msg: string = error.message || String(error);

  if (msg.includes("10-digit")) return msg;
  if (msg.includes("Incorrect OTP") || msg.includes("complete 6-digit")) return msg;
  if (msg.includes("expired") || msg.includes("Expired")) return msg;
  if (msg.includes("BILLING_NOT_ENABLED")) {
    return "Firebase billing account needs to be linked to rozkaam-fd58e in Google Cloud Console.";
  }
  if (msg.includes("App verification") || msg.includes("MISSING_CLIENT_IDENTIFIER")) {
    return "App verification required: Please add SHA-256 fingerprint in Firebase Console (Project Settings -> General -> Android App).";
  }
  if (msg.includes("too-many-requests") || msg.includes("TOO_MANY_ATTEMPTS_TRY_LATER")) {
    return "Google Firebase security rate-limit: Too many OTP requests were sent to this number in a short time. Please wait 10-15 minutes or test with another mobile number.";
  }
  if (msg.includes("Missing or insufficient permissions")) {
    return "Firestore rules need to be published in Firebase Console -> Firestore Database -> Rules.";
  }
  if (msg.includes("network") || msg.includes("fetch") || msg.includes("offline")) {
    return "Network connection issue. Please check your internet connection.";
  }

  return msg || "Authentication failed. Please try again.";
}
