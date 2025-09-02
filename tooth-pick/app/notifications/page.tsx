'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { redirect } from 'next/navigation';
import Link from 'next/link';

interface Notification {
  _id: string;
  title: string;
  message: string;
  type: 'order' | 'system' | 'tracking' | 'stock' | 'payment';
  read: boolean;
  createdAt: string;
  orderId?: string;
  productId?: string;
  metadata?: {
    orderNumber?: string;
    amount?: number;
    status?: string;
    productName?: string;
    [key: string]: any;
  };
}

export default function NotificationsPage() {
  const { data: session, status } = useSession();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  if (status === 'loading') {
    return <div className="min-h-screen flex items-center justify-center">
      <div className="text-lg">Cargando...</div>
    </div>;
  }

  if (!session) {
    redirect('/login');
  }

  useEffect(() => {
    fetchNotifications();
  }, [filter]);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filter === 'unread') {
        params.set('unread', 'true');
      }
      params.set('limit', '100');

      const response = await fetch(`/api/notifications?${params}`);
      if (response.ok) {
        const data = await response.json();
        setNotifications(data);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      const response = await fetch('/api/notifications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'markAsRead',
          notificationId,
        }),
      });

      if (response.ok) {
        setNotifications(notifications.map(n => 
          n._id === notificationId ? { ...n, read: true } : n
        ));
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const response = await fetch('/api/notifications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'markAllAsRead',
        }),
      });

      if (response.ok) {
        setNotifications(notifications.map(n => ({ ...n, read: true })));
      }
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'order':
        return {
          icon: '📋',
          bgColor: 'bg-blue-100',
          textColor: 'text-blue-600'
        };
      case 'tracking':
        return {
          icon: '📦',
          bgColor: 'bg-purple-100',
          textColor: 'text-purple-600'
        };
      case 'stock':
        return {
          icon: '🚨',
          bgColor: 'bg-red-100',
          textColor: 'text-red-600'
        };
      case 'system':
        return {
          icon: '⚙️',
          bgColor: 'bg-gray-100',
          textColor: 'text-gray-600'
        };
      case 'payment':
        return {
          icon: '💳',
          bgColor: 'bg-green-100',
          textColor: 'text-green-600'
        };
      default:
        return {
          icon: '🔔',
          bgColor: 'bg-gray-100',
          textColor: 'text-gray-600'
        };
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-CL', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP'
    }).format(amount);
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Notificaciones</h1>
              <p className="text-gray-600">
                {unreadCount > 0 
                  ? `Tienes ${unreadCount} notificación${unreadCount > 1 ? 'es' : ''} sin leer`
                  : 'Todas las notificaciones están al día'
                }
              </p>
            </div>
            
            <div className="flex items-center space-x-4">
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm transition-colors"
                >
                  Marcar todas como leídas
                </button>
              )}
              
              <Link
                href={`/${session.user.role}/dashboard`}
                className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg text-sm transition-colors"
              >
                ← Volver al Dashboard
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-6">
        {/* Filters */}
        <div className="bg-white rounded-lg shadow mb-6 p-4">
          <div className="flex space-x-4">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === 'all'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Todas ({notifications.length})
            </button>
            <button
              onClick={() => setFilter('unread')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === 'unread'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              No leídas ({unreadCount})
            </button>
          </div>
        </div>

        {/* Notifications List */}
        {loading ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Cargando notificaciones...</p>
          </div>
        ) : notifications.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {filter === 'unread' ? 'No tienes notificaciones sin leer' : 'No tienes notificaciones'}
            </h3>
            <p className="text-gray-600">
              {filter === 'unread' 
                ? 'Todas tus notificaciones están al día.'
                : 'Las notificaciones aparecerán aquí cuando tengas actividad en tu cuenta.'
              }
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {notifications.map((notification) => {
              const iconData = getNotificationIcon(notification.type);
              
              return (
                <div
                  key={notification._id}
                  className={`bg-white rounded-lg shadow hover:shadow-md transition-shadow ${
                    !notification.read ? 'border-l-4 border-blue-500' : ''
                  }`}
                >
                  <div className="p-6">
                    <div className="flex items-start space-x-4">
                      {/* Icon */}
                      <div className={`flex-shrink-0 w-12 h-12 ${iconData.bgColor} rounded-lg flex items-center justify-center`}>
                        <span className="text-xl">{iconData.icon}</span>
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h3 className={`text-lg font-semibold ${
                              !notification.read ? 'text-gray-900' : 'text-gray-700'
                            }`}>
                              {notification.title}
                            </h3>
                            <p className="mt-1 text-gray-600 leading-relaxed">
                              {notification.message}
                            </p>

                            {/* Metadata */}
                            {notification.metadata && (
                              <div className="mt-3 space-y-1">
                                {notification.metadata.orderNumber && (
                                  <div className="flex items-center space-x-2">
                                    <span className="text-sm text-gray-500">Orden:</span>
                                    <Link
                                      href={`/orders/${notification.orderId}`}
                                      className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                                    >
                                      #{notification.metadata.orderNumber}
                                    </Link>
                                  </div>
                                )}
                                {notification.metadata.amount && (
                                  <div className="flex items-center space-x-2">
                                    <span className="text-sm text-gray-500">Monto:</span>
                                    <span className="text-sm font-medium text-gray-900">
                                      {formatCurrency(notification.metadata.amount)}
                                    </span>
                                  </div>
                                )}
                                {notification.metadata.productName && (
                                  <div className="flex items-center space-x-2">
                                    <span className="text-sm text-gray-500">Producto:</span>
                                    <span className="text-sm font-medium text-gray-900">
                                      {notification.metadata.productName}
                                    </span>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>

                          <div className="flex items-center space-x-3 ml-4">
                            <span className="text-sm text-gray-500">
                              {formatDate(notification.createdAt)}
                            </span>
                            {!notification.read && (
                              <div className="flex items-center space-x-2">
                                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                                <button
                                  onClick={() => markAsRead(notification._id)}
                                  className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                                >
                                  Marcar como leída
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
