const dotenv = require('dotenv');
const path = require('path');
const mongoose = require('mongoose');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

const Customer = require('../models/Customer');
const { sendSMS } = require('../services/fast2smsService');
const { sendWhatsAppMessage } = require('../services/whatsappService');

const runTest = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/udhaar-khata');
    console.log('Connected to MongoDB');

    const customer = await Customer.findOne({ balance: { $gt: 0 } });
    if (!customer) {
      console.log('No customer found with balance > 0. Please add one first.');
      mongoose.disconnect();
      return;
    }

    console.log(`Found Customer: ${customer.name} | Phone: ${customer.phone} | Balance: ${customer.balance}`);

    console.log('\n--- Testing SMS Mock/Real Send ---');
    try {
      const smsResult = await sendSMS(customer.phone, `Test SMS for ${customer.name}`);
      console.log('SMS Result:', smsResult);
    } catch (err) {
      console.error('SMS Error:', err.message);
    }

    console.log('\n--- Testing WhatsApp Mock/Real Send ---');
    try {
      const whatsappResult = await sendWhatsAppMessage(customer.phone, customer.name, customer.balance, 'Digital Udhaar');
      console.log('WhatsApp Result:', whatsappResult);
    } catch (err) {
      console.error('WhatsApp Error:', err.message);
    }

    mongoose.disconnect();
  } catch (error) {
    console.error('Connection/Test Error:', error);
  }
};

runTest();
