import React from 'react';

interface PropertyIllustrationProps {
  className?: string;
}

export const PropertyIllustration: React.FC<PropertyIllustrationProps> = ({ className = '' }) => {
  return (
    <div className={`relative flex items-center justify-center ${className}`}>
      <svg
        viewBox="0 0 400 300"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full max-w-sm h-auto drop-shadow-xs"
      >
        {/* Soft Background Cloud & Circular Glow */}
        <circle cx="200" cy="150" r="120" fill="#E2E8F0" fillOpacity="0.4" />
        <ellipse cx="270" cy="90" rx="45" ry="18" fill="#F1F5F9" fillOpacity="0.7" />
        <ellipse cx="120" cy="110" rx="35" ry="14" fill="#F1F5F9" fillOpacity="0.7" />

        {/* Distant Trees & Shrubs */}
        <circle cx="105" cy="190" r="28" fill="#CBD5E1" />
        <circle cx="295" cy="190" r="32" fill="#CBD5E1" />
        <circle cx="85" cy="205" r="22" fill="#94A3B8" />
        <circle cx="315" cy="205" r="24" fill="#94A3B8" />

        {/* Base Hill / Ground Curve */}
        <path
          d="M30 240C90 220 310 220 370 240V260H30V240Z"
          fill="#E2E8F0"
        />

        {/* Main Central House */}
        {/* Shadow */}
        <ellipse cx="200" cy="235" rx="75" ry="12" fill="#94A3B8" fillOpacity="0.3" />

        {/* Walls */}
        <path d="M140 145L200 100L260 145V230H140V145Z" fill="#94A3B8" />
        <rect x="145" y="150" width="110" height="75" fill="#CBD5E1" />

        {/* Roof Gable */}
        <path
          d="M200 85L125 145H275L200 85Z"
          fill="#475569"
        />
        <path
          d="M200 92L135 145H265L200 92Z"
          fill="#64748B"
        />

        {/* Chimney */}
        <rect x="235" y="105" width="16" height="30" fill="#475569" rx="2" />

        {/* Attic Round Window */}
        <circle cx="200" cy="125" r="10" fill="#E2E8F0" stroke="#475569" strokeWidth="3" />
        <line x1="200" y1="115" x2="200" y2="135" stroke="#475569" strokeWidth="2" />
        <line x1="190" y1="125" x2="210" y2="125" stroke="#475569" strokeWidth="2" />

        {/* Front Door */}
        <path
          d="M185 230V175C185 170 215 170 215 175V230H185Z"
          fill="#1E293B"
        />
        <circle cx="208" cy="205" r="2" fill="#E2E8F0" />

        {/* Windows */}
        <rect x="155" y="170" width="22" height="26" rx="3" fill="#F8FAFC" stroke="#64748B" strokeWidth="2.5" />
        <line x1="166" y1="170" x2="166" y2="196" stroke="#64748B" strokeWidth="1.5" />
        <line x1="155" y1="183" x2="177" y2="183" stroke="#64748B" strokeWidth="1.5" />

        <rect x="223" y="170" width="22" height="26" rx="3" fill="#F8FAFC" stroke="#64748B" strokeWidth="2.5" />
        <line x1="234" y1="170" x2="234" y2="196" stroke="#64748B" strokeWidth="1.5" />
        <line x1="223" y1="183" x2="245" y2="183" stroke="#64748B" strokeWidth="1.5" />

        {/* Secondary Left Smaller House / Wing */}
        <path d="M90 185L120 160L150 185V230H90V185Z" fill="#94A3B8" />
        <path d="M120 152L80 185H160L120 152Z" fill="#64748B" />
        <rect x="105" y="195" width="16" height="18" fill="#F8FAFC" stroke="#475569" strokeWidth="2" />

        {/* Pathway */}
        <path d="M190 230L175 255H225L210 230H190Z" fill="#CBD5E1" />
      </svg>
    </div>
  );
};
export default PropertyIllustration;
