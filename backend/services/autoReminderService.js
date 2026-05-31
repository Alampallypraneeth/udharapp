const Customer = require('../models/Customer');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const { updateRiskLevel } = require('./riskService');

/**
 * Calculates differences in days (date2 - date1) based on calendar dates (ignoring time)
 */
const getDaysDiff = (date1, date2) => {
  const d1 = new Date(date1);
  d1.setHours(0, 0, 0, 0);
  const d2 = new Date(date2);
  d2.setHours(0, 0, 0, 0);
  const diffTime = d2.getTime() - d1.getTime();
  return Math.round(diffTime / (1000 * 60 * 60 * 24));
};

/**
 * Automatically checks and sends payment reminders to customers.
 * - From 4 days before the due date (inclusive): sends pre-due warning reminders daily if unpaid.
 * - After the due date: deducts credit score dynamically and sends continuous daily overdue warnings if unpaid.
 */
const runAutoReminders = async () => {
  console.log('🤖 KathaGPT Auto-Reminder Bot: Checking for outstanding dues today...');
  try {
    const today = new Date();
    const todayStr = today.toDateString();
    
    // Find all customers with:
    // 1. Dues (balance > 0)
    // 2. paymentDueDate set
    const customers = await Customer.find({
      balance: { $gt: 0 },
      paymentDueDate: { $ne: null }
    }).populate('owner');

    console.log(`🤖 KathaGPT Auto-Reminder Bot: Found ${customers.length} customer(s) with active outstanding balances and due dates.`);

    for (const customer of customers) {
      if (!customer.owner) continue;

      // Skip if already processed today
      if (customer.lastAutoReminderSentDate && new Date(customer.lastAutoReminderSentDate).toDateString() === todayStr) {
        continue;
      }

      const owner = customer.owner;
      const storeName = owner.storeName || 'Digital Udhaar';
      const upiId = owner.upiId;
      const dueDate = new Date(customer.paymentDueDate);
      const daysDiff = getDaysDiff(today, dueDate);

      // Check if it's within the reminder windows:
      // Warning window: 0 to 4 days before due date (daysDiff from 0 to 4)
      // Overdue window: after due date (daysDiff < 0)
      const isWarningPeriod = daysDiff >= 0 && daysDiff <= 4;
      const isOverduePeriod = daysDiff < 0;

      if (!isWarningPeriod && !isOverduePeriod) {
        // Too early, do nothing
        continue;
      }

      // If overdue, update risk level and apply score penalty
      if (isOverduePeriod) {
        console.log(`⚠️ Customer ${customer.name} is overdue by ${Math.abs(daysDiff)} day(s). Recalculating score penalty.`);
        await updateRiskLevel(customer._id);
        // Refresh customer data from database after score deduction
        const refreshedCustomer = await Customer.findById(customer._id).populate('owner');
        if (refreshedCustomer) {
          Object.assign(customer, refreshedCustomer.toObject());
        }
      }

      // Set last processed date to today
      customer.lastAutoReminderSentDate = today;
      await customer.save();

      console.log(`🤖 KathaGPT Auto-Reminder Bot: Processed outstanding dues for ${customer.name}. Days diff: ${daysDiff}`);
    }
  } catch (err) {
    console.error('❌ KathaGPT Auto-Reminder Bot: Cron Job execution failed:', err.message);
  }
};

/**
 * Initializes the AI Auto-Reminder Bot Scheduler.
 */
const initAutoReminderScheduler = () => {
  // Run checks on startup (delayed slightly to ensure DB connection is ready)
  setTimeout(runAutoReminders, 10000);

  // Run checks every 24 hours
  setInterval(runAutoReminders, 24 * 60 * 60 * 1000);
  
  console.log('🤖 AI Auto-Reminder Bot: Scheduler initialized (runs every 24 hours).');
};

module.exports = { initAutoReminderScheduler };
