import React from 'react';
import PropTypes from 'prop-types';

export default function Card({
  children,
  className = '',
  padding = 'normal',
  interactive = false,
  onClick,
  ...props
}) {
  const paddingMap = {
    none: 'p-0',
    tight: 'p-3 sm:p-4',
    normal: 'p-5 sm:p-6',
    spacious: 'p-6 sm:p-8',
  };

  const interactiveClasses = interactive
    ? 'hover:border-teal-500/40 dark:hover:border-teal-500/40 hover:shadow-md cursor-pointer transition-all duration-150'
    : '';

  return (
    <div
      onClick={onClick}
      className={`bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md shadow-sm text-slate-900 dark:text-slate-100 ${paddingMap[padding] || paddingMap.normal} ${interactiveClasses} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

Card.propTypes = {
  children: PropTypes.node,
  className: PropTypes.string,
  padding: PropTypes.oneOf(['none', 'tight', 'normal', 'spacious']),
  interactive: PropTypes.bool,
  onClick: PropTypes.func
};
