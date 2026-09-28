import React from 'react';

interface PropertyIllustrationProps {
  className?: string;
}

export const PropertyIllustration: React.FC<PropertyIllustrationProps> = ({ className = '' }) => {
  return (
    <div className={`relative flex items-center justify-center ${className}`}>
      <svg
        viewBox="0 0 460 340"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full max-w-md h-auto drop-shadow-md"
      >
        <defs>
          <linearGradient id="skyGlow" x1="230" y1="20" x2="230" y2="300" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#DBEAFE" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#EFF6FF" stopOpacity="0.2" />
          </linearGradient>
          <linearGradient id="commGrad" x1="80" y1="60" x2="160" y2="240" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#1E293B" />
            <stop offset="100%" stopColor="#0F172A" />
          </linearGradient>
          <linearGradient id="commGlass" x1="100" y1="80" x2="150" y2="230" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#38BDF8" stopOpacity="0.7" />
            <stop offset="100%" stopColor="#0284C7" stopOpacity="0.9" />
          </linearGradient>
          <linearGradient id="resGrad" x1="210" y1="120" x2="310" y2="250" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#3B82F6" />
            <stop offset="100%" stopColor="#1D4ED8" />
          </linearGradient>
          <linearGradient id="landGrad" x1="330" y1="170" x2="420" y2="270" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#10B981" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#059669" stopOpacity="0.9" />
          </linearGradient>
          <linearGradient id="carGrad" x1="160" y1="235" x2="280" y2="280" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#0284C7" />
            <stop offset="100%" stopColor="#0369A1" />
          </linearGradient>
          <radialGradient id="halo" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.15" />
            <stop offset="100%" stopColor="#3B82F6" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Ambient Halo & AI Network Backdrop */}
        <circle cx="230" cy="170" r="150" fill="url(#halo)" />
        <ellipse cx="230" cy="275" rx="200" ry="25" fill="#E2E8F0" fillOpacity="0.6" />

        {/* Telemetry Grid & Connection Arcs */}
        <path d="M70 260C150 220 310 220 390 260" stroke="#93C5FD" strokeWidth="1.5" strokeDasharray="4 4" strokeOpacity="0.8" />
        <path d="M120 120C170 80 270 90 330 140" stroke="#60A5FA" strokeWidth="1.5" strokeDasharray="3 3" strokeOpacity="0.7" />

        {/* 1. COMMERCIAL ASSET (Left Tower) */}
        <g id="commercial-tower">
          <rect x="75" y="75" width="85" height="185" rx="6" fill="url(#commGrad)" />
          {/* Glass Windows Grid */}
          <rect x="85" y="90" width="65" height="155" rx="3" fill="url(#commGlass)" />
          <line x1="85" y1="115" x2="150" y2="115" stroke="#E0F2FE" strokeWidth="1" strokeOpacity="0.4" />
          <line x1="85" y1="140" x2="150" y2="140" stroke="#E0F2FE" strokeWidth="1" strokeOpacity="0.4" />
          <line x1="85" y1="165" x2="150" y2="165" stroke="#E0F2FE" strokeWidth="1" strokeOpacity="0.4" />
          <line x1="85" y1="190" x2="150" y2="190" stroke="#E0F2FE" strokeWidth="1" strokeOpacity="0.4" />
          <line x1="85" y1="215" x2="150" y2="215" stroke="#E0F2FE" strokeWidth="1" strokeOpacity="0.4" />
          <line x1="106" y1="90" x2="106" y2="245" stroke="#E0F2FE" strokeWidth="1" strokeOpacity="0.4" />
          <line x1="128" y1="90" x2="128" y2="245" stroke="#E0F2FE" strokeWidth="1" strokeOpacity="0.4" />
          {/* Spire & Telemetry Beacon */}
          <line x1="117" y1="75" x2="117" y2="48" stroke="#0284C7" strokeWidth="3" strokeLinecap="round" />
          <circle cx="117" cy="46" r="4" fill="#38BDF8" />
          <circle cx="117" cy="46" r="8" stroke="#38BDF8" strokeWidth="1" strokeOpacity="0.5" />
          {/* Tag Pill */}
          <rect x="70" y="248" width="62" height="16" rx="8" fill="#1E293B" />
          <text x="101" y="259" fill="#94A3B8" fontSize="8" fontWeight="bold" textAnchor="middle" fontFamily="sans-serif">Commercial</text>
        </g>

        {/* 2. RESIDENTIAL VILLA (Center Architectural Asset) */}
        <g id="residential-villa">
          {/* Main Villa Block */}
          <rect x="185" y="130" width="125" height="120" rx="8" fill="#FFFFFF" stroke="#E2E8F0" strokeWidth="2" />
          {/* Cantilever Upper Floor / Accent */}
          <path d="M175 125L250 85L325 125H175Z" fill="url(#resGrad)" />
          {/* Balcony & Glass Sliders */}
          <rect x="200" y="145" width="45" height="40" rx="3" fill="#E0F2FE" stroke="#93C5FD" strokeWidth="1.5" />
          <rect x="255" y="145" width="40" height="40" rx="3" fill="#E0F2FE" stroke="#93C5FD" strokeWidth="1.5" />
          <line x1="222" y1="145" x2="222" y2="185" stroke="#3B82F6" strokeWidth="1" />
          <line x1="275" y1="145" x2="275" y2="185" stroke="#3B82F6" strokeWidth="1" />
          {/* Entrance Door & Sconce */}
          <rect x="235" y="200" width="26" height="50" rx="3" fill="#1E3A8A" />
          <circle cx="255" cy="225" r="2" fill="#FEF08A" />
          {/* Villa Roof Terrace Railing */}
          <line x1="185" y1="130" x2="310" y2="130" stroke="#CBD5E1" strokeWidth="2" />
          {/* Tag Pill */}
          <rect x="220" y="105" width="55" height="16" rx="8" fill="#1D4ED8" />
          <text x="247" y="116" fill="#FFFFFF" fontSize="8" fontWeight="bold" textAnchor="middle" fontFamily="sans-serif">Residential</text>
        </g>

        {/* 3. LAND & ESTATE PARCEL (Right Parcel Grid & Beacon) */}
        <g id="land-parcel">
          {/* Isometric Land Plate */}
          <path d="M330 200L385 175L435 200L380 225L330 200Z" fill="url(#landGrad)" />
          <path d="M330 200L380 225V240L330 215V200Z" fill="#047857" />
          <path d="M380 225L435 200V215L380 240V225Z" fill="#065F46" />
          {/* Land Grid Lines */}
          <line x1="357" y1="187" x2="407" y2="212" stroke="#A7F3D0" strokeWidth="1" strokeOpacity="0.7" />
          <line x1="355" y1="212" x2="410" y2="187" stroke="#A7F3D0" strokeWidth="1" strokeOpacity="0.7" />
          {/* Geolocation Marker Pin */}
          <g transform="translate(378, 155)">
            <circle cx="8" cy="8" r="7" fill="#EF4444" />
            <circle cx="8" cy="8" r="3" fill="#FFFFFF" />
            <path d="M8 15L8 24" stroke="#DC2626" strokeWidth="2" strokeLinecap="round" />
            <ellipse cx="8" cy="24" rx="4" ry="1.5" fill="#047857" />
          </g>
          {/* Trees on Land */}
          <circle cx="348" cy="192" r="6" fill="#34D399" />
          <circle cx="418" cy="196" r="5" fill="#34D399" />
          {/* Tag Pill */}
          <rect x="355" y="245" width="50" height="16" rx="8" fill="#065F46" />
          <text x="380" y="256" fill="#A7F3D0" fontSize="8" fontWeight="bold" textAnchor="middle" fontFamily="sans-serif">Land/Plot</text>
        </g>

        {/* 4. VEHICLE / FLEET ASSET (Foreground Modern SUV) */}
        <g id="vehicle-asset" transform="translate(135, 235)">
          {/* Ground Shadow */}
          <ellipse cx="80" cy="42" rx="70" ry="6" fill="#0F172A" fillOpacity="0.25" />
          {/* Car Body Shell */}
          <path
            d="M20 30L35 16C40 12 48 10 65 10H100C112 10 122 14 128 20L140 28C146 29 150 33 150 38V40H12V36C12 33 15 30 20 30Z"
            fill="url(#carGrad)"
          />
          {/* Windows / Cabin Glass */}
          <path
            d="M40 18L52 13H95C104 13 112 16 116 22L124 28H35L40 18Z"
            fill="#E0F2FE"
            stroke="#0284C7"
            strokeWidth="1"
          />
          <line x1="78" y1="13" x2="78" y2="28" stroke="#0369A1" strokeWidth="1.5" />
          {/* Headlights & Tail Light */}
          <path d="M144 32L149 33V37L144 36Z" fill="#FEF08A" />
          <path d="M13 32L16 32V36L13 35Z" fill="#F87171" />
          {/* Wheel Arches & Wheels */}
          {/* Front Wheel */}
          <circle cx="118" cy="40" r="12" fill="#1E293B" />
          <circle cx="118" cy="40" r="7" fill="#94A3B8" />
          <circle cx="118" cy="40" r="3" fill="#F8FAFC" />
          {/* Rear Wheel */}
          <circle cx="42" cy="40" r="12" fill="#1E293B" />
          <circle cx="42" cy="40" r="7" fill="#94A3B8" />
          <circle cx="42" cy="40" r="3" fill="#F8FAFC" />
          {/* Tag Pill */}
          <rect x="52" y="47" width="55" height="15" rx="7.5" fill="#0369A1" />
          <text x="79.5" y="58" fill="#E0F2FE" fontSize="8" fontWeight="bold" textAnchor="middle" fontFamily="sans-serif">Vehicles</text>
        </g>

        {/* AI Continuity Sparkle Nodes */}
        <g id="ai-nodes">
          <circle cx="170" cy="100" r="3" fill="#38BDF8" className="animate-pulse" />
          <circle cx="320" cy="110" r="3" fill="#60A5FA" className="animate-pulse" />
          <circle cx="280" cy="65" r="4" fill="#3B82F6" />
          <circle cx="280" cy="65" r="9" stroke="#93C5FD" strokeWidth="1" strokeOpacity="0.6" />
        </g>
      </svg>
    </div>
  );
};
export default PropertyIllustration;
