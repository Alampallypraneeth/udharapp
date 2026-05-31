const dotenv = require('dotenv');
const axios = require('axios');
const path = require('path');

// Load env from one level up (backend/.env)
dotenv.config({ path: path.join(__dirname, '../.env') });

const testWhatsApp = async () => {
  const token = process.env.WHATSAPP_TOKEN;
  const phoneNumberId = process.env.PHONE_NUMBER_ID;

  console.log('Token Length:', token ? token.length : 0);
  console.log('Phone Number ID:', phoneNumberId);

  const phone = '919849228937'; // User's test number
  const message = 'Test WhatsApp message from Digital Udhaar Khata.';

  const url = `https://graph.facebook.com/v23.0/${phoneNumberId}/messages`;
  const payload = {
    messaging_product: 'whatsapp',
    to: phone,
    type: 'text',
    text: {
      body: message,
    },
  };

  try {
    const response = await axios.post(url, payload, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
    console.log('Success Response:', response.data);
  } catch (error) {
    console.error('API Error details:', error.response ? error.response.data : error.message);
  }
};

testWhatsApp();
