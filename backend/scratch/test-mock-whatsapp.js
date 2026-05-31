const dotenv = require('dotenv');
const path = require('path');

// Load env
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const whatsappService = require('../services/whatsappService');

const runTest = async () => {
  try {
    console.log('Testing sendWhatsAppMessage with Mock active...');
    const result = await whatsappService.sendWhatsAppMessage(
      '9182476284',
      'Shiva',
      500000000,
      'Punju Store'
    );
    console.log('Result:', result);
  } catch (error) {
    console.error('Error during test:', error.message);
  }
};

runTest();
