import React from 'react';

interface StatusBadgeProps {
  status: string;
  size?: 'sm' | 'md';
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'sm', className = '' }) => {
  const norm = status?.trim().toLowerCase() || 'default';

  let badgeStyle = 'bg-slate-100 text-slate-700 border-slate-200';

  // Green / Success
  if (['active', 'completed', 'resolved', 'verified', 'approved', 'scheduled'].includes(norm)) {
    badgeStyle = 'bg-emerald-50 text-emerald-700 border-emerald-200';
  }
  // Amber / Warning / In Progress
  else if (
    [
      'pending',
      'planning',
      'validating',
      'in progress',
      'inprogress',
      'workinprogress',
      'inspectionpending',
      'undermaintenance',
      'medium',
    ].includes(norm)
  ) {
    badgeStyle = 'bg-amber-50 text-amber-700 border-amber-200';
  }
  // Blue / Info
  else if (['reported', 'providerselection', 'low', 'singlefamilyhouse', 'apartment', 'villa'].includes(norm)) {
    badgeStyle = 'bg-blue-50 text-blue-700 border-blue-200';
  }
  // Red / Danger / Emergency
  else if (['high', 'emergency', 'critical', 'rejected', 'archived', 'cancelled', 'inactive', 'unverified'].includes(norm)) {
    badgeStyle = 'bg-red-50 text-red-700 border-red-200';
  }
  // Cyan / AI
  else if (['ai', 'recommended', 'continuous'].includes(norm)) {
    badgeStyle = 'bg-cyan-50 text-cyan-700 border-cyan-200';
  }

  const sizeClass = size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs';

  return (
    <span
      className={`inline-flex items-center font-semibold rounded-md border ${sizeClass} ${badgeStyle} ${className}`}
    >
      {status}
    </span>
  );
};
