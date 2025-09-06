// Loading components with skeleton states

import React from 'react';
import { SkeletonProps } from '@/types/components';

export const Skeleton: React.FC<SkeletonProps> = ({
  width = '100%',
  height = '1rem',
  className = '',
  animate = true
}) => {
  return (
    <div
      className={`bg-gray-200 rounded ${animate ? 'animate-pulse' : ''} ${className}`}
      style={{ width, height }}
    />
  );
};

export const SkeletonText: React.FC<{ lines?: number; className?: string }> = ({
  lines = 3,
  className = ''
}) => {
  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: lines }).map((_, index) => (
        <Skeleton
          key={index}
          height="1rem"
          width={index === lines - 1 ? '60%' : '100%'}
        />
      ))}
    </div>
  );
};

export const SkeletonCard: React.FC<{ className?: string }> = ({ className = '' }) => {
  return (
    <div className={`p-6 bg-white rounded-lg shadow border ${className}`}>
      <div className="flex items-center space-x-4">
        <Skeleton width="3rem" height="3rem" className="rounded-full" />
        <div className="flex-1">
          <Skeleton width="60%" height="1.25rem" className="mb-2" />
          <Skeleton width="40%" height="1rem" />
        </div>
      </div>
    </div>
  );
};

export const LoadingSpinner: React.FC<{ size?: 'sm' | 'md' | 'lg'; className?: string }> = ({
  size = 'md',
  className = ''
}) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12'
  };

  return (
    <div className={`animate-spin rounded-full border-2 border-gray-300 border-t-blue-600 ${sizeClasses[size]} ${className}`}></div>
  );
};

export const LoadingOverlay: React.FC<{
  isLoading: boolean;
  message?: string;
  children: React.ReactNode;
  className?: string;
}> = ({ isLoading, message = 'Loading...', children, className = '' }) => {
  return (
    <div className={`relative ${className}`}>
      {children}
      {isLoading && (
        <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center rounded-lg">
          <div className="text-center">
            <LoadingSpinner className="mx-auto mb-2" />
            <p className="text-sm text-gray-600">{message}</p>
          </div>
        </div>
      )}
    </div>
  );
};

export const LoadingButton: React.FC<{
  isLoading: boolean;
  loadingText?: string;
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  disabled?: boolean;
}> = ({
  isLoading,
  loadingText = 'Loading...',
  children,
  className = '',
  onClick,
  disabled
}) => {
  return (
    <button
      onClick={onClick}
      disabled={disabled || isLoading}
      className={`relative ${className}`}
    >
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center">
          <LoadingSpinner size="sm" />
        </div>
      )}
      <span className={isLoading ? 'invisible' : ''}>
        {children}
      </span>
      {isLoading && (
        <span className="absolute inset-0 flex items-center justify-center text-sm">
          {loadingText}
        </span>
      )}
    </button>
  );
};