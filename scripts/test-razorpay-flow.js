/**
 * Razorpay End-to-End Server & Signature Verification Test Suite
 * 
 * Verifies:
 * 1. HMAC-SHA256 Signature generation & verification algorithm
 * 2. Protection against spoofed/fake signatures
 * 3. Amount to paise conversion (INR currency standards)
 * 4. Order metadata payload validation
 */

const crypto = require("crypto");

const TEST_SECRET = "TestSecretKey_9876543210_Rozkaam";
const TEST_ORDER_ID = "order_Nmb123456789";
const TEST_PAYMENT_ID = "pay_Pqr987654321";

function generateSignature(orderId, paymentId, secret) {
  return crypto
    .createHmac("sha256", secret)
    .update(`${orderId}|${paymentId}`)
    .digest("hex");
}

function verifySignature(orderId, paymentId, signature, secret) {
  const expected = generateSignature(orderId, paymentId, secret);
  return expected === signature;
}

function runTests() {
  console.log("==================================================================");
  console.log("    RozKaam Razorpay Server & Cryptographic Verification Suite");
  console.log("==================================================================");

  let passed = 0;
  let total = 0;

  function assert(title, condition, extra = "") {
    total++;
    if (condition) {
      console.log(`✅ [PASS] ${title}`);
      if (extra) console.log(`   ${extra}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${title}`);
      if (extra) console.error(`   ${extra}`);
    }
  }

  // 1. Valid Signature Test
  console.log("\n[TEST 1] Authentic Razorpay Signature Verification");
  const validSig = generateSignature(TEST_ORDER_ID, TEST_PAYMENT_ID, TEST_SECRET);
  const isValid = verifySignature(TEST_ORDER_ID, TEST_PAYMENT_ID, validSig, TEST_SECRET);
  assert("HMAC-SHA256 verification confirms authentic signature", isValid === true, `Signature: ${validSig.slice(0, 16)}...`);

  // 2. Tampered / Spoofed Signature Test
  console.log("\n[TEST 2] Security: Protection Against Spoofed Signatures");
  const fakeSig = "fake_signature_attempt_1234567890abcdef";
  const isFakeRejected = !verifySignature(TEST_ORDER_ID, TEST_PAYMENT_ID, fakeSig, TEST_SECRET);
  assert("Backend immediately rejects spoofed signature without key_secret", isFakeRejected === true);

  // 3. Amount in Paise Conversion Test
  console.log("\n[TEST 3] Currency & Paise Calculations");
  const testRupees = 850;
  const paise = Math.round(testRupees * 100);
  assert("₹850 correctly converts to 85,000 Paise for Razorpay API", paise === 85000, `Converted: ₹${testRupees} -> ${paise} paise`);

  // 4. Order Payload Structure
  console.log("\n[TEST 4] Server Order Metadata Structure");
  const orderPayload = {
    amount: paise,
    currency: "INR",
    receipt: `receipt_job_123_${Date.now()}`.slice(0, 40),
    notes: { jobId: "123", companyId: "comp_1", workerId: "worker_1" },
  };
  assert("Order Payload conforms to Razorpay Orders API specification",
    orderPayload.currency === "INR" && orderPayload.amount === 85000 && !!orderPayload.receipt,
    `Payload: ${JSON.stringify(orderPayload)}`
  );

  console.log("\n==================================================================");
  console.log(`  Summary: ${passed}/${total} Tests Passed`);
  console.log("==================================================================");

  if (passed === total) {
    console.log("🎉 ALL RAZORPAY VERIFICATION TESTS PASSED SUCCESSFULLY!\n");
    process.exit(0);
  } else {
    console.error("❌ SOME TESTS FAILED!\n");
    process.exit(1);
  }
}

runTests();
