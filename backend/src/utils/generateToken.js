const jwt = require('jsonwebtoken');

const generateToken = (id, type = 'user') => {
  return jwt.sign({ id, type }, process.env.JWT_SECRET || 'your-secret-key', {
    expiresIn: process.env.JWT_EXPIRE || '7d',
  });
};

module.exports = generateToken;

