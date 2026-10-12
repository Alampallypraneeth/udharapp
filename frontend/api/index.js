import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

const JWT_SECRET = process.env.JWT_SECRET || 'udhaar_khata_super_secret_key_2026';

// ── In-Memory / Hybrid Storage Fallback (Guarantees zero-downtime even if MongoDB is paused) ──
const memoryStore = {
  users: [],
  customers: [],
  transactions: [],
  cashbook: [],
  history: [],
};

// ── Database Connection Cache for Vercel Serverless ──
const ATLAS_URI = 'mongodb+srv://alampallypraneeth:alampallypraneeth@cluster0.dzmd3lj.mongodb.net/udhaar-khata?retryWrites=true&w=majority';
let cachedConn = null;
let cachedPromise = null;

async function connectToMongo() {
  if (cachedConn && mongoose.connection.readyState === 1) {
    return true;
  }
  const uri = process.env.MONGO_URI || ATLAS_URI;
  if (!uri) return false;

  if (!cachedPromise) {
    cachedPromise = mongoose
      .connect(uri, {
        serverSelectionTimeoutMS: 6000,
      })
      .then(() => {
        console.log('✅ Connected to MongoDB Atlas on Vercel');
        cachedConn = mongoose.connection;
        return true;
      })
      .catch((err) => {
        console.warn('⚠️ MongoDB connection error on Vercel:', err.message);
        cachedPromise = null;
        return false;
      });
  }

  try {
    const connected = await cachedPromise;
    if (connected && mongoose.connection.readyState === 1) {
      cachedConn = mongoose.connection;
      return true;
    }
  } catch (err) {
    cachedPromise = null;
    return false;
  }
  return false;
}

// ── Mongoose Models ──
const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    password: { type: String, required: true },
    storeName: { type: String, required: true },
    phone: { type: String, default: '' },
    upiId: { type: String, default: '' },
    language: { type: String, default: 'en' },
    avatar: { type: String, default: '' },
    pin: { type: String, default: '' },
    hasPin: { type: Boolean, default: false },
    isBiometricEnabled: { type: Boolean, default: false },
    biometricCredentialId: { type: String, default: '' },
  },
  { timestamps: true }
);
const User = mongoose.models.User || mongoose.model('User', userSchema);

const customerSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    phone: { type: String, required: true },
    email: { type: String, default: '' },
    address: { type: String, default: '' },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    balance: { type: Number, default: 0 },
    riskLevel: { type: String, default: 'low' },
    creditScore: { type: Number, default: 750 },
    duePrediction: { type: String, default: 'trusted' },
    totalTransactions: { type: Number, default: 0 },
    lastPaymentDate: { type: Date, default: null },
    paymentDueDate: { type: Date, default: null },
    avatar: { type: String, default: '' },
  },
  { timestamps: true }
);
const Customer = mongoose.models.Customer || mongoose.model('Customer', customerSchema);

const transactionSchema = new mongoose.Schema(
  {
    customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, enum: ['credit', 'debit'], required: true },
    amount: { type: Number, required: true },
    description: { type: String, default: '' },
    paymentStatus: { type: String, default: 'PENDING' },
    paymentMode: { type: String, default: 'none' },
    date: { type: Date, default: Date.now },
  },
  { timestamps: true }
);
const Transaction = mongoose.models.Transaction || mongoose.model('Transaction', transactionSchema);

const cashbookSchema = new mongoose.Schema(
  {
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, enum: ['in', 'out'], required: true },
    amount: { type: Number, required: true },
    description: { type: String, default: '' },
    paymentMode: { type: String, default: 'cash' },
    category: { type: String, default: 'Other' },
    date: { type: Date, default: Date.now },
  },
  { timestamps: true }
);
const Cashbook = mongoose.models.CashbookEntry || mongoose.model('CashbookEntry', cashbookSchema);

// ── Helper: Generate Token ──
const generateToken = (id) => jwt.sign({ id }, JWT_SECRET, { expiresIn: '30d' });

// ── Auth Middleware ──
const authGuard = async (req, res, next) => {
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }
  if (!token) {
    return res.status(401).json({ success: false, message: 'Not authorized' });
  }
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const dbReady = await connectToMongo();
    if (dbReady) {
      const u = await User.findById(decoded.id);
      if (u) {
        req.user = u;
        return next();
      }
    }
    // Fallback search
    const memUser = memoryStore.users.find((u) => u._id.toString() === decoded.id.toString());
    if (memUser) {
      req.user = memUser;
      return next();
    }
    return res.status(401).json({ success: false, message: 'User not found' });
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Invalid token' });
  }
};

