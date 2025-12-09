const crypto = require('crypto');

const generateQRToken = () => {
  // Generate 8 bytes = 16 hex characters (always exactly 16 chars)
  return crypto.randomBytes(8).toString('hex').toUpperCase();
};

module.exports = {
  generateQRToken,
};
