/**
 * RozKaam Production Razorpay Payment Backend
 * Supports both Firebase Cloud Functions and Standalone Node/Express HTTP Server
 * 
 * Flow:
 * 1. POST /api/payment/create-order -> Creates order via Razorpay Orders API with KEY_SECRET
 * 2. POST /api/payment/verify-signature -> Verifies HMAC-SHA256 signature using KEY_SECRET
 * 3. POST /api/payment/webhook -> Asynchronous webhook handler with WEBHOOK_SECRET verification
 * 4. Atomic Firestore Transactions -> Updates 'payments' and 'wallets' collections
 */

require("dotenv").config();
const crypto = require("crypto");
const Razorpay = require("razorpay");
const admin = require("firebase-admin");

// Initialize Firebase Admin SDK if not already initialized
if (!admin.apps.length) {
  try {
    admin.initializeApp({
      projectId: process.env.FIREBASE_PROJECT_ID || "rozkaam-fd58e",
    });
  } catch (e) {
    console.warn("Firebase Admin initialize warning:", e.message);
  }
}

const db = admin.apps.length ? admin.firestore() : null;

// Initialize Razorpay client with server-side environment credentials
const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID;
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET;
const RAZORPAY_WEBHOOK_SECRET = process.env.RAZORPAY_WEBHOOK_SECRET || "";

const razorpay = (RAZORPAY_KEY_ID && RAZORPAY_KEY_SECRET)
  ? new Razorpay({
      key_id: RAZORPAY_KEY_ID,
      key_secret: RAZORPAY_KEY_SECRET,
    })
  : null;

/**
 * 1. Server-Side Order Creation Logic
 */
async function createOrderLogic({ amount, jobId, companyId, workerId }) {
  if (!amount || Number(amount) <= 0) {
    throw new Error("Invalid payment amount. Amount must be greater than 0.");
  }

  const amountInPaise = Math.round(Number(amount) * 100);

  const options = {
    amount: amountInPaise,
    currency: "INR",
    receipt: `rcpt_${jobId}_${Date.now()}`.slice(0, 40),
    notes: {
      jobId: String(jobId || ""),
      companyId: String(companyId || ""),
      workerId: String(workerId || ""),
      platform: "RozKaam",
    },
  };

  const order = await razorpay.orders.create(options);

  // Record created order in Firestore 'payments' collection
  if (db) {
    try {
      await db.collection("payments").doc(order.id).set({
        orderId: order.id,
        companyId: String(companyId || ""),
        workerId: String(workerId || ""),
        jobId: String(jobId || ""),
        amount: Number(amount),
        currency: "INR",
        status: "CREATED",
        createdAt: new Date().toISOString(),
      });
    } catch (dbErr) {
      console.warn("Firestore pending payment record notice:", dbErr.message);
    }
  }

  return {
    success: true,
    orderId: order.id,
    amount: order.amount,
    currency: order.currency,
    keyId: RAZORPAY_KEY_ID,
  };
}

/**
 * 2. Server-Side Cryptographic Signature Verification Logic
 */
async function verifyPaymentLogic({
  razorpay_order_id,
  razorpay_payment_id,
  razorpay_signature,
  workerId,
  amount,
}) {
  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    throw new Error("Missing required payment verification parameters.");
  }

  // Idempotency check: Check if order was already successfully processed
  if (db) {
    try {
      const existingDoc = await db.collection("payments").doc(razorpay_order_id).get();
      if (existingDoc.exists && existingDoc.data().status === "SUCCESS") {
        return {
          success: true,
          verified: true,
          message: "Payment already verified and processed.",
          paymentId: razorpay_payment_id,
          orderId: razorpay_order_id,
        };
      }
    } catch (e) {}
  }

  // Cryptographic Signature Verification: HMAC-SHA256(order_id + "|" + payment_id, secret)
  const body = `${razorpay_order_id}|${razorpay_payment_id}`;
  const expectedSignature = crypto
    .createHmac("sha256", RAZORPAY_KEY_SECRET)
    .update(body)
    .digest("hex");

  const isAuthentic = expectedSignature === razorpay_signature;

  if (!isAuthentic) {
    if (db) {
      try {
        await db.collection("payments").doc(razorpay_order_id).set(
          {
            status: "FAILED_SIGNATURE_MISMATCH",
            paymentId: razorpay_payment_id,
            updatedAt: new Date().toISOString(),
          },
          { merge: true }
        );
      } catch (e) {}
    }
    throw new Error("Payment verification failed: Signature mismatch. Fraudulent transaction rejected.");
  }

  // Atomically update payment record & worker wallet balance in Firestore
  if (db) {
    try {
      const paymentRef = db.collection("payments").doc(razorpay_order_id);
      const cleanWorkerId = String(workerId || "").replace(/[^0-9]/g, "").slice(-10);
      const walletRef = db.collection("wallets").doc(cleanWorkerId);

      await db.runTransaction(async (transaction) => {
        transaction.set(
          paymentRef,
          {
            paymentId: razorpay_payment_id,
            signature: razorpay_signature,
            status: "SUCCESS",
            paidAt: new Date().toISOString(),
          },
          { merge: true }
        );

        if (cleanWorkerId) {
          transaction.set(
            walletRef,
            {
              workerId: cleanWorkerId,
              totalBalance: admin.firestore.FieldValue.increment(Number(amount || 0)),
              updatedAt: new Date().toISOString(),
            },
            { merge: true }
          );
        }
      });
    } catch (dbErr) {
      console.warn("Firestore transaction notice:", dbErr.message);
    }
  }

  return {
    success: true,
    verified: true,
    message: "Payment successfully verified and worker wallet credited.",
    paymentId: razorpay_payment_id,
    orderId: razorpay_order_id,
  };
}

