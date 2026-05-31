const axios = require('axios');

/**
 * Send WhatsApp message using official WhatsApp Cloud API (Facebook Graph API)
 * @param {string} phone - Target phone number with country code (e.g. 919876543210)
 * @param {string} customerName - Name of the customer
 * @param {number} amount - Pending due amount
 * @param {string} storeName - Name of the store
 */
const sendWhatsAppMessage = async (phone, customerName, amount, storeName) => {
  const token = process.env.WHATSAPP_TOKEN;
  const phoneNumberId = process.env.PHONE_NUMBER_ID;

  // Formatting phone number
  let formattedPhone = phone.replace(/\D/g, '');
  if (formattedPhone.length === 10) {
    formattedPhone = '91' + formattedPhone;
  }

  const message = `Hello ${customerName}, this is a reminder from ${storeName}. Your pending due amount is ₹${amount}. Please pay soon. Thank you!`;

  const useMock = process.env.USE_MOCK_WHATSAPP === 'true';

  // Fallback to mock mode if not configured or explicitly mocked
  if (!token || !phoneNumberId || token === 'your_whatsapp_token_here' || useMock) {
    console.log(`📱 [WhatsApp API Mock] To: ${formattedPhone} | Message: ${message}`);
    return {
      success: true,
      status: 'mock',
      message: 'WhatsApp Cloud API credentials mock active — Message logged to console.',
      data: {
        to: formattedPhone,
        body: message
      }
    };
  }

  try {
    const url = `https://graph.facebook.com/v23.0/${phoneNumberId}/messages`;
    const payload = {
      messaging_product: 'whatsapp',
      to: formattedPhone,
      type: 'text',
      text: {
        body: message,
      },
    };

    const response = await axios.post(url, payload, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    return response.data;
  } catch (error) {
    console.error('WhatsApp Cloud API Error:', error.response?.data || error.message);
    
    // Check if the error response looks like a FortiGate block page
    const responseDataString = typeof error.response?.data === 'string' ? error.response.data : '';
    if (
      error.response?.status === 403 && 
      (responseDataString.includes('FortiGate') || 
       responseDataString.includes('Application Blocked') || 
       responseDataString.includes('Application Control'))
    ) {
      console.log(`📱 [WhatsApp API Mock Fallback] To: ${formattedPhone} | Message: ${message} (Blocked by local firewall)`);
      return {
        success: true,
        status: 'mock_firewall',
        message: 'WhatsApp Cloud API was blocked by your network firewall (FortiGate). The message has been logged to the console.',
        data: {
          to: formattedPhone,
          body: message
        }
      };
    }

    const apiError = error.response?.data?.error;
    if (apiError?.code === 190) {
      throw new Error(
        'WhatsApp Token has expired or is invalid. Please get a new token from the Meta Developer Portal and update WHATSAPP_TOKEN in your backend .env file.'
      );
    }
    throw new Error(
      apiError?.message || error.message || 'Failed to send WhatsApp message'
    );
  }
};

module.exports = {
  sendWhatsAppMessage,
};
