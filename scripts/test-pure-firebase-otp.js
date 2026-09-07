const https = require('https');

const apiKey = 'AIzaSyCiWCcIEJaVV6LPrD0c_0sPBmQwkk95OcQ';
const postData = JSON.stringify({ phoneNumber: '+919876543210' });

const options = {
  hostname: 'identitytoolkit.googleapis.com',
  path: `/v1/accounts:sendVerificationCode?key=${apiKey}`,
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(postData)
  }
};

const req = https.request(options, (res) => {
  let body = '';
  res.on('data', chunk => body += chunk);
  res.on('end', () => console.log('Firebase Response (' + res.statusCode + '):', body));
});

req.on('error', (e) => console.error('Req error:', e));
req.write(postData);
req.end();
