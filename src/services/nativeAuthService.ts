/**
 * RozKaam Pure Firebase Phone Authentication Bridge
 * 
 * 100% Official Google Firebase Phone Auth for Real Carrier SMS OTP Delivery
 * and secure Firebase User Session & Firestore Profile synchronization.
 */

import {
  sendFirebaseSMSOTP,
  verifyFirebaseSMSOTP,
  resendFirebaseSMSOTP,
  parseFirebaseSMSError,
  format10DigitPhone,
  formatPhoneNumber,
} from "./firebaseNativeAuthService";

/**
 * Sends real Google Firebase SMS OTP
 */
export async function sendFirebaseOtp(phoneNumber: string): Promise<any> {
  return sendFirebaseSMSOTP(phoneNumber);
}

/**
 * Verifies 6-digit OTP code directly with Firebase
 */
export async function verifyFirebaseOtp(
  code: string,
  sessionData?: any
): Promise<any> {
  const phone = typeof sessionData === "string" ? sessionData : sessionData?.phone;
  return verifyFirebaseSMSOTP(code, phone);
}

/**
 * Resends Firebase SMS OTP
 */
export async function resendFirebaseOtp(phoneNumber: string): Promise<any> {
  return resendFirebaseSMSOTP(phoneNumber);
}

/**
 * Aliases
 */
export const sendNativePhoneOtp = sendFirebaseOtp;
export const confirmNativeOtp = (confirmation: any, code: string) =>
  verifyFirebaseOtp(code, confirmation);
export const sendOTP = sendFirebaseOtp;
export const verifyOTP = verifyFirebaseOtp;
export const resendOTP = resendFirebaseOtp;
export const clearOTPSession = () => {};

/**
 * User-friendly error message parser
 */
export const parseAuthErrorMessage = parseFirebaseSMSError;
export const parseOTPError = parseFirebaseSMSError;

export {
  format10DigitPhone,
  formatPhoneNumber,
  sendFirebaseSMSOTP,
  verifyFirebaseSMSOTP,
  resendFirebaseSMSOTP,
  parseFirebaseSMSError,
};
