'use client';

import React, { useState, useEffect } from 'react';
import { Bell, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useNotifications } from '@/hooks/useNotifications';
import NotificationDropdown from './NotificationDropdown';

interface NotificationBellProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
}

const NotificationBell: React.FC<NotificationBellProps> = ({
  className,
  size = 'md',
  showText = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const { unreadCount, loading } = useNotifications();

  const sizeClasses = {
    sm: 'w-6 h-6',
    md: 'w-8 h-8',
    lg: 'w-10 h-10'
  };

  const badgeSizeClasses = {
    sm: 'w-4 h-4 text-xs',
    md: 'w-5 h-5 text-sm',
    lg: 'w-6 h-6 text-base'
  };

  return (
    <div className="relative">
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "relative p-2 rounded-full transition-all duration-200",
          "hover:bg-gray-100 dark:hover:bg-gray-700",
          "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2",
          "active:scale-95",
          className
        )}
        aria-label={`Notificaciones (${unreadCount} sin leer)`}
      >
        <div className="relative">
          <Bell 
            className={cn(
              sizeClasses[size],
              "text-gray-600 dark:text-gray-300 transition-colors",
              isOpen && "text-blue-600 dark:text-blue-400"
            )}
          />
          
          {/* Badge de conteo */}
          {unreadCount > 0 && !loading && (
            <span 
              className={cn(
                "absolute -top-1 -right-1 flex items-center justify-center",
                "bg-red-500 text-white font-bold rounded-full",
                "animate-pulse shadow-lg",
                badgeSizeClasses[size]
              )}
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}

          {/* Indicador de carga */}
          {loading && (
            <span 
              className={cn(
                "absolute -top-1 -right-1 flex items-center justify-center",
                "bg-gray-400 rounded-full animate-spin",
                badgeSizeClasses[size]
              )}
            >
              <div className="w-2 h-2 bg-white rounded-full"></div>
            </span>
          )}
        </div>

        {/* Texto opcional */}
        {showText && (
          <span className="ml-2 text-sm font-medium text-gray-700 dark:text-gray-300">
            Notificaciones
          </span>
        )}
      </button>

      {/* Dropdown de notificaciones */}
      {isOpen && (
        <>
          {/* Overlay para cerrar */}
          <div 
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          
          {/* Dropdown */}
          <div className="absolute right-0 top-full mt-2 z-50">
            <NotificationDropdown 
              onClose={() => setIsOpen(false)}
              isOpen={isOpen}
            />
          </div>
        </>
      )}
    </div>
  );
};

export default NotificationBell;
