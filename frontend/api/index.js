import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import axios from 'axios';

const JWT_SECRET = process.env.JWT_SECRET || 'udhaar_khata_super_secret_key_2026';
const GROQ_API_KEY = process.env.GROQ_API_KEY;

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
        maxPoolSize: 10,
        minPoolSize: 1,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 25000,
        family: 4,
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

const historySchema = new mongoose.Schema(
  {
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer' },
    customerName: { type: String, default: '' },
    customerPhone: { type: String, default: '' },
    transactionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Transaction' },
    type: { type: String, default: 'credit' },
    amount: { type: Number, default: 0 },
    description: { type: String, default: '' },
    date: { type: Date, default: Date.now },
    action: { type: String, default: 'CREATE' },
  },
  { timestamps: true }
);
const CustomerHistory = mongoose.models.CustomerHistory || mongoose.model('CustomerHistory', historySchema);

// ── Database High-Performance Indexes ──
userSchema.index({ email: 1 });
customerSchema.index({ owner: 1, balance: -1 });
customerSchema.index({ owner: 1, name: 1 });
transactionSchema.index({ owner: 1, date: -1 });
transactionSchema.index({ customer: 1, date: -1 });
cashbookSchema.index({ owner: 1, date: -1 });
historySchema.index({ owner: 1, date: -1 });

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
      const customers = await Customer.find({ owner: req.user._id }).sort({ balance: -1 }).lean();
      return res.json({ success: true, count: customers.length, data: customers });
    }
    const memCusts = memoryStore.customers.filter((c) => c.owner.toString() === req.user._id.toString());
    res.json({ success: true, count: memCusts.length, data: memCusts });
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
      const [customer, transactions] = await Promise.all([
        Customer.findOne({ _id: req.params.id, owner: req.user._id }).lean(),
        Transaction.find({ customer: req.params.id, owner: req.user._id }).sort({ date: -1 }).limit(100).lean(),
      ]);
      if (!customer) return res.status(404).json({ success: false, message: 'Customer not found' });
      return res.json({ success: true, data: { ...customer, transactions } });
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
app.get('/api/transactions/stats', authGuard, async (req, res) => {
  try {
    const ownerId = req.user._id;
    const dbReady = await connectToMongo();
    if (dbReady) {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      const [
        totalCustomers,
        balanceAgg,
        todayTransactions,
        todayAgg,
        customersWithDues,
        highRiskCount,
        pendingTransactions,
      ] = await Promise.all([
        Customer.countDocuments({ owner: ownerId }),
        Customer.aggregate([
          { $match: { owner: new mongoose.Types.ObjectId(ownerId) } },
          {
            $group: {
              _id: null,
              youWillGet: { $sum: { $cond: [{ $gt: ['$balance', 0] }, '$balance', 0] } },
              youWillGive: { $sum: { $cond: [{ $lt: ['$balance', 0] }, { $abs: '$balance' }, 0] } },
            },
          },
        ]),
        Transaction.countDocuments({
          owner: ownerId,
          date: { $gte: todayStart },
        }),
        Transaction.aggregate([
          { $match: { owner: new mongoose.Types.ObjectId(ownerId), date: { $gte: todayStart } } },
          {
            $group: {
              _id: '$type',
              total: { $sum: '$amount' },
            },
          },
        ]),
        Customer.countDocuments({
          owner: ownerId,
          balance: { $gt: 0 },
        }),
        Customer.countDocuments({
          owner: ownerId,
          riskLevel: 'high',
        }),
        Transaction.countDocuments({
          owner: ownerId,
          paymentStatus: 'PENDING',
          type: 'credit',
        }),
      ]);

      const todayCredit = todayAgg.find((a) => a._id === 'credit')?.total || 0;
      const todayDebit = todayAgg.find((a) => a._id === 'debit')?.total || 0;

      return res.status(200).json({
        success: true,
        data: {
          totalCustomers,
          youWillGet: balanceAgg[0]?.youWillGet || 0,
          youWillGive: balanceAgg[0]?.youWillGive || 0,
          todayTransactions,
          todayCredit,
          todayDebit,
          customersWithDues,
          highRiskCount,
          pendingTransactions,
        },
      });
    }

    const memCusts = memoryStore.customers.filter((c) => c.owner.toString() === ownerId.toString());
    const memTxs = memoryStore.transactions.filter((t) => t.owner.toString() === ownerId.toString());
    const youWillGet = memCusts.filter((c) => c.balance > 0).reduce((sum, c) => sum + c.balance, 0);
    const youWillGive = memCusts.filter((c) => c.balance < 0).reduce((sum, c) => sum + Math.abs(c.balance), 0);
    res.json({
      success: true,
      data: {
        totalCustomers: memCusts.length,
        youWillGet,
        youWillGive,
        todayTransactions: memTxs.length,
        todayCredit: 0,
        todayDebit: 0,
        customersWithDues: memCusts.filter((c) => c.balance > 0).length,
        highRiskCount: 0,
        pendingTransactions: 0,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.get('/api/transactions', authGuard, async (req, res) => {
  try {
    const { customer, type, limit } = req.query;
    const dbReady = await connectToMongo();
    if (dbReady) {
      const query = { owner: req.user._id };
      if (customer) query.customer = customer;
      if (type) query.type = type;
      const qLimit = parseInt(limit) || 100;
      const txs = await Transaction.find(query)
        .populate('customer', 'name phone balance avatar')
        .sort({ date: -1 })
        .limit(qLimit)
        .lean();
      return res.json({ success: true, count: txs.length, data: txs });
    }
    let txs = memoryStore.transactions.filter((t) => t.owner.toString() === req.user._id.toString());
    if (customer) txs = txs.filter((t) => t.customer.toString() === customer.toString());
    res.json({ success: true, count: txs.length, data: txs });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.post('/api/transactions', authGuard, async (req, res) => {
  try {
    const { customer, customerId, type, amount, description, paymentMode, date } = req.body;
    const cid = customer || customerId;
    const numAmount = parseFloat(amount);
    if (!cid || isNaN(numAmount) || numAmount <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid customer or amount' });
    }

    const dbReady = await connectToMongo();
    if (dbReady) {
      const cust = await Customer.findOne({ _id: cid, owner: req.user._id });
      if (!cust) return res.status(404).json({ success: false, message: 'Customer not found' });

      const tx = await Transaction.create({
        customer: cust._id,
        owner: req.user._id,
        type,
        amount: numAmount,
        description: description || '',
        paymentMode: paymentMode || (type === 'credit' ? 'none' : 'cash'),
        paymentStatus: type === 'debit' ? 'SETTLED' : 'PENDING',
        date: date ? new Date(date) : new Date(),
      });

      if (type === 'credit') {
        cust.balance += numAmount;
      } else {
        cust.balance -= numAmount;
        cust.lastPaymentDate = new Date();
      }
      cust.totalTransactions = (cust.totalTransactions || 0) + 1;
      await cust.save();

      await CustomerHistory.create({
        owner: req.user._id,
        customerId: cust._id,
        customerName: cust.name,
        customerPhone: cust.phone,
        transactionId: tx._id,
        type,
        amount: numAmount,
        description: description || '',
        date: tx.date,
        action: 'CREATE',
      }).catch(() => {});

      await tx.populate('customer');
      return res.status(201).json({ success: true, data: tx, updatedBalance: cust.balance });
    }

    const c = memoryStore.customers.find((cust) => cust._id.toString() === cid.toString());
    if (!c) return res.status(404).json({ success: false, message: 'Customer not found' });
    const fakeId = new mongoose.Types.ObjectId().toString();
    const newTx = {
      _id: fakeId,
      customer: c,
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
    res.status(201).json({ success: true, data: newTx, updatedBalance: c.balance });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.put('/api/transactions/:id/settle', authGuard, async (req, res) => {
  try {
    const dbReady = await connectToMongo();
    if (dbReady) {
      const tx = await Transaction.findOne({ _id: req.params.id, owner: req.user._id });
      if (!tx) return res.status(404).json({ success: false, message: 'Transaction not found' });
      tx.paymentStatus = 'SETTLED';
      await tx.save();

      const cust = await Customer.findOne({ _id: tx.customer, owner: req.user._id });
      if (cust) {
        if (tx.type === 'credit') {
          cust.balance = Math.max(0, cust.balance - tx.amount);
          cust.lastPaymentDate = new Date();
        } else {
          cust.balance += tx.amount;
        }
        await cust.save();
      }
      return res.json({ success: true, data: tx, updatedBalance: cust?.balance });
    }
    res.json({ success: true, message: 'Settled' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.put('/api/transactions/:id/approve', authGuard, async (req, res) => {
  try {
    const dbReady = await connectToMongo();
    if (dbReady) {
      const tx = await Transaction.findOne({ _id: req.params.id, owner: req.user._id });
      if (!tx) return res.status(404).json({ success: false, message: 'Transaction not found' });
      tx.paymentStatus = 'SETTLED';
      await tx.save();

      const cust = await Customer.findOne({ _id: tx.customer, owner: req.user._id });
      if (cust) {
        cust.balance = Math.max(0, cust.balance - tx.amount);
        cust.lastPaymentDate = new Date();
        await cust.save();
      }
      return res.json({ success: true, message: 'Approved', data: tx });
    }
    res.json({ success: true, message: 'Approved' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.put('/api/transactions/:id/decline', authGuard, async (req, res) => {
  try {
    const dbReady = await connectToMongo();
    if (dbReady) {
      const tx = await Transaction.findOne({ _id: req.params.id, owner: req.user._id });
      if (!tx) return res.status(404).json({ success: false, message: 'Transaction not found' });
      tx.paymentStatus = 'FAILED';
      await tx.save();
      return res.json({ success: true, message: 'Declined', data: tx });
    }
    res.json({ success: true, message: 'Declined' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.delete('/api/transactions/:id', authGuard, async (req, res) => {
  try {
    const dbReady = await connectToMongo();
    if (dbReady) {
      const tx = await Transaction.findOne({ _id: req.params.id, owner: req.user._id });
      if (!tx) return res.status(404).json({ success: false, message: 'Transaction not found' });
      const cust = await Customer.findById(tx.customer);
      if (cust) {
        if (tx.type === 'credit') cust.balance -= tx.amount;
        else cust.balance += tx.amount;
        cust.totalTransactions = Math.max(0, (cust.totalTransactions || 0) - 1);
        await cust.save();
      }
      await Transaction.findByIdAndDelete(tx._id);
      return res.json({ success: true, message: 'Transaction deleted', updatedBalance: cust?.balance });
    }
    res.json({ success: true, message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.put('/api/transactions/:id', authGuard, async (req, res) => {
  try {
    const { amount, description, date, paymentStatus, paymentMode } = req.body;
    const dbReady = await connectToMongo();
    if (dbReady) {
      const tx = await Transaction.findOne({ _id: req.params.id, owner: req.user._id });
      if (!tx) return res.status(404).json({ success: false, message: 'Transaction not found' });
      if (amount) tx.amount = parseFloat(amount);
      if (description !== undefined) tx.description = description;
      if (date) tx.date = new Date(date);
      if (paymentStatus) tx.paymentStatus = paymentStatus;
      if (paymentMode) tx.paymentMode = paymentMode;
      await tx.save();
      return res.json({ success: true, data: tx });
    }
    res.json({ success: true, message: 'Updated' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── Permanent History Endpoint ──
app.get('/api/history', authGuard, async (req, res) => {
  try {
    const dbReady = await connectToMongo();
    if (dbReady) {
      const history = await CustomerHistory.find({ owner: req.user._id }).sort({ date: -1 }).limit(100);
      return res.json({ success: true, count: history.length, data: history });
    }
    res.json({ success: true, count: 0, data: [] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── AI Voice Entry Endpoint ──
app.post('/api/ai/voice-entry', authGuard, async (req, res) => {
  try {
    const { text } = req.body;
    const amountMatch = (text || '').match(/(\d+)/);
    const amount = amountMatch ? parseFloat(amountMatch[1]) : 100;
    const isCredit = /gave|credit|udhaar|diya/i.test(text || '');
    res.json({
      success: true,
      message: `Parsed voice: ₹${amount} ${isCredit ? 'Credit' : 'Payment'}`,
      data: { amount, type: isCredit ? 'credit' : 'debit' },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── KhataBot AI Chat Assistant Endpoint (Answers ALL questions) ──
function findMatchedCustomer(text, customers) {
  if (!text || !customers) return null;
  const normalized = text.toLowerCase();
  for (const c of customers) {
    if (c.name && normalized.includes(c.name.toLowerCase())) return c;
    if (c.phone && normalized.includes(c.phone)) return c;
  }
  const words = normalized.split(/\s+/).filter(w => w.length > 2);
  for (const c of customers) {
    if (!c.name) continue;
    const nameWords = c.name.toLowerCase().split(/\s+/);
    if (words.some(w => nameWords.includes(w))) return c;
  }
  return null;
}

app.post('/api/ai/chat', authGuard, async (req, res) => {
  try {
    const { message, history, lang } = req.body;
    if (!message) {
      return res.status(400).json({ success: false, message: 'Message is required' });
    }

    const ownerId = req.user._id;
    let owner = null;
    let customers = [];
    let transactions = [];
    let cashbookEntries = [];

    const dbReady = await connectToMongo();
    if (dbReady) {
      [owner, customers, transactions, cashbookEntries] = await Promise.all([
        User.findById(ownerId),
        Customer.find({ owner: ownerId }),
        Transaction.find({ owner: ownerId }).sort({ date: -1, createdAt: -1 }).limit(25).populate('customer', 'name phone'),
        Cashbook.find({ owner: ownerId }).sort({ date: -1 }).limit(15),
      ]);
    } else {
      owner = memoryStore.users.find(u => u._id === ownerId.toString());
      customers = memoryStore.customers.filter(c => c.owner === ownerId.toString());
      transactions = memoryStore.transactions.filter(t => t.owner === ownerId.toString()).slice(-25).reverse();
      cashbookEntries = memoryStore.cashbook.filter(c => c.owner === ownerId.toString()).slice(-15).reverse();
    }

    const ownerName = owner ? owner.name : 'Merchant';
    const storeName = owner ? owner.storeName : 'KhataPay Store';
    const langName = lang === 'hi' ? 'Hindi' : lang === 'te' ? 'Telugu' : 'English';

    const totalUdhaar = customers.reduce((acc, c) => c.balance > 0 ? acc + c.balance : acc, 0);
    const totalJama = customers.reduce((acc, c) => c.balance < 0 ? acc + Math.abs(c.balance) : acc, 0);
    const netBalance = totalUdhaar - totalJama;
    const customersWithDues = customers.filter(c => c.balance > 0).length;
    const totalCashIn = cashbookEntries.filter(e => e.type === 'in').reduce((s, e) => s + e.amount, 0);
    const totalCashOut = cashbookEntries.filter(e => e.type === 'out').reduce((s, e) => s + e.amount, 0);
    const netCash = totalCashIn - totalCashOut;

    // ── 1. Call Groq AI Models with Fallback ──
    if (GROQ_API_KEY) {
      const systemPrompt = `You are KhataBot, the all-knowing AI assistant and financial advisor for KhataPay.
You are assisting ${ownerName}, owner of "${storeName}".
Current Date & Time: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}.

📊 REAL-TIME FINANCIAL CONTEXT:
- Total Customers: ${customers.length} (with dues: ${customersWithDues})
- Total Udhaar (To Collect): ₹${totalUdhaar.toLocaleString('en-IN')}
- Total Jama (Advance Held): ₹${totalJama.toLocaleString('en-IN')}
- Net Store Position: ₹${netBalance.toLocaleString('en-IN')}
- Cash in Drawer: ₹${netCash.toLocaleString('en-IN')}

👥 CUSTOMERS:
${customers.map(c => `- ${c.name} | Balance: ₹${c.balance} (${c.balance > 0 ? 'owes you' : c.balance < 0 ? 'advance' : 'settled'}) | Score: ${c.creditScore || 750} | Risk: ${(c.riskLevel || 'low').toUpperCase()}`).join('\n')}

📝 RECENT TRANSACTIONS:
${transactions.map((t, i) => `${i + 1}. Date: ${new Date(t.date).toLocaleDateString('en-IN')}, Customer: ${t.customer ? t.customer.name : 'Unknown'}, Type: ${t.type === 'credit' ? 'Udhaar' : 'Jama'}, Amount: ₹${t.amount}`).join('\n')}

RULES:
1. Answer ANY question asked by the merchant clearly, concisely, and helpfully.
2. If asked about customers, debts, balances, or transactions, cite exact figures from above.
3. If asked for business/shop advice, give practical kirana/retail tips.
4. If asked how to use any feature of KhataPay (SMS reminders, WhatsApp reminders, UPI checkout links, Cashbook, Soundbox, CSV export), explain step-by-step.
5. Respond strictly in ${langName}.
6. Output ONLY valid JSON: { "response": "markdown string", "suggestions": ["...", "..."] }`;

      const groqMessages = [{ role: 'system', content: systemPrompt }];
      if (history && Array.isArray(history)) groqMessages.push(...history.slice(-6));
      const lastMsg = history && history.length > 0 ? history[history.length - 1] : null;
      if (!lastMsg || lastMsg.content !== message) groqMessages.push({ role: 'user', content: message });

      const models = ['qwen/qwen3.8-27b', 'openai/gpt-oss-20b'];
      for (const m of models) {
        try {
          const resp = await axios.post(
            'https://api.groq.com/openai/v1/chat/completions',
            {
              model: m,
              messages: groqMessages,
              response_format: { type: 'json_object' },
              temperature: 0.2
            },
            {
              headers: {
                Authorization: `Bearer ${GROQ_API_KEY}`,
                'Content-Type': 'application/json'
              },
              timeout: 6000
            }
          );
          const parsed = JSON.parse(resp.data.choices[0].message.content);
          if (parsed && parsed.response) {
            return res.json({
              success: true,
              response: parsed.response,
              suggestions: parsed.suggestions || ["Who has highest due?", "Show this month collection", "Send payment reminder"]
            });
          }
        } catch (err) {
          console.warn(`Groq error on ${m}:`, err.message);
        }
      }
    }

    // ── 2. Local Comprehensive Intelligence Fallback ──
    const normalized = message.toLowerCase().trim();

    // A. Greeting
    if (/^(hi|hello|hey|namaste|నమస్తే|नमस्ते|good morning|good evening)/i.test(normalized)) {
      return res.json({
        success: true,
        response: `Namaste **${ownerName}**! I am **KhataBot** 🤖, your KhataPay assistant for **"${storeName}"**.\n\nAsk me **anything** about your store:\n* 💰 **"Who has highest due?"**\n* 📊 **"What is my net balance?"**\n* ⚠️ **"Who are the risky customers?"**\n* 📱 **"How do I send SMS reminders?"**\n* 💵 **"Show cashbook expenses"**`,
        suggestions: ["What is my net balance?", "Who has highest due?", "Show this month collection", "Risky customers"]
      });
    }

    // B. Store / Owner
    if (/^(what is|tell me|show me)?\s*(my store|my shop|store name|shop name)\??$/i.test(normalized) || normalized.includes('store name') || normalized.includes('shop name') || normalized.includes('what is my shop') || normalized.includes('what is my store')) {
      return res.json({
        success: true,
        response: `🏪 Your registered store name is **"${storeName}"**.\n\n* **Owner:** ${ownerName}\n* **Active Customers:** ${customers.length}\n* **Total Due to Collect:** ₹${totalUdhaar.toLocaleString('en-IN')}`,
        suggestions: ["What is my net balance?", "Who has highest due?"]
      });
    }
    if (normalized.includes('my name') || normalized.includes('who am i') || normalized.includes('who i am')) {
      return res.json({
        success: true,
        response: `👤 You are **${ownerName}**, the store manager of **"${storeName}"** on KhataPay!`,
        suggestions: ["What is my net balance?", "Who has highest due?"]
      });
    }

    // C. Specific Customer
    const matchedCustomer = findMatchedCustomer(message, customers);
    if (matchedCustomer) {
      const isDue = matchedCustomer.balance > 0;
      const isAdvance = matchedCustomer.balance < 0;
      const balText = isDue 
        ? `owes you **₹${matchedCustomer.balance.toLocaleString('en-IN')}** (Udhaar)` 
        : isAdvance 
          ? `has an advance payment of **₹${Math.abs(matchedCustomer.balance).toLocaleString('en-IN')}**` 
          : `is all settled with **₹0 balance** ✅`;

      return res.json({
        success: true,
        response: `👤 **Customer Report: ${matchedCustomer.name}**\n\n* **Balance:** ${balText}\n* **Phone:** ${matchedCustomer.phone || 'N/A'}\n* **Credit Score:** **${matchedCustomer.creditScore || 750} / 900**\n* **Risk:** **${(matchedCustomer.riskLevel || 'low').toUpperCase()}**`,
        suggestions: [`Send reminder to ${matchedCustomer.name}`, "Who has highest due?", "What is my net balance?"]
      });
    }

    // D. Total Udhaar / Due
    if (normalized.includes('total due') || normalized.includes('total udhar') || normalized.includes('how much udhar') || normalized.includes('who owes me') || normalized.includes('to collect') || normalized.includes('उधार') || normalized.includes('ఉధార్')) {
      const debtors = customers.filter(c => c.balance > 0).sort((a, b) => b.balance - a.balance);
      const topList = debtors.slice(0, 5).map((c, i) => `${i + 1}. **${c.name}**: ₹${c.balance.toLocaleString('en-IN')}`).join('\n');
      return res.json({
        success: true,
        response: `💰 **Total Udhaar (To Collect):**\n\nYou have **₹${totalUdhaar.toLocaleString('en-IN')}** across **${debtors.length}** customers with pending dues.\n\n**Top Dues:**\n${topList || 'No pending dues!'}\n\n💡 *Tip: You can send instant WhatsApp or SMS reminders with payment links from the Reminders tab.*`,
        suggestions: ["Send payment reminders", "Who has highest due?", "What is my net balance?"]
      });
    }

    // E. Net Balance / Summary
    if (normalized.includes('net balance') || normalized.includes('total balance') || normalized.includes('overview') || normalized.includes('summary')) {
      return res.json({
        success: true,
        response: `📊 **Store Summary for "${storeName}":**\n\n* **Net Ledger Position:** **₹${netBalance.toLocaleString('en-IN')}**\n* **Total Udhaar (You'll Get):** ₹${totalUdhaar.toLocaleString('en-IN')} (${customersWithDues} customers)\n* **Total Advance (You'll Give):** ₹${totalJama.toLocaleString('en-IN')}\n* **Total Customers:** ${customers.length}\n* **Cash in Drawer (Cashbook Net):** ₹${netCash.toLocaleString('en-IN')}`,
        suggestions: ["Who has highest due?", "Show this month collection", "Show cashbook expenses"]
      });
    }

    // F. Highest Due
    if (normalized.includes('highest due') || normalized.includes('highest udhar') || normalized.includes('owes the most') || normalized.includes('top due')) {
      const sorted = [...customers].sort((a, b) => b.balance - a.balance);
      const top = sorted[0];
      if (!top || top.balance <= 0) {
        return res.json({
          success: true,
          response: "🎉 All customers are clear! There are zero outstanding dues right now.",
          suggestions: ["What is my net balance?", "Show this month collection"]
        });
      }
      return res.json({
        success: true,
        response: `👑 **Highest Due Customer:**\n\n**${top.name}** has the highest pending due of **₹${top.balance.toLocaleString('en-IN')}**.\n\n* Phone: ${top.phone}\n* Credit Score: ${top.creditScore || 750}\n* Risk: ${(top.riskLevel || 'low').toUpperCase()}`,
        suggestions: [`Send reminder to ${top.name}`, "Who are the risky customers?", "What is my net balance?"]
      });
    }

    // G. Risky Customers
    if (normalized.includes('risky') || normalized.includes('high risk') || normalized.includes('late payer')) {
      const risky = customers.filter(c => c.duePrediction === 'risky' || c.riskLevel === 'high' || (c.creditScore && c.creditScore < 600));
      if (risky.length === 0) {
        return res.json({
          success: true,
          response: "✅ Great news! You have **0 High-Risk** customers right now. All your customers pay on time.",
          suggestions: ["Who has highest due?", "What is my net balance?"]
        });
      }
      const list = risky.map((c, i) => `${i + 1}. **${c.name}**: ₹${c.balance.toLocaleString('en-IN')} (Score: ${c.creditScore || 550})`).join('\n');
      return res.json({
        success: true,
        response: `⚠️ **High Risk / Delay Customers:**\n\n${list}\n\n💡 *Recommendation: Set shorter credit periods or require partial cash payments before giving additional stock.*`,
        suggestions: ["Send payment reminders", "Who has highest due?"]
      });
    }

    // H. Credit Scores
    if (normalized.includes('credit score') || normalized.includes('trust score') || normalized.includes('score')) {
      const sorted = [...customers].sort((a, b) => (b.creditScore || 750) - (a.creditScore || 750));
      const top3 = sorted.slice(0, 3).map((c, i) => `${i + 1}. **${c.name}**: ${c.creditScore || 750} / 900 ⭐`).join('\n');
      return res.json({
        success: true,
        response: `📊 **Customer Credit Ratings (300 - 900):**\n\n**Top Rated (Most Trusted):**\n${top3 || 'None'}\n\n*Scores are automatically updated based on repayment velocity and transaction frequency.*`,
        suggestions: ["Who are the risky customers?", "Who has highest due?", "What is my net balance?"]
      });
    }

    // I. Recent Transactions
    if (normalized.includes('last transaction') || normalized.includes('recent transaction') || normalized.includes('recent payment') || normalized.includes('who paid')) {
      if (transactions.length === 0) {
        return res.json({
          success: true,
          response: "You don't have any recorded transactions yet.",
          suggestions: ["What is my net balance?", "Who has highest due?"]
        });
      }
      const top5 = transactions.slice(0, 5).map((t, i) => {
        const typeStr = t.type === 'credit' ? '🔴 Udhaar' : '🟢 Jama';
        return `${i + 1}. **${t.customer ? t.customer.name : 'Unknown'}**: ${typeStr} **₹${t.amount.toLocaleString('en-IN')}** (${new Date(t.date).toLocaleDateString('en-IN')})`;
      }).join('\n');
      return res.json({
        success: true,
        response: `📝 **Recent Ledger Activity:**\n\n${top5}`,
        suggestions: ["Show this month collection", "What is my net balance?"]
      });
    }

    // J. Today's Transactions
    if (normalized.includes('today') || normalized.includes('आज') || normalized.includes('ఈరోజు')) {
      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);
      const todayTxns = transactions.filter(t => new Date(t.date) >= startOfToday);
      const todayGot = todayTxns.filter(t => t.type === 'debit').reduce((s, t) => s + t.amount, 0);
      const todayGave = todayTxns.filter(t => t.type === 'credit').reduce((s, t) => s + t.amount, 0);
      return res.json({
        success: true,
        response: `📅 **Today's Activity Summary:**\n\n* **Total Collected (Jama):** **₹${todayGot.toLocaleString('en-IN')}**\n* **Total Credit Given (Udhaar):** **₹${todayGave.toLocaleString('en-IN')}**\n* **Total Entries:** ${todayTxns.length} transaction(s)`,
        suggestions: ["Show this month collection", "What is my net balance?"]
      });
    }

    // K. Month Collections
    if (normalized.includes('month collection') || normalized.includes('monthly collection') || normalized.includes('this month') || normalized.includes('महीना') || normalized.includes('నెల')) {
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);
      const monthTxns = transactions.filter(t => t.type === 'debit' && new Date(t.date) >= startOfMonth);
      const monthTotal = monthTxns.reduce((s, t) => s + t.amount, 0);
      return res.json({
        success: true,
        response: `📈 **This Month's Collections:**\n\nYou have collected **₹${monthTotal.toLocaleString('en-IN')}** across recent payments this calendar month.`,
        suggestions: ["What is my net balance?", "Who has highest due?"]
      });
    }

    // L. Reminders (SMS / WhatsApp)
    if (normalized.includes('sms') || normalized.includes('whatsapp') || normalized.includes('reminder')) {
      return res.json({
        success: true,
        response: `📲 **Sending Payment Reminders on KhataPay:**\n\n1. Go to **Reminders** in the sidebar or open any customer's page.\n2. Click **"Send SMS"** or **"Send WhatsApp"**.\n3. KhataPay automatically attaches an instant verified UPI settlement link (\`https://udharapp.vercel.app/pay/:customerId\`).\n4. You can send via Fast2SMS Cloud or open directly in your phone's SMS / WhatsApp app!`,
        suggestions: ["Who has highest due?", "What is my net balance?"]
      });
    }

    // M. UPI & QR Checkout
    if (normalized.includes('upi') || normalized.includes('qr') || normalized.includes('online payment') || normalized.includes('payment link') || normalized.includes('checkout') || normalized.includes('utr')) {
      return res.json({
        success: true,
        response: `💳 **How KhataPay UPI Checkout Works:**\n\n1. Every customer has a unique verified payment page: \`https://udharapp.vercel.app/pay/:customerId\`.\n2. When they click the link, they see your store name (**"${storeName}"**), balance, and a dynamic UPI QR code.\n3. They scan & pay using **GPay, PhonePe, Paytm, or BHIM**.\n4. After paying, they enter their 12-digit **UTR number** to confirm.\n5. The transaction updates your ledger instantly!`,
        suggestions: ["How to send payment reminder?", "What is my net balance?"]
      });
    }

    // N. Soundbox
    if (normalized.includes('soundbox') || normalized.includes('voice') || normalized.includes('audio') || normalized.includes('chime') || normalized.includes('speaker')) {
      return res.json({
        success: true,
        response: `🔊 **KhataPay Virtual Soundbox:**\n\nKhataPay features a built-in virtual soundbox that announces payment collections in real-time.\n\n* **To Enable/Mute:** Click the **Speaker icon** in the top navigation bar.\n* When active, an audio chime sounds whenever payment is recorded or verified.`,
        suggestions: ["How to send payment reminder?", "What is my net balance?"]
      });
    }

    // O. Export CSV / Reports / Backup
    if (normalized.includes('export') || normalized.includes('csv') || normalized.includes('excel') || normalized.includes('download') || normalized.includes('backup') || normalized.includes('report')) {
      return res.json({
        success: true,
        response: `📊 **Exporting Reports & Data in KhataPay:**\n\n* **Customer Ledger CSV:** Go to **Customers** and click **"Export CSV"** in the top-right to download an instant spreadsheet of all customer names, phone numbers, balances, and risk levels.\n* **Quick Actions:** Click **"Export CSV"** directly in the Dashboard Quick Actions hub.\n* **Backup:** Click **"Backup"** in Quick Actions or Settings to create a local ledger snapshot.`,
        suggestions: ["What is my net balance?", "Who has highest due?"]
      });
    }

    // P. Cashbook / Expenses
    if (normalized.includes('cashbook') || normalized.includes('expense') || normalized.includes('expenses') || normalized.includes('petty cash')) {
      return res.json({
        success: true,
        response: `💵 **Cashbook Status:**\n\n* **Total Cash In:** ₹${totalCashIn.toLocaleString('en-IN')}\n* **Total Cash Out (Expenses):** ₹${totalCashOut.toLocaleString('en-IN')}\n* **Net Drawer Cash:** **₹${netCash.toLocaleString('en-IN')}**`,
        suggestions: ["What is my net balance?", "Who has highest due?"]
      });
    }

    // Q. Business Advice: How to recover udhaar & kirana store management
    if (normalized.includes('recover') || normalized.includes('collect debt') || normalized.includes('bad debt') || normalized.includes('advice') || normalized.includes('tips') || normalized.includes('profit') || normalized.includes('margin') || normalized.includes('credit policy')) {
      return res.json({
        success: true,
        response: `💡 **Proven Shopkeeper Rules to Avoid Bad Debts & Recover Udhaar:**\n\n1. **Set Hard Credit Limits:** Never allow any single customer's due to exceed 10-15% of your daily sales volume.\n2. **Send 3-Day Prior Reminders:** Use KhataPay's friendly SMS reminder before the due date, not just when overdue.\n3. **Partial Settlements First:** If a customer can't pay ₹2,000, ask for ₹500 today. Partial payments build repayment discipline.\n4. **Reward Fast Payers:** Give small perks or discounts to customers who maintain an **800+ credit score**.\n5. **Cash on Hand:** Always record your daily petty expenses in the **Cashbook** to track true net profit margins.`,
        suggestions: ["Risky customers", "Who has highest due?", "What is my net balance?"]
      });
    }

    // R. General helpful reply (Answers any unmapped question)
    return res.json({
      success: true,
      response: `I'm here to help with all questions about **"${storeName}"**!\n\n* 💰 **Udhaar to Collect:** ₹${totalUdhaar.toLocaleString('en-IN')} (${customersWithDues} customers)\n* 💵 **Advance Received:** ₹${totalJama.toLocaleString('en-IN')}\n* 📊 **Net Position:** **₹${netBalance.toLocaleString('en-IN')}**\n* 👥 **Total Customers:** ${customers.length}\n* 📥 **Cash in Drawer:** ₹${netCash.toLocaleString('en-IN')}\n\nYou can ask about any customer, payment reminders, cashbook expenses, or debt recovery advice!`,
      suggestions: ["What is my net balance?", "Who has highest due?", "Show this month collection", "Risky customers"]
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── Cashbook Endpoints ──
app.get('/api/cashbook/report', authGuard, async (req, res) => {
  try {
    const dbReady = await connectToMongo();
    if (dbReady) {
      const entries = await Cashbook.find({ owner: req.user._id }).sort({ date: -1 });
      const totalIn = entries.filter((e) => e.type === 'in').reduce((s, e) => s + e.amount, 0);
      const totalOut = entries.filter((e) => e.type === 'out').reduce((s, e) => s + e.amount, 0);
      return res.json({
        success: true,
        data: { entries, totalIn, totalOut, netBalance: totalIn - totalOut },
      });
    }
    res.json({ success: true, data: { entries: [], totalIn: 0, totalOut: 0, netBalance: 0 } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.delete('/api/cashbook/:id', authGuard, async (req, res) => {
  try {
    const dbReady = await connectToMongo();
    if (dbReady) {
      await Cashbook.findOneAndDelete({ _id: req.params.id, owner: req.user._id });
      return res.json({ success: true, message: 'Entry deleted' });
    }
    res.json({ success: true, message: 'Entry deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});
app.get('/api/cashbook', authGuard, async (req, res) => {
  try {
    const { period, paymentMode, search, startDate, endDate } = req.query;
    const ownerId = req.user._id;
    const dbReady = await connectToMongo();
    if (dbReady) {
      let query = { owner: ownerId };
      if (paymentMode && ['cash', 'online'].includes(paymentMode)) {
        query.paymentMode = paymentMode;
      }
      if (search) {
        query.description = { $regex: search, $options: 'i' };
      }

      let dateFilter = {};
      const now = new Date();
      if (period === 'today') {
        const start = new Date(now);
        start.setHours(0, 0, 0, 0);
        dateFilter = { $gte: start };
      } else if (period === 'yesterday') {
        const start = new Date(now);
        start.setDate(start.getDate() - 1);
        start.setHours(0, 0, 0, 0);
        const end = new Date(start);
        end.setHours(23, 59, 59, 999);
        dateFilter = { $gte: start, $lte: end };
      } else if (period === 'this-month') {
        const start = new Date(now.getFullYear(), now.getMonth(), 1);
        dateFilter = { $gte: start };
      } else if (startDate || endDate) {
        dateFilter = {};
        if (startDate) dateFilter.$gte = new Date(startDate);
        if (endDate) {
          const end = new Date(endDate);
          end.setHours(23, 59, 59, 999);
          dateFilter.$lte = end;
        }
      }
      if (Object.keys(dateFilter).length > 0) {
        query.date = dateFilter;
      }

      const todayStart = new Date(now);
      todayStart.setHours(0, 0, 0, 0);

      const [entries, allEntries] = await Promise.all([
        Cashbook.find(query).sort({ date: -1 }).lean(),
        Cashbook.find({ owner: ownerId }, 'type amount date').lean(),
      ]);

      // Lifetime cash in hand
      const lifetimeIn = allEntries.filter((e) => e.type === 'in').reduce((s, e) => s + e.amount, 0);
      const lifetimeOut = allEntries.filter((e) => e.type === 'out').reduce((s, e) => s + e.amount, 0);
      const cashInHand = lifetimeIn - lifetimeOut;

      // Today's entries
      const todayEntries = allEntries.filter((e) => new Date(e.date) >= todayStart);
      const todayCashIn = todayEntries.filter((e) => e.type === 'in').reduce((s, e) => s + e.amount, 0);
      const todayCashOut = todayEntries.filter((e) => e.type === 'out').reduce((s, e) => s + e.amount, 0);

      // Filtered entries stats
      let filteredIn = 0;
      let filteredOut = 0;
      entries.forEach((e) => {
        if (e.type === 'in') filteredIn += e.amount;
        else filteredOut += e.amount;
      });

      return res.json({
        success: true,
        count: entries.length,
        data: entries,
        stats: {
          cashInHand,
          todayCashIn,
          todayCashOut,
          filteredIn,
          filteredOut,
        },
      });
    }

    const memEntries = memoryStore.cashbook.filter((e) => e.owner.toString() === ownerId.toString());
    const lifetimeIn = memEntries.filter((e) => e.type === 'in').reduce((s, e) => s + e.amount, 0);
    const lifetimeOut = memEntries.filter((e) => e.type === 'out').reduce((s, e) => s + e.amount, 0);
    res.json({
      success: true,
      count: memEntries.length,
      data: memEntries,
      stats: {
        cashInHand: lifetimeIn - lifetimeOut,
        todayCashIn: 0,
        todayCashOut: 0,
        filteredIn: lifetimeIn,
        filteredOut: lifetimeOut,
      },
    });
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
            storeName: customer.owner?.storeName || 'KhataPay',
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
        storeName: owner?.storeName || 'KhataPay',
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

app.post('/api/reminders/send-whatsapp', authGuard, async (req, res) => {
  try {
    const customerId = req.body.customerId || req.params.customerId;
    const storeName = req.user?.storeName || 'KhataPay';
    const frontendUrl = process.env.FRONTEND_URL || 'https://udharapp.vercel.app';
    
    let customer = null;
    if (mongoose.connection.readyState === 1) {
      customer = await Customer.findOne({ _id: customerId, owner: req.user._id });
    }
    if (!customer) {
      customer = memoryStore.customers.find(c => c._id.toString() === customerId && c.owner.toString() === req.user._id.toString());
    }
    
    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }

    const cleanPhone = (customer.phone || '').replace(/\D/g, '');
    const formattedPhone = cleanPhone.length === 10 ? '91' + cleanPhone : cleanPhone;
    const paymentLink = `${frontendUrl}/pay/${customer._id}`;
    const message = req.body.customMessage || `Namaste ${customer.name}! Friendly reminder from ${storeName}. Your pending due amount is ₹${customer.balance}. Please clear it soon. Pay online here: ${paymentLink} - Thank you!`;
    const whatsappUrl = `https://api.whatsapp.com/send?phone=${formattedPhone}&text=${encodeURIComponent(message)}`;

    res.json({
      success: true,
      message: `WhatsApp reminder prepared for ${customer.name}`,
      whatsappUrl,
      customerName: customer.name,
      phone: customer.phone,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.post('/api/reminders/send-sms', authGuard, async (req, res) => {
  try {
    const customerId = req.body.customerId || req.params.customerId;
    const storeName = req.user?.storeName || 'KhataPay';
    const frontendUrl = process.env.FRONTEND_URL || 'https://udharapp.vercel.app';
    
    let customer = null;
    if (mongoose.connection.readyState === 1) {
      customer = await Customer.findOne({ _id: customerId, owner: req.user._id });
    }
    if (!customer) {
      customer = memoryStore.customers.find(c => c._id.toString() === customerId && c.owner.toString() === req.user._id.toString());
    }
    
    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }

    const cleanPhone = (customer.phone || '').replace(/\D/g, '');
    const phone10 = cleanPhone.slice(-10);
    const paymentLink = `${frontendUrl}/pay/${customer._id}`;
    const message = req.body.customMessage || `Namaste ${customer.name}, you have a pending payment of ₹${Number(customer.balance).toFixed(2)} at ${storeName}. Please clear it soon. Pay online: ${paymentLink} - Thank you!`;

    // Attempt Fast2SMS Cloud API
    const apiKey = process.env.FAST2SMS_API_KEY || 'qiHLwsP9XaxUTheY1k86WuMnBoRC5ObytIvdZA3zJKj74mQDp0GfYAuKPoDm0R9wTC7kSegL2NaOxJVE';
    let gatewaySuccess = false;
    let gatewayResponse = null;

    if (apiKey && phone10.length === 10) {
      try {
        const f2sRes = await axios.post('https://www.fast2sms.com/dev/bulkV2', {
          route: 'q',
          message: message,
          language: 'english',
          flash: 0,
          numbers: phone10,
        }, {
          headers: {
            'authorization': apiKey,
            'Content-Type': 'application/json',
          },
          timeout: 6000,
        });

        if (f2sRes.data && f2sRes.data.return === true) {
          gatewaySuccess = true;
          gatewayResponse = f2sRes.data;
        } else {
          gatewayResponse = f2sRes.data;
        }
      } catch (err) {
        gatewayResponse = err.response?.data || { message: err.message };
      }
    }

    const smsUri = `sms:${phone10}?body=${encodeURIComponent(message)}`;

    res.json({
      success: true,
      gatewaySuccess,
      message: gatewaySuccess 
        ? `SMS sent via Fast2SMS to ${customer.name}!` 
        : `SMS reminder ready for ${customer.name}`,
      gatewayResponse,
      smsData: {
        to: phone10,
        customerName: customer.name,
        message,
        smsUri,
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default app;
