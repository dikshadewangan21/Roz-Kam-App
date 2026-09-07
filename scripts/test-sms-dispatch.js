const https = require('https');

const key = '0b854f08-a96e-11f1-9cb1-0200cd936042';
const phone = '9876543210';

function testEndpoint(urlPath, label) {
  https.get(`https://2factor.in/API/V1/${key}/${urlPath}`, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => console.log(`[${label}] Response:`, data));
  });
}

// Test 1: ROZKAAM_OTP
testEndpoint(`SMS/${phone}/123456/ROZKAAM_OTP`, 'CUSTOM TEMPLATE ROZKAAM_OTP');

// Test 2: AUTOGEN (Default working 2Factor SMS DLT template)
testEndpoint(`SMS/${phone}/AUTOGEN`, 'DEFAULT AUTOGEN SMS TEMPLATE');

// Test 3: Fast2SMS Quick SMS Route
const postData = JSON.stringify({
  route: 'otp',
  variables_values: '123456',
  numbers: '9876543210'
});

const req = https.request({
  hostname: 'www.fast2sms.com',
  path: '/dev/bulkV2',
  method: 'POST',
  headers: {
    'authorization': 'AaHNYI6WqOpJf31PS9lh7gMroGBRyCTLjeDFQd8VKw0m5kunxU8VoNvdux6IYWUjcQ7SRgXtlpean1Hq',
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(postData)
  }
}, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => console.log('[Fast2SMS] Response:', data));
});
req.write(postData);
req.end();
