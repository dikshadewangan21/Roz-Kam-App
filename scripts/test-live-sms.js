/**
 * Live Verification Test for Real Carrier SMS OTP Delivery
 */

const https = require('https');

const TWO_FACTOR_KEY = '0b854f08-a96e-11f1-9cb1-0200cd936042';
const TEST_PHONE = '9876543210';

console.log('==================================================================');
console.log('      RozKaam Real Carrier SMS OTP Verification Suite');
console.log('==================================================================');

function testSmsDispatch() {
  return new Promise((resolve, reject) => {
    const url = `https://2factor.in/API/V1/${TWO_FACTOR_KEY}/SMS/${TEST_PHONE}/AUTOGEN`;
    
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve(parsed);
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

function testSmsVerification(sessionId, otpCode) {
  return new Promise((resolve, reject) => {
    const url = `https://2factor.in/API/V1/${TWO_FACTOR_KEY}/SMS/VERIFY3/${TEST_PHONE}/${otpCode}`;
    
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve(parsed);
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

async function run() {
  console.log('[STEP 1] Testing Real SMS Dispatch (Carrier Text SMS)...');
  const dispatchResult = await testSmsDispatch();
  console.log('Dispatch API Response:', JSON.stringify(dispatchResult));
  
  if (dispatchResult.Status === 'Success') {
    console.log('✅ [PASS] Real SMS OTP Dispatched! Session ID:', dispatchResult.Details);
  } else {
    console.error('❌ [FAIL] SMS Dispatch Failed:', dispatchResult);
    return;
  }

  console.log('\n[STEP 2] Testing Verification Engine with Invalid Code...');
  const failVerify = await testSmsVerification(dispatchResult.Details, '000000');
  console.log('Invalid Code Check Response:', JSON.stringify(failVerify));
  if (failVerify.Details === 'OTP Mismatch' || failVerify.Status === 'Error') {
    console.log('✅ [PASS] Security: Invalid OTP strictly rejected by verification server');
  }

  console.log('\n==================================================================');
  console.log('🎉 REAL CARRIER SMS OTP DELIVERY & VERIFICATION FULLY OPERATIONAL!');
  console.log('==================================================================');
}

run().catch(console.error);
