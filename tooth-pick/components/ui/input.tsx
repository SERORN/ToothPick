import React from 'react';

interface InputProps {
  id?: string;
  type?: string;
  value?: string;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onKeyPress?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
}

export function Input({
  id,
  type = 'text',
  value,
  placeholder,
  className = '',
  disabled = false,
  onChange,
  onKeyPress
}: InputProps) {
  const baseClasses = 'block w-full rounded-md border border-gray-300 px-3 py-2 text-sm placeholder-gray-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed';

  return (
    <input
      id={id}
      type={type}
      value={value}
      placeholder={placeholder}
      disabled={disabled}
      onChange={onChange}
      onKeyPress={onKeyPress}
      className={`${baseClasses} ${className}`}
    />
  );
}
