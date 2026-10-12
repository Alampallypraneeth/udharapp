import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { FaSms, FaRegCopy, FaPaperPlane, FaCheck, FaExternalLinkAlt } from 'react-icons/fa';
import { HiOutlineX, HiOutlineDeviceMobile, HiOutlineSparkles, HiOutlineCloudUpload } from 'react-icons/hi';
import API from '../../api/axios';

const SmsModal = ({ isOpen, onClose, customer, storeName = 'KhataPay' }) => {
  if (!isOpen || !customer) return null;

  const [template, setTemplate] = useState('friendly');
  const [copied, setCopied] = useState(false);
  const [sendingCloud, setSendingCloud] = useState(false);

  const cleanPhone = (customer.phone || '').replace(/\D/g, '');
  const formattedPhone = cleanPhone.length === 10 ? '91' + cleanPhone : cleanPhone;
  const baseUrl = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? (import.meta.env.VITE_FRONTEND_URL || 'https://udharapp.vercel.app')
    : window.location.origin;
  const paymentLink = `${baseUrl}/pay/${customer._id}`;

  const getTemplateMessage = (type) => {
    switch (type) {
      case 'urgent':
        return `IMPORTANT: Your pending due balance of ₹${customer.balance} at ${storeName} is overdue. Please settle immediately via UPI: ${paymentLink} - Thank you!`;
      case 'short':
        return `${storeName}: Pending due of ₹${customer.balance} for ${customer.name}. Pay online: ${paymentLink}`;
      case 'friendly':
      default:
        return `Namaste ${customer.name}! Friendly reminder from ${storeName}. Your pending due amount is ₹${customer.balance}. Please clear it soon. Pay online: ${paymentLink} - Thank you!`;
    }
  };

  const [message, setMessage] = useState(getTemplateMessage('friendly'));

  useEffect(() => {
    setMessage(getTemplateMessage(template));
  }, [template, customer]);

  const handleCopy = () => {
    navigator.clipboard.writeText(message);
    setCopied(true);
    toast.success('SMS text copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleOpenNativeSMS = () => {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const separator = isIOS ? '&' : '?';
    const smsUrl = `sms:${formattedPhone}${separator}body=${encodeURIComponent(message)}`;
    window.location.href = smsUrl;
    toast.info('Opened in your default SMS / Messages app!');
  };

  const handleSendCloudSMS = async () => {
    setSendingCloud(true);
    try {
      const res = await API.post('/reminders/send-sms', {
        customerId: customer._id,
        customMessage: message,
      });

      if (res.data?.gatewaySuccess) {
        toast.success(res.data.message || `SMS successfully delivered to ${customer.name}!`);
        onClose();
      } else {
        // Fast2SMS returned note or mock status -> offer instant native app launch
        toast.info(res.data?.message || 'Cloud SMS processed. Opening phone SMS app...');
        handleOpenNativeSMS();
      }
    } catch (err) {
      toast.warn(err.response?.data?.message || 'Could not send via cloud. Opening your SMS app instead!');
      handleOpenNativeSMS();
    } finally {
      setSendingCloud(false);
    }
  };

  const charCount = message.length;
  const smsSegments = Math.ceil(charCount / 160) || 1;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="fixed inset-0" 
        onClick={onClose} 
      />

      <div className="relative w-full max-w-lg bg-pure-white border border-soft-gray rounded-2xl shadow-2xl overflow-hidden z-10 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-soft-gray bg-light-cream/30">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
              <FaSms size={18} />
            </div>
            <div>
              <h3 className="text-base font-bold text-deep-navy leading-tight">Send SMS Reminder</h3>
              <p className="text-xs text-slate-gray">Direct mobile SMS with instant UPI payment link</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="text-slate-gray hover:text-deep-navy p-1.5 rounded-lg hover:bg-soft-gray/50 transition-colors"
          >
            <HiOutlineX size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Recipient Card */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-light-cream/50 border border-soft-gray/60">
            <div>
              <div className="text-xs text-slate-gray font-semibold uppercase tracking-wider">Recipient</div>
              <div className="text-sm font-bold text-deep-navy">{customer.name}</div>
              <div className="text-xs text-slate-gray">{customer.phone}</div>
            </div>
            <div className="text-right">
              <div className="text-xs text-slate-gray font-semibold uppercase tracking-wider">Outstanding</div>
              <div className="text-base font-black text-rose-500">₹{Number(customer.balance).toLocaleString('en-IN')}</div>
            </div>
          </div>

          {/* Template Chips */}
          <div>
            <label className="block text-xs font-bold text-slate-gray uppercase tracking-wider mb-2">
              Select SMS Template
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setTemplate('friendly')}
                className={`py-2 px-3 rounded-lg text-xs font-semibold border transition-all text-center cursor-pointer ${
                  template === 'friendly'
                    ? 'bg-blue-500/10 border-blue-500 text-blue-700 dark:text-blue-400 font-bold'
                    : 'bg-pure-white border-soft-gray text-slate-gray hover:border-slate-300'
                }`}
              >
                😊 Friendly
              </button>
              <button
                type="button"
                onClick={() => setTemplate('urgent')}
                className={`py-2 px-3 rounded-lg text-xs font-semibold border transition-all text-center cursor-pointer ${
                  template === 'urgent'
                    ? 'bg-rose-500/10 border-rose-500 text-rose-700 font-bold'
                    : 'bg-pure-white border-soft-gray text-slate-gray hover:border-slate-300'
                }`}
              >
                ⚠️ Urgent Due
              </button>
              <button
                type="button"
                onClick={() => setTemplate('short')}
                className={`py-2 px-3 rounded-lg text-xs font-semibold border transition-all text-center cursor-pointer ${
                  template === 'short'
                    ? 'bg-indigo-500/10 border-indigo-500 text-indigo-700 font-bold'
                    : 'bg-pure-white border-soft-gray text-slate-gray hover:border-slate-300'
                }`}
              >
                ⚡ Short & Crisp
              </button>
            </div>
          </div>

          {/* SMS Message Editor */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-slate-gray uppercase tracking-wider">
                SMS Message Text
              </label>
              <span className="text-[11px] font-semibold text-slate-gray">
                {charCount} chars • {smsSegments} SMS {smsSegments > 1 ? 'segments' : 'part'}
              </span>
            </div>
            <textarea
              rows={4}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full p-3 text-sm bg-light-cream/30 border border-soft-gray rounded-xl text-deep-navy focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none leading-relaxed resize-none font-sans"
            />
          </div>

          {/* Verified Link indicator */}
          <div className="flex items-center gap-2 p-2.5 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-800 dark:text-blue-300 text-xs">
            <HiOutlineSparkles size={16} className="text-blue-600 dark:text-blue-400 shrink-0" />
            <span className="truncate">Includes instant UPI settlement link: <b className="font-mono">{paymentLink}</b></span>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-light-cream/40 border-t border-soft-gray flex flex-col sm:flex-row items-center gap-2.5">
          <button
            type="button"
            onClick={handleCopy}
            className="w-full sm:w-auto px-4 py-2.5 bg-pure-white hover:bg-slate-50 border border-soft-gray text-slate-gray hover:text-deep-navy rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shrink-0"
            title="Copy SMS text"
          >
            {copied ? <FaCheck className="text-blue-600 dark:text-blue-400" /> : <FaRegCopy />}
            <span>{copied ? 'Copied' : 'Copy Text'}</span>
          </button>

          <button
            type="button"
            onClick={handleSendCloudSMS}
            disabled={sendingCloud}
            className="w-full sm:flex-1 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-sm cursor-pointer disabled:opacity-50"
            title="Send directly via Fast2SMS Cloud Gateway"
          >
            {sendingCloud ? (
              <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <HiOutlineCloudUpload size={16} />
            )}
            <span>Send via Cloud Gateway</span>
          </button>

          <button
            type="button"
            onClick={handleOpenNativeSMS}
            className="w-full sm:flex-1 px-4 py-2.5 bg-[#0A1128] hover:bg-[#1E293B] dark:bg-blue-600 dark:hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-sm shadow-slate-900/20 cursor-pointer"
            title="Open in your device's native SMS app with pre-filled text"
          >
            <HiOutlineDeviceMobile size={16} />
            <span>Open Phone SMS App</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default SmsModal;
