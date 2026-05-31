const express = require('express');
const router = express.Router();
const { 
  register, 
  login, 
  getMe, 
  updateProfile, 
  setupSecurity, 
  verifyPin, 
  verifyBiometric,
  forgotPassword,
  resetPassword
} = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

router.post('/register', register);
router.post('/login', login);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password/:token', resetPassword);
router.get('/me', protect, getMe);
router.put('/me', protect, updateProfile);
router.post('/setup-security', protect, setupSecurity);
router.post('/verify-pin', protect, verifyPin);
router.post('/verify-biometric', protect, verifyBiometric);

module.exports = router;
