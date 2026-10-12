import React from 'react';

const Logo = ({ size = '100%', showText = false, className = '' }) => {
  return (
    <div className={`flex items-center gap-2.5 ${className}`} style={{ display: 'inline-flex' }}>
      <svg 
        viewBox="0 0 100 100" 
        style={{ width: size, height: size, display: 'block' }}
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
        className="shrink-0 transition-transform hover:scale-105 duration-200"
      >
        <defs>
          <linearGradient id="vf-bg-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#059669" />
            <stop offset="60%" stopColor="#047857" />
            <stop offset="100%" stopColor="#064E3B" />
          </linearGradient>
          <linearGradient id="vf-v-grad" x1="20%" y1="0%" x2="80%" y2="100%">
            <stop offset="0%" stopColor="#34D399" />
            <stop offset="100%" stopColor="#10B981" />
          </linearGradient>
          <linearGradient id="vf-accent-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FBBF24" />
            <stop offset="100%" stopColor="#F59E0B" />
          </linearGradient>
          <filter id="vf-glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Outer squircle container */}
        <rect width="100" height="100" rx="24" fill="url(#vf-bg-grad)" />
        
        {/* Subtle inner border glow */}
        <rect x="2" y="2" width="96" height="96" rx="22" stroke="rgba(255,255,255,0.15)" strokeWidth="2" fill="none" />

        {/* Geometric Left Wing of V */}
        <path 
          d="M24 28 L42 28 L54 62 L42 62 Z" 
          fill="rgba(255, 255, 255, 0.85)" 
        />

        {/* Geometric Right Wing of V (Flowing Forward) */}
        <path 
          d="M76 28 L58 28 L46 62 L58 62 Z" 
          fill="url(#vf-v-grad)" 
        />

        {/* Dynamic Flow Arrow at base */}
        <path 
          d="M42 66 L50 78 L58 66 Z" 
          fill="url(#vf-accent-grad)" 
          filter="url(#vf-glow)"
        />

        {/* Micro Rupee Node Accent in top right */}
        <circle cx="74" cy="28" r="6" fill="url(#vf-accent-grad)" />
        <circle cx="74" cy="28" r="3" fill="#FFFFFF" />
      </svg>

      {showText && (
        <div className="flex flex-col text-left">
          <span className="font-outfit font-extrabold text-lg tracking-tight leading-none text-deep-navy">
            Vyapar<span className="text-emerald-500">Flow</span>
          </span>
          <span className="text-[10px] uppercase font-semibold tracking-wider text-slate-gray mt-0.5">
            Smart Ledger
          </span>
        </div>
      )}
    </div>
  );
};

export default Logo;
