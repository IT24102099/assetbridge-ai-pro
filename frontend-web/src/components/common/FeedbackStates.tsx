import React from 'react';
import { LucideIcon, AlertCircle } from 'lucide-react';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description: string;
  actionText?: string;
  actionLabel?: string; // alias
  onAction?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon = AlertCircle,
  title,
  description,
  actionText,
  actionLabel,
  onAction,
}) => {
  const btnLabel = actionLabel || actionText;

  return (
    <div className="w-full bg-white rounded-2xl border border-slate-200 p-10 flex flex-col items-center justify-center text-center space-y-3 shadow-xs">
      <div className="h-12 w-12 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 border border-slate-100">
        <Icon className="h-6 w-6" />
      </div>
      <div className="space-y-1 max-w-sm">
        <h4 className="text-sm font-bold text-slate-900">{title}</h4>
        <p className="text-xs text-slate-500">{description}</p>
      </div>
      {btnLabel && onAction && (
        <button
          onClick={onAction}
          className="mt-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-xs transition"
        >
          {btnLabel}
        </button>
      )}
    </div>
  );
};

export const LoadingState: React.FC<{ message?: string }> = ({ message = 'Loading data...' }) => (
  <div className="w-full bg-white rounded-2xl border border-slate-200 p-12 flex flex-col items-center justify-center space-y-3 shadow-xs">
    <div className="h-8 w-8 animate-spin rounded-full border-3 border-blue-600 border-t-transparent" />
    <p className="text-xs text-slate-500 font-semibold">{message}</p>
  </div>
);

export const ErrorState: React.FC<{ message?: string; onRetry?: () => void }> = ({
  message = 'Failed to load data from server.',
  onRetry,
}) => (
  <div className="w-full bg-red-50/60 rounded-2xl border border-red-200 p-8 flex flex-col items-center justify-center text-center space-y-3 shadow-xs">
    <div className="h-10 w-10 rounded-full bg-red-100 text-red-600 flex items-center justify-center">
      <AlertCircle className="h-5 w-5" />
    </div>
    <div className="space-y-1 max-w-md">
      <h4 className="text-sm font-bold text-red-900">Communication Error</h4>
      <p className="text-xs text-red-600">{message}</p>
    </div>
    {onRetry && (
      <button
        onClick={onRetry}
        className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-xl transition"
      >
        Retry Request
      </button>
    )}
  </div>
);
