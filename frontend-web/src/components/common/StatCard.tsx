import React from 'react';
import { LucideIcon } from 'lucide-react';

export type StatVariant = 'blue' | 'red' | 'amber' | 'green' | 'emerald' | 'cyan' | 'purple' | 'indigo';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  variant?: StatVariant;
  color?: StatVariant; // alias
  change?: {
    value: string;
    positive?: boolean;
  };
  onClick?: () => void;
}

const variantStyles: Record<string, { bg: string; iconBg: string; border: string }> = {
  blue: {
    bg: 'bg-blue-50/80',
    iconBg: 'bg-blue-600 text-white shadow-sm',
    border: 'border-blue-100',
  },
  red: {
    bg: 'bg-red-50/80',
    iconBg: 'bg-red-600 text-white shadow-sm',
    border: 'border-red-100',
  },
  amber: {
    bg: 'bg-amber-50/80',
    iconBg: 'bg-amber-500 text-white shadow-sm',
    border: 'border-amber-100',
  },
  green: {
    bg: 'bg-emerald-50/80',
    iconBg: 'bg-emerald-600 text-white shadow-sm',
    border: 'border-emerald-100',
  },
  emerald: {
    bg: 'bg-emerald-50/80',
    iconBg: 'bg-emerald-600 text-white shadow-sm',
    border: 'border-emerald-100',
  },
  cyan: {
    bg: 'bg-cyan-50/80',
    iconBg: 'bg-cyan-600 text-white shadow-sm',
    border: 'border-cyan-100',
  },
  purple: {
    bg: 'bg-purple-50/80',
    iconBg: 'bg-purple-600 text-white shadow-sm',
    border: 'border-purple-100',
  },
  indigo: {
    bg: 'bg-indigo-50/80',
    iconBg: 'bg-indigo-600 text-white shadow-sm',
    border: 'border-indigo-100',
  },
};

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  variant,
  color = 'blue',
  change,
  onClick,
}) => {
  const chosenVariant = variant || color;
  const styles = variantStyles[chosenVariant] || variantStyles.blue;

  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-2xl border border-slate-200 p-5 shadow-xs transition-all duration-200 hover:shadow-md ${
        onClick ? 'cursor-pointer hover:border-slate-300' : ''
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="space-y-1 min-w-0">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider truncate">{title}</p>
          <div className="text-2xl font-bold tracking-tight text-slate-900">{value}</div>
          {change ? (
            <div className="flex items-center gap-1.5 pt-0.5">
              <span
                className={`text-[11px] font-bold ${
                  change.positive ? 'text-emerald-600' : 'text-slate-500'
                }`}
              >
                {change.value}
              </span>
              {subtitle && <span className="text-[11px] text-slate-400">• {subtitle}</span>}
            </div>
          ) : subtitle ? (
            <p className="text-xs text-slate-500 font-medium">{subtitle}</p>
          ) : null}
        </div>
        <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${styles.iconBg}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
};
export default StatCard;
