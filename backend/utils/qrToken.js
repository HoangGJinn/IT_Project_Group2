const crypto = require('crypto');

const generateQRToken = () => {
  return crypto.randomBytes(8).toString('hex').toUpperCase();
};

module.exports = {
  generateQRToken
};

