let twilioClient = null;

// Initialize Twilio client only if credentials are provided
const initTwilio = () => {
  const { TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN } = process.env;

  if (TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN) {
    try {
      const twilio = require('twilio');
      twilioClient = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
      console.log('✅ Twilio client initialized');
    } catch (error) {
      console.warn('⚠️  Twilio initialization failed:', error.message);
    }
  } else {
    console.warn('⚠️  Twilio credentials not configured — SMS/WhatsApp reminders disabled');
  }
};

// Send SMS
const sendSMS = async (to, message) => {
  if (!twilioClient) {
    console.log(`📱 [SMS Mock] To: ${to} | Message: ${message}`);
    return { status: 'mock', message: 'Twilio not configured — message logged to console' };
  }

  const result = await twilioClient.messages.create({
    body: message,
    from: process.env.TWILIO_PHONE_NUMBER,
    to: to,
  });

  return { status: 'sent', sid: result.sid };
};

// Send WhatsApp
const sendWhatsApp = async (to, message) => {
  if (!twilioClient) {
    console.log(`💬 [WhatsApp Mock] To: ${to} | Message: ${message}`);
    return { status: 'mock', message: 'Twilio not configured — message logged to console' };
  }

  // Ensure the 'to' number has the whatsapp: prefix
  const whatsappTo = to.startsWith('whatsapp:') ? to : `whatsapp:${to}`;

  const result = await twilioClient.messages.create({
    body: message,
    from: process.env.TWILIO_WHATSAPP_NUMBER,
    to: whatsappTo,
  });

  return { status: 'sent', sid: result.sid };
};

module.exports = { initTwilio, sendSMS, sendWhatsApp };
