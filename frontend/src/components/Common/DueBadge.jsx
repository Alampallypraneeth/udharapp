import React from 'react';
import { HiOutlineClock, HiOutlineCheckCircle, HiOutlineSparkles, HiOutlineExclamationCircle } from 'react-icons/hi';

export const getDueStatus = (customer) => {
  if (!customer) return null;
  const balance = customer.balance || 0;

  // VIP Check: High transactions and clear/low due
  if ((customer.totalTransactions >= 6 || customer.creditScore >= 800) && balance <= 0) {
    return {
      type: 'vip',
      label: 'VIP Customer',
      color: 'bg-amber-500/10 text-amber-600 border-amber-500/30 dark:text-amber-400',
      icon: <HiOutlineSparkles size={13} />,
    };
  }

  if (balance <= 0) {
    return {
      type: 'clear',
      label: 'All Clear',
      color: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30 dark:text-emerald-400',
      icon: <HiOutlineCheckCircle size={13} />,
    };
  }

  if (!customer.paymentDueDate) {
    return {
      type: 'pending',
      label: 'Due Active',
      color: 'bg-slate-500/10 text-slate-600 border-slate-500/30 dark:text-slate-400',
      icon: <HiOutlineClock size={13} />,
    };
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(customer.paymentDueDate);
  due.setHours(0, 0, 0, 0);

  const diffTime = due.getTime() - today.getTime();
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    const overdueDays = Math.abs(diffDays);
    return {
      type: 'overdue',
      label: `Overdue by ${overdueDays}d`,
      color: 'bg-rose-500/15 text-rose-600 border-rose-500/30 animate-pulse dark:text-rose-400',
      icon: <HiOutlineExclamationCircle size={13} />,
    };
  } else if (diffDays === 0) {
    return {
      type: 'today',
      label: 'Due Today',
      color: 'bg-amber-500/15 text-amber-600 border-amber-500/30 font-bold dark:text-amber-400',
      icon: <HiOutlineClock size={13} />,
    };
  } else if (diffDays <= 3) {
    return {
      type: 'soon',
      label: `Due in ${diffDays}d`,
      color: 'bg-amber-500/10 text-amber-600 border-amber-500/30 dark:text-amber-400',
      icon: <HiOutlineClock size={13} />,
    };
  }

  return {
    type: 'scheduled',
    label: `Due in ${diffDays}d`,
    color: 'bg-blue-500/10 text-blue-600 border-blue-500/30 dark:text-blue-400',
    icon: <HiOutlineClock size={13} />,
  };
};

const DueBadge = ({ customer }) => {
  const status = getDueStatus(customer);
  if (!status) return null;

  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${status.color}`}>
      {status.icon}
      <span>{status.label}</span>
    </span>
  );
};

export default DueBadge;
