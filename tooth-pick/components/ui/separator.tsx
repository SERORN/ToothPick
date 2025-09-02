import React from 'react';

interface SeparatorProps {
  className?: string;
  orientation?: 'horizontal' | 'vertical';
}

export function Separator({ className = '', orientation = 'horizontal' }: SeparatorProps) {
  const baseClasses = 'bg-gray-200';
  const orientationClasses = orientation === 'horizontal' 
    ? 'h-px w-full' 
    : 'w-px h-full';

  return (
    <div className={`${baseClasses} ${orientationClasses} ${className}`} />
  );
}
