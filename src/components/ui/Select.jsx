import React from 'react';
import PropTypes from 'prop-types';
import { ChevronDown } from 'lucide-react';

export default function Select({
  options = [],
  value,
  onChange,
  placeholder = 'Select an option',
  disabled = false,
  className = '',
  id,
  ...props
}) {
  return (
    <div className="relative w-full">
      <select
        id={id}
        value={value}
        onChange={onChange}
        disabled={disabled}
        className={`w-full appearance-none bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-md px-3.5 py-2 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all duration-150 disabled:opacity-50 disabled:bg-slate-100 dark:disabled:bg-slate-800 disabled:cursor-not-allowed ${className}`}
        {...props}
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map((opt) => {
          const optValue = typeof opt === 'object' ? opt.value || opt.id : opt;
          const optLabel = typeof opt === 'object' ? opt.label || opt.name : opt;
          return (
            <option key={optValue} value={optValue}>
              {optLabel}
            </option>
          );
        })}
      </select>
      <ChevronDown
        className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none"
        aria-hidden="true"
      />
    </div>
  );
}

Select.propTypes = {
  options: PropTypes.arrayOf(
    PropTypes.oneOfType([
      PropTypes.string,
      PropTypes.shape({
        value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
        id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
        label: PropTypes.string,
        name: PropTypes.string
      })
    ])
  ).isRequired,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  onChange: PropTypes.func,
  placeholder: PropTypes.string,
  disabled: PropTypes.bool,
  className: PropTypes.string,
  id: PropTypes.string
};
