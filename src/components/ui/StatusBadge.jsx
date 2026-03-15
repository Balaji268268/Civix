import React from 'react';
import PropTypes from 'prop-types';

/**
 * StatusBadge — Single source of truth for rendering issue lifecycle status across Civix.
 * Driven strictly by design tokens in tokens.css.
 */
export const STATUS_CONFIG = {
  'Received': {
    label: 'Received',
    dotClass: 'bg-amber-500',
    badgeClass: 'bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-200 border-amber-200 dark:border-amber-800/60',
  },
  'Pending': {
    label: 'Pending',
    dotClass: 'bg-amber-500',
    badgeClass: 'bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-200 border-amber-200 dark:border-amber-800/60',
  },
  'Assigned': {
    label: 'Assigned',
    dotClass: 'bg-indigo-500',
    badgeClass: 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-800 dark:text-indigo-200 border-indigo-200 dark:border-indigo-800/60',
  },
  'In Progress': {
    label: 'In Progress',
    dotClass: 'bg-sky-500',
    badgeClass: 'bg-sky-50 dark:bg-sky-950/60 text-sky-800 dark:text-sky-200 border-sky-200 dark:border-sky-800/60',
  },
  'Pending Review': {
    label: 'Pending Review',
    dotClass: 'bg-teal-500',
    badgeClass: 'bg-teal-50 dark:bg-teal-950/60 text-teal-800 dark:text-teal-200 border-teal-200 dark:border-teal-800/60',
  },
  'Resolved': {
    label: 'Resolved',
    dotClass: 'bg-emerald-500',
    badgeClass: 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-200 border-emerald-200 dark:border-emerald-800/60',
  },
  'Closed': {
    label: 'Closed',
    dotClass: 'bg-slate-400',
    badgeClass: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700',
  },
  'Rejected': {
    label: 'Rejected',
    dotClass: 'bg-slate-500',
    badgeClass: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-600',
  },
  'Spam': {
    label: 'Spam Flagged',
    dotClass: 'bg-purple-500',
    badgeClass: 'bg-purple-50 dark:bg-purple-950/60 text-purple-800 dark:text-purple-200 border-purple-200 dark:border-purple-800/60',
  }
};

export default function StatusBadge({ status, size = 'md', showDot = true, reasonCode = null, className = '' }) {
  const normalized = STATUS_CONFIG[status] || STATUS_CONFIG['Pending'];
  
  const sizeClasses = {
    sm: 'text-[11px] px-2 py-0.5 font-medium tracking-tight',
    md: 'text-xs px-2.5 py-1 font-medium',
    lg: 'text-sm px-3 py-1.5 font-semibold'
  }[size] || 'text-xs px-2.5 py-1 font-medium';

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border shadow-sm transition-colors duration-150 ${sizeClasses} ${normalized.badgeClass} ${className}`}
      role="status"
      aria-label={`Status: ${normalized.label}${reasonCode ? ` (${reasonCode})` : ''}`}
    >
      {showDot && (
        <span className={`w-1.5 h-1.5 rounded-full ${normalized.dotClass} shrink-0`} aria-hidden="true" />
      )}
      <span>{normalized.label}</span>
      {reasonCode && (
        <span className="opacity-75 text-[10px] uppercase font-mono tracking-wider ml-0.5">
          [{reasonCode}]
        </span>
      )}
    </span>
  );
}

StatusBadge.propTypes = {
  status: PropTypes.string,
  size: PropTypes.oneOf(['sm', 'md', 'lg']),
  showDot: PropTypes.bool,
  reasonCode: PropTypes.string,
  className: PropTypes.string
};
