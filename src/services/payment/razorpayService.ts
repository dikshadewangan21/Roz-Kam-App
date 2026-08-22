// @ts-ignore
import RazorpayCheckout from "react-native-razorpay";
import { InitiatePaymentParams } from "./types";
import { createPaymentRecord, updateWorkerWallet } from "./paymentRepository";

export const processSalaryPayment = async ({
  companyId,
  workerId,
  jobId,
  amount,
  companyName,
  companyPhone,
}: InitiatePaymentParams): Promise<{ success: boolean; message: string }> => {
  return new Promise((resolve) => {
    const options = {
      description: `Daily Salary Release for Job #${jobId}`,
      image: "https://rozkaam.app/logo.png",
      currency: "INR",
      key: "rzp_test_TJaHsVWq2l0lqK", // Razorpay Dashboard se Test Key daal dena
      amount: amount * 100, // Amount in Paise (e.g. ₹850 = 85000)
      name: companyName || "Rozkaam Employer",
      prefill: {
        contact: companyPhone,
      },
      theme: { color: "#2563EB" },
    };

    RazorpayCheckout.open(options)
      .then(async (data: any) => {
        const razorpayPaymentId = data.razorpay_payment_id || "pay_test_123";
        const razorpayOrderId = data.razorpay_order_id || "order_test_123";

        // Save to Firestore 'payments'
        await createPaymentRecord({
          companyId,
          workerId,
          jobId,
          amount,
          razorpayOrderId,
          razorpayPaymentId,
          status: "SUCCESS",
        });

        // Update Worker Wallet
        await updateWorkerWallet(workerId, amount);

        resolve({ success: true, message: "Payment Released Successfully 👍" });
      })
      .catch((error: any) => {
        console.log("Razorpay Cancelled/Failed:", error);
        resolve({ success: false, message: "Payment cancelled or failed." });
      });
  });
};