import { NavLink } from 'react-router-dom';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../hooks/useAuth';
import { 
  HiOutlineHome, 
  HiOutlineUsers, 
  HiOutlineCog, 
  HiOutlineBell, 
  HiOutlineBookOpen, 
  HiOutlineClock,
  HiOutlineShieldCheck
} from 'react-icons/hi';
import Logo from '../Common/Logo';

const Sidebar = ({ isOpen, onClose }) => {
  const { t } = useLanguage();
  const { user } = useAuth();

  const links = [
    { to: '/', icon: <HiOutlineHome size={19} />, label: t('dashboard') },
    { to: '/customers', icon: <HiOutlineUsers size={19} />, label: t('customers') },
    { to: '/cashbook', icon: <HiOutlineBookOpen size={19} />, label: t('cashbook') },
    { to: '/reminders', icon: <HiOutlineBell size={19} />, label: t('reminders') },
    { to: '/history', icon: <HiOutlineClock size={19} />, label: 'History' },
    { to: '/settings', icon: <HiOutlineCog size={19} />, label: t('settings') },
  ];

  return (
    <>
      {isOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-40 lg:hidden transition-opacity" 
          onClick={onClose} 
        />
      )}
      <aside 
        className={`fixed left-0 top-0 bottom-0 w-64 p-5 bg-pure-white border-r border-soft-gray flex flex-col z-50 transition-transform duration-300 lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="flex items-center gap-3 px-2 mb-7 pt-1">
          <div className="w-10 h-10 rounded-xl bg-pure-white border border-soft-gray flex items-center justify-center p-1.5 shadow-xs shrink-0">
            <Logo size="100%" />
          </div>
          <div>
            <div className="text-base font-black text-deep-navy font-outfit tracking-tight leading-tight">
              Khata<span className="text-blue-600 dark:text-blue-400">Pay</span>
            </div>
            <span className="text-[10px] text-slate-gray font-semibold uppercase tracking-wider block mt-0.5">
              Smart Ledger & UPI
            </span>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 flex flex-col gap-1.5 overflow-y-auto">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.to === '/'}
              className={({ isActive }) => 
                `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all group ${
                  isActive 
                    ? 'text-white bg-gradient-to-r from-[#0A1128] via-[#0F172A] to-[#1E3A8A] shadow-md shadow-slate-900/30 font-bold' 
                    : 'text-slate-gray hover:text-deep-navy hover:bg-light-cream/70'
                }`
              }
              onClick={onClose}
            >
              <span className="shrink-0 transition-transform group-hover:scale-105">{link.icon}</span>
              <span className="truncate">{link.label}</span>
            </NavLink>
          ))}
        </nav>

        {/* Merchant Status Footer Card */}
        <div className="pt-4 border-t border-soft-gray/60">
          <div className="p-3 rounded-xl bg-light-cream/60 border border-soft-gray/60 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-xs shrink-0">
              <HiOutlineShieldCheck size={18} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse shrink-0" />
                <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider truncate">Active Store</span>
              </div>
              <div className="text-xs font-bold text-deep-navy truncate mt-0.5">
                {user?.storeName || 'My Khata Store'}
              </div>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
