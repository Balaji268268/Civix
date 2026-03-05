import React, { useId } from 'react';
import PropTypes from 'prop-types';

export default function Field({
  label,
  helperText,
  error,
  required = false,
  children,
  className = '',
  id: customId,
}) {
  const generatedId = useId();
  const fieldId = customId || generatedId;
  const helperId = `${fieldId}-helper`;
  const errorId = `${fieldId}-error`;

  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      {label && (
        <label
          htmlFor={fieldId}
          className="text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 select-none flex items-center justify-between"
        >
          <span>
            {label}
            {required && <span className="text-red-500 ml-1" aria-hidden="true">*</span>}
          </span>
        </label>
      )}

      <div>
        {React.isValidElement(children)
          ? React.cloneElement(children, {
              id: fieldId,
              'aria-invalid': !!error,
              'aria-describedby': error ? errorId : helperText ? helperId : undefined,
              className: `${children.props.className || ''} ${
                error
                  ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20'
                  : ''
              }`
            })
          : children}
      </div>

      {error ? (
        <p id={errorId} className="text-xs font-medium text-red-600 dark:text-red-400 mt-0.5 flex items-center gap-1" role="alert">
          <span>{error}</span>
        </p>
      ) : helperText ? (
        <p id={helperId} className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          {helperText}
        </p>
      ) : null}
    </div>
  );
}

Field.propTypes = {
  label: PropTypes.string,
  helperText: PropTypes.string,
  error: PropTypes.string,
  required: PropTypes.bool,
  children: PropTypes.node.isRequired,
  className: PropTypes.string,
  id: PropTypes.string
};
