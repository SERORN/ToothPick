'use client';

import { useState, useEffect, useCallback } from 'react';

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  category: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  isRead: boolean;
  url?: string;
  icon?: string;
  metadata?: Record<string, any>;
  createdAt: string;
  readAt?: string;
  timeAgo: string;
}

export interface NotificationFilters {
  category?: string;
  isRead?: boolean;
  priority?: string;
  startDate?: Date;
  endDate?: Date;
}

export interface NotificationOptions {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface NotificationStats {
  total: number;
  unread: number;
  readRate: string;
  byCategory: Array<{ _id: string; count: number }>;
  byPriority: Array<{ _id: string; count: number }>;
  recentActivity: Notification[];
}

export const useNotifications = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState(Date.now());

  // Función para obtener notificaciones
  const fetchNotifications = useCallback(async (
    filters: NotificationFilters = {},
    options: NotificationOptions = {}
  ) => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      
      // Agregar filtros
      if (filters.category) params.append('category', filters.category);
      if (typeof filters.isRead === 'boolean') params.append('isRead', filters.isRead.toString());
      if (filters.priority) params.append('priority', filters.priority);
      if (filters.startDate) params.append('startDate', filters.startDate.toISOString());
      if (filters.endDate) params.append('endDate', filters.endDate.toISOString());
      
      // Agregar opciones
      if (options.page) params.append('page', options.page.toString());
      if (options.limit) params.append('limit', options.limit.toString());
      if (options.sortBy) params.append('sortBy', options.sortBy);
      if (options.sortOrder) params.append('sortOrder', options.sortOrder);

      const response = await fetch(`/api/notifications?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error('Error al cargar notificaciones');
      }

      const result = await response.json();
      
      if (result.success) {
        const notificationData = result.data.notifications || result.data;
        setNotifications(Array.isArray(notificationData) ? notificationData : []);
        setLastUpdate(Date.now());
      } else {
        throw new Error(result.error || 'Error al cargar notificaciones');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
      console.error('Error fetching notifications:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Función para obtener conteo de no leídas
  const fetchUnreadCount = useCallback(async () => {
    try {
      const response = await fetch('/api/notifications/unread-count');
      
      if (!response.ok) {
        throw new Error('Error al cargar conteo');
      }

      const result = await response.json();
      setUnreadCount(result.count || 0);
    } catch (err) {
      console.error('Error fetching unread count:', err);
    }
  }, []);

  // Función para marcar como leída
  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      const response = await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'markAsRead',
          notificationId
        })
      });

      if (!response.ok) {
        throw new Error('Error al marcar como leída');
      }

      // Actualizar estado local
      setNotifications(prev => 
        prev.map(n => 
          n.id === notificationId 
            ? { ...n, isRead: true, readAt: new Date().toISOString() }
            : n
        )
      );
      
      // Actualizar conteo
      setUnreadCount(prev => Math.max(0, prev - 1));
      setLastUpdate(Date.now());

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al marcar como leída');
      console.error('Error marking as read:', err);
    }
  }, []);

  // Función para marcar múltiples como leídas
  const markMultipleAsRead = useCallback(async (notificationIds: string[]) => {
    try {
      const response = await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'markMultipleAsRead',
          notificationIds
        })
      });

      if (!response.ok) {
        throw new Error('Error al marcar como leídas');
      }

      const result = await response.json();
      
      // Actualizar estado local
      setNotifications(prev => 
        prev.map(n => 
          notificationIds.includes(n.id)
            ? { ...n, isRead: true, readAt: new Date().toISOString() }
            : n
        )
      );
      
      // Actualizar conteo
      setUnreadCount(prev => Math.max(0, prev - result.modifiedCount));
      setLastUpdate(Date.now());

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al marcar como leídas');
      console.error('Error marking multiple as read:', err);
    }
  }, []);

  // Función para marcar todas como leídas
  const markAllAsRead = useCallback(async () => {
    try {
      const response = await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'markAllAsRead'
        })
      });

      if (!response.ok) {
        throw new Error('Error al marcar todas como leídas');
      }

      // Actualizar estado local
      setNotifications(prev => 
        prev.map(n => ({ ...n, isRead: true, readAt: new Date().toISOString() }))
      );
      
      setUnreadCount(0);
      setLastUpdate(Date.now());

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al marcar todas como leídas');
      console.error('Error marking all as read:', err);
    }
  }, []);

  // Función para eliminar notificación
  const deleteNotification = useCallback(async (notificationId: string) => {
    try {
      const response = await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'delete',
          notificationId
        })
      });

      if (!response.ok) {
        throw new Error('Error al eliminar notificación');
      }

      // Actualizar estado local
      setNotifications(prev => {
        const filtered = prev.filter(n => n.id !== notificationId);
        const deletedNotification = prev.find(n => n.id === notificationId);
        
        // Si la notificación eliminada no estaba leída, decrementar el conteo
        if (deletedNotification && !deletedNotification.isRead) {
          setUnreadCount(prev => Math.max(0, prev - 1));
        }
        
        return filtered;
      });
      
      setLastUpdate(Date.now());

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al eliminar notificación');
      console.error('Error deleting notification:', err);
    }
  }, []);

  // Función para obtener estadísticas
  const getStats = useCallback(async (days: number = 30): Promise<NotificationStats | null> => {
    try {
      const response = await fetch(`/api/notifications/stats?days=${days}`);
      
      if (!response.ok) {
        throw new Error('Error al cargar estadísticas');
      }

      const result = await response.json();
      return result.success ? result.data : null;
    } catch (err) {
      console.error('Error fetching stats:', err);
      return null;
    }
  }, []);

  // Efecto para cargar datos iniciales
  useEffect(() => {
    fetchNotifications();
    fetchUnreadCount();
  }, [fetchNotifications, fetchUnreadCount]);

  // Efecto para polling (actualizaciones automáticas cada 30 segundos)
  useEffect(() => {
    const interval = setInterval(() => {
      fetchUnreadCount();
      // Solo actualizar notificaciones si no hay filtros específicos
      if (notifications.length === 0 || Date.now() - lastUpdate > 60000) {
        fetchNotifications();
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [fetchNotifications, fetchUnreadCount, notifications.length, lastUpdate]);

  return {
    notifications,
    unreadCount,
    loading,
    error,
    fetchNotifications,
    fetchUnreadCount,
    markAsRead,
    markMultipleAsRead,
    markAllAsRead,
    deleteNotification,
    getStats,
    refresh: () => {
      fetchNotifications();
      fetchUnreadCount();
    }
  };
};
