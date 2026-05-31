import { useState, useEffect } from 'react';
import API from '../api/axios';
import Header from '../components/Layout/Header';
import Loader from '../components/Common/Loader';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../hooks/useAuth';
import { toast } from 'react-toastify';
import { HiOutlinePaperAirplane, HiOutlineCheckCircle } from 'react-icons/hi';
import { FaWhatsapp, FaSms } from 'react-icons/fa';

const RemindersPage = () => {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState({});

  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        const { data } = await API.get('/customers?sort=balance-high');
        setCustomers(data.data.filter(c => c.balance > 0));
      } catch (err) { 
        console.error(err);
        toast.error('Failed to load customers'); 
      } finally { 
        setLoading(false); 
      }
    };
    fetchCustomers();
  }, []);



  const sendWhatsAppRemind = async (customer) => {
    setSending(p => ({ ...p, [customer._id + '_whatsapp']: true }));
    try {
      // 1. Log and mock-send on backend
      const { data } = await API.post('/reminders/send-whatsapp', { customerId: customer._id });
      toast.success(data.message || `WhatsApp Reminder sent to ${customer.name}!`);

      // 2. Open native WhatsApp click-to-chat window as a bulletproof instant delivery method!
      const storeName = user?.storeName || 'Digital Udhaar';
      const cleanPhone = customer.phone.replace(/\D/g, '');
      const formattedPhone = cleanPhone.length === 10 ? '91' + cleanPhone : cleanPhone;
      const paymentLink = `${window.location.origin}/pay/${customer._id}`;
      const message = `Namaste ${customer.name}! This is a friendly reminder from ${storeName}. Your pending due amount is ₹${customer.balance}. Please clear it soon. Pay online here: ${paymentLink} - Thank you!`;
      
      const whatsappUrl = `https://api.whatsapp.com/send?phone=${formattedPhone}&text=${encodeURIComponent(message)}`;
      window.open(whatsappUrl, '_blank');
    } catch (err) { 
      toast.error(err.response?.data?.message || 'Failed to send WhatsApp reminder'); 
    } finally { 
      setSending(p => ({ ...p, [customer._id + '_whatsapp']: false })); 
    }
  };

  const sendSMSRemind = async (customer) => {
    setSending(p => ({ ...p, [customer._id + '_sms']: true }));
    try {
      const { data } = await API.post('/reminders/send-sms', { customerId: customer._id });
      toast.success(data.message || `SMS Reminder sent to ${customer.name}!`);
    } catch (err) { 
      toast.error(err.response?.data?.message || 'Failed to send SMS reminder'); 
    } finally { 
      setSending(p => ({ ...p, [customer._id + '_sms']: false })); 
    }
  };



  if (loading) return <><Header title={t('reminders')} subtitle={t('sendPaymentReminders')} /><Loader fullPage /></>;

  return (
    <>
      <Header title={t('reminders')} subtitle={t('sendPaymentReminders')} />
      
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold text-slate-gray">
            {customers.length} {t('customersWithDues')}
          </span>
        </div>
      </div>

      {customers.length === 0 ? (
        <div className="bg-pure-white border border-soft-gray rounded-2xl p-12 text-center shadow-sm max-w-xl mx-auto space-y-4">
          <div className="w-16 h-16 rounded-full bg-green-get/10 text-green-get flex items-center justify-center mx-auto mb-4">
            <HiOutlineCheckCircle size={32} />
          </div>
          <h3 className="text-lg font-bold text-deep-navy mb-0">{t('noPendingDues')}</h3>
          <p className="text-sm text-slate-gray mt-0">{t('noPendingDuesMsg')}</p>
        </div>
      ) : (
        <div className="bg-pure-white border border-soft-gray rounded-2xl shadow-sm overflow-hidden overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[650px]">
            <thead>
              <tr className="bg-soft-white border-b border-soft-gray">
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-gray">{t('customerName')}</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-gray">{t('phone')}</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-gray">{t('pendingAmount')}</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-gray">{t('actions')}</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((c) => (
                <tr key={c._id} className="border-b border-soft-gray/50 hover:bg-light-cream/10 transition-colors">
                  <td className="px-6 py-4 text-sm font-bold text-deep-navy align-middle">{c.name}</td>
                  <td className="px-6 py-4 text-sm align-middle text-deep-navy">{c.phone}</td>
                  <td className="px-6 py-4 text-sm align-middle font-bold text-red-give">₹{c.balance.toLocaleString('en-IN')}</td>
                  <td className="px-6 py-4 text-sm align-middle">
                    <div className="flex flex-wrap items-center gap-2">
                      <button 
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#2EAF7D] hover:bg-[#238C62] text-pure-white text-xs font-bold rounded-lg border-none cursor-pointer transition-all shadow-2xs hover:shadow-xs disabled:opacity-30" 
                        title="Send WhatsApp Reminder" 
                        onClick={() => sendWhatsAppRemind(c)}
                        disabled={sending[c._id + '_whatsapp']}
                      >
                        {sending[c._id + '_whatsapp'] ? (
                          <span className="w-3.5 h-3.5 border-2 border-pure-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <FaWhatsapp size={13} />
                        )}
                        WhatsApp
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
};

export default RemindersPage;
