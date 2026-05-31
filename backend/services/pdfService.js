const PDFDocument = require('pdfkit');

/**
 * Generate a monthly statement PDF and stream it to the HTTP response
 * @param {Object} store - Store owner info { storeName, name, phone }
 * @param {Object} customer - Customer info { name, phone, address, balance }
 * @param {Array} transactions - Array of transaction objects
 * @param {Object} dateRange - { startDate, endDate }
 * @param {Object} res - Express response object
 */
const buildPDFDocument = (store, customer, transactions, dateRange, doc) => {
  // ─── HEADER ───
  doc
    .fontSize(22)
    .font('Helvetica-Bold')
    .text(store.storeName, { align: 'center' });
  doc.fontSize(10).font('Helvetica').text(`Owner: ${store.name}`, { align: 'center' });
  if (store.phone) {
    doc.text(`Phone: ${store.phone}`, { align: 'center' });
  }
  doc.moveDown(0.5);

  // Divider
  doc
    .strokeColor('#10b981')
    .lineWidth(2)
    .moveTo(50, doc.y)
    .lineTo(545, doc.y)
    .stroke();
  doc.moveDown(0.8);

  // ─── STATEMENT TITLE ───
  doc
    .fontSize(16)
    .font('Helvetica-Bold')
    .fillColor('#1e293b')
    .text('Monthly Statement (Khata)', { align: 'center' });
  doc
    .fontSize(10)
    .font('Helvetica')
    .fillColor('#64748b')
    .text(`Period: ${dateRange.startDate} to ${dateRange.endDate}`, { align: 'center' });
  doc.moveDown(1);

  // ─── CUSTOMER INFO ───
  doc
    .fontSize(12)
    .font('Helvetica-Bold')
    .fillColor('#1e293b')
    .text('Customer Details');
  doc.moveDown(0.3);

  const profileY = doc.y;
  let hasImage = false;

  if (customer.avatar) {
    if (customer.avatar.startsWith('data:image/png;base64,') || customer.avatar.startsWith('data:image/jpeg;base64,')) {
      try {
        const base64Data = customer.avatar.replace(/^data:image\/\w+;base64,/, '');
        const imgBuffer = Buffer.from(base64Data, 'base64');
        
        // Draw circular border
        doc.circle(75, profileY + 25, 25).strokeColor('#e2e8f0').lineWidth(1.5).stroke();
        
        // Clip image to circle
        doc.save();
        doc.circle(75, profileY + 25, 25).clip();
        doc.image(imgBuffer, 50, profileY, { width: 50, height: 50 });
        doc.restore();
        
        hasImage = true;
      } catch (err) {
        console.error('Error rendering base64 image in PDF:', err.message);
      }
    }
  }

  // If no custom image was rendered, render a beautiful vector letter avatar!
  if (!hasImage) {
    // Circle background
    doc.circle(75, profileY + 25, 25).fillColor('#ef4444').fill();
    
    // First letter
    const initial = customer.name ? customer.name.charAt(0).toUpperCase() : '?';
    doc.fillColor('#ffffff').fontSize(20).font('Helvetica-Bold').text(initial, 50, profileY + 16, { width: 50, align: 'center' });
  }

  // Draw customer details to the right of the avatar
  doc.fontSize(10).font('Helvetica').fillColor('#334155');
  doc.text(`Name: ${customer.name}`, 120, profileY + 5);
  doc.text(`Phone: ${customer.phone}`, 120, profileY + 18);
  if (customer.address) {
    doc.text(`Address: ${customer.address}`, 120, profileY + 31);
  }
  
  doc.y = profileY + 60; // Advance vertical position below the details section
  doc.moveDown(1);

  // ─── TRANSACTIONS TABLE ───
  doc
    .fontSize(12)
    .font('Helvetica-Bold')
    .fillColor('#1e293b')
    .text('Transaction Details');
  doc.moveDown(0.5);

  // Table header
  const tableTop = doc.y;
  const col1 = 50; // Date
  const col2 = 150; // Type
  const col3 = 220; // Description
  const col4 = 400; // Amount
  const col5 = 480; // Balance

  // Header background
  doc
    .rect(col1 - 5, tableTop - 3, 505, 20)
    .fill('#0f172a');

  doc
    .fontSize(9)
    .font('Helvetica-Bold')
    .fillColor('#ffffff');
  doc.text('Date', col1, tableTop, { width: 90 });
  doc.text('Type', col2, tableTop, { width: 60 });
  doc.text('Description', col3, tableTop, { width: 170 });
  doc.text('Amount (Rs.)', col4, tableTop, { width: 70, align: 'right' });
  doc.text('Balance (Rs.)', col5, tableTop, { width: 65, align: 'right' });

  doc.moveDown(0.5);

  // Table rows
  let runningBalance = 0;
  let yPos = tableTop + 22;

  transactions.forEach((txn, index) => {
    // Check if we need a new page
    if (yPos > 700) {
      doc.addPage();
      yPos = 50;
    }

    // Alternate row background
    if (index % 2 === 0) {
      doc
        .rect(col1 - 5, yPos - 3, 505, 18)
        .fill('#f8fafc');
    }

    // Update running balance
    if (txn.type === 'credit') {
      runningBalance += txn.amount;
    } else {
      runningBalance -= txn.amount;
    }

    const dateStr = new Date(txn.date).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });

    const typeColor = txn.type === 'credit' ? '#ef4444' : '#10b981';

    doc.fontSize(9).font('Helvetica').fillColor('#334155');
    doc.text(dateStr, col1, yPos, { width: 90 });

    doc.fillColor(typeColor).font('Helvetica-Bold');
    doc.text(txn.type === 'credit' ? 'YOU GAVE' : 'YOU GOT', col2, yPos, { width: 60 });

    doc.fillColor('#334155').font('Helvetica');
    doc.text(txn.description || '-', col3, yPos, { width: 170 });
    doc.text(txn.amount.toFixed(2), col4, yPos, { width: 70, align: 'right' });
    doc.text(runningBalance.toFixed(2), col5, yPos, { width: 65, align: 'right' });

    yPos += 20;
  });

  // ─── SUMMARY ───
  doc.y = yPos + 15;

  // Divider
  doc
    .strokeColor('#10b981')
    .lineWidth(1)
    .moveTo(50, doc.y)
    .lineTo(545, doc.y)
    .stroke();
  doc.moveDown(0.8);

  const totalCredit = transactions
    .filter((t) => t.type === 'credit')
    .reduce((sum, t) => sum + t.amount, 0);
  const totalDebit = transactions
    .filter((t) => t.type === 'debit')
    .reduce((sum, t) => sum + t.amount, 0);

  doc.fontSize(11).font('Helvetica-Bold').fillColor('#1e293b');
  doc.text(`Total You Gave (Credit): Rs. ${totalCredit.toFixed(2)}`, 50);
  doc.text(`Total You Got (Debit): Rs. ${totalDebit.toFixed(2)}`, 50);
  doc.moveDown(0.3);

  const netBalance = totalCredit - totalDebit;
  const balanceColor = netBalance > 0 ? '#ef4444' : '#10b981';
  doc
    .fontSize(13)
    .fillColor(balanceColor)
    .text(
      `Net Balance: Rs. ${Math.abs(netBalance).toFixed(2)} ${netBalance > 0 ? '(Due)' : '(Advance)'}`,
      50
    );

  doc.moveDown(2);

  // ─── FOOTER ───
  doc
    .fontSize(8)
    .font('Helvetica')
    .fillColor('#94a3b8')
    .text(
      `Generated on ${new Date().toLocaleDateString('en-IN')} | Digital Udhaar Khata`,
      50,
      doc.y,
      { align: 'center' }
    );

  // Finalize
  doc.end();
};

