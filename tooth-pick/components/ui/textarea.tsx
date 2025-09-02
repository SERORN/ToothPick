import React from 'react';

interface TextareaProps {
  id?: string;
  value?: string;
  placeholder?: string;
  rows?: number;
  className?: string;
  disabled?: boolean;
  onChange?: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
}

export function Textarea({
  id,
  value,
  placeholder,
  rows = 3,
  className = '',
  disabled = false,
  onChange
}: TextareaProps) {
  const baseClasses = 'block w-full rounded-md border border-gray-300 px-3 py-2 text-sm placeholder-gray-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed resize-y';

  return (
    <textarea
      id={id}
      value={value}
      placeholder={placeholder}
      rows={rows}
      disabled={disabled}
      onChange={onChange}
      className={`${baseClasses} ${className}`}
    />
  );
}
