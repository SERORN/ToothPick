'use client';

import React, { useState, useEffect } from 'react';
import { 
  Bell, 
  Check, 
  CheckCheck, 
  X, 
  ExternalLink, 
  Clock, 
  Filter,
  Settings,
  Trash2,
  AlertCircle,
  Info,
  Star,
  Zap
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useNotifications, Notification } from '@/hooks/useNotifications';

interface NotificationDropdownProps {
  onClose: () => void;
  isOpen: boolean;
  maxHeight?: number;
}

const NotificationDropdown: React.FC<NotificationDropdownProps> = ({
  onClose,
  isOpen,
  maxHeight = 400
}) => {
  const { 
    notifications, 
    unreadCount, 
    loading, 
    error,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    fetchNotifications
  } = useNotifications();

  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [selectedNotifications, setSelectedNotifications] = useState<string[]>([]);

  // Filtrar notificaciones
  const filteredNotifications = notifications.filter(notification => {
    if (filter === 'unread') return !notification.isRead;
    return true;
  });

  // Manejar selección múltiple
  const toggleSelection = (notificationId: string) => {
    setSelectedNotifications(prev => 
      prev.includes(notificationId)
        ? prev.filter(id => id !== notificationId)
        : [...prev, notificationId]
    );
  };

  // Manejar click en notificación
  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.isRead) {
      await markAsRead(notification.id);
    }

    if (notification.url) {
      window.open(notification.url, '_blank');
    }
  };

  // Obtener icono según tipo
  const getNotificationIcon = (notification: Notification) => {
    if (notification.icon) {
      return <span className="text-lg">{notification.icon}</span>;
    }

    const iconMap: Record<string, React.ReactNode> = {
      'order_success': <CheckCheck className="w-4 h-4 text-green-500" />,
      'order_cancelled': <X className="w-4 h-4 text-red-500" />,
      'verification_approved': <Check className="w-4 h-4 text-green-500" />,
      'verification_rejected': <X className="w-4 h-4 text-red-500" />,
      'support_reply': <Bell className="w-4 h-4 text-blue-500" />,
      'loyalty_points_earned': <Star className="w-4 h-4 text-yellow-500" />,
      'system_announcement': <Info className="w-4 h-4 text-blue-500" />,
      'payment_processed': <CheckCheck className="w-4 h-4 text-green-500" />,
      'payment_failed': <AlertCircle className="w-4 h-4 text-red-500" />
    };

    return iconMap[notification.type] || <Bell className="w-4 h-4 text-gray-500" />;
  };

  // Obtener color de prioridad
  const getPriorityColor = (priority: string) => {
    const colorMap: Record<string, string> = {
      'urgent': 'border-l-red-500 bg-red-50 dark:bg-red-900/20',
      'high': 'border-l-orange-500 bg-orange-50 dark:bg-orange-900/20',
      'medium': 'border-l-blue-500 bg-blue-50 dark:bg-blue-900/20',
      'low': 'border-l-gray-500 bg-gray-50 dark:bg-gray-900/20'
    };
    return colorMap[priority] || colorMap['medium'];
  };

  if (!isOpen) return null;

  return (
    <div className="w-80 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Bell className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            <h3 className="font-semibold text-gray-900 dark:text-white">
              Notificaciones
            </h3>
            {unreadCount > 0 && (
              <span className="px-2 py-1 text-xs font-medium bg-red-500 text-white rounded-full">
                {unreadCount}
              </span>
            )}
          </div>
          
          <div className="flex items-center space-x-1">
            {/* Filtro */}
            <button
              onClick={() => setFilter(filter === 'all' ? 'unread' : 'all')}
              className={cn(
                "p-1 rounded-md transition-colors",
                "hover:bg-gray-200 dark:hover:bg-gray-700",
                filter === 'unread' && "bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400"
              )}
              title={filter === 'all' ? 'Mostrar solo no leídas' : 'Mostrar todas'}
            >
              <Filter className="w-4 h-4" />
            </button>

            {/* Marcar todas como leídas */}
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="p-1 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                title="Marcar todas como leídas"
              >
                <CheckCheck className="w-4 h-4" />
              </button>
            )}

            {/* Cerrar */}
            <button
              onClick={onClose}
              className="p-1 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div 
        className="overflow-y-auto"
        style={{ maxHeight: `${maxHeight}px` }}
      >
        {loading && (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
            <span className="ml-2 text-gray-600 dark:text-gray-400">Cargando...</span>
          </div>
        )}

        {error && (
          <div className="p-4 text-center">
            <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-2" />
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            <button
              onClick={() => fetchNotifications()}
              className="mt-2 text-sm text-blue-600 dark:text-blue-400 hover:underline"
            >
              Reintentar
            </button>
          </div>
        )}

        {!loading && !error && filteredNotifications.length === 0 && (
          <div className="p-8 text-center">
            <Bell className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h4 className="font-medium text-gray-900 dark:text-white mb-1">
              {filter === 'unread' ? 'No hay notificaciones sin leer' : 'No hay notificaciones'}
            </h4>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {filter === 'unread' 
                ? 'Todas tus notificaciones están al día' 
                : 'Recibirás notificaciones aquí cuando haya actividad'
              }
            </p>
          </div>
        )}

        {!loading && !error && filteredNotifications.map((notification) => (
          <div
            key={notification.id}
            className={cn(
              "relative border-l-4 p-4 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors cursor-pointer",
              !notification.isRead && "bg-blue-50 dark:bg-blue-950/30",
              getPriorityColor(notification.priority)
            )}
            onClick={() => handleNotificationClick(notification)}
          >
            <div className="flex items-start space-x-3">
              {/* Icono */}
              <div className="flex-shrink-0 mt-1">
                {getNotificationIcon(notification)}
              </div>

              {/* Contenido */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className={cn(
                      "text-sm font-medium text-gray-900 dark:text-white",
                      !notification.isRead && "font-semibold"
                    )}>
                      {notification.title}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">
                      {notification.message}
                    </p>
                  </div>

                  {/* Acciones */}
                  <div className="flex items-center space-x-1 ml-2">
                    {notification.url && (
                      <ExternalLink className="w-3 h-3 text-gray-400" />
                    )}
                    
                    {!notification.isRead && (
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    )}

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteNotification(notification.id);
                      }}
                      className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors opacity-0 group-hover:opacity-100"
                      title="Eliminar notificación"
                    >
                      <Trash2 className="w-3 h-3 text-gray-400" />
                    </button>
                  </div>
                </div>

                {/* Metadata */}
                <div className="flex items-center justify-between mt-2">
                  <div className="flex items-center space-x-2">
                    <Clock className="w-3 h-3 text-gray-400" />
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {notification.timeAgo}
                    </span>
                  </div>

                  {/* Prioridad */}
                  {notification.priority === 'urgent' && (
                    <div className="flex items-center space-x-1">
                      <Zap className="w-3 h-3 text-red-500" />
                      <span className="text-xs text-red-600 dark:text-red-400 font-medium">
                        Urgente
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      {filteredNotifications.length > 0 && (
        <div className="px-4 py-3 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={() => {
              window.open('/notifications', '_blank');
              onClose();
            }}
            className="w-full text-center text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium transition-colors"
          >
            Ver todas las notificaciones
          </button>
        </div>
      )}
    </div>
  );
};

export default NotificationDropdown;
