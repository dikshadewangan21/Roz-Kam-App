export interface PaymentRecord {
  paymentId?: string;
  companyId: string;
  workerId: string;
  jobId: string;
  amount: number;
  razorpayOrderId: string;
  razorpayPaymentId: string;
  status: "PENDING" | "SUCCESS" | "FAILED";
  createdAt?: any;
}

export interface InitiatePaymentParams {
  companyId: string;
  workerId: string;
  jobId: string;
  amount: number;
  companyName: string;
  companyPhone: string;
}