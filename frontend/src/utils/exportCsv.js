/**
 * Utility to convert transactions or ledger records into a downloadable CSV file.
 */
export const exportToCSV = (filename, rows, headers) => {
  if (!rows || !rows.length) {
    alert('No data available to export.');
    return;
  }

  // Construct CSV content
  const csvHeaders = headers.map(h => `"${h.label}"`).join(',');
  const csvRows = rows.map(row => {
    return headers.map(h => {
      let val = row[h.key];
      if (val === undefined || val === null) val = '';
      if (typeof val === 'string') {
        // Escape quotes
        val = val.replace(/"/g, '""');
      }
      return `"${val}"`;
    }).join(',');
  });

  const csvContent = [csvHeaders, ...csvRows].join('\r\n');
  const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
  
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export const exportCustomerLedgerCSV = (customer, transactions) => {
  const safeName = (customer.name || 'Customer').replace(/[^a-zA-Z0-9]/g, '_');
  const dateStr = new Date().toISOString().split('T')[0];
  const filename = `KhataPay_Statement_${safeName}_${dateStr}`;

  const headers = [
    { label: 'Date', key: 'formattedDate' },
    { label: 'Type', key: 'typeLabel' },
    { label: 'Amount (₹)', key: 'amount' },
    { label: 'Payment Mode', key: 'paymentMode' },
    { label: 'Status', key: 'paymentStatus' },
    { label: 'Description', key: 'description' },
  ];

  const rows = transactions.map(t => ({
    formattedDate: new Date(t.date || t.createdAt).toLocaleDateString('en-IN', {
      year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
    }),
    typeLabel: t.type === 'credit' ? 'Credit (You Gave / Udhaar)' : 'Payment (You Got / Jama)',
    amount: t.amount,
    paymentMode: t.paymentMode || 'cash',
    paymentStatus: t.paymentStatus || 'SETTLED',
    description: t.description || '—',
  }));

  exportToCSV(filename, rows, headers);
};

export const exportAllCustomersCSV = (customers) => {
  const dateStr = new Date().toISOString().split('T')[0];
  const filename = `KhataPay_Customers_Summary_${dateStr}`;

  const headers = [
    { label: 'Customer Name', key: 'name' },
    { label: 'Phone', key: 'phone' },
    { label: 'Outstanding Balance (₹)', key: 'balance' },
    { label: 'Risk Level', key: 'riskLevel' },
    { label: 'Credit Score', key: 'creditScore' },
    { label: 'Payment Due Date', key: 'paymentDueDate' },
    { label: 'Total Transactions', key: 'totalTransactions' },
  ];

  const rows = customers.map(c => ({
    name: c.name,
    phone: c.phone,
    balance: c.balance || 0,
    riskLevel: (c.riskLevel || 'low').toUpperCase(),
    creditScore: c.creditScore || 750,
    paymentDueDate: c.paymentDueDate ? new Date(c.paymentDueDate).toLocaleDateString('en-IN') : 'None',
    totalTransactions: c.totalTransactions || 0,
  }));

  exportToCSV(filename, rows, headers);
};
