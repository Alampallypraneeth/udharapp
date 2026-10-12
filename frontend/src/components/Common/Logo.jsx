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
          <linearGradient id="kp-bg-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#0A1128" />
            <stop offset="55%" stopColor="#0F172A" />
            <stop offset="100%" stopColor="#1E3A8A" />
          </linearGradient>
          <linearGradient id="kp-k-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#60A5FA" />
            <stop offset="100%" stopColor="#2563EB" />
          </linearGradient>
          <linearGradient id="kp-accent-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#93C5FD" />
            <stop offset="100%" stopColor="#3B82F6" />
          </linearGradient>
          <filter id="kp-glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="2.5" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Outer squircle container */}
        <rect width="100" height="100" rx="24" fill="url(#kp-bg-grad)" />
        
        {/* Subtle inner border glow */}
        <rect x="2" y="2" width="96" height="96" rx="22" stroke="rgba(255,255,255,0.18)" strokeWidth="2" fill="none" />

        {/* Geometric 'K' Vertical Pillar */}
        <rect x="26" y="24" width="12" height="52" rx="4" fill="#FFFFFF" />

        {/* Geometric 'K' Upper Branch (Ascending Payment Flow) */}
        <path 
          d="M42 45 L62 25 L75 35 L52 53 Z" 
          fill="url(#kp-k-grad)" 
        />

        {/* Geometric 'K' Lower Branch */}
        <path 
          d="M44 47 L65 75 L52 75 L36 55 Z" 
          fill="#FFFFFF" 
          opacity="0.9" 
        />

        {/* Fast-Pay Arrow Accent in top right */}
        <path 
          d="M66 22 L78 22 L78 34 Z" 
          fill="url(#kp-accent-grad)"
          filter="url(#kp-glow)"
        />

        {/* Micro Rupee Node Accent */}
        <circle cx="72" cy="50" r="5" fill="url(#kp-accent-grad)" />
        <circle cx="72" cy="50" r="2.5" fill="#FFFFFF" />
      </svg>

      {showText && (
        <div className="flex flex-col text-left">
          <span className="font-outfit font-extrabold text-lg tracking-tight leading-none text-deep-navy">
            Khata<span className="text-blue-600 dark:text-blue-400">Pay</span>
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