/**
 * 3. Webhook Event Processing Logic
 */
async function processWebhookLogic(rawBody, signatureHeader) {
  if (!RAZORPAY_WEBHOOK_SECRET) {
    throw new Error("Webhook secret not configured on server.");
  }

  const expectedSignature = crypto
    .createHmac("sha256", RAZORPAY_WEBHOOK_SECRET)
    .update(rawBody)
    .digest("hex");

  if (expectedSignature !== signatureHeader) {
    throw new Error("Invalid webhook signature.");
  }

  const event = JSON.parse(rawBody);
  const eventName = event.event;

  if (eventName === "payment.captured" || eventName === "order.paid") {
    const paymentEntity = event.payload.payment.entity;
    const orderId = paymentEntity.order_id;
    const paymentId = paymentEntity.id;
    const amountInRupees = paymentEntity.amount / 100;
    const workerId = paymentEntity.notes?.workerId;

    if (db && orderId) {
      const paymentRef = db.collection("payments").doc(orderId);
      const paymentDoc = await paymentRef.get();

      if (paymentDoc.exists && paymentDoc.data().status !== "SUCCESS") {
        const cleanWorkerId = String(workerId || paymentDoc.data().workerId || "").replace(/[^0-9]/g, "").slice(-10);
        const walletRef = db.collection("wallets").doc(cleanWorkerId);

        await db.runTransaction(async (transaction) => {
          transaction.set(paymentRef, {
            paymentId,
            status: "SUCCESS",
            webhookProcessed: true,
            paidAt: new Date().toISOString(),
          }, { merge: true });

          if (cleanWorkerId) {
            transaction.set(walletRef, {
              workerId: cleanWorkerId,
              totalBalance: admin.firestore.FieldValue.increment(amountInRupees),
              updatedAt: new Date().toISOString(),
            }, { merge: true });
          }
        });
      }
    }
  }

  return { status: "ok" };
}

// -------------------------------------------------------------
// A. Firebase Cloud Functions Exports
// -------------------------------------------------------------
let functions;
try {
  functions = require("firebase-functions");
} catch (e) {
  functions = null;
}

if (functions) {
  exports.createRazorpayOrder = functions.https.onCall(async (data, context) => {
    try {
      return await createOrderLogic(data || {});
    } catch (error) {
      throw new functions.https.HttpsError("internal", error.message);
    }
  });

  exports.verifyRazorpayPayment = functions.https.onCall(async (data, context) => {
    try {
      return await verifyPaymentLogic(data || {});
    } catch (error) {
      throw new functions.https.HttpsError("permission-denied", error.message);
    }
  });

  exports.razorpayWebhook = functions.https.onRequest(async (req, res) => {
    try {
      const signature = req.headers["x-razorpay-signature"];
      await processWebhookLogic(JSON.stringify(req.body), signature);
      res.status(200).json({ status: "ok" });
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  });
}

// -------------------------------------------------------------
// B. Express REST API Server (Standalone deployment)
// -------------------------------------------------------------
const express = require("express");
const cors = require("cors");
const app = express();

app.use(cors());
app.use(express.json());

app.get("/health", (req, res) => {
  res.json({
    status: "OK",
    timestamp: new Date().toISOString(),
    service: "RozKaam Razorpay Payment Gateway Backend",
    keyConfigured: !!RAZORPAY_KEY_ID,
    secretConfigured: RAZORPAY_KEY_SECRET !== "YourRazorpaySecretKeyHere",
  });
});

app.post("/api/payment/create-order", async (req, res) => {
  try {
    const result = await createOrderLogic(req.body);
    res.json(result);
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

app.post("/api/payment/verify-signature", async (req, res) => {
  try {
    const result = await verifyPaymentLogic(req.body);
    res.json(result);
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

app.post("/api/payment/webhook", async (req, res) => {
  try {
    const signature = req.headers["x-razorpay-signature"];
    const result = await processWebhookLogic(JSON.stringify(req.body), signature);
    res.json(result);
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

const PORT = process.env.PORT || 5000;
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`=======================================================`);
    console.log(`  RozKaam Payment Server running on port ${PORT}`);
    console.log(`  - Health Check: GET http://localhost:${PORT}/health`);
    console.log(`  - Create Order: POST http://localhost:${PORT}/api/payment/create-order`);
    console.log(`  - Verify Sig:   POST http://localhost:${PORT}/api/payment/verify-signature`);
    console.log(`  - Webhooks:     POST http://localhost:${PORT}/api/payment/webhook`);
    console.log(`=======================================================`);
  });
}

module.exports = {
  app,
  createOrderLogic,
  verifyPaymentLogic,
  processWebhookLogic,
};