const generateStatement = (store, customer, transactions, dateRange, res) => {
  const doc = new PDFDocument({ margin: 50, size: 'A4' });

  // Set response headers
  const filename = `statement_${customer.name.replace(/\s+/g, '_')}_${dateRange.startDate}_${dateRange.endDate}.pdf`;
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

  // Pipe to response
  doc.pipe(res);

  buildPDFDocument(store, customer, transactions, dateRange, doc);
};

const generateStatementBuffer = (store, customer, transactions, dateRange) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50, size: 'A4' });
      const chunks = [];
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', (err) => reject(err));

      buildPDFDocument(store, customer, transactions, dateRange, doc);
    } catch (err) {
      reject(err);
    }
  });
};

/**
 * Generate a cashbook statement PDF and stream it to the HTTP response
 * @param {Object} store - Store owner info { storeName, name, phone }
 * @param {Array} entries - Array of cashbook entry objects
 * @param {Object} dateRange - { label, startDate, endDate }
 * @param {Object} res - Express response object
 */
const generateCashbookStatement = (store, entries, dateRange, res) => {
  const doc = new PDFDocument({ margin: 50, size: 'A4' });

  // Set response headers
  const filename = `cashbook_statement_${dateRange.label.replace(/\s+/g, '_')}.pdf`;
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

  // Pipe to response
  doc.pipe(res);

  // ─── HEADER ───
  doc
    .fontSize(22)
    .font('Helvetica-Bold')
    .text(store.storeName, { align: 'center' });
  doc.fontSize(10).font('Helvetica').text(`Owner: ${store.name}`, { align: 'center' });
  if (store.phone) {
    doc.text(`Phone: ${store.phone}`, { align: 'center' });
  }
  doc.moveDown(0.5);

  // Divider
  doc
    .strokeColor('#10b981')
    .lineWidth(2)
    .moveTo(50, doc.y)
    .lineTo(545, doc.y)
    .stroke();
  doc.moveDown(0.8);

  // ─── STATEMENT TITLE ───
  doc
    .fontSize(16)
    .font('Helvetica-Bold')
    .fillColor('#1e293b')
    .text('Cashbook Daily Ledger', { align: 'center' });
  doc
    .fontSize(10)
    .font('Helvetica')
    .fillColor('#64748b')
    .text(`Period: ${dateRange.label}`, { align: 'center' });
  doc.moveDown(1.5);

  // ─── TRANSACTIONS TABLE ───
  doc
    .fontSize(12)
    .font('Helvetica-Bold')
    .fillColor('#1e293b')
    .text('Cashbook Entries');
  doc.moveDown(0.5);

  // Table header
  const tableTop = doc.y;
  const col1 = 50;   // Date
  const col2 = 140;  // Mode
  const col3 = 200;  // Remarks / Description
  const col4 = 380;  // Cash In (Got)
  const col5 = 465;  // Cash Out (Paid)

  // Header background
  doc
    .rect(col1 - 5, tableTop - 3, 505, 20)
    .fill('#0f172a');

  doc
    .fontSize(9)
    .font('Helvetica-Bold')
    .fillColor('#ffffff');
  doc.text('Date & Time', col1, tableTop, { width: 85 });
  doc.text('Mode', col2, tableTop, { width: 55 });
  doc.text('Remarks', col3, tableTop, { width: 175 });
  doc.text('Cash In (Rs.)', col4, tableTop, { width: 80, align: 'right' });
  doc.text('Cash Out (Rs.)', col5, tableTop, { width: 80, align: 'right' });

  doc.moveDown(0.5);

  let yPos = tableTop + 22;

  entries.forEach((entry, index) => {
    // Check if we need a new page
    if (yPos > 700) {
      doc.addPage();
      yPos = 50;
    }

    // Alternate row background
    if (index % 2 === 0) {
      doc
        .rect(col1 - 5, yPos - 3, 505, 18)
        .fill('#f8fafc');
    }

    const dateStr = new Date(entry.date).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });

    const isCashIn = entry.type === 'in';
    const amountColor = isCashIn ? '#10b981' : '#ef4444';

    doc.fontSize(8.5).font('Helvetica').fillColor('#334155');
    doc.text(dateStr, col1, yPos, { width: 85 });

    doc.fillColor('#475569');
    doc.text(entry.paymentMode.toUpperCase(), col2, yPos, { width: 55 });

    doc.fillColor('#334155');
    doc.text(entry.description || '-', col3, yPos, { width: 175 });

    // Cash In Amount
    doc.fillColor(isCashIn ? amountColor : '#94a3b8').font(isCashIn ? 'Helvetica-Bold' : 'Helvetica');
    doc.text(isCashIn ? `+${entry.amount.toFixed(2)}` : '-', col4, yPos, { width: 80, align: 'right' });

    // Cash Out Amount
    doc.fillColor(!isCashIn ? amountColor : '#94a3b8').font(!isCashIn ? 'Helvetica-Bold' : 'Helvetica');
    doc.text(!isCashIn ? `-${entry.amount.toFixed(2)}` : '-', col5, yPos, { width: 80, align: 'right' });

    yPos += 20;
  });

  // ─── SUMMARY ───
  doc.y = yPos + 15;

  // Divider
  doc
    .strokeColor('#10b981')
    .lineWidth(1)
    .moveTo(50, doc.y)
    .lineTo(545, doc.y)
    .stroke();
  doc.moveDown(0.8);

  const totalIn = entries
    .filter((e) => e.type === 'in')
    .reduce((sum, e) => sum + e.amount, 0);
  const totalOut = entries
    .filter((e) => e.type === 'out')
    .reduce((sum, e) => sum + e.amount, 0);

  doc.fontSize(10).font('Helvetica-Bold').fillColor('#1e293b');
  doc.text(`Total Cash In (Got):  Rs. ${totalIn.toFixed(2)}`, 50);
  doc.text(`Total Cash Out (Paid): Rs. ${totalOut.toFixed(2)}`, 50);
  doc.moveDown(0.4);

  const cashInHand = totalIn - totalOut;
  const balanceColor = cashInHand >= 0 ? '#10b981' : '#ef4444';
  doc
    .fontSize(12)
    .fillColor(balanceColor)
    .text(
      `Net Cash in Hand: Rs. ${cashInHand.toFixed(2)}`,
      50
    );

  doc.moveDown(2);

  // ─── FOOTER ───
  doc
    .fontSize(8)
    .font('Helvetica')
    .fillColor('#94a3b8')
    .text(
      `Generated on ${new Date().toLocaleDateString('en-IN')} | Digital Udhaar Khata Cashbook`,
      50,
      doc.y,
      { align: 'center' }
    );

  // Finalize
  doc.end();
};

