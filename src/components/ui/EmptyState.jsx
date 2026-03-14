import React from 'react';
import PropTypes from 'prop-types';
import { Inbox } from 'lucide-react';

export default function EmptyState({
  icon = <Inbox className="w-10 h-10 text-slate-400" />,
  title = 'No items found',
  description = 'There are no records matching your criteria.',
  action = null,
  className = ''
}) {
  return (
    <div className={`flex flex-col items-center justify-center p-8 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md ${className}`}>
      <div className="p-3 bg-slate-50 dark:bg-slate-800/80 rounded-full mb-3 text-slate-500 dark:text-slate-400">
        {icon}
      </div>
      <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-1">
        {title}
      </h4>
      <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mb-4">
        {description}
      </p>
      {action && <div>{action}</div>}
    </div>
  );
}

EmptyState.propTypes = {
  icon: PropTypes.node,
  title: PropTypes.string,
  description: PropTypes.string,
  action: PropTypes.node,
  className: PropTypes.string
};
