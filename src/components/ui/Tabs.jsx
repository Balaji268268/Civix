import React from 'react';
import PropTypes from 'prop-types';

export default function Tabs({
  tabs = [],
  activeTab,
  onChange,
  className = ''
}) {
  return (
    <div className={`flex border-b border-slate-200 dark:border-slate-800 gap-2 ${className}`} role="tablist">
      {tabs.map((tab) => {
        const tabId = typeof tab === 'object' ? tab.id : tab;
        const tabLabel = typeof tab === 'object' ? tab.label : tab;
        const tabCount = typeof tab === 'object' ? tab.count : undefined;
        const isActive = activeTab === tabId;

        return (
          <button
            key={tabId}
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(tabId)}
            className={`pb-2.5 px-3 text-xs font-semibold tracking-wide transition-all border-b-2 select-none flex items-center gap-1.5 focus:outline-none ${
              isActive
                ? 'border-teal-600 text-teal-700 dark:text-teal-400 font-bold'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:border-slate-300'
            }`}
          >
            <span>{tabLabel}</span>
            {tabCount !== undefined && (
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                isActive
                  ? 'bg-teal-100 dark:bg-teal-950 text-teal-800 dark:text-teal-200'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
              }`}>
                {tabCount}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

Tabs.propTypes = {
  tabs: PropTypes.arrayOf(
    PropTypes.oneOfType([
      PropTypes.string,
      PropTypes.shape({
        id: PropTypes.string.isRequired,
        label: PropTypes.node.isRequired,
        count: PropTypes.number
      })
    ])
  ).isRequired,
  activeTab: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  className: PropTypes.string
};