const generateReceiptPDFBuffer = (store, customer, transaction, customerTransactions) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 40, size: 'A4' });
      const chunks = [];
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', (err) => reject(err));

      // ─── TOP RED STRIPE ───
      doc.rect(0, 0, 595, 8).fill('#ef4444');

      // ─── LOGO (Left) ───
      doc.rect(40, 25, 20, 26).fill('#ef4444');
      doc.rect(42, 25, 2, 26).fill('#ffffff');
      doc.rect(54, 29, 3, 2).fill('#ffffff');
      doc.rect(54, 35, 3, 2).fill('#ffffff');
      doc.rect(54, 41, 3, 2).fill('#ffffff');
      
      doc.fontSize(10).font('Helvetica-Bold').fillColor('#ef4444').text('UDHAAR', 66, 28);
      doc.fontSize(10).font('Helvetica-Bold').fillColor('#1e293b').text('KHATA', 66, 39);

      // ─── STORE INFO (Center) ───
      doc.fontSize(18).font('Helvetica-Bold').fillColor('#0f172a').text(store.storeName, 180, 24, { align: 'center', width: 235 });
      doc.fontSize(8).font('Helvetica').fillColor('#64748b').text('DIGITAL UDHAAR KHATA', 180, 42, { align: 'center', width: 235 });
      doc.fontSize(8).font('Helvetica').fillColor('#475569').text(`Owner: ${store.name}  |  Phone: ${store.phone}`, 180, 52, { align: 'center', width: 235 });

      // ─── SECURED BADGE (Right) ───
      doc.roundedRect(440, 28, 115, 22, 11).fillColor('#ecfdf5').fill();
      doc.roundedRect(440, 28, 115, 22, 11).lineWidth(1).strokeColor('#d1fae5').stroke();
      doc.circle(452, 39, 4).fillColor('#10b981').fill();
      doc.fontSize(8).font('Helvetica-Bold').fillColor('#065f46').text('Secured by Cashfree', 462, 35);

      doc.moveDown(2);
      
      // ─── SUCCESS BANNER ───
      const successY = 75;
      doc.roundedRect(40, successY, 515, 45, 8).fillColor('#ecfdf5').fill();
      doc.roundedRect(40, successY, 515, 45, 8).lineWidth(1).strokeColor('#a7f3d0').stroke();
      
      doc.circle(65, successY + 22, 10).fillColor('#10b981').fill();
      doc.circle(65, successY + 22, 10).lineWidth(1.5).strokeColor('#ffffff').stroke();
      doc.lineCap('round').lineWidth(2).strokeColor('#ffffff')
        .moveTo(61, successY + 22)
        .lineTo(64, successY + 25)
        .lineTo(70, successY + 19)
        .stroke();

      doc.fontSize(12).font('Helvetica-Bold').fillColor('#065f46').text('Payment Successful!', 85, successY + 10);
      doc.fontSize(9).font('Helvetica').fillColor('#047857').text('Thank you for your payment.', 85, successY + 24);

      // ─── RECEIPT METADATA ROW ───
      const metaY = 132;
      doc.roundedRect(40, metaY, 515, 38, 8).fillColor('#f8fafc').fill();
      doc.roundedRect(40, metaY, 515, 38, 8).lineWidth(1).strokeColor('#e2e8f0').stroke();

      doc.lineWidth(1).strokeColor('#e2e8f0')
        .moveTo(168, metaY).lineTo(168, metaY + 38)
        .moveTo(296, metaY).lineTo(296, metaY + 38)
        .moveTo(424, metaY).lineTo(424, metaY + 38)
        .stroke();

      const dateObj = new Date(transaction.date);
      const receiptNo = `RCP-${dateObj.getFullYear()}${(dateObj.getMonth()+1).toString().padStart(2,'0')}${dateObj.getDate().toString().padStart(2,'0')}-${customer._id.toString().slice(-3).toUpperCase()}`;
      const paymentDate = dateObj.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
      const paymentTime = dateObj.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });

      doc.fontSize(7).font('Helvetica-Bold').fillColor('#64748b');
      doc.text('RECEIPT NO.', 45, metaY + 8, { width: 118, align: 'center' });
      doc.text('DATE', 173, metaY + 8, { width: 118, align: 'center' });
      doc.text('TIME', 301, metaY + 8, { width: 118, align: 'center' });
      doc.text('GENERATED ON', 429, metaY + 8, { width: 120, align: 'center' });

      doc.fontSize(9).font('Helvetica-Bold').fillColor('#1e293b');
      doc.text(receiptNo, 45, metaY + 20, { width: 118, align: 'center' });
      doc.text(paymentDate, 173, metaY + 20, { width: 118, align: 'center' });
      doc.text(paymentTime, 301, metaY + 20, { width: 118, align: 'center' });
      doc.text(paymentDate, 429, metaY + 20, { width: 120, align: 'center' });

      // ─── CUSTOMER DETAILS CARD ───
      const custY = 182;
      doc.roundedRect(40, custY, 515, 65, 8).fillColor('#ffffff').fill();
      doc.roundedRect(40, custY, 515, 65, 8).lineWidth(1).strokeColor('#e2e8f0').stroke();

      doc.fontSize(8).font('Helvetica-Bold').fillColor('#4f46e5').text('👤 CUSTOMER DETAILS', 52, custY + 8);
      
      doc.fontSize(9).font('Helvetica').fillColor('#64748b');
      doc.text('Name', 52, custY + 24);
      doc.text('Phone', 52, custY + 36);
      doc.text('Address', 52, custY + 48);

      doc.font('Helvetica-Bold').fillColor('#1e293b');
      doc.text(`:  ${customer.name}`, 105, custY + 24);
      doc.text(`:  ${customer.phone}`, 105, custY + 36);
      doc.text(`:  ${customer.address || 'Not specified'}`, 105, custY + 48);

      const avatarX = 500;
      const avatarY = custY + 15;
      doc.circle(avatarX + 17, avatarY + 17, 17).fillColor('#fff1f2').fill();
      doc.circle(avatarX + 17, avatarY + 17, 17).lineWidth(1).strokeColor('#ffe4e6').stroke();
      const initial = customer.name ? customer.name.charAt(0).toUpperCase() : 'C';
      doc.fontSize(13).font('Helvetica-Bold').fillColor('#f43f5e').text(initial, avatarX, avatarY + 11, { width: 34, align: 'center' });

      // ─── TWO CARD SECTION ───
      const cardY = 260;
      const cardW = 248;
      const cardH = 120;

      // Card 1: Payment Details
      doc.roundedRect(40, cardY, cardW, cardH, 8).fillColor('#ffffff').fill();
      doc.roundedRect(40, cardY, cardW, cardH, 8).lineWidth(1).strokeColor('#e2e8f0').stroke();

      doc.fontSize(8).font('Helvetica-Bold').fillColor('#4f46e5').text('💳 PAYMENT DETAILS', 50, cardY + 8);
      
      doc.fontSize(9).font('Helvetica').fillColor('#64748b').text('Amount Paid', 50, cardY + 24);
      doc.fontSize(11).font('Helvetica-Bold').fillColor('#10b981').text(`₹${transaction.amount.toFixed(2)}`, 160, cardY + 22, { align: 'right', width: 118 });

      doc.fontSize(9).font('Helvetica').fillColor('#64748b').text('Payment Method', 50, cardY + 38);
      doc.font('Helvetica-Bold').fillColor('#1e293b').text(transaction.paymentMode ? transaction.paymentMode.toUpperCase() : 'UPI', 160, cardY + 38, { align: 'right', width: 118 });

      doc.fontSize(9).font('Helvetica').fillColor('#64748b').text('Payment Status', 50, cardY + 52);
      doc.roundedRect(210, cardY + 50, 48, 12, 6).fillColor('#ecfdf5').fill();
      doc.fontSize(7).font('Helvetica-Bold').fillColor('#065f46').text('SUCCESS', 210, cardY + 53, { width: 48, align: 'center' });

      doc.lineWidth(1).strokeColor('#f1f5f9').moveTo(50, cardY + 70).lineTo(278, cardY + 70).stroke();

      let utrVal = transaction.utr || '';
      if (!utrVal && transaction.description) {
        const match = transaction.description.match(/UTR:\s*(\d+)/i);
        if (match) utrVal = match[1];
      }
      if (!utrVal) utrVal = transaction._id.toString().slice(-12).toUpperCase();

      doc.fontSize(7).font('Helvetica-Bold').fillColor('#94a3b8').text('TRANSACTION ID (UTR)', 50, cardY + 78);
      doc.fontSize(9).font('Helvetica-Bold').fillColor('#475569').text(utrVal, 50, cardY + 88);

      // Card 2: Khata Summary
      doc.roundedRect(307, cardY, cardW, cardH, 8).fillColor('#ffffff').fill();
      doc.roundedRect(307, cardY, cardW, cardH, 8).lineWidth(1).strokeColor('#e2e8f0').stroke();

      doc.fontSize(8).font('Helvetica-Bold').fillColor('#4f46e5').text('📋 KHATA SUMMARY', 317, cardY + 8);

      const totalUdhaarVal = customerTransactions.filter(t => t.type === 'credit').reduce((sum, t) => sum + t.amount, 0);
      const totalJamaVal = customerTransactions.filter(t => t.type === 'debit' && t.paymentStatus !== 'FAILED').reduce((sum, t) => sum + t.amount, 0);

      doc.fontSize(9).font('Helvetica').fillColor('#64748b').text('Total You Gave', 317, cardY + 24);
      doc.font('Helvetica-Bold').fillColor('#1e293b').text(`₹${totalUdhaarVal.toFixed(2)}`, 427, cardY + 24, { align: 'right', width: 118 });

      doc.fontSize(9).font('Helvetica').fillColor('#64748b').text('Total You Got', 317, cardY + 38);
      doc.font('Helvetica-Bold').fillColor('#1e293b').text(`₹${totalJamaVal.toFixed(2)}`, 427, cardY + 38, { align: 'right', width: 118 });

      doc.lineWidth(1).strokeColor('#f1f5f9').moveTo(317, cardY + 70).lineTo(545, cardY + 70).stroke();

      const finalBalanceVal = customer.balance;
      const balanceLabel = finalBalanceVal <= 0 ? '(Advance)' : '(Due)';

      doc.fontSize(9).font('Helvetica-Bold').fillColor('#10b981').text('Net Balance', 317, cardY + 78);
      doc.fontSize(7).font('Helvetica-Bold').fillColor('#10b981').text(balanceLabel, 317, cardY + 88);
      doc.fontSize(16).font('Helvetica-Bold').fillColor('#10b981').text(`₹${finalBalanceVal.toFixed(2)}`, 427, cardY + 78, { align: 'right', width: 118 });

      // ─── TRANSACTION TIMELINE ───
      const timelineY = 390;
      doc.roundedRect(40, timelineY, 515, 110, 8).fillColor('#ffffff').fill();
      doc.roundedRect(40, timelineY, 515, 110, 8).lineWidth(1).strokeColor('#e2e8f0').stroke();

      doc.fontSize(8).font('Helvetica-Bold').fillColor('#4f46e5').text('🕒 TRANSACTION TIMELINE', 50, timelineY + 8);

      const timelineTxns = customerTransactions.slice().sort((a,b) => new Date(b.date) - new Date(a.date)).slice(0, 3);
      timelineTxns.reverse();

      let rowY = timelineY + 26;
      timelineTxns.forEach((txn, idx) => {
        const txnDateStr = new Date(txn.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
        const txnTimeStr = new Date(txn.date).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
        const isCreditTxn = txn.type === 'credit';
        const dotColor = isCreditTxn ? '#f97316' : '#10b981';
        const textColor = isCreditTxn ? '#ef4444' : '#10b981';

        let txnTitle = isCreditTxn ? 'You Gave Added' : 'You Got Received via UPI';
        let txnSubtitle = '';
        if (isCreditTxn) {
          txnSubtitle = txn.description || 'Goods purchased on credit';
        } else {
          let txnUtr = '';
          const m = (txn.description || '').match(/UTR:\s*(\d+)/i);
          if (m) txnUtr = m[1];
          txnSubtitle = txnUtr ? `UTR: ${txnUtr}` : (txn.description || 'Payment received');
        }

        doc.circle(55, rowY + 5, 3).fillColor(dotColor).fill();
        
        if (idx < timelineTxns.length - 1) {
          doc.lineWidth(1).strokeColor('#e2e8f0')
            .moveTo(55, rowY + 8).lineTo(55, rowY + 22)
            .stroke();
        }

        doc.fontSize(8).font('Helvetica-Bold').fillColor('#64748b');
        doc.text(`${txnDateStr}  ${txnTimeStr}`, 70, rowY);

        doc.fontSize(8).font('Helvetica-Bold').fillColor('#334155');
        doc.text(txnTitle, 180, rowY);
        doc.fontSize(7).font('Helvetica').fillColor('#94a3b8').text(txnSubtitle, 180, rowY + 9);

        doc.fontSize(9).font('Helvetica-Bold').fillColor(textColor);
        doc.text(`₹${txn.amount.toFixed(2)}`, 427, rowY, { align: 'right', width: 118 });

        rowY += 24;
      });

      // ─── FOOTER SECTION ───
      const footerY = 515;
      doc.lineWidth(1).strokeColor('#e2e8f0').moveTo(40, footerY).lineTo(555, footerY).stroke();

      doc.rect(40, footerY + 12, 45, 45).fillColor('#f8fafc').fill();
      doc.rect(40, footerY + 12, 45, 45).lineWidth(1).strokeColor('#cbd5e1').stroke();
      doc.rect(44, footerY + 16, 12, 12).fillColor('#0f172a').fill();
      doc.rect(69, footerY + 16, 12, 12).fillColor('#0f172a').fill();
      doc.rect(44, footerY + 41, 12, 12).fillColor('#0f172a').fill();
      doc.rect(59, footerY + 29, 6, 6).fillColor('#0f172a').fill();
      doc.rect(69, footerY + 41, 6, 6).fillColor('#0f172a').fill();

      doc.fontSize(9).font('Helvetica-Bold').fillColor('#1e293b').text('Scan to Verify', 95, footerY + 18);
      doc.fontSize(7).font('Helvetica').fillColor('#64748b').text(`Receipt No: ${receiptNo}`, 95, footerY + 30);

      doc.fontSize(9).font('Helvetica-Bold').fillColor('#1e293b').text('Need Help?', 420, footerY + 14, { align: 'right', width: 135 });
      doc.fontSize(7).font('Helvetica').fillColor('#475569');
      doc.text(`Owner: ${store.name}`, 420, footerY + 25, { align: 'right', width: 135 });
      doc.text(`Phone: ${store.phone}`, 420, footerY + 35, { align: 'right', width: 135 });
      doc.text('Email: support@udhaarkhata.com', 420, footerY + 45, { align: 'right', width: 135 });

      const discY = footerY + 70;
      doc.lineWidth(1).strokeColor('#f1f5f9').moveTo(40, discY).lineTo(555, discY).stroke();
      
      doc.fontSize(7).font('Helvetica').fillColor('#94a3b8').text('🔒 This is a computer generated receipt and does not require any signature.', 40, discY + 8, { align: 'center', width: 515 });
      doc.fontSize(6).font('Helvetica').fillColor('#94a3b8').text('Powered by Digital Udhaar Khata  |  Secured by Cashfree Payments', 40, discY + 18, { align: 'center', width: 515 });

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
};

module.exports = { generateStatement, generateCashbookStatement, generateStatementBuffer, generateReceiptPDFBuffer };

