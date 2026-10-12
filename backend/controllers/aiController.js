const Customer = require('../models/Customer');
const Transaction = require('../models/Transaction');
const CashbookEntry = require('../models/CashbookEntry');
const { updateRiskLevel } = require('../services/riskService');
const axios = require('axios');

// Indian Phonetic Key (IPK) mapping for English, Hindi, and Telugu consonants
function getIndianPhoneticKey(str) {
  if (!str) return '';
  str = str.toLowerCase();
  
  let result = '';
  for (let i = 0; i < str.length; i++) {
    const char = str[i];
    const code = str.charCodeAt(i);
    
    // English consonants
    if (char === 'r') result += 'R';
    else if (char === 'v' || char === 'w') result += 'V';
    else if (char === 's') {
      if (str[i+1] === 'h') {
        result += 'S';
        i++;
      } else {
        result += 'S';
      }
    }
    else if (char === 't') {
      if (str[i+1] === 'h') {
        result += 'T';
        i++;
      } else {
        result += 'T';
      }
    }
    else if (char === 'd') {
      if (str[i+1] === 'h') {
        result += 'D';
        i++;
      } else {
        result += 'D';
      }
    }
    else if (char === 'n') result += 'N';
    else if (char === 'm') result += 'M';
    else if (char === 'k') {
      if (str[i+1] === 'h') {
        result += 'K';
        i++;
      } else {
        result += 'K';
      }
    }
    else if (char === 'g') {
      if (str[i+1] === 'h') {
        result += 'G';
        i++;
      } else {
        result += 'G';
      }
    }
    else if (char === 'p') {
      if (str[i+1] === 'h') {
        result += 'P';
        i++;
      } else {
        result += 'P';
      }
    }
    else if (char === 'f') result += 'P';
    else if (char === 'b') {
      if (str[i+1] === 'h') {
        result += 'B';
        i++;
      } else {
        result += 'B';
      }
    }
    else if (char === 'l') result += 'L';
    else if (char === 'y') result += 'Y';
    else if (char === 'c' && str[i+1] === 'h') {
      result += 'C';
      i++;
    }
    else if (char === 'j') result += 'J';
    
    // Hindi Devanagari mappings (0x0900 to 0x097F)
    else if (code >= 0x0900 && code <= 0x097F) {
      if (code === 0x0930 || code === 0x0931) result += 'R';
      else if (code === 0x0935) result += 'V';
      else if (code === 0x0938 || code === 0x0939 || code === 0x0936 || code === 0x0937) result += 'S';
      else if (code === 0x0924 || code === 0x0925 || code === 0x091F || code === 0x0920) result += 'T';
      else if (code === 0x0926 || code === 0x0927 || code === 0x0921 || code === 0x0922) result += 'D';
      else if (code === 0x0928 || code === 0x0929 || code === 0x0923) result += 'N';
      else if (code === 0x092e) result += 'M';
      else if (code === 0x0915 || code === 0x0916) result += 'K';
      else if (code === 0x0917 || code === 0x0918) result += 'G';
      else if (code === 0x092a || code === 0x092b) result += 'P';
      else if (code === 0x092c || code === 0x092d) result += 'B';
      else if (code === 0x0932 || code === 0x0933 || code === 0x0934) result += 'L';
      else if (code === 0x092f) result += 'Y';
      else if (code === 0x091a || code === 0x091b) result += 'C';
      else if (code === 0x091c || code === 0x091d) result += 'J';
    }
    
    // Telugu mappings (0x0C00 to 0x0C7F)
    else if (code >= 0x0C00 && code <= 0x0C7F) {
      if (code === 0x0C30 || code === 0x0C31) result += 'R';
      else if (code === 0x0C35) result += 'V';
      else if (code === 0x0C38 || code === 0x0C39 || code === 0x0C36 || code === 0x0C37) result += 'S';
      else if (code === 0x0C24 || code === 0x0C25 || code === 0x0C1F || code === 0x0C20) result += 'T';
      else if (code === 0x0C26 || code === 0x0C27 || code === 0x0C21 || code === 0x0C22) result += 'D';
      else if (code === 0x0C28 || code === 0x0C23) result += 'N';
      else if (code === 0x0C2E) result += 'M';
      else if (code === 0x0C15 || code === 0x0C16) result += 'K';
      else if (code === 0x0C17 || code === 0x0C18) result += 'G';
      else if (code === 0x0C2A || code === 0x0C2B) result += 'P';
      else if (code === 0x0C2C || code === 0x0C2D) result += 'B';
      else if (code === 0x0C32 || code === 0x0C33) result += 'L';
      else if (code === 0x0C2F) result += 'Y';
      else if (code === 0x0C1A || code === 0x0C1B) result += 'C';
      else if (code === 0x0C1C || code === 0x0C1D) result += 'J';
    }
  }
  return result;
}

// Find a matching customer in the query text
const findMatchedCustomer = (text, customers) => {
  const normalizedText = text.toLowerCase();
  
  // 1. Direct substring match (very fast for English)
  for (const customer of customers) {
    if (normalizedText.includes(customer.name.toLowerCase())) {
      return customer;
    }
  }

  // 2. Word-by-word phonetic key matching (handles multi-script: English, Hindi, Telugu)
  const textWords = text.split(/\s+/);
  const textWordKeys = textWords.map(w => getIndianPhoneticKey(w)).filter(Boolean);

  for (const customer of customers) {
    const nameWords = customer.name.split(/\s+/);
    const nameWordKeys = nameWords.map(w => getIndianPhoneticKey(w)).filter(Boolean);

    if (nameWordKeys.length === 0) continue;

    // Check if the customer's first name matches any word in the query phonetically
    const firstNameKey = nameWordKeys[0];
    if (textWordKeys.includes(firstNameKey)) {
      return customer;
    }
  }

  return null;
};