// ── Initialize App ──
const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Health Check
app.get('/api/health', async (req, res) => {
  const dbReady = await connectToMongo();
  res.json({
    status: 'ok',
    message: 'Udhaar Khata API is running on Vercel',
    database: dbReady ? 'connected' : 'memory_fallback',
  });
});

// ── Auth Endpoints ──
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password, storeName, phone, avatar } = req.body;
    if (!name || !email || !password || !storeName) {
      return res.status(400).json({ success: false, message: 'Please provide all required fields' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const dbReady = await connectToMongo();
    if (dbReady) {
      const existing = await User.findOne({ email });
      if (existing) {
        return res.status(400).json({ success: false, message: 'An account with this email already exists' });
      }
      const user = await User.create({
        name,
        email,
        password: hashedPassword,
        storeName,
        phone: phone || '',
        avatar: avatar || '',
      });
      const token = generateToken(user._id);
      return res.status(201).json({
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
        },
        token,
      });
    }

    // Fallback store
    const existing = memoryStore.users.find((u) => u.email === email);
    if (existing) {
      return res.status(400).json({ success: false, message: 'An account with this email already exists' });
    }
    const fakeId = new mongoose.Types.ObjectId().toString();
    const newUser = {
      _id: fakeId,
      name,
      email,
      password: hashedPassword,
      storeName,
      phone: phone || '',
      avatar: avatar || '',
      upiId: '',
      language: 'en',
      hasPin: false,
      isBiometricEnabled: false,
      createdAt: new Date(),
    };
    memoryStore.users.push(newUser);
    const token = generateToken(fakeId);
    return res.status(201).json({
      success: true,
      data: {
        _id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        storeName: newUser.storeName,
        phone: newUser.phone,
        upiId: newUser.upiId,
        language: newUser.language,
        avatar: newUser.avatar,
        hasPin: newUser.hasPin,
        isBiometricEnabled: newUser.isBiometricEnabled,
      },
      token,
    });
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ success: false, message: err.message || 'Registration failed' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Please provide email and password' });
    }

    const dbReady = await connectToMongo();
    if (dbReady) {
      const user = await User.findOne({ email });
      if (user && (await bcrypt.compare(password, user.password))) {
        const token = generateToken(user._id);
        return res.status(200).json({
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
          },
          token,
        });
      }
    }

    const memUser = memoryStore.users.find((u) => u.email === email);
    if (memUser && (await bcrypt.compare(password, memUser.password))) {
      const token = generateToken(memUser._id);
      return res.status(200).json({
        success: true,
        data: {
          _id: memUser._id,
          name: memUser.name,
          email: memUser.email,
          storeName: memUser.storeName,
          phone: memUser.phone,
          upiId: memUser.upiId,
          language: memUser.language,
          avatar: memUser.avatar,
          hasPin: memUser.hasPin,
          isBiometricEnabled: memUser.isBiometricEnabled,
        },
        token,
      });
    }

    return res.status(401).json({ success: false, message: 'Invalid email or password' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message || 'Login failed' });
  }
});

app.get('/api/auth/me', authGuard, (req, res) => {
  res.json({ success: true, data: req.user });
});

app.put('/api/auth/me', authGuard, async (req, res) => {
  const { name, storeName, phone, upiId, language, avatar } = req.body;
  if (req.user.save) {
    Object.assign(req.user, { name, storeName, phone, upiId, language, avatar });
    await req.user.save();
    return res.json({ success: true, data: req.user });
  }
  Object.assign(req.user, { name, storeName, phone, upiId, language, avatar });
  res.json({ success: true, data: req.user });
});

