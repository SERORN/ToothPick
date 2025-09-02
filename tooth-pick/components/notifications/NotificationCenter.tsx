'use client';

import React, { useState, useEffect } from 'react';
import { 
  Bell, 
  Filter, 
  Search, 
  Calendar,
  BarChart3,
  Check,
  CheckCheck,
  Trash2,
  RefreshCw,
  Settings,
  Download,
  Eye,
  EyeOff
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useNotifications, Notification, NotificationFilters, NotificationStats } from '@/hooks/useNotifications';

const NotificationCenter: React.FC = () => {
  const {
    notifications,
    unreadCount,
    loading,
    error,
    fetchNotifications,
    markAsRead,
    markMultipleAsRead,
    markAllAsRead,
    deleteNotification,
    getStats,
    refresh
  } = useNotifications();

  // Estados para filtros y búsqueda
  const [filters, setFilters] = useState<NotificationFilters>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedPriority, setSelectedPriority] = useState<string>('all');
  const [showRead, setShowRead] = useState(true);
  const [selectedNotifications, setSelectedNotifications] = useState<string[]>([]);
  
  // Estados para paginación y estadísticas
  const [currentPage, setCurrentPage] = useState(1);
  const [stats, setStats] = useState<NotificationStats | null>(null);
  const [showStats, setShowStats] = useState(false);

  // Cargar estadísticas
  useEffect(() => {
    if (showStats) {
      getStats(30).then(setStats);
    }
  }, [showStats, getStats]);

  // Aplicar filtros
  useEffect(() => {
    const newFilters: NotificationFilters = {};
    
    if (selectedCategory !== 'all') {
      newFilters.category = selectedCategory;
    }
    
    if (selectedPriority !== 'all') {
      newFilters.priority = selectedPriority;
    }
    
    if (!showRead) {
      newFilters.isRead = false;
    }

    setFilters(newFilters);
    fetchNotifications(newFilters, { page: currentPage, limit: 20 });
  }, [selectedCategory, selectedPriority, showRead, currentPage, fetchNotifications]);

  // Filtrar notificaciones localmente por búsqueda
  const filteredNotifications = notifications.filter(notification => {
    if (!searchQuery) return true;
    
    const query = searchQuery.toLowerCase();
    return (
      notification.title.toLowerCase().includes(query) ||
      notification.message.toLowerCase().includes(query) ||
      notification.type.toLowerCase().includes(query)
    );
  });

  // Manejar selección múltiple
  const toggleSelection = (notificationId: string) => {
    setSelectedNotifications(prev => 
      prev.includes(notificationId)
        ? prev.filter(id => id !== notificationId)
        : [...prev, notificationId]
    );
  };

  const selectAll = () => {
    setSelectedNotifications(filteredNotifications.map(n => n.id));
  };

  const clearSelection = () => {
    setSelectedNotifications([]);
  };

  // Acciones en lote
  const handleBulkMarkAsRead = async () => {
    if (selectedNotifications.length > 0) {
      await markMultipleAsRead(selectedNotifications);
      clearSelection();
    }
  };

  const handleBulkDelete = async () => {
    if (selectedNotifications.length > 0) {
      await Promise.all(selectedNotifications.map(id => deleteNotification(id)));
      clearSelection();
    }
  };

  // Categorías disponibles
  const categories = [
    { value: 'all', label: 'Todas', icon: '📋' },
    { value: 'order', label: 'Pedidos', icon: '🛒' },
    { value: 'verification', label: 'Verificación', icon: '✅' },
    { value: 'support', label: 'Soporte', icon: '💬' },
    { value: 'subscription', label: 'Suscripción', icon: '🎯' },
    { value: 'loyalty', label: 'Puntos', icon: '⭐' },
    { value: 'payment', label: 'Pagos', icon: '💳' },
    { value: 'system', label: 'Sistema', icon: '⚙️' }
  ];

  const priorities = [
    { value: 'all', label: 'Todas' },
    { value: 'urgent', label: 'Urgente', color: 'text-red-600' },
    { value: 'high', label: 'Alta', color: 'text-orange-600' },
    { value: 'medium', label: 'Media', color: 'text-blue-600' },
    { value: 'low', label: 'Baja', color: 'text-gray-600' }
  ];

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Bell className="w-8 h-8 text-blue-600" />
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Centro de Notificaciones
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Gestiona todas tus notificaciones en un solo lugar
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {/* Estadísticas */}
          <button
            onClick={() => setShowStats(!showStats)}
            className={cn(
              "p-2 rounded-lg transition-colors",
              "hover:bg-gray-100 dark:hover:bg-gray-700",
              showStats && "bg-blue-100 dark:bg-blue-900 text-blue-600"
            )}
            title="Ver estadísticas"
          >
            <BarChart3 className="w-5 h-5" />
          </button>

          {/* Refresh */}
          <button
            onClick={refresh}
            disabled={loading}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
            title="Actualizar"
          >
            <RefreshCw className={cn("w-5 h-5", loading && "animate-spin")} />
          </button>
        </div>
      </div>

      {/* Estadísticas */}
      {showStats && stats && (
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold mb-4">Estadísticas (últimos 30 días)</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{stats.total}</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Total</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{stats.unread}</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Sin leer</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{stats.readRate}%</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Tasa de lectura</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{stats.recentActivity.length}</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Recientes</div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Por categoría */}
            <div>
              <h3 className="font-medium mb-2">Por categoría</h3>
              <div className="space-y-2">
                {stats.byCategory.map((item) => (
                  <div key={item._id} className="flex justify-between">
                    <span className="capitalize">{item._id}</span>
                    <span className="font-medium">{item.count}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Por prioridad */}
            <div>
              <h3 className="font-medium mb-2">Por prioridad</h3>
              <div className="space-y-2">
                {stats.byPriority.map((item) => (
                  <div key={item._id} className="flex justify-between">
                    <span className="capitalize">{item._id}</span>
                    <span className="font-medium">{item.count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filtros y búsqueda */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Búsqueda */}
          <div className="relative">
            <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar notificaciones..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Categoría */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full py-2 px-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {categories.map(category => (
              <option key={category.value} value={category.value}>
                {category.icon} {category.label}
              </option>
            ))}
          </select>

          {/* Prioridad */}
          <select
            value={selectedPriority}
            onChange={(e) => setSelectedPriority(e.target.value)}
            className="w-full py-2 px-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {priorities.map(priority => (
              <option key={priority.value} value={priority.value}>
                {priority.label}
              </option>
            ))}
          </select>

          {/* Mostrar leídas */}
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowRead(!showRead)}
              className={cn(
                "flex items-center space-x-2 px-3 py-2 rounded-lg transition-colors",
                showRead 
                  ? "bg-blue-100 dark:bg-blue-900 text-blue-600" 
                  : "bg-gray-100 dark:bg-gray-700 text-gray-600"
              )}
            >
              {showRead ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
              <span className="text-sm">{showRead ? 'Ver leídas' : 'Solo sin leer'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Acciones en lote */}
      {selectedNotifications.length > 0 && (
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-700">
          <div className="flex items-center justify-between">
            <span className="text-sm text-blue-800 dark:text-blue-200">
              {selectedNotifications.length} notificación{selectedNotifications.length !== 1 ? 'es' : ''} seleccionada{selectedNotifications.length !== 1 ? 's' : ''}
            </span>
            
            <div className="flex items-center space-x-2">
              <button
                onClick={handleBulkMarkAsRead}
                className="flex items-center space-x-1 px-3 py-1 bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 rounded-md text-sm hover:bg-green-200 dark:hover:bg-green-800 transition-colors"
              >
                <Check className="w-4 h-4" />
                <span>Marcar como leídas</span>
              </button>
              
              <button
                onClick={handleBulkDelete}
                className="flex items-center space-x-1 px-3 py-1 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 rounded-md text-sm hover:bg-red-200 dark:hover:bg-red-800 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                <span>Eliminar</span>
              </button>
              
              <button
                onClick={clearSelection}
                className="px-3 py-1 text-gray-600 dark:text-gray-400 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lista de notificaciones */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        {/* Header de la tabla */}
        <div className="px-6 py-3 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <input
                type="checkbox"
                checked={selectedNotifications.length === filteredNotifications.length && filteredNotifications.length > 0}
                onChange={() => {
                  if (selectedNotifications.length === filteredNotifications.length) {
                    clearSelection();
                  } else {
                    selectAll();
                  }
                }}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {filteredNotifications.length} notificaciones
              </span>
            </div>

            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="flex items-center space-x-1 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
              >
                <CheckCheck className="w-4 h-4" />
                <span>Marcar todas como leídas</span>
              </button>
            )}
          </div>
        </div>

        {/* Lista */}
        <div className="divide-y divide-gray-200 dark:divide-gray-700">
          {loading && (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
              <span className="ml-3 text-gray-600 dark:text-gray-400">Cargando notificaciones...</span>
            </div>
          )}

          {error && (
            <div className="p-8 text-center">
              <div className="text-red-500 mb-2">Error al cargar notificaciones</div>
              <button
                onClick={refresh}
                className="text-blue-600 dark:text-blue-400 hover:underline"
              >
                Reintentar
              </button>
            </div>
          )}

          {!loading && !error && filteredNotifications.length === 0 && (
            <div className="p-12 text-center">
              <Bell className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                No hay notificaciones
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                {searchQuery 
                  ? 'No se encontraron notificaciones que coincidan con tu búsqueda'
                  : 'No tienes notificaciones en este momento'
                }
              </p>
            </div>
          )}

          {!loading && !error && filteredNotifications.map((notification) => (
            <NotificationItem
              key={notification.id}
              notification={notification}
              isSelected={selectedNotifications.includes(notification.id)}
              onToggleSelection={toggleSelection}
              onMarkAsRead={markAsRead}
              onDelete={deleteNotification}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

// Componente para cada item de notificación
interface NotificationItemProps {
  notification: Notification;
  isSelected: boolean;
  onToggleSelection: (id: string) => void;
  onMarkAsRead: (id: string) => void;
  onDelete: (id: string) => void;
}

const NotificationItem: React.FC<NotificationItemProps> = ({
  notification,
  isSelected,
  onToggleSelection,
  onMarkAsRead,
  onDelete
}) => {
  const getPriorityBadge = (priority: string) => {
    const badges = {
      urgent: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
      high: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
      medium: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      low: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
    };
    
    return badges[priority as keyof typeof badges] || badges.medium;
  };

  return (
    <div className={cn(
      "px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors",
      !notification.isRead && "bg-blue-50 dark:bg-blue-950/30"
    )}>
      <div className="flex items-start space-x-4">
        {/* Checkbox */}
        <input
          type="checkbox"
          checked={isSelected}
          onChange={() => onToggleSelection(notification.id)}
          className="mt-1 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
        />

        {/* Contenido */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              {/* Header */}
              <div className="flex items-center space-x-2 mb-1">
                {notification.icon && (
                  <span className="text-lg">{notification.icon}</span>
                )}
                <h3 className={cn(
                  "text-sm font-medium text-gray-900 dark:text-white",
                  !notification.isRead && "font-semibold"
                )}>
                  {notification.title}
                </h3>
                <span className={cn(
                  "px-2 py-1 text-xs font-medium rounded-full",
                  getPriorityBadge(notification.priority)
                )}>
                  {notification.priority}
                </span>
              </div>

              {/* Mensaje */}
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                {notification.message}
              </p>

              {/* Metadata */}
              <div className="flex items-center space-x-4 text-xs text-gray-500 dark:text-gray-400">
                <span>{notification.timeAgo}</span>
                <span className="capitalize">{notification.category}</span>
                <span className="capitalize">{notification.type.replace('_', ' ')}</span>
                {notification.url && (
                  <a
                    href={notification.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    Ver detalles
                  </a>
                )}
              </div>
            </div>

            {/* Acciones */}
            <div className="flex items-center space-x-2 ml-4">
              {!notification.isRead && (
                <button
                  onClick={() => onMarkAsRead(notification.id)}
                  className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                  title="Marcar como leída"
                >
                  <Check className="w-4 h-4 text-green-600" />
                </button>
              )}

              <button
                onClick={() => onDelete(notification.id)}
                className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                title="Eliminar"
              >
                <Trash2 className="w-4 h-4 text-red-600" />
              </button>

              {!notification.isRead && (
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotificationCenter;
