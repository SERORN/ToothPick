import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';

interface SelectProps {
  value?: string;
  onValueChange?: (value: string) => void;
  disabled?: boolean;
  children: React.ReactNode;
}

interface SelectTriggerProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  disabled?: boolean;
  isOpen?: boolean;
}

interface SelectContentProps {
  children: React.ReactNode;
  onSelect?: (value: string) => void;
  value?: string;
}

interface SelectItemProps {
  value: string;
  children: React.ReactNode;
  onSelect?: (value: string) => void;
  isSelected?: boolean;
}

interface SelectValueProps {
  placeholder?: string;
}

export function Select({ value, onValueChange, disabled = false, children }: SelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedValue, setSelectedValue] = useState(value || '');
  const selectRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (selectRef.current && !selectRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    setSelectedValue(value || '');
  }, [value]);

  const handleSelect = (selectedValue: string) => {
    setSelectedValue(selectedValue);
    if (onValueChange) {
      onValueChange(selectedValue);
    }
    setIsOpen(false);
  };

  const triggerChild = React.Children.toArray(children).find(
    child => React.isValidElement(child) && child.type === SelectTrigger
  ) as React.ReactElement;

  const contentChild = React.Children.toArray(children).find(
    child => React.isValidElement(child) && child.type === SelectContent
  ) as React.ReactElement;

  return (
    <div ref={selectRef} className="relative">
      {triggerChild && (
        <SelectTrigger
          onClick={() => !disabled && setIsOpen(!isOpen)}
          disabled={disabled}
          isOpen={isOpen}
          className={triggerChild.props.className}
        >
          {triggerChild.props.children}
        </SelectTrigger>
      )}
      
      {isOpen && contentChild && (
        <SelectContent
          onSelect={handleSelect}
          value={selectedValue}
        >
          {contentChild.props.children}
        </SelectContent>
      )}
    </div>
  );
}

export function SelectTrigger({ children, className = '', onClick, disabled, isOpen }: SelectTriggerProps) {
  const baseClasses = 'flex items-center justify-between w-full rounded-md border border-gray-300 px-3 py-2 text-sm bg-white cursor-pointer focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed';

  return (
    <div
      onClick={onClick}
      className={`${baseClasses} ${className}`}
    >
      {children}
      <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
    </div>
  );
}

export function SelectContent({ children, onSelect, value }: SelectContentProps) {
  return (
    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-md shadow-lg z-50 max-h-60 overflow-auto">
      {React.Children.map(children, child => {
        if (React.isValidElement(child) && child.type === SelectItem) {
          const itemProps = child.props as SelectItemProps;
          return (
            <SelectItem
              key={itemProps.value}
              value={itemProps.value}
              onSelect={onSelect}
              isSelected={itemProps.value === value}
            >
              {itemProps.children}
            </SelectItem>
          );
        }
        return child;
      })}
    </div>
  );
}

export function SelectItem({ value, children, onSelect, isSelected }: SelectItemProps) {
  return (
    <div
      onClick={() => onSelect && onSelect(value)}
      className={`px-3 py-2 text-sm cursor-pointer hover:bg-gray-100 ${isSelected ? 'bg-blue-50 text-blue-700' : ''}`}
    >
      {children}
    </div>
  );
}

export function SelectValue({ placeholder }: SelectValueProps) {
  return (
    <span className="text-gray-500">
      {placeholder}
    </span>
  );
}
