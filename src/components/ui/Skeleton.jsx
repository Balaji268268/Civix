import React from 'react';
import PropTypes from 'prop-types';

export default function Skeleton({
  className = '',
  variant = 'text',
  width,
  height,
}) {
  const variantStyles = {
    text: 'h-4 w-full rounded-sm',
    circle: 'rounded-full',
    rect: 'rounded-md',
  }[variant] || 'rounded-md';

  const style = {};
  if (width) style.width = width;
  if (height) style.height = height;

  return (
    <div
      aria-hidden="true"
      style={style}
      className={`animate-pulse bg-slate-200 dark:bg-slate-800 ${variantStyles} ${className}`}
    />
  );
}

Skeleton.propTypes = {
  className: PropTypes.string,
  variant: PropTypes.oneOf(['text', 'circle', 'rect']),
  width: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  height: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
};
