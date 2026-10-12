import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../../api/axios';
import { HiOutlineSearch, HiOutlineX, HiOutlineUser, HiOutlineArrowRight } from 'react-icons/hi';

const CommandSearch = ({ isOpen, onClose }) => {
  const [query, setQuery] = useState('');
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setLoading(true);
      API.get('/customers')
        .then(res => {
          if (res.data?.success) setCustomers(res.data.data);
        })
        .catch(err => console.warn('Spotlight fetch error:', err))
        .finally(() => setLoading(false));

      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const filtered = customers.filter(c => 
    c.name.toLowerCase().includes(query.toLowerCase()) ||
    c.phone.includes(query)
  ).slice(0, 8);

  const handleSelect = (customer) => {
    onClose();
    navigate(`/customers/${customer._id}`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div 
        className="fixed inset-0" 
        onClick={onClose} 
      />
      <div className="relative w-full max-w-xl bg-pure-white border border-soft-gray rounded-2xl shadow-2xl overflow-hidden z-10 flex flex-col">
        {/* Search Input Bar */}
        <div className="flex items-center px-4 py-3.5 border-b border-soft-gray gap-3">
          <HiOutlineSearch className="text-emerald-500 shrink-0" size={22} />
          <input
            ref={inputRef}
            type="text"
            className="w-full bg-transparent border-none text-deep-navy placeholder-slate-gray/50 text-base outline-none font-medium"
            placeholder="Search customer by name or phone... (Esc to close)"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {query && (
            <button 
              onClick={() => setQuery('')}
              className="text-slate-gray hover:text-deep-navy p-1 rounded-md"
            >
              <HiOutlineX size={16} />
            </button>
          )}
          <span className="hidden sm:inline text-[11px] font-semibold text-slate-gray bg-light-cream px-2 py-0.5 rounded border border-soft-gray">
            ESC
          </span>
        </div>

        {/* Results List */}
        <div className="max-h-80 overflow-y-auto p-2 divide-y divide-soft-gray/40">
          {loading ? (
            <div className="p-8 text-center text-sm text-slate-gray">
              Searching customers...
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-sm font-semibold text-deep-navy">No customers found</p>
              <p className="text-xs text-slate-gray mt-1">Try searching with a different name or phone number</p>
            </div>
          ) : (
            filtered.map((customer) => {
              const isDue = customer.balance > 0;
              return (
                <div
                  key={customer._id}
                  onClick={() => handleSelect(customer)}
                  className="flex items-center justify-between p-3 rounded-xl hover:bg-light-cream/70 cursor-pointer transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 flex items-center justify-center font-bold text-sm">
                      {customer.avatar ? (
                        <img src={customer.avatar} alt={customer.name} className="w-full h-full rounded-full object-cover" />
                      ) : (
                        customer.name.charAt(0).toUpperCase()
                      )}
                    </div>
                    <div>
                      <div className="font-semibold text-sm text-deep-navy group-hover:text-emerald-600 transition-colors">
                        {customer.name}
                      </div>
                      <div className="text-xs text-slate-gray">
                        {customer.phone}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className={`font-bold text-sm ${isDue ? 'text-rose-500' : 'text-emerald-500'}`}>
                        {isDue ? `₹${customer.balance.toFixed(2)} due` : '₹0 clear'}
                      </div>
                      <div className="text-[10px] text-slate-gray uppercase font-semibold">
                        {customer.riskLevel || 'Low'} Risk
                      </div>
                    </div>
                    <HiOutlineArrowRight className="text-slate-gray group-hover:text-emerald-500 transition-colors" size={16} />
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer shortcuts */}
        <div className="px-4 py-2.5 bg-light-cream/40 border-t border-soft-gray flex items-center justify-between text-[11px] text-slate-gray">
          <span>Quick VyaparFlow Spotlight</span>
          <span className="flex items-center gap-2">
            <span>Press <b>↑</b> <b>↓</b> to navigate</span>
            <span>•</span>
            <span><b>↵</b> to select</span>
          </span>
        </div>
      </div>
    </div>
  );
};

export default CommandSearch;
