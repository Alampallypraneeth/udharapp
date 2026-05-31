const Customer = require('../models/Customer');
const Transaction = require('../models/Transaction');
const { sendEmail } = require('../services/mailService');
const { generateStatementBuffer } = require('../services/pdfService');

// @desc    Send payment reminder to a customer via Email
// @route   POST /api/reminders/send/:customerId
const sendReminder = async (req, res, next) => {
  try {
    const customer = await Customer.findOne({
      _id: req.params.customerId,
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

    if (!customer.email) {
      return res.status(400).json({
        success: false,
        message: 'Customer does not have an email address configured. Please add an email address to this customer to send reminders.',
      });
    }

    const storeName = req.user.storeName || 'Digital Udhaar';
    const upiId = req.user.upiId;
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const customerFirstName = customer.name ? customer.name.split(' ')[0] : 'Valued Customer';

    let textMessage = `Namaste ${customerFirstName}!\n\nThis is a friendly payment reminder from ${storeName}. Your pending due amount is ₹${customer.balance.toFixed(2)}.\n\nKindly clear your dues at your earliest convenience. Your detailed monthly statement has been attached to this email as a PDF. Thank you! 🙏`;

    // Append UPI collection link if merchant has configured UPI
    if (upiId) {
      textMessage += `\n\n💳 Pay now: ${frontendUrl}/pay/${customer._id}`;
    }

    const htmlMessage = `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e4e4e7; border-radius: 16px; background-color: #ffffff; color: #18181b;">
        <div style="text-align: center; margin-bottom: 24px;">
          <h2 style="color: #e22d34; font-weight: 800; margin: 0; font-size: 24px; letter-spacing: -0.025em;">${storeName}</h2>
          <p style="color: #71717a; font-size: 14px; margin: 4px 0 0 0;">Transaction & Outstanding Dues Reminder</p>
        </div>
        
        <p style="font-size: 15px; line-height: 1.6; color: #3f3f46;">Namaste <strong>${customerFirstName}</strong>,</p>
        <p style="font-size: 15px; line-height: 1.6; color: #3f3f46;">This is a friendly reminder regarding your outstanding balance with our store. We have attached your detailed ledger statement as a PDF file.</p>
        
        <div style="background-color: #fef2f2; border: 1px solid #fee2e2; padding: 20px; border-radius: 12px; margin: 24px 0; text-align: center;">
          <span style="font-size: 11px; color: #ef4444; display: block; font-weight: 800; letter-spacing: 0.05em; text-transform: uppercase; margin-bottom: 6px;">Total Outstanding Due</span>
          <span style="font-size: 36px; color: #b91c1c; font-weight: 900; font-family: system-ui, -apple-system, sans-serif;">₹${customer.balance.toFixed(2)}</span>
        </div>
        
        <p style="font-size: 15px; line-height: 1.6; color: #3f3f46;">Please clear your pending balance at your earliest convenience. Thank you for your continued business!</p>
        
        ${upiId ? `
          <div style="text-align: center; margin: 32px 0 24px 0;">
            <a href="${frontendUrl}/pay/${customer._id}" 
               style="background-color: #e22d34; color: #ffffff; padding: 12px 28px; text-decoration: none; font-weight: bold; font-size: 14px; border-radius: 10px; display: inline-block; box-shadow: 0 4px 6px -1px rgba(226, 45, 52, 0.2);">
               <img src="https://img.icons8.com/ios-filled/50/ffffff/credit-card.png" width="16" height="12" style="vertical-align: middle; margin-right: 8px; margin-bottom: 2px;" />Pay Now
            </a>
            <p style="font-size: 11px; color: #71717a; margin-top: 10px;">UPI ID: <strong>${upiId}</strong></p>
          </div>
        ` : ''}
        
        <hr style="border: 0; border-top: 1px solid #e4e4e7; margin: 32px 0 24px 0;" />
        <p style="font-size: 11px; color: #a1a1aa; text-align: center; margin: 0;">This is an automated transaction update sent by ${storeName} via Digital Udhaar app.</p>
      </div>
    `;

    // Fetch transactions for PDF statement
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const transactions = await Transaction.find({
      customer: customer._id,
      date: { $gte: start, $lte: end },
    }).sort({ date: 1 });

    const store = {
      storeName,
      name: req.user.name,
      phone: req.user.phone,
    };
    const dateRange = {
      startDate: start.toLocaleDateString('en-IN'),
      endDate: end.toLocaleDateString('en-IN'),
    };

    const pdfBuffer = await generateStatementBuffer(store, customer, transactions, dateRange);

    const result = await sendEmail({
      to: customer.email,
      subject: `Pending Due Reminder from ${storeName}`,
      text: textMessage,
      html: htmlMessage,
      attachments: [
        {
          filename: `statement_${customer.name.replace(/\s+/g, '_')}.pdf`,
          content: pdfBuffer,
        }
      ]
    });

    res.status(200).json({
      success: true,
      message: `Email reminder sent to ${customer.name} at ${customer.email}`,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Send bulk reminders to all customers with balance > 0 via Email
// @route   POST /api/reminders/send-bulk
const sendBulkReminders = async (req, res, next) => {
  try {
    const customers = await Customer.find({
      owner: req.user._id,
      balance: { $gt: 0 },
      email: { $gt: '' },
    });

    if (customers.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'No customers with outstanding balance and email addresses configured',
        data: { sent: 0, failed: 0 },
      });
    }

    const storeName = req.user.storeName || 'Digital Udhaar';
    const upiId = req.user.upiId;
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    let sent = 0;
    let failed = 0;
    const results = [];

    for (const customer of customers) {
      try {
        const customerFirstName = customer.name ? customer.name.split(' ')[0] : 'Valued Customer';
        let textMessage = `Namaste ${customerFirstName}!\n\nThis is a friendly payment reminder from ${storeName}. Your pending due amount is ₹${customer.balance.toFixed(2)}.\n\nKindly clear your dues at your earliest convenience. Your detailed monthly statement has been attached to this email as a PDF. Thank you! 🙏`;

        if (upiId) {
          textMessage += `\n\n💳 Pay now: ${frontendUrl}/pay/${customer._id}`;
        }

        const htmlMessage = `
          <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e4e4e7; border-radius: 16px; background-color: #ffffff; color: #18181b;">
            <div style="text-align: center; margin-bottom: 24px;">
              <h2 style="color: #e22d34; font-weight: 800; margin: 0; font-size: 24px; letter-spacing: -0.025em;">${storeName}</h2>
              <p style="color: #71717a; font-size: 14px; margin: 4px 0 0 0;">Transaction & Outstanding Dues Reminder</p>
            </div>
            
            <p style="font-size: 15px; line-height: 1.6; color: #3f3f46;">Namaste <strong>${customerFirstName}</strong>,</p>
            <p style="font-size: 15px; line-height: 1.6; color: #3f3f46;">This is a friendly reminder regarding your outstanding balance with our store. We have attached your detailed ledger statement as a PDF file.</p>
            
            <div style="background-color: #fef2f2; border: 1px solid #fee2e2; padding: 20px; border-radius: 12px; margin: 24px 0; text-align: center;">
              <span style="font-size: 11px; color: #ef4444; display: block; font-weight: 800; letter-spacing: 0.05em; text-transform: uppercase; margin-bottom: 6px;">Total Outstanding Due</span>
              <span style="font-size: 36px; color: #b91c1c; font-weight: 900; font-family: system-ui, -apple-system, sans-serif;">₹${customer.balance.toFixed(2)}</span>
            </div>
            
            <p style="font-size: 15px; line-height: 1.6; color: #3f3f46;">Please clear your pending balance at your earliest convenience. Thank you for your continued business!</p>
            
            ${upiId ? `
              <div style="text-align: center; margin: 32px 0 24px 0;">
                <a href="${frontendUrl}/pay/${customer._id}" 
                   style="background-color: #e22d34; color: #ffffff; padding: 12px 28px; text-decoration: none; font-weight: bold; font-size: 14px; border-radius: 10px; display: inline-block; box-shadow: 0 4px 6px -1px rgba(226, 45, 52, 0.2);">
                   <img src="https://img.icons8.com/ios-filled/50/ffffff/credit-card.png" width="16" height="12" style="vertical-align: middle; margin-right: 8px; margin-bottom: 2px;" />Pay Now
                </a>
              </div>
            ` : ''}
            
            <hr style="border: 0; border-top: 1px solid #e4e4e7; margin: 32px 0 24px 0;" />
            <p style="font-size: 11px; color: #a1a1aa; text-align: center; margin: 0;">This is an automated transaction update sent by ${storeName} via Digital Udhaar app.</p>
          </div>
        `;

        // Fetch transactions for PDF statement
        const now = new Date();
        const start = new Date(now.getFullYear(), now.getMonth(), 1);
        const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        const transactions = await Transaction.find({
          customer: customer._id,
          date: { $gte: start, $lte: end },
        }).sort({ date: 1 });

        const store = {
          storeName,
          name: req.user.name,
          phone: req.user.phone,
        };
        const dateRange = {
          startDate: start.toLocaleDateString('en-IN'),
          endDate: end.toLocaleDateString('en-IN'),
        };

        const pdfBuffer = await generateStatementBuffer(store, customer, transactions, dateRange);

        await sendEmail({
          to: customer.email,
          subject: `Pending Due Reminder from ${storeName}`,
          text: textMessage,
          html: htmlMessage,
          attachments: [
            {
              filename: `statement_${customer.name.replace(/\s+/g, '_')}.pdf`,
              content: pdfBuffer,
            }
          ]
        });

        sent++;
        results.push({ customer: customer.name, status: 'sent', email: customer.email });
      } catch (err) {
        failed++;
        results.push({ customer: customer.name, status: 'failed', error: err.message });
      }
    }

    res.status(200).json({
      success: true,
      message: `Email reminders sent: ${sent}, Failed: ${failed}`,
      data: { sent, failed, results },
    });
  } catch (error) {
    next(error);
  }
};

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
  sendReminder,
  sendBulkReminders,
  sendFast2SMSSMS,
  sendCloudWhatsApp,
};
