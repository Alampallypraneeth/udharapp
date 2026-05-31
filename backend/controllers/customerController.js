const Customer = require('../models/Customer');
const Transaction = require('../models/Transaction');
const CustomerHistory = require('../models/CustomerHistory');
const dns = require('dns').promises;
const socketService = require('../services/socketService');

const validateEmailExists = async (email) => {
  if (!email) return true;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) return false;
  const domain = email.split('@')[1];
  try {
    const mx = await Promise.race([
      dns.resolveMx(domain),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 2000))
    ]);
    return mx && mx.length > 0;
  } catch (err) {
    try {
      const addresses = await Promise.race([
        dns.resolve(domain),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 1500))
      ]);
      return addresses && addresses.length > 0;
    } catch (err2) {
      return false;
    }
  }
};

// @desc    Get all customers for logged-in owner
// @route   GET /api/customers
const getCustomers = async (req, res, next) => {
  try {
    const { search, sort } = req.query;
    let query = { owner: req.user._id };

    // Search by name or phone
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
      ];
    }

    // Sort options
    let sortOption = { createdAt: -1 };
    if (sort === 'name') sortOption = { name: 1 };
    if (sort === 'balance-high') sortOption = { balance: -1 };
    if (sort === 'balance-low') sortOption = { balance: 1 };

    const customers = await Customer.find(query).sort(sortOption);

    res.status(200).json({
      success: true,
      count: customers.length,
      data: customers,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single customer with transactions
// @route   GET /api/customers/:id
const getCustomer = async (req, res, next) => {
  try {
    const customer = await Customer.findOne({
      _id: req.params.id,
      owner: req.user._id,
    });

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found',
      });
    }

    const transactions = await Transaction.find({
      customer: customer._id,
    }).sort({ date: -1 });

    res.status(200).json({
      success: true,
      data: { customer, transactions },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create new customer
// @route   POST /api/customers
const createCustomer = async (req, res, next) => {
  try {
    const { name, phone, email, address, avatar, paymentDueDate } = req.body;

    // Check if email exists/is valid if provided
    if (email && !(await validateEmailExists(email))) {
      return res.status(400).json({
        success: false,
        message: 'customer email is invalid / customer id is invalid',
      });
    }

    // Check for duplicate phone under same owner
    const existing = await Customer.findOne({ phone, owner: req.user._id });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'A customer with this phone number already exists',
      });
    }

    const customer = await Customer.create({
      name,
      phone,
      email: email || '',
      address,
      avatar: avatar || '',
      paymentDueDate: paymentDueDate || null,
      owner: req.user._id,
    });

    // Log to permanent customer history
    await CustomerHistory.create({
      owner: req.user._id,
      customerId: customer._id,
      customerName: customer.name,
      customerPhone: customer.phone,
      type: 'customer_created',
      amount: 0,
      description: 'New customer account created',
      date: new Date(),
      action: 'CREATE'
    });

    socketService.emitRefresh('customers');

    res.status(201).json({
      success: true,
      data: customer,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update customer
// @route   PUT /api/customers/:id
const updateCustomer = async (req, res, next) => {
  try {
    const { name, phone, email, address, avatar, paymentDueDate } = req.body;

    // Check if email exists/is valid if provided
    if (email && !(await validateEmailExists(email))) {
      return res.status(400).json({
        success: false,
        message: 'customer email is invalid / customer id is invalid',
      });
    }

    const customer = await Customer.findOneAndUpdate(
      { _id: req.params.id, owner: req.user._id },
      { name, phone, email: email || '', address, avatar, paymentDueDate: paymentDueDate || null },
      { new: true, runValidators: true }
    );

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found',
      });
    }

    socketService.emitRefresh('customers');

    res.status(200).json({
      success: true,
      data: customer,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete customer and all their transactions
// @route   DELETE /api/customers/:id
const deleteCustomer = async (req, res, next) => {
  try {
    const customer = await Customer.findOne({
      _id: req.params.id,
      owner: req.user._id,
    });

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found',
      });
    }

    // Log to permanent customer history
    await CustomerHistory.create({
      owner: req.user._id,
      customerId: customer._id,
      customerName: customer.name,
      customerPhone: customer.phone,
      type: 'customer_deleted',
      amount: customer.balance,
      description: `Customer deleted. Final ledger balance was: ₹${customer.balance}`,
      date: new Date(),
      action: 'CUSTOMER_DELETED'
    });

    // Delete all transactions for this customer
    await Transaction.deleteMany({ customer: customer._id });

    // Delete the customer
    await Customer.findByIdAndDelete(customer._id);

    socketService.emitRefresh('customers');

    res.status(200).json({
      success: true,
      message: 'Customer and all related transactions deleted',
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getCustomers,
  getCustomer,
  createCustomer,
  updateCustomer,
  deleteCustomer,
};