// @desc    Parse voice entry and automatically add transaction
const voiceEntry = async (req, res, next) => {
  try {
    const { text, customerId } = req.body;
    if (!text) {
      return res.status(400).json({ success: false, message: 'Speech text is required' });
    }

    let matchedCustomer = null;
    let amount = null;
    let type = 'credit';

    const customers = await Customer.find({ owner: req.user._id });

    // Try using Groq if key is present
    if (process.env.GROQ_API_KEY) {
      try {
        const voicePrompt = `You are a helper that parses spoken transaction transcripts for a shopkeeper.
The user might speak a customer credit transaction (e.g., "Ravi took 300 rupees today") OR a business cashbook expense/income entry (e.g., "Added electricity bill 1500" or "Got cash 200").

Here is the list of existing customers:
${customers.map(c => `- Name: ${c.name}`).join('\n')}

Analyze the transcribed text and output a JSON object.
Rules:
1. If the text is about adding a customer credit transaction (e.g. "Ravi took 300 rupees"):
   - "isCashbook": false
   - "customerName": the exact matching name from the customer list (or null if none)
   - "amount": the numerical amount (e.g. 300)
   - "type": "credit" if they took goods/borrowed money, "debit" if they paid back
   - "category": null
   - "description": "Voice Entry: " + text

2. If the text is about a general business expense or income for the cashbook (e.g. "Added electricity bill 1500" or "Added rent 1000" or "Got cash 500"):
   - "isCashbook": true
   - "customerName": null
   - "amount": the numerical amount (e.g. 1500)
   - "type": "out" if it is an expense/bill/rent/salary/food/stock purchase, "in" if it is an income/sales/got cash
   - "category": Choose one of: "Stock", "Rent", "Salary", "Electricity", "Food", "Other" (for out/expense), or "Sales", "Other" (for in/income). Matches the context (e.g. "electricity bill" matches "Electricity")
   - "description": The description of the item (e.g. "Electricity bill")

Spoken text: "${text}"

You MUST respond ONLY with a JSON object in this format: { "isCashbook": boolean, "customerName": string | null, "amount": number | null, "type": "credit" | "debit" | "in" | "out" | null, "category": string | null, "description": string }`;

        const groqResponse = await axios.post(
          'https://api.groq.com/openai/v1/chat/completions',
          {
            model: 'qwen/qwen3.8-27b',
            messages: [
              { role: 'system', content: voicePrompt },
              { role: 'user', content: text }
            ],
            response_format: { type: 'json_object' },
            temperature: 0.1
          },
          {
            headers: {
              'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
              'Content-Type': 'application/json'
            },
            timeout: 5000
          }
        );

        const parsed = JSON.parse(groqResponse.data.choices[0].message.content);
        if (parsed.isCashbook) {
          const entry = await CashbookEntry.create({
            owner: req.user._id,
            type: parsed.type === 'in' ? 'in' : 'out',
            amount: parsed.amount,
            description: parsed.description || `Voice Entry: "${text}"`,
            category: parsed.category || 'Other',
            paymentMode: 'cash',
            date: new Date()
          });

          return res.status(201).json({
            success: true,
            isCashbook: true,
            message: `Successfully recorded ${entry.type === 'in' ? 'Income' : 'Expense'}: ₹${entry.amount} for ${entry.category}`,
            data: entry
          });
        }

        if (parsed.customerName) {
          matchedCustomer = customers.find(c => c.name.toLowerCase() === parsed.customerName.toLowerCase());
        }
        if (parsed.amount) {
          amount = parsed.amount;
        }
        if (parsed.type) {
          type = parsed.type;
        }
      } catch (groqErr) {
        console.error('Groq voice parsing error, falling back to local:', groqErr.message);
      }
    }

    // Fallback: local keyword detection for Cashbook
    let isLocalCashbook = false;
    let localCategory = 'Other';
    let localType = 'out';
    const normalizedText = text.toLowerCase();

    if (normalizedText.includes('added') || normalizedText.includes('bill') || normalizedText.includes('expense') || normalizedText.includes('rent') || normalizedText.includes('salary') || normalizedText.includes('electricity') || normalizedText.includes('food') || normalizedText.includes('stock')) {
      isLocalCashbook = true;
      if (normalizedText.includes('stock')) localCategory = 'Stock';
      else if (normalizedText.includes('rent')) localCategory = 'Rent';
      else if (normalizedText.includes('salary')) localCategory = 'Salary';
      else if (normalizedText.includes('electricity') || normalizedText.includes('power') || normalizedText.includes('current')) localCategory = 'Electricity';
      else if (normalizedText.includes('food')) localCategory = 'Food';
      
      if (normalizedText.includes('sales') || normalizedText.includes('got cash') || normalizedText.includes('income')) {
        localType = 'in';
      }
    }

    if (isLocalCashbook) {
      const amountMatch = text.match(/\b\d+(?:\.\d+)?\b/);
      if (amountMatch) {
        const localAmount = parseFloat(amountMatch[0]);
        const entry = await CashbookEntry.create({
          owner: req.user._id,
          type: localType,
          amount: localAmount,
          description: `Voice Entry: "${text}"`,
          category: localCategory,
          paymentMode: 'cash',
          date: new Date()
        });

        return res.status(201).json({
          success: true,
          isCashbook: true,
          message: `Successfully recorded ${entry.type === 'in' ? 'Income' : 'Expense'}: ₹${entry.amount} for ${entry.category}`,
          data: entry
        });
      }
    }

    // Fallback to local rule-based parsing for Customer Transaction if Groq failed or key is missing
    if (!matchedCustomer || !amount) {
      if (customerId) {
        matchedCustomer = await Customer.findOne({ _id: customerId, owner: req.user._id });
      }
      if (!matchedCustomer) {
        matchedCustomer = findMatchedCustomer(text, customers);
      }
      if (!matchedCustomer) {
        return res.status(404).json({
          success: false,
          message: 'Could not match any customer from the voice entry. Try saying the customer name clearly.',
          parsed: { text }
        });
      }

      const amountMatch = text.match(/\b\d+(?:\.\d+)?\b/);
      if (!amountMatch) {
        return res.status(400).json({
          success: false,
          message: `Matched customer ${matchedCustomer.name}, but couldn't find an amount. Try saying e.g., "took 300 rupees".`,
          parsed: { customer: matchedCustomer.name }
        });
      }
      amount = parseFloat(amountMatch[0]);

      // Determine type locally
      let creditScoreCount = 0;
      let debitScoreCount = 0;
      const creditKeywords = [
        'took', 'taken', 'borrow', 'borrowed', 'bought', 'buy', 'udhaar', 'due', 'gave to', 'give to', 'credit',
        'लिया', 'लिए', 'उधार', 'खरीदा',
        'తీసుకున్నాడు', 'తీసుకుంది', 'తీసుకున్నారు', 'కొన్నాడు', 'ఉధార్'
      ];
      const debitKeywords = [
        'paid', 'return', 'returned', 'received', 'got', 'debit', 'gave back', 'pay',
        'दिया', 'मिला', 'मिले', 'जमा', 'वापस', 'चुका',
        'ఇచ్చాడు', 'ఇచ్చింది', 'ఇచ్చారు', 'వచ్చింది', 'వచ్చాయి', 'తిరిగి', 'చెల్లించాడు'
      ];
      creditKeywords.forEach(k => { if (normalizedText.includes(k)) creditScoreCount++; });
      debitKeywords.forEach(k => { if (normalizedText.includes(k)) debitScoreCount++; });
      if (normalizedText.includes('को') || normalizedText.includes('ko')) creditScoreCount += 3;
      if (normalizedText.includes('ने') || normalizedText.includes('ne')) debitScoreCount += 3;
      if (normalizedText.includes('కి') || normalizedText.includes('కు') || normalizedText.includes('ki') || normalizedText.includes('ku')) creditScoreCount += 3;
      if (normalizedText.includes('నుండి') || normalizedText.includes('నుంచి') || normalizedText.includes('nundi') || normalizedText.includes('nunchi')) debitScoreCount += 3;

      type = (debitScoreCount > creditScoreCount) ? 'debit' : 'credit';
    }

    // Create the transaction
    const transaction = await Transaction.create({
      customer: matchedCustomer._id,
      owner: req.user._id,
      type,
      amount,
      description: `Voice Entry: "${text}"`,
      paymentStatus: type === 'debit' ? 'SETTLED' : 'PENDING',
      date: new Date()
    });

    // Update customer balance
    if (type === 'credit') {
      matchedCustomer.balance += amount;
    } else {
      matchedCustomer.balance -= amount;
      matchedCustomer.lastPaymentDate = new Date();
    }
    matchedCustomer.totalTransactions = (matchedCustomer.totalTransactions || 0) + 1;
    await matchedCustomer.save();

    // Async update risk, score, prediction
    await updateRiskLevel(matchedCustomer._id);

    res.status(201).json({
      success: true,
      message: `Successfully recorded transaction: ₹${amount} ${type === 'credit' ? 'Due (Gave)' : 'Paid (Got)'} for ${matchedCustomer.name}`,
      data: {
        transaction,
        customerName: matchedCustomer.name,
        updatedBalance: matchedCustomer.balance,
        duePrediction: matchedCustomer.duePrediction,
        creditScore: matchedCustomer.creditScore
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    KhataBot AI Assistant (Answers ALL ledger, business, app, and general questions)
// @route   POST /api/ai/chat
const chatAssistant = async (req, res, next) => {
  try {
    const { message, history, lang } = req.body;
    if (!message) {
      return res.status(400).json({ success: false, message: 'Message is required' });
    }

    const ownerId = req.user._id;
    const User = require('../models/User');
    const owner = await User.findById(ownerId);
    const ownerName = owner ? owner.name : 'Merchant';
    const storeName = owner ? owner.storeName : 'KhataPay Store';
    const langName = lang === 'hi' ? 'Hindi' : lang === 'te' ? 'Telugu' : 'English';

    const customers = await Customer.find({ owner: ownerId });
    
    // Fetch last 25 transactions populated with customer names
    const transactions = await Transaction.find({ owner: ownerId })
      .sort({ date: -1, createdAt: -1 })
      .limit(25)
      .populate('customer', 'name phone');

    // Fetch last 15 cashbook entries
    const cashbookEntries = await CashbookEntry.find({ owner: ownerId })
      .sort({ date: -1 })
      .limit(15);

    // Calculate store aggregates
    const totalUdhaar = customers.reduce((acc, c) => c.balance > 0 ? acc + c.balance : acc, 0);
    const totalJama = customers.reduce((acc, c) => c.balance < 0 ? acc + Math.abs(c.balance) : acc, 0);
    const netBalance = totalUdhaar - totalJama;
    const customersWithDues = customers.filter(c => c.balance > 0).length;
    const totalCashIn = cashbookEntries.filter(e => e.type === 'in').reduce((s, e) => s + e.amount, 0);
    const totalCashOut = cashbookEntries.filter(e => e.type === 'out').reduce((s, e) => s + e.amount, 0);
    const netCash = totalCashIn - totalCashOut;

    // ── 1. Try Groq AI Engine (with auto-fallback between models) ──
    const groqKey = process.env.GROQ_API_KEY;
    if (groqKey) {
      const systemPrompt = `You are KhataBot, the all-knowing AI assistant and financial advisor for KhataPay (Smart Ledger OS).
You are assisting the store owner, ${ownerName}, who operates "${storeName}".
Current Date & Time: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}.

📊 REAL-TIME STORE FINANCIAL DASHBOARD:
- Total Active Customers: ${customers.length}
- Customers with Outstanding Dues: ${customersWithDues}
- Total Udhaar (To Collect): ₹${totalUdhaar.toLocaleString('en-IN')}
- Total Jama (Advance Received): ₹${totalJama.toLocaleString('en-IN')}
- Net Store Ledger Position: ₹${netBalance.toLocaleString('en-IN')}
- Recent Cashbook Income (Cash In): ₹${totalCashIn.toLocaleString('en-IN')}
- Recent Cashbook Expenses (Cash Out): ₹${totalCashOut.toLocaleString('en-IN')}
- Net Cash in Drawer: ₹${netCash.toLocaleString('en-IN')}

👥 CUSTOMER LEDGER DIRECTORY:
${customers.map(c => `- ${c.name} | Phone: ${c.phone} | Balance: ₹${c.balance} (${c.balance > 0 ? 'owes you (Due)' : c.balance < 0 ? 'advance paid' : 'settled'}) | Score: ${c.creditScore || 750} | Risk: ${(c.riskLevel || 'low').toUpperCase()} | Prediction: ${c.duePrediction === 'trusted' ? 'Trusted ✅' : c.duePrediction === 'delay' ? 'Late Payer ⚠️' : 'Risky 🚨'}`).join('\n')}

📝 RECENT TRANSACTIONS (Newest to Oldest):
${transactions.map((t, index) => `${index + 1}. Date: ${new Date(t.date).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}, Customer: ${t.customer ? t.customer.name : 'Unknown'}, Type: ${t.type === 'credit' ? 'Udhaar (Gave)' : 'Jama (Got)'}, Amount: ₹${t.amount}, Mode: ${t.paymentMode || 'cash'}, Status: ${t.paymentStatus}, Note: ${t.description || 'none'}`).join('\n')}

💰 RECENT CASHBOOK ENTRIES:
${cashbookEntries.map((e, index) => `${index + 1}. Date: ${new Date(e.date).toLocaleString('en-IN', { day: '2-digit', month: 'short' })}, Type: ${e.type === 'in' ? 'Income' : 'Expense'}, Amount: ₹${e.amount}, Category: ${e.category}, Note: ${e.description || 'none'}`).join('\n')}

KHATAPAY APP CAPABILITIES:
- SMS Reminders: Send SMS payment reminders via Fast2SMS Cloud Gateway or native device SMS launcher with pre-filled text and instant UPI checkout link.
- WhatsApp Reminders: 1-click WhatsApp message to customer with their exact balance and payment link.
- Customer Online Payment: Customers can visit /pay/:customerId to pay via any UPI app (PhonePe, GPay, Paytm) and enter the 12-digit UTR to clear balance.
- Soundbox: Audio chime feature that plays a confirmation voice alert when payments are received.
- Export CSV: Instant Excel/CSV download of customer balances and ledger entries.
- Security: 4-digit PIN lock and biometric unlock.

RULES FOR KHATABOT:
1. Answer ANY question asked by the merchant accurately, warmly, and helpfully. Never refuse a question.
2. If asked about customers, debts, balances, or transactions, cite exact figures from the real-time context above.
3. If asked for business/shopkeeper advice (improving collections, managing udhaar, pricing, profit margin, kirana shop management), provide expert, practical tips.
4. If asked how to use any feature of KhataPay (sending reminders, recording payments, adding customers, cashbook, exports), give clear step-by-step guidance.
5. If the merchant asks 'who am I' or mentions their name, address them warmly as ${ownerName}, owner of "${storeName}".
6. Respond strictly in ${langName}.
7. Return 2-3 short, relevant clickable suggestion follow-ups.

YOU MUST RESPOND ONLY WITH A VALID JSON OBJECT:
{
  "response": "Your structured, beautiful markdown response here",
  "suggestions": ["suggestion 1", "suggestion 2"]
}`;

      const groqMessages = [{ role: 'system', content: systemPrompt }];
      if (history && Array.isArray(history)) {
        groqMessages.push(...history.slice(-6));
      }
      const lastHistoryMsg = history && history.length > 0 ? history[history.length - 1] : null;
      if (!lastHistoryMsg || lastHistoryMsg.content !== message) {
        groqMessages.push({ role: 'user', content: message });
      }

      const modelsToTry = ['qwen/qwen3.8-27b', 'openai/gpt-oss-20b'];

      for (const modelName of modelsToTry) {
        try {
          const groqResponse = await axios.post(
            'https://api.groq.com/openai/v1/chat/completions',
            {
              model: modelName,
              messages: groqMessages,
              response_format: { type: 'json_object' },
              temperature: 0.2
            },
            {
              headers: {
                'Authorization': `Bearer ${groqKey}`,
                'Content-Type': 'application/json'
              },
              timeout: 6000
            }
          );

          const content = groqResponse.data.choices[0].message.content;
          const parsed = JSON.parse(content);
          if (parsed && parsed.response) {
            return res.status(200).json({
              success: true,
              response: parsed.response,
              suggestions: parsed.suggestions || ["Who has highest due?", "Show this month collection", "Send payment reminder"]
            });
          }
        } catch (modelErr) {
          console.warn(`Groq model ${modelName} error:`, modelErr.message);
        }
      }
    }

    // ── 2. Comprehensive Local KhataBot Intelligence Engine ──
    const normalized = message.toLowerCase().trim();

    // A. Greeting
    if (/^(hi|hello|hey|hola|greetings|namaste|నమస్తే|नमस्ते|good morning|good evening|good afternoon)/i.test(normalized)) {
      return res.status(200).json({
        success: true,
        response: `Namaste **${ownerName}**! I am **KhataBot** 🤖, your KhataPay intelligent assistant for **"${storeName}"**.\n\nI can answer **any question** about your store, including:\n* 💰 **"Who has highest due?"** or **"How much udhar does [customer] have?"**\n* 📊 **"Show this month's collection"** or **"What is my net balance?"**\n* ⚠️ **"Who are the risky customers?"**\n* 📱 **"How do I send SMS or WhatsApp reminders?"**\n* 💵 **"Show cashbook expenses"** or **"Recent transactions"**\n\nHow can I help you right now?`,
        suggestions: ["What is my net balance?", "Who has highest due?", "Show this month collection", "Risky customers"]
      });
    }

    // B. Store Name / Owner Identity
    if (normalized.includes('store name') || normalized.includes('shop name') || normalized.includes('my shop') || normalized.includes('my store')) {
      return res.status(200).json({
        success: true,
        response: `🏪 Your registered store name is **"${storeName}"**.\n\n* **Owner:** ${ownerName}\n* **Active Customers:** ${customers.length}\n* **Total Due to Collect:** ₹${totalUdhaar.toLocaleString('en-IN')}`,
        suggestions: ["What is my net balance?", "Who has highest due?"]
      });
    }
    if (normalized.includes('my name') || normalized.includes('who am i') || normalized.includes('who i am')) {
      return res.status(200).json({
        success: true,
        response: `👤 You are **${ownerName}**, the owner and manager of **"${storeName}"** on KhataPay!`,
        suggestions: ["What is my net balance?", "Who has highest due?"]
      });
    }

    // C. Specific Customer Lookup (by name or phone)
    const matchedCustomer = findMatchedCustomer(message, customers);
    if (matchedCustomer) {
      const isDue = matchedCustomer.balance > 0;
      const isAdvance = matchedCustomer.balance < 0;
      const balanceStr = isDue 
        ? `owes you **₹${matchedCustomer.balance.toLocaleString('en-IN')}** (Udhaar)` 
        : isAdvance 
          ? `has an advance deposit of **₹${Math.abs(matchedCustomer.balance).toLocaleString('en-IN')}**` 
          : `is completely settled with **₹0 balance** ✅`;

      const lastCustTxn = transactions.find(t => t.customer && t.customer._id.toString() === matchedCustomer._id.toString());
      const lastTxnStr = lastCustTxn 
        ? `* **Last Transaction:** ₹${lastCustTxn.amount} (${lastCustTxn.type === 'credit' ? 'Udhaar' : 'Payment'}) on ${new Date(lastCustTxn.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}`
        : `* **Transactions:** ${matchedCustomer.totalTransactions || 0} recorded entries`;

      return res.status(200).json({
        success: true,
        response: `👤 **Customer Report: ${matchedCustomer.name}**\n\n* **Status:** ${balanceStr}\n* **Phone:** ${matchedCustomer.phone || 'Not provided'}\n* **Credit Score:** **${matchedCustomer.creditScore || 750} / 900**\n* **Risk Assessment:** **${(matchedCustomer.riskLevel || 'low').toUpperCase()}** (${matchedCustomer.duePrediction === 'trusted' ? 'Trusted Customer ✅' : matchedCustomer.duePrediction === 'delay' ? 'May Delay ⚠️' : 'High Risk 🚨'})\n${lastTxnStr}`,
        suggestions: [`Send reminder to ${matchedCustomer.name}`, `Show details for ${matchedCustomer.name}`, "Who has highest due?"]
      });
    }

    // D. Total Udhaar / Total Due / How much to collect
    if (normalized.includes('total due') || normalized.includes('total udhar') || normalized.includes('how much udhar') || normalized.includes('how much to collect') || normalized.includes('who owes me') || normalized.includes('total to collect') || normalized.includes('to collect') || normalized.includes('उधार') || normalized.includes('ఉధార్')) {
      const debtors = customers.filter(c => c.balance > 0).sort((a, b) => b.balance - a.balance);
      const topList = debtors.slice(0, 5).map((c, i) => `${i + 1}. **${c.name}**: ₹${c.balance.toLocaleString('en-IN')}`).join('\n');

      return res.status(200).json({
        success: true,
        response: `💰 **Total Udhaar (To Collect):**\n\nYou have **₹${totalUdhaar.toLocaleString('en-IN')}** to collect across **${debtors.length}** customers.\n\n**Top Customers with Outstanding Dues:**\n${topList || 'No pending dues!'}\n\n💡 *Tip: You can send instant WhatsApp or SMS reminders with payment links from the Reminders tab.*`,
        suggestions: ["Send payment reminders", "Who has highest due?", "What is my net balance?"]
      });
    }

    // E. Total Jama / Advance Payments
    if (normalized.includes('jama') || normalized.includes('advance') || normalized.includes('advance payment') || normalized.includes('जमा') || normalized.includes('జమా')) {
      const advanceCusts = customers.filter(c => c.balance < 0);
      return res.status(200).json({
        success: true,
        response: `📥 **Total Advance (Jama Received):**\n\nYou are holding **₹${totalJama.toLocaleString('en-IN')}** in advance payments from **${advanceCusts.length}** customer(s).`,
        suggestions: ["What is my net balance?", "Who has highest due?"]
      });
    }

    // F. Net Balance / Overall Store Position
    if (normalized.includes('net balance') || normalized.includes('total balance') || normalized.includes('store position') || normalized.includes('overview') || normalized.includes('summary') || normalized.includes('ledger balance')) {
      return res.status(200).json({
        success: true,
        response: `📊 **Store Financial Summary for "${storeName}":**\n\n* **Net Ledger Position:** **₹${netBalance.toLocaleString('en-IN')}**\n* **Total Udhaar (You'll Get):** ₹${totalUdhaar.toLocaleString('en-IN')} (${customersWithDues} customers)\n* **Total Advance (You'll Give):** ₹${totalJama.toLocaleString('en-IN')}\n* **Total Customers:** ${customers.length}\n* **Cash in Drawer (Cashbook Net):** ₹${netCash.toLocaleString('en-IN')}`,
        suggestions: ["Who has highest due?", "Show this month collection", "Show cashbook expenses"]
      });
    }

    // G. Highest Due Customer
    if (normalized.includes('highest due') || normalized.includes('highest udhar') || normalized.includes('owes the most') || normalized.includes('maximum due') || normalized.includes('top due')) {
      const sorted = [...customers].sort((a, b) => b.balance - a.balance);
      const top = sorted[0];

      if (!top || top.balance <= 0) {
        return res.status(200).json({
          success: true,
          response: "🎉 All customers are clear! There are zero outstanding dues right now.",
          suggestions: ["What is my net balance?", "Show this month collection"]
        });
      }

      return res.status(200).json({
        success: true,
        response: `👑 **Highest Due Customer:**\n\n**${top.name}** has the highest pending due of **₹${top.balance.toLocaleString('en-IN')}**.\n\n* **Phone:** ${top.phone}\n* **Credit Score:** ${top.creditScore || 750}\n* **Risk Status:** ${(top.riskLevel || 'low').toUpperCase()}\n\nWould you like to send them an SMS or WhatsApp reminder?`,
        suggestions: [`Send reminder to ${top.name}`, "Who are the risky customers?", "What is my net balance?"]
      });
    }

    // H. Risky Customers
    if (normalized.includes('risky') || normalized.includes('high risk') || normalized.includes('late payer') || normalized.includes('bad debt') || normalized.includes('रिस्क')) {
      const risky = customers.filter(c => c.duePrediction === 'risky' || c.riskLevel === 'high' || (c.creditScore && c.creditScore < 600));

      if (risky.length === 0) {
        return res.status(200).json({
          success: true,
          response: "✅ Great news! You have **0 High-Risk** customers right now. All your customers pay on time or have safe transaction limits.",
          suggestions: ["Who has highest due?", "What is my net balance?"]
        });
      }

      const list = risky.map((c, i) => `${i + 1}. **${c.name}**: ₹${c.balance.toLocaleString('en-IN')} (Credit Score: ${c.creditScore || 550})`).join('\n');
      return res.status(200).json({
        success: true,
        response: `⚠️ **Customers Requiring Attention (High Risk / Delay):**\n\n${list}\n\n💡 *Recommendation: Set shorter credit periods or require partial cash payments before giving additional stock on udhaar.*`,
        suggestions: ["Send payment reminders", "Who has highest due?", "How to recover udhaar?"]
      });
    }

    // I. Credit Scores
    if (normalized.includes('credit score') || normalized.includes('score') || normalized.includes('trust score')) {
      const sorted = [...customers].sort((a, b) => (b.creditScore || 750) - (a.creditScore || 750));
      const top3 = sorted.slice(0, 3).map((c, i) => `${i + 1}. **${c.name}**: ${c.creditScore || 750} / 900 ⭐`).join('\n');
      const bottom3 = [...sorted].reverse().slice(0, 3).map((c, i) => `${i + 1}. **${c.name}**: ${c.creditScore || 750} / 900`).join('\n');

      return res.status(200).json({
        success: true,
        response: `📊 **Customer Credit Score Ratings (300 - 900):**\n\n**Top Rated (Most Trusted):**\n${top3 || 'None'}\n\n**Lowest Rated (High Delay Risk):**\n${bottom3 || 'None'}\n\n*Scores are automatically calculated based on on-time repayment history and overdue delays.*`,
        suggestions: ["Risky customers", "Who has highest due?", "What is my net balance?"]
      });
    }

    // J. Recent Transactions / Last Transaction / Payment
    if (normalized.includes('last transaction') || normalized.includes('recent transaction') || normalized.includes('recent payment') || normalized.includes('last payment') || normalized.includes('who paid') || normalized.includes('recent entry')) {
      if (transactions.length === 0) {
        return res.status(200).json({
          success: true,
          response: "You don't have any recorded transactions yet. Click '+ Add Customer' or 'You Gave (Udhaar)' to get started!",
          suggestions: ["What is my net balance?", "How to add transaction?"]
        });
      }

      const top5 = transactions.slice(0, 5).map((t, i) => {
        const dateStr = new Date(t.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
        const typeStr = t.type === 'credit' ? '🔴 Udhaar (Gave)' : '🟢 Jama (Got)';
        return `${i + 1}. **${t.customer ? t.customer.name : 'Unknown'}**: ${typeStr} **₹${t.amount.toLocaleString('en-IN')}** on ${dateStr} (${t.paymentMode || 'cash'})`;
      }).join('\n');

      return res.status(200).json({
        success: true,
        response: `📝 **Recent Ledger Activity:**\n\n${top5}`,
        suggestions: ["Show today's transactions", "Show this month collection", "What is my net balance?"]
      });
    }

    // K. Today's Transactions
    if (normalized.includes('today') || normalized.includes('आज') || normalized.includes('ఈరోజు')) {
      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);

      const todayTxns = transactions.filter(t => new Date(t.date) >= startOfToday);
      const todayGot = todayTxns.filter(t => t.type === 'debit').reduce((s, t) => s + t.amount, 0);
      const todayGave = todayTxns.filter(t => t.type === 'credit').reduce((s, t) => s + t.amount, 0);

      if (todayTxns.length === 0) {
        return res.status(200).json({
          success: true,
          response: "🗓️ No transactions have been recorded today yet.",
          suggestions: ["Show recent transactions", "Show this month collection", "What is my net balance?"]
        });
      }

      return res.status(200).json({
        success: true,
        response: `📅 **Today's Activity Summary:**\n\n* **Total Collected (Jama):** **₹${todayGot.toLocaleString('en-IN')}**\n* **Total Credit Given (Udhaar):** **₹${todayGave.toLocaleString('en-IN')}**\n* **Total Entries:** ${todayTxns.length} transaction(s)`,
        suggestions: ["Show recent transactions", "Show this month collection", "What is my net balance?"]
      });
    }

    // L. This Month's Collection
    if (normalized.includes('month collection') || normalized.includes('monthly collection') || normalized.includes('this month') || normalized.includes('महीना') || normalized.includes('నెల')) {
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const monthTxns = await Transaction.find({
        owner: ownerId,
        type: 'debit',
        date: { $gte: startOfMonth }
      });
      const monthTotal = monthTxns.reduce((s, t) => s + t.amount, 0);

      return res.status(200).json({
        success: true,
        response: `📈 **This Month's Collections:**\n\nYou have collected **₹${monthTotal.toLocaleString('en-IN')}** across **${monthTxns.length}** payments this calendar month.`,
        suggestions: ["What is my net balance?", "Who has highest due?", "Show cashbook expenses"]
      });
    }

    // M. Cashbook / Expenses / Drawer Cash
    if (normalized.includes('cashbook') || normalized.includes('expense') || normalized.includes('expenses') || normalized.includes('income') || normalized.includes('cash in') || normalized.includes('cash out') || normalized.includes('petty cash')) {
      const topExpenses = cashbookEntries.filter(e => e.type === 'out').slice(0, 4)
        .map(e => `* **${e.category}:** ₹${e.amount} (${e.description || 'No note'})`).join('\n');

      return res.status(200).json({
        success: true,
        response: `💵 **Cashbook (Shop Income & Expenses):**\n\n* **Total Cash In:** ₹${totalCashIn.toLocaleString('en-IN')}\n* **Total Cash Out (Expenses):** ₹${totalCashOut.toLocaleString('en-IN')}\n* **Net Cash in Drawer:** **₹${netCash.toLocaleString('en-IN')}**\n\n**Recent Expenses:**\n${topExpenses || 'No recent expenses recorded.'}`,
        suggestions: ["What is my net balance?", "Show this month collection"]
      });
    }

    // N. How to send SMS / WhatsApp Reminders
    if (normalized.includes('sms') || normalized.includes('whatsapp') || normalized.includes('reminder') || normalized.includes('reminders') || normalized.includes('send reminder')) {
      return res.status(200).json({
        success: true,
        response: `📲 **How to Send Payment Reminders on KhataPay:**\n\n1. **Via Reminders Page:** Click **"Reminders"** in the sidebar. You'll see all customers with pending dues and automated overdue alerts.\n2. **Via Customer Page:** Open any customer's profile, click **"Send SMS"** or **"Send WhatsApp"**.\n3. **Automated Payment Link:** KhataPay includes an instant verified UPI link (\`https://udharapp.vercel.app/pay/:customerId\`) with QR code.\n4. **Delivery Modes:**\n   * **Cloud Gateway:** Direct delivery via Fast2SMS.\n   * **Phone App:** Opens directly in your device's SMS or WhatsApp app with pre-filled professional text.`,
        suggestions: ["Who has highest due?", "How does online payment work?", "What is my net balance?"]
      });
    }

    // O. Online Payments / UPI / Checkout Link
    if (normalized.includes('upi') || normalized.includes('qr') || normalized.includes('online payment') || normalized.includes('payment link') || normalized.includes('checkout') || normalized.includes('utr')) {
      return res.status(200).json({
        success: true,
        response: `💳 **How KhataPay UPI Checkout Works:**\n\n1. Every customer has a unique verified payment page: \`https://udharapp.vercel.app/pay/:customerId\`.\n2. When they click the link, they see your store name (**"${storeName}"**), balance, and a dynamic UPI QR code.\n3. They scan & pay using **GPay, PhonePe, Paytm, or BHIM**.\n4. After paying, they enter their 12-digit **UTR number** to confirm.\n5. The transaction updates your ledger instantly, and the Soundbox chimes!`,
        suggestions: ["How to send payment reminder?", "What is soundbox?", "What is my net balance?"]
      });
    }

    // P. Soundbox / Audio alerts
    if (normalized.includes('soundbox') || normalized.includes('voice') || normalized.includes('audio') || normalized.includes('chime') || normalized.includes('speaker')) {
      return res.status(200).json({
        success: true,
        response: `🔊 **KhataPay Instant Soundbox:**\n\nKhataPay features a built-in virtual soundbox that announces payment collections in real-time.\n\n* **To Enable/Mute:** Click the **Speaker icon** in the top navigation bar.\n* When active, an audio chime sounds whenever payment is recorded or verified.`,
        suggestions: ["How does online payment work?", "What is my net balance?"]
      });
    }

    // Q. How to Export CSV / Reports / Data Backup
    if (normalized.includes('export') || normalized.includes('csv') || normalized.includes('excel') || normalized.includes('download') || normalized.includes('backup') || normalized.includes('report')) {
      return res.status(200).json({
        success: true,
        response: `📊 **Exporting Reports & Data in KhataPay:**\n\n* **Customer Ledger CSV:** Go to **Customers** and click **"Export CSV"** in the top-right to download an instant spreadsheet of all customer names, phone numbers, balances, and risk levels.\n* **Quick Actions:** Click **"Export CSV"** directly in the Dashboard Quick Actions hub.\n* **Backup:** Click **"Backup"** in Quick Actions or Settings to create a local ledger snapshot.`,
        suggestions: ["What is my net balance?", "Who has highest due?"]
      });
    }

    // R. Business Advice: How to recover debt / Udhaar management tips
    if (normalized.includes('recover') || normalized.includes('collect debt') || normalized.includes('bad debt') || normalized.includes('advice') || normalized.includes('tips') || normalized.includes('profit') || normalized.includes('margin') || normalized.includes('credit policy')) {
      return res.status(200).json({
        success: true,
        response: `💡 **Proven Shopkeeper Rules to Avoid Bad Debts & Recover Udhaar:**\n\n1. **Set Hard Credit Limits:** Never allow any single customer's due to exceed 10-15% of your daily sales volume.\n2. **Send 3-Day Prior Reminders:** Use KhataPay's friendly SMS reminder before the due date, not just when overdue.\n3. **Partial Settlements First:** If a customer can't pay ₹2,000, ask for ₹500 today. Partial payments build repayment discipline.\n4. **Reward Fast Payers:** Give small perks or discounts to customers who maintain an **800+ credit score**.\n5. **Cash on Hand:** Always record your daily petty expenses in the **Cashbook** to track true net profit margins.`,
        suggestions: ["Risky customers", "Who has highest due?", "What is my net balance?"]
      });
    }

    // S. General Answer (Helpful, complete fallback that NEVER rejects)
    return res.status(200).json({
      success: true,
      response: `I'm here to help with all questions about **"${storeName}"**!\n\nHere is a quick snapshot of your business right now:\n* 💰 **Udhaar to Collect:** ₹${totalUdhaar.toLocaleString('en-IN')} (${customersWithDues} customers)\n* 💵 **Advance Received:** ₹${totalJama.toLocaleString('en-IN')}\n* 📊 **Net Position:** **₹${netBalance.toLocaleString('en-IN')}**\n* 👥 **Total Customers:** ${customers.length}\n* 📥 **Cash in Drawer:** ₹${netCash.toLocaleString('en-IN')}\n\nYou can ask me specific questions like:\n* *"How much does [Customer Name] owe?"*\n* *"Who are my top 3 highest due customers?"*\n* *"How do I send an SMS reminder with a UPI link?"*\n* *"What were my cashbook expenses?"*`,
      suggestions: ["What is my net balance?", "Who has highest due?", "Show this month collection", "Risky customers"]
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  voiceEntry,
  chatAssistant
};
