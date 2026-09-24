import React from 'react';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showTagline?: boolean;
  className?: string;
  variant?: 'light' | 'dark';
}

export const Logo: React.FC<LogoProps> = ({
  size = 'md',
  showTagline = true,
  className = '',
  variant = 'light',
}) => {
  // Dimensions
  const iconDimensions = {
    sm: { box: 'h-8 w-8', svg: 32, text: 'text-sm', sub: 'text-[9px]' },
    md: { box: 'h-10 w-10', svg: 40, text: 'text-base', sub: 'text-[10px]' },
    lg: { box: 'h-14 w-14', svg: 56, text: 'text-xl', sub: 'text-xs' },
    xl: { box: 'h-20 w-20', svg: 80, text: 'text-2xl', sub: 'text-sm' },
  }[size];

  const textColor = variant === 'dark' ? 'text-white' : 'text-slate-900';
  const taglineColor = variant === 'dark' ? 'text-slate-400' : 'text-slate-500';

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {/* Visual House + Bridge Arrow Mark matching primary wireframe */}
      <div className={`relative shrink-0 flex items-center justify-center ${iconDimensions.box}`}>
        <svg
          width="100%"
          height="100%"
          viewBox="0 0 64 64"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="drop-shadow-xs"
        >
          {/* House Outer Gable & Wall Frame */}
          <path
            d="M32 6L6 26V54C6 56.2091 7.79086 58 10 58H54C56.2091 58 58 56.2091 58 54V26L32 6Z"
            fill="none"
            stroke="#1E3A8A"
            strokeWidth="5"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
          {/* Top Arrow: curving right-to-left or left-to-right (Bridge Exchange) */}
          <path
            d="M20 32C20 27.5817 23.5817 24 28 24H44"
            stroke="#2563EB"
            strokeWidth="4.5"
            strokeLinecap="round"
          />
          <path
            d="M38 18L45 24L38 30"
            stroke="#2563EB"
            strokeWidth="4.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Bottom Arrow: looping in reverse to form the bridge/continuity cycle */}
          <path
            d="M44 40C44 44.4183 40.4183 48 36 48H20"
            stroke="#0284C7"
            strokeWidth="4.5"
            strokeLinecap="round"
          />
          <path
            d="M26 54L19 48L26 42"
            stroke="#0284C7"
            strokeWidth="4.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>

      {/* Typography */}
      <div className="flex flex-col">
        <span className={`font-extrabold tracking-tight ${iconDimensions.text} ${textColor} leading-tight flex items-center gap-1`}>
          AssetBridge <span className="text-blue-600 font-black">AI</span>
        </span>
        {showTagline && (
          <span className={`font-semibold ${iconDimensions.sub} ${taglineColor} tracking-tight leading-none mt-0.5`}>
            Your Assets. Always Protected.
          </span>
        )}
      </div>
    </div>
  );
};
export default Logo;
