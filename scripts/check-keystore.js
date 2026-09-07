const fs = require('fs');
const crypto = require('crypto');

try {
  const keystoreData = fs.readFileSync('android/app/debug.keystore');
  console.log('Keystore file size:', keystoreData.length, 'bytes');
  const sha256 = crypto.createHash('sha256').update(keystoreData).digest('hex');
  console.log('Keystore hash:', sha256);
} catch (e) {
  console.error('Error reading keystore:', e.message);
}
