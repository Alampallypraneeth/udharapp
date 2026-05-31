const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');
const { sendEmail } = require('../services/mailService');

// Generate JWT
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '30d' });
};

// @desc    Register a new store owner
// @route   POST /api/auth/register
const register = async (req, res, next) => {
  try {
    const { name, email, password, storeName, phone, avatar } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'An account with this email already exists',
      });
    }

    const user = await User.create({ name, email, password, storeName, phone, avatar });

    const token = generateToken(user._id);

    res.status(201).json({
      success: true,
      data: {
        _id: user._id,
        name: user.name,
        email: user.email,
        storeName: user.storeName,
        phone: user.phone,
        upiId: user.upiId || '',
        language: user.language || 'en',
        avatar: user.avatar || '',
        hasPin: user.hasPin || false,
        isBiometricEnabled: user.isBiometricEnabled || false,
        biometricCredentialId: user.biometricCredentialId || '',
      },
      token,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Login store owner
// @route   POST /api/auth/login
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and password',
      });
    }

    const user = await User.findOne({ email }).select('+password');

    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
    }

    const token = generateToken(user._id);

    res.status(200).json({
      success: true,
      data: {
        _id: user._id,
        name: user.name,
        email: user.email,
        storeName: user.storeName,
        phone: user.phone,
        upiId: user.upiId || '',
        language: user.language || 'en',
        avatar: user.avatar || '',
        hasPin: user.hasPin || false,
        isBiometricEnabled: user.isBiometricEnabled || false,
        biometricCredentialId: user.biometricCredentialId || '',
      },
      token,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get logged-in user profile
// @route   GET /api/auth/me
const getMe = async (req, res, next) => {
  try {
    res.status(200).json({
      success: true,
      data: req.user,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update user profile
// @route   PUT /api/auth/me
const updateProfile = async (req, res, next) => {
  try {
    const { name, storeName, phone, upiId, language, avatar } = req.body;
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { name, storeName, phone, upiId, language, avatar },
      { new: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Setup PIN and Biometrics
// @route   POST /api/auth/setup-security
const setupSecurity = async (req, res, next) => {
  try {
    const { pin, isBiometricEnabled, biometricCredentialId, biometricPublicKey } = req.body;
    
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (pin !== undefined) {
      user.pin = pin;
    }
    
    if (isBiometricEnabled !== undefined) {
      user.isBiometricEnabled = isBiometricEnabled;
    }
    if (biometricCredentialId !== undefined) {
      user.biometricCredentialId = biometricCredentialId;
    }
    if (biometricPublicKey !== undefined) {
      user.biometricPublicKey = biometricPublicKey;
    }

    await user.save();

    res.status(200).json({
      success: true,
      message: 'Security settings updated successfully',
      data: {
        _id: user._id,
        name: user.name,
        email: user.email,
        storeName: user.storeName,
        phone: user.phone,
        upiId: user.upiId || '',
        language: user.language || 'en',
        avatar: user.avatar || '',
        hasPin: user.hasPin,
        isBiometricEnabled: user.isBiometricEnabled,
        biometricCredentialId: user.biometricCredentialId || '',
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Verify PIN
// @route   POST /api/auth/verify-pin
const verifyPin = async (req, res, next) => {
  try {
    const { pin } = req.body;
    if (!pin) {
      return res.status(400).json({ success: false, message: 'Please provide PIN' });
    }

    const user = await User.findById(req.user._id).select('+pin');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const isMatch = await user.comparePin(pin);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: 'Incorrect PIN' });
    }

    res.status(200).json({
      success: true,
      message: 'PIN verified successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Verify Biometrics
// @route   POST /api/auth/verify-biometric
const verifyBiometric = async (req, res, next) => {
  try {
    const { credentialId } = req.body;
    
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (!user.isBiometricEnabled) {
      return res.status(400).json({ success: false, message: 'Biometrics not enabled for this user' });
    }

    // Verify credential ID matches
    if (user.biometricCredentialId !== credentialId) {
      return res.status(400).json({ success: false, message: 'Invalid biometric credential' });
    }

    res.status(200).json({
      success: true,
      message: 'Biometrics verified successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Forgot Password - Request reset link
// @route   POST /api/auth/forgot-password
const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ success: false, message: 'Please provide an email address' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ success: false, message: 'No account found with this email' });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(20).toString('hex');

    // Hash token and set to resetPasswordToken field
    user.resetPasswordToken = crypto
      .createHash('sha256')
      .update(resetToken)
      .digest('hex');

    // Set expire (10 minutes)
    user.resetPasswordExpire = Date.now() + 10 * 60 * 1000;

    await user.save();

    // Create reset url
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const resetUrl = `${frontendUrl}/reset-password/${resetToken}`;

    // HTML Message
    const htmlMessage = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #1e293b; padding: 20px; margin: 0; }
          .container { background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 32px; max-width: 500px; margin: 40px auto; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
          .logo-container { text-align: center; margin-bottom: 24px; }
          .logo { display: inline-block; background-color: #ea580c; color: #ffffff !important; font-size: 20px; font-weight: bold; padding: 10px 16px; border-radius: 8px; text-decoration: none; }
          .title { font-size: 22px; font-weight: bold; color: #0f172a; text-align: center; margin-bottom: 16px; }
          .text { font-size: 15px; color: #475569; line-height: 1.6; margin-bottom: 24px; }
          .btn-container { text-align: center; margin-bottom: 24px; }
          .btn { display: inline-block; background-color: #ea580c; color: #ffffff !important; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-weight: 600; font-size: 15px; box-shadow: 0 4px 6px -1px rgba(234, 88, 12, 0.2); }
          .link-text { font-size: 13px; color: #64748b; word-break: break-all; margin-top: 24px; border-top: 1px solid #e2e8f0; padding-top: 16px; }
          .footer { font-size: 12px; color: #94a3b8; text-align: center; margin-top: 32px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="logo-container">
            <span class="logo">Digital Udhaar</span>
          </div>
          <h1 class="title">Reset Your Password</h1>
          <p class="text">Hello ${user.name},</p>
          <p class="text">You requested a password reset for your Digital Udhaar account. Click the button below to choose a new password:</p>
          <div class="btn-container">
            <a href="${resetUrl}" class="btn" target="_blank">Reset Password</a>
          </div>
          <p class="text">This link is valid for 10 minutes. If you did not request this password reset, please ignore this email and your password will remain unchanged.</p>
          <div class="link-text">
            <strong>If the button above does not work, copy and paste this URL into your browser:</strong><br/>
            <span style="color: #ea580c;">${resetUrl}</span>
          </div>
        </div>
        <div class="footer">Digital Udhaar &copy; 2026. All rights reserved.</div>
      </body>
      </html>
    `;

    // Text Message
    const textMessage = `
Hello ${user.name},

You requested a password reset for your Digital Udhaar account.
Please visit the following link to reset your password (valid for 10 minutes):

${resetUrl}

If you did not request this password reset, please ignore this email.

Digital Udhaar Team
    `;

    try {
      const result = await sendEmail({
        to: user.email,
        subject: 'Password Reset Request - Digital Udhaar',
        text: textMessage,
        html: htmlMessage,
      });

      res.status(200).json({
        success: true,
        message: 'Password reset link sent to your email address',
        resetUrl: result.logged ? resetUrl : undefined
      });
    } catch (err) {
      user.resetPasswordToken = '';
      user.resetPasswordExpire = undefined;
      await user.save();

      return res.status(500).json({
        success: false,
        message: 'Email could not be sent. Please try again later.'
      });
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Reset Password
// @route   POST /api/auth/reset-password/:token
const resetPassword = async (req, res, next) => {
  try {
    const { password } = req.body;
    if (!password) {
      return res.status(400).json({ success: false, message: 'Please provide a new password' });
    }

    // Get hashed token
    const resetPasswordToken = crypto
      .createHash('sha256')
      .update(req.params.token)
      .digest('hex');

    const user = await User.findOne({
      resetPasswordToken,
      resetPasswordExpire: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({ success: false, message: 'Invalid or expired reset token' });
    }

    // Set new password (pre-save hook hashes it)
    user.password = password;
    user.resetPasswordToken = '';
    user.resetPasswordExpire = undefined;

    await user.save();

    res.status(200).json({
      success: true,
      message: 'Password reset successful. You can now login with your new password.',
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { 
  register, 
  login, 
  getMe, 
  updateProfile, 
  setupSecurity, 
  verifyPin, 
  verifyBiometric,
  forgotPassword,
  resetPassword
};
