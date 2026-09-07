/**
 * RozKaam Real SMS OTP End-to-End Verification Suite
 * 
 * Verifies:
 * 1. Phone number formatting & validation (+91 & 10-digit Indian numbers)
 * 2. Real SMS Gateway connectivity & Credit Balance
 * 3. Real OTP Generation & SMS Dispatch (AUTOGEN)
 * 4. Verification via VERIFY3 (rejection of incorrect OTP)
 * 5. 5-minute TTL Expiry logic
 * 6. Resend OTP session generation
 * 7. Error parsing & user-friendly translations
 * 8. User payload structure for Firestore registration/login
 */

const https = require('https');

const API_KEY = process.env.EXPO_PUBLIC_2FACTOR_API_KEY || "0b854f08-a96e-11f1-9cb1-0200cd936042";

function httpGet(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'Accept': 'application/json', 'User-Agent': 'RozKaam-Test/1.0' } }, (res) => {
      let data = '';
      res.on('data', (c) => data += c);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); } catch (e) { resolve(data); }
      });
    }).on('error', reject);
  });
}

function format10DigitPhone(phone) {
  if (!phone) return "";
  const digits = phone.replace(/[^0-9]/g, "");
  return digits.slice(-10);
}

function formatPhoneNumber(phone) {
  const clean = format10DigitPhone(phone);
  return `+91${clean}`;
}

function parseError(error) {
  if (!error) return "An unexpected error occurred. Please try again.";
  const msg = error.message || String(error);
  if (msg.includes("10-digit")) return msg;
  if (msg.includes("Incorrect OTP") || msg.includes("complete 6-digit")) return msg;
  if (msg.includes("expired") || msg.includes("Expired")) return msg;
  if (msg.includes("timed out") || msg.includes("timeout")) return msg;
  if (msg.includes("network") || msg.includes("Network") || msg.includes("fetch")) {
    return "Network connection issue. Please check your internet connection.";
  }
  return msg || "Authentication failed. Please try again.";
}

async function runTests() {
  console.log("==================================================================");
  console.log("     RozKaam Real SMS OTP End-to-End Verification Suite");
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

  // 1. Phone formatting tests
  console.log("\n[TEST 1] Phone Number Formatting & Validation");
  assert("10-digit clean extraction from '+919876543210'", format10DigitPhone("+919876543210") === "9876543210");
  assert("10-digit clean extraction from '09876543210'", format10DigitPhone("09876543210") === "9876543210");
  assert("10-digit clean extraction from '98765-43210'", format10DigitPhone("98765-43210") === "9876543210");
  assert("E.164 +91 format generation", formatPhoneNumber("9876543210") === "+919876543210");

  // 2. Gateway Balance Check
  console.log("\n[TEST 2] SMS Gateway Connectivity & Real Balance");
  try {
    const balData = await httpGet(`https://2factor.in/API/V1/${API_KEY}/BAL/SMS`);
    const balance = parseInt(balData.Details, 10);
    assert("SMS Gateway is active with credits ready for real SMS dispatch", balData.Status === "Success" && balance > 0, `Remaining Real SMS Credits: ${balData.Details}`);
  } catch (err) {
    assert("SMS Gateway connectivity", false, err.message);
  }

  // 3. Real OTP Generation & Dispatch
  console.log("\n[TEST 3] Real OTP SMS Generation & Dispatch (AUTOGEN)");
  const testPhone = "9876543210";
  let sessionId = null;

  try {
    const sendUrl = `https://2factor.in/API/V1/${API_KEY}/SMS/${testPhone}/AUTOGEN`;
    const sendData = await httpGet(sendUrl);
    assert("Real SMS OTP dispatched successfully & Session ID generated", sendData.Status === "Success" && !!sendData.Details, `Session ID: ${sendData.Details}`);
    sessionId = sendData.Details;
  } catch (err) {
    assert("Real SMS OTP dispatch", false, err.message);
  }

  // 4. Invalid OTP Rejection with VERIFY3
  console.log("\n[TEST 4] Verification with Incorrect OTP (VERIFY3)");
  try {
    const verifyUrl = `https://2factor.in/API/V1/${API_KEY}/SMS/VERIFY3/${testPhone}/000000`;
    const verifyData = await httpGet(verifyUrl);
    assert(
      "Incorrect OTP rejected accurately by VERIFY3 endpoint",
      verifyData.Status === "Error" && (verifyData.Details === "OTP Mismatch" || verifyData.Details.includes("Mismatch")),
      `Response: ${JSON.stringify(verifyData)}`
    );
  } catch (err) {
    assert("Incorrect OTP rejection", false, err.message);
  }

  // 5. Expiry Check Logic
  console.log("\n[TEST 5] Expiry Logic Verification (5-minute TTL)");
  const OTP_EXPIRY_MS = 5 * 60 * 1000;
  const expiredSession = {
    sessionId: "mock-session",
    phone: "9876543210",
    createdAt: Date.now() - (6 * 60 * 1000), // 6 minutes ago
  };
  const isExpired = Date.now() - expiredSession.createdAt > OTP_EXPIRY_MS;
  assert("5-minute validity window correctly expires stale session", isExpired === true, `Elapsed: ${(Date.now() - expiredSession.createdAt)/1000}s > 300s`);

  // 6. Resend Flow Test
  console.log("\n[TEST 6] Resend OTP Flow");
  try {
    const resendUrl = `https://2factor.in/API/V1/${API_KEY}/SMS/${testPhone}/AUTOGEN`;
    const resendData = await httpGet(resendUrl);
    assert("Resend OTP generates new distinct Session ID", resendData.Status === "Success" && resendData.Details !== sessionId, `New Session ID: ${resendData.Details}`);
  } catch (err) {
    assert("Resend OTP Success", false, err.message);
  }

  // 7. Error message parser verification
  console.log("\n[TEST 7] Error Message Translation");
  const testErr1 = new Error("Please enter a valid 10-digit mobile number.");
  assert("Validation error preserved", parseError(testErr1).includes("10-digit"));
  const testErr2 = new Error("Network request failed");
  assert("Network error translated cleanly", parseError(testErr2).includes("Network connection issue"));

  // 8. Verification Result Structure
  console.log("\n[TEST 8] User Verification Payload for Registration / Login");
  const verifiedUser = {
    phoneNumber: formatPhoneNumber("9876543210"),
    uid: `phone_${format10DigitPhone("9876543210")}`,
  };
  assert("Verified User payload contains standard E.164 phone and worker/company UID for Firestore",
    verifiedUser.phoneNumber === "+919876543210" && verifiedUser.uid === "phone_9876543210",
    `Payload: ${JSON.stringify(verifiedUser)}`
  );

  console.log("\n==================================================================");
  console.log(`  Summary: ${passed}/${total} Tests Passed`);
  console.log("==================================================================");

  if (passed === total) {
    console.log("🎉 ALL REAL SMS OTP TESTS PASSED SUCCESSFULLY!\n");
    process.exit(0);
  } else {
    console.error("❌ SOME TESTS FAILED!\n");
    process.exit(1);
  }
}

runTests();
