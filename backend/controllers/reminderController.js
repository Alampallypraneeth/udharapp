const Customer = require('../models/Customer');
const Transaction = require('../models/Transaction');
const { sendSMS } = require('../services/fast2smsService');
const { sendWhatsAppMessage } = require('../services/whatsappService');

// @desc    Send payment reminder to a customer via SMS
// @route   POST /api/reminders/send-sms
const sendFast2SMSSMS = async (req, res, next) => {
  try {
    const customerId = req.body.customerId || req.params.customerId;
    const customer = await Customer.findOne({
      _id: customerId,
      owner: req.user._id,
    });

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found',
      });
    }

    if (customer.balance <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Customer has no outstanding balance',
      });
    }

    const storeName = req.user.storeName || 'Digital Udhaar';
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const message = `Namaste ${customer.name}, you have a pending payment of ₹${customer.balance.toFixed(2)} at ${storeName}. Please clear it soon. Pay at: ${frontendUrl}/pay/${customer._id}`;

    const result = await sendSMS(customer.phone, message);

    res.status(200).json({
      success: true,
      message: `SMS reminder sent successfully to ${customer.name}!`,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Send payment reminder to a customer via WhatsApp
// @route   POST /api/reminders/send-whatsapp
const sendCloudWhatsApp = async (req, res, next) => {
  try {
    const customerId = req.body.customerId || req.params.customerId;
    const customer = await Customer.findOne({
      _id: customerId,
      owner: req.user._id,
    });

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found',
      });
    }

    if (customer.balance <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Customer has no outstanding balance',
      });
    }

    const storeName = req.user.storeName || 'Digital Udhaar';

    const result = await sendWhatsAppMessage(
      customer.phone,
      customer.name,
      customer.balance,
      storeName
    );

    res.status(200).json({
      success: true,
      message: `WhatsApp reminder sent successfully to ${customer.name}!`,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  sendFast2SMSSMS,
  sendCloudWhatsApp,
};