app.post('/api/auth/setup-security', authGuard, async (req, res) => {
  try {
    const { pin, isBiometricEnabled, biometricCredentialId } = req.body;
    const salt = await bcrypt.genSalt(10);
    const hashedPin = pin ? await bcrypt.hash(pin, salt) : undefined;

    if (req.user.save) {
      if (hashedPin) {
        req.user.pin = hashedPin;
        req.user.hasPin = true;
      }
      if (isBiometricEnabled !== undefined) req.user.isBiometricEnabled = isBiometricEnabled;
      if (biometricCredentialId !== undefined) req.user.biometricCredentialId = biometricCredentialId;
      await req.user.save();
      return res.json({ success: true, data: req.user });
    }

    if (hashedPin) {
      req.user.pin = hashedPin;
      req.user.hasPin = true;
    }
    if (isBiometricEnabled !== undefined) req.user.isBiometricEnabled = isBiometricEnabled;
    if (biometricCredentialId !== undefined) req.user.biometricCredentialId = biometricCredentialId;
    res.json({ success: true, data: req.user });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.post('/api/auth/verify-pin', authGuard, async (req, res) => {
  const { pin } = req.body;
  if (!pin) return res.status(400).json({ success: false, message: 'Please provide PIN' });
  const isMatch = req.user.pin ? await bcrypt.compare(pin, req.user.pin) : false;
  if (!isMatch) return res.status(400).json({ success: false, message: 'Incorrect PIN' });
  res.json({ success: true, message: 'PIN verified successfully' });
});

app.post('/api/auth/verify-biometric', authGuard, async (req, res) => {
  const { credentialId } = req.body;
  if (req.user.biometricCredentialId !== credentialId) {
    return res.status(400).json({ success: false, message: 'Invalid biometric credential' });
  }
  res.json({ success: true, message: 'Biometrics verified successfully' });
});

// ── Customers Endpoints ──
app.get('/api/customers', authGuard, async (req, res) => {
  try {
    const dbReady = await connectToMongo();
    if (dbReady) {
      const customers = await Customer.find({ owner: req.user._id }).sort({ balance: -1 });
      return res.json({ success: true, data: customers });
    }
    const memCusts = memoryStore.customers.filter((c) => c.owner.toString() === req.user._id.toString());
    res.json({ success: true, data: memCusts });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.post('/api/customers', authGuard, async (req, res) => {
  try {
    const { name, phone, email, address, balance, avatar, paymentDueDate } = req.body;
    const dbReady = await connectToMongo();
    if (dbReady) {
      const customer = await Customer.create({
        name,
        phone,
        email: email || '',
        address: address || '',
        balance: parseFloat(balance) || 0,
        avatar: avatar || '',
        paymentDueDate: paymentDueDate || null,
        owner: req.user._id,
      });
      return res.status(201).json({ success: true, data: customer });
    }

    const fakeId = new mongoose.Types.ObjectId().toString();
    const newCust = {
      _id: fakeId,
      name,
      phone,
      email: email || '',
      address: address || '',
      balance: parseFloat(balance) || 0,
      avatar: avatar || '',
      paymentDueDate: paymentDueDate || null,
      owner: req.user._id,
      riskLevel: 'low',
      creditScore: 750,
      duePrediction: 'trusted',
      totalTransactions: 0,
      createdAt: new Date(),
    };
    memoryStore.customers.push(newCust);
    res.status(201).json({ success: true, data: newCust });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.get('/api/customers/:id', authGuard, async (req, res) => {
  try {
    const dbReady = await connectToMongo();
    if (dbReady) {
      const customer = await Customer.findOne({ _id: req.params.id, owner: req.user._id });
      if (!customer) return res.status(404).json({ success: false, message: 'Customer not found' });
      const transactions = await Transaction.find({ customer: customer._id }).sort({ date: -1 });
      return res.json({ success: true, data: { ...customer.toObject(), transactions } });
    }

    const c = memoryStore.customers.find(
      (cust) => cust._id.toString() === req.params.id && cust.owner.toString() === req.user._id.toString()
    );
    if (!c) return res.status(404).json({ success: false, message: 'Customer not found' });
    const txs = memoryStore.transactions
      .filter((t) => t.customer.toString() === c._id.toString())
      .sort((a, b) => new Date(b.date) - new Date(a.date));
    res.json({ success: true, data: { ...c, transactions: txs } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.put('/api/customers/:id', authGuard, async (req, res) => {
  try {
    const { name, phone, email, address, avatar, paymentDueDate } = req.body;
    const dbReady = await connectToMongo();
    if (dbReady) {
      const customer = await Customer.findOneAndUpdate(
        { _id: req.params.id, owner: req.user._id },
        { name, phone, email, address, avatar, paymentDueDate },
        { new: true }
      );
      return res.json({ success: true, data: customer });
    }
    const c = memoryStore.customers.find((cust) => cust._id.toString() === req.params.id);
    if (c) Object.assign(c, { name, phone, email, address, avatar, paymentDueDate });
    res.json({ success: true, data: c });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.delete('/api/customers/:id', authGuard, async (req, res) => {
  try {
    const dbReady = await connectToMongo();
    if (dbReady) {
      await Customer.findOneAndDelete({ _id: req.params.id, owner: req.user._id });
      await Transaction.deleteMany({ customer: req.params.id });
      return res.json({ success: true, message: 'Customer deleted' });
    }
    memoryStore.customers = memoryStore.customers.filter((c) => c._id.toString() !== req.params.id);
    memoryStore.transactions = memoryStore.transactions.filter((t) => t.customer.toString() !== req.params.id);
    res.json({ success: true, message: 'Customer deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── Transactions Endpoints ──
app.get('/api/transactions', authGuard, async (req, res) => {
  try {
    const dbReady = await connectToMongo();
    if (dbReady) {
      const txs = await Transaction.find({ owner: req.user._id }).populate('customer').sort({ date: -1 });
      return res.json({ success: true, data: txs });
    }
    const txs = memoryStore.transactions.filter((t) => t.owner.toString() === req.user._id.toString());
    res.json({ success: true, data: txs });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.post('/api/transactions', authGuard, async (req, res) => {
  try {
    const { customerId, type, amount, description, paymentMode } = req.body;
    const numAmount = parseFloat(amount);
    const dbReady = await connectToMongo();
    if (dbReady) {
      const customer = await Customer.findOne({ _id: customerId, owner: req.user._id });
      if (!customer) return res.status(404).json({ success: false, message: 'Customer not found' });

      const tx = await Transaction.create({
        customer: customer._id,
        owner: req.user._id,
        type,
        amount: numAmount,
        description: description || '',
        paymentMode: paymentMode || (type === 'credit' ? 'none' : 'cash'),
        paymentStatus: 'SETTLED',
      });

      if (type === 'credit') {
        customer.balance += numAmount;
      } else {
        customer.balance -= numAmount;
        customer.lastPaymentDate = new Date();
      }
      customer.totalTransactions += 1;
      await customer.save();

      return res.status(201).json({ success: true, data: tx });
    }

    const c = memoryStore.customers.find((cust) => cust._id.toString() === customerId);
    if (!c) return res.status(404).json({ success: false, message: 'Customer not found' });
    const fakeId = new mongoose.Types.ObjectId().toString();
    const newTx = {
      _id: fakeId,
      customer: c._id,
      owner: req.user._id,
      type,
      amount: numAmount,
      description: description || '',
      paymentMode: paymentMode || (type === 'credit' ? 'none' : 'cash'),
      paymentStatus: 'SETTLED',
      date: new Date(),
    };
    memoryStore.transactions.push(newTx);
    if (type === 'credit') c.balance += numAmount;
    else {
      c.balance -= numAmount;
      c.lastPaymentDate = new Date();
    }
    c.totalTransactions += 1;
    res.status(201).json({ success: true, data: newTx });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── Cashbook Endpoints ──
app.get('/api/cashbook', authGuard, async (req, res) => {
  try {
    const dbReady = await connectToMongo();
    if (dbReady) {
      const entries = await Cashbook.find({ owner: req.user._id }).sort({ date: -1 });
      return res.json({ success: true, data: entries });
    }
    const memEntries = memoryStore.cashbook.filter((e) => e.owner.toString() === req.user._id.toString());
    res.json({ success: true, data: memEntries });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.post('/api/cashbook', authGuard, async (req, res) => {
  try {
    const { type, amount, category, description, paymentMode } = req.body;
    const dbReady = await connectToMongo();
    if (dbReady) {
      const entry = await Cashbook.create({
        owner: req.user._id,
        type,
        amount: parseFloat(amount),
        category: category || 'Other',
        description: description || '',
        paymentMode: paymentMode || 'cash',
      });
      return res.status(201).json({ success: true, data: entry });
    }
    const fakeId = new mongoose.Types.ObjectId().toString();
    const entry = {
      _id: fakeId,
      owner: req.user._id,
      type,
      amount: parseFloat(amount),
      category: category || 'Other',
      description: description || '',
      paymentMode: paymentMode || 'cash',
      date: new Date(),
    };
    memoryStore.cashbook.push(entry);
    res.status(201).json({ success: true, data: entry });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── Public Checkout Endpoints ──
app.get('/api/reminders/checkout/:customerId', async (req, res) => {
  try {
    const { customerId } = req.params;
    const dbReady = await connectToMongo();
    if (dbReady) {
      const customer = await Customer.findById(customerId).populate('owner');
      if (customer) {
        const credits = await Transaction.find({ customer: customer._id, type: 'credit' });
        const debits = await Transaction.find({ customer: customer._id, type: 'debit' });
        const totalUdhaar = credits.reduce((sum, tx) => sum + tx.amount, 0);
        const totalJama = debits.reduce((sum, tx) => sum + tx.amount, 0);
        return res.json({
          success: true,
          data: {
            customerName: customer.name,
            customerPhone: customer.phone,
            customerAddress: customer.address || 'Ghatkesar Rd',
            balance: customer.balance,
            storeName: customer.owner?.storeName || 'VyaparFlow',
            upiId: customer.owner?.upiId || '',
            ownerName: customer.owner?.name || 'Store Owner',
            ownerPhone: customer.owner?.phone || '',
            totalUdhaar,
            totalJama,
            lastPayment: null,
          },
        });
      }
    }

    const c = memoryStore.customers.find((cust) => cust._id.toString() === customerId);
    if (!c) {
      return res.status(404).json({ success: false, message: 'Customer record not found' });
    }
    const owner = memoryStore.users.find((u) => u._id.toString() === c.owner.toString());
    const txs = memoryStore.transactions.filter((t) => t.customer.toString() === customerId);
    const totalUdhaar = txs.filter((t) => t.type === 'credit').reduce((s, t) => s + t.amount, 0);
    const totalJama = txs.filter((t) => t.type === 'debit').reduce((s, t) => s + t.amount, 0);

    res.json({
      success: true,
      data: {
        customerName: c.name,
        customerPhone: c.phone,
        customerAddress: c.address || 'Ghatkesar Rd',
        balance: c.balance,
        storeName: owner?.storeName || 'VyaparFlow',
        upiId: owner?.upiId || '',
        ownerName: owner?.name || 'Store Owner',
        ownerPhone: owner?.phone || '',
        totalUdhaar,
        totalJama,
        lastPayment: null,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.post('/api/reminders/checkout/:customerId/confirm-payment', async (req, res) => {
  try {
    const { customerId } = req.params;
    const { utr, amount } = req.body;
    const numAmount = parseFloat(amount) || 0;

    const dbReady = await connectToMongo();
    if (dbReady) {
      const customer = await Customer.findById(customerId);
      if (customer) {
        await Transaction.create({
          customer: customer._id,
          owner: customer.owner,
          type: 'debit',
          amount: numAmount,
          description: `Online UPI Payment (UTR: ${utr})`,
          paymentStatus: 'SETTLED',
          paymentMode: 'upi',
        });
        customer.balance = Math.max(0, customer.balance - numAmount);
        customer.lastPaymentDate = new Date();
        customer.totalTransactions += 1;
        await customer.save();
        return res.json({
          success: true,
          message: 'Payment confirmed successfully',
          data: { balance: customer.balance, transactionStatus: 'SETTLED' },
        });
      }
    }

    const c = memoryStore.customers.find((cust) => cust._id.toString() === customerId);
    if (!c) return res.status(404).json({ success: false, message: 'Customer not found' });
    const fakeId = new mongoose.Types.ObjectId().toString();
    memoryStore.transactions.push({
      _id: fakeId,
      customer: c._id,
      owner: c.owner,
      type: 'debit',
      amount: numAmount,
      description: `Online UPI Payment (UTR: ${utr})`,
      paymentStatus: 'SETTLED',
      paymentMode: 'upi',
      date: new Date(),
    });
    c.balance = Math.max(0, c.balance - numAmount);
    c.lastPaymentDate = new Date();
    c.totalTransactions += 1;

    res.json({
      success: true,
      message: 'Payment confirmed successfully',
      data: { balance: c.balance, transactionStatus: 'SETTLED' },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.post('/api/reminders/send-whatsapp', authGuard, (req, res) => {
  res.json({ success: true, message: 'WhatsApp reminder intent generated' });
});

app.post('/api/reminders/send-sms', authGuard, (req, res) => {
  res.json({ success: true, message: 'SMS reminder intent generated' });
});

export default app;
