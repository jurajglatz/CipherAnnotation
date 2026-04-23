/**
 * LoadingSpinner Component
 * Centered loading spinner
 */

import React from 'react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  fullHeight?: boolean;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'md',
  fullHeight = true,
}) => {
  const sizeClasses = {
    sm: 'w-6 h-6',
    md: 'w-10 h-10',
    lg: 'w-16 h-16',
  };

  const containerClasses = fullHeight ? 'min-h-screen' : '';

  return (
    <div
      className={`flex items-center justify-center ${containerClasses}`}
    >
      <div
        className={`${sizeClasses[size]} border-4 border-sepia-600/20 border-t-ink-900 rounded-full animate-spin`}
      />
    </div>
  );
};

export default LoadingSpinner;
