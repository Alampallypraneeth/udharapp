import { useState, useRef, useEffect } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useLanguage } from '../../context/LanguageContext';
import { useTheme } from '../../context/ThemeContext';
import { 
  HiOutlineMenuAlt2, 
  HiOutlineUser, 
  HiOutlineLogout, 
  HiOutlineSun, 
  HiOutlineMoon,
  HiOutlineSearch,
  HiOutlineVolumeUp,
  HiOutlineVolumeOff
} from 'react-icons/hi';
import CommandSearch from '../Common/CommandSearch';
import { isSoundboxEnabled, setSoundboxEnabled, playPaymentSuccessChime } from '../../utils/soundbox';

const Header = ({ title, subtitle, onToggleSidebar }) => {
  const { user, logout } = useAuth();
  const { t } = useLanguage();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const context = useOutletContext();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [soundEnabled, setSoundEnabledState] = useState(isSoundboxEnabled());
  const dropdownRef = useRef(null);

  const toggleSidebar = onToggleSidebar || (() => {
    if (context && Array.isArray(context)) {
      const [sidebarOpen, setSidebarOpen] = context;
      setSidebarOpen(!sidebarOpen);
    }
  });

  // Global Cmd+K / Ctrl+K shortcut listener
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setSearchOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleToggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabledState(next);
    setSoundboxEnabled(next);
    if (next) {
      playPaymentSuccessChime();
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <>
      <header className="fixed top-0 right-0 left-0 lg:left-64 h-18 flex items-center justify-between px-4 sm:px-6 lg:px-8 bg-soft-white/80 backdrop-blur-md border-b border-soft-gray z-40">
        <div className="flex items-center">
          <button 
            className="lg:hidden mr-3 p-2 text-slate-gray hover:bg-slate-gray/10 rounded-lg cursor-pointer flex items-center justify-center border-none bg-none" 
            onClick={toggleSidebar}
            id="menu-toggle"
          >
            <HiOutlineMenuAlt2 size={22} />
          </button>
          <div>
            <h1 className="text-xl font-bold text-deep-navy leading-none font-outfit">{title}</h1>
            {subtitle && (
              <p className="text-xs text-slate-gray mt-1 leading-none">
                {subtitle}
              </p>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-2 sm:gap-3" id="header-actions">
          {/* Spotlight Search Trigger Bar */}
          <button
            onClick={() => setSearchOpen(true)}
            className="hidden md:flex items-center gap-2 px-3.5 py-1.5 bg-light-cream/70 hover:bg-light-cream border border-soft-gray rounded-xl text-slate-gray hover:text-deep-navy text-xs font-medium cursor-pointer transition-all shadow-2xs"
            title="Quick Customer Search (Cmd+K)"
          >
            <HiOutlineSearch className="text-blue-600 dark:text-blue-400" size={15} />
            <span>Search ledger...</span>
            <kbd className="text-[10px] font-semibold bg-pure-white px-1.5 py-0.5 rounded border border-soft-gray ml-2 text-slate-gray/70">
              ⌘K
            </kbd>
          </button>

          {/* Mobile Search Icon */}
          <button
            onClick={() => setSearchOpen(true)}
            className="md:hidden w-9 h-9 bg-pure-white border border-soft-gray hover:bg-light-cream/50 rounded-full cursor-pointer text-slate-gray hover:text-blue-600 dark:hover:text-blue-400 transition-all flex items-center justify-center shadow-xs"
            title="Quick Search"
          >
            <HiOutlineSearch size={18} />
          </button>

          {/* Soundbox Chime Toggle */}
          <button
            onClick={handleToggleSound}
            className={`w-9 h-9 border rounded-full cursor-pointer transition-all flex items-center justify-center shadow-xs outline-none ${
              soundEnabled 
                ? 'bg-blue-500/10 border-blue-500/30 text-blue-600 dark:text-blue-400' 
                : 'bg-pure-white border-soft-gray text-slate-gray hover:text-deep-navy'
            }`}
            title={soundEnabled ? 'Payment Soundbox: Active (Click to mute)' : 'Payment Soundbox: Muted (Click to enable)'}
          >
            {soundEnabled ? (
              <HiOutlineVolumeUp size={18} />
            ) : (
              <HiOutlineVolumeOff size={18} />
            )}
          </button>

          {/* Theme toggle button */}
          <button
            onClick={toggleTheme}
            className="w-9 h-9 bg-pure-white border border-soft-gray hover:bg-light-cream/50 rounded-full cursor-pointer text-slate-gray hover:text-deep-navy transition-all flex items-center justify-center shadow-xs outline-none"
            title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {theme === 'dark' ? (
              <HiOutlineSun className="text-amber-500 animate-pulse" size={18} />
            ) : (
              <HiOutlineMoon className="text-indigo-600" size={18} />
            )}
          </button>

          {/* User Profile Menu */}
          <div className="relative" ref={dropdownRef}>
            <button
              className="flex items-center gap-2.5 p-1 pr-3 bg-pure-white border border-soft-gray rounded-full cursor-pointer hover:bg-light-cream/30 hover:border-blue-500/30 transition-all text-deep-navy outline-none"
              onClick={() => setDropdownOpen(!dropdownOpen)}
            >
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#0A1128] via-[#0F172A] to-[#1E3A8A] flex items-center justify-center font-bold text-xs text-white overflow-hidden shrink-0 shadow-inner">
                {user?.avatar ? (
                  <img src={user.avatar} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  user?.name?.charAt(0)?.toUpperCase() || 'U'
                )}
              </div>
              <div className="text-left hidden sm:block">
                <div className="text-xs font-semibold leading-tight">{user?.name || 'User'}</div>
                <div className="text-[10px] text-slate-gray leading-none mt-0.5">{user?.storeName || 'Store'}</div>
              </div>
            </button>

            {dropdownOpen && (
              <div className="absolute top-full mt-2 right-0 min-w-48 p-1.5 bg-pure-white border border-soft-gray rounded-xl shadow-xl z-50 animate-in fade-in zoom-in-95 duration-150">
                <button
                  onClick={() => { setDropdownOpen(false); navigate('/settings'); }}
                  className="flex items-center gap-2.5 w-full px-3 py-2 bg-transparent border-0 text-slate-gray cursor-pointer rounded-lg text-sm transition-colors hover:bg-slate-gray/5 hover:text-deep-navy text-left font-medium"
                >
                  <HiOutlineUser className="shrink-0 text-slate-gray" size={16} /> Profile & Settings
                </button>
                <div className="h-px bg-soft-gray my-1.5 mx-2" />
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-2.5 w-full px-3 py-2 bg-transparent border-0 text-rose-500 cursor-pointer rounded-lg text-sm transition-colors hover:bg-rose-500/10 text-left font-medium"
                >
                  <HiOutlineLogout className="shrink-0 text-rose-500" size={16} /> Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Global Spotlight Search Modal */}
      <CommandSearch isOpen={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  );
};

export default Header;
