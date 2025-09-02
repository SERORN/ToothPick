'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import SupportTicketList from './SupportTicketList';

interface SupportStats {
  totalTickets: number;
  openTickets: number;
  inProgressTickets: number;
  resolvedTickets: number;
  closedTickets: number;
  avgResolutionTime: number;
  avgSatisfactionRating: number;
  totalSatisfactionRatings: number;
  ticketsByCategory: Array<{
    _id: string;
    count: number;
  }>;
  ticketsByPriority: Array<{
    _id: string;
    count: number;
  }>;
  recentActivity: Array<{
    type: 'ticket_created' | 'ticket_updated' | 'reply_added';
    ticketId: string;
    ticketNumber: string;
    message: string;
    timestamp: string;
  }>;
}

const AdminSupportDashboard: React.FC = () => {
  const { data: session } = useSession();
  const [stats, setStats] = useState<SupportStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedTimeRange, setSelectedTimeRange] = useState('7'); // días

  useEffect(() => {
    if (session?.user?.role === 'admin') {
      fetchStats();
    }
  }, [session, selectedTimeRange]);

  const fetchStats = async () => {
    try {
      setLoading(true);
      setError('');

      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(endDate.getDate() - parseInt(selectedTimeRange));

      const params = new URLSearchParams({
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString()
      });

      const response = await fetch(`/api/support/tickets/stats?${params}`);
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Error al cargar estadísticas');
      }

      setStats(result.data);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar estadísticas');
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (hours: number) => {
    if (hours < 24) {
      return `${Math.round(hours)} horas`;
    }
    const days = Math.round(hours / 24);
    return `${days} días`;
  };

  const categoryLabels: Record<string, string> = {
    technical: 'Técnico',
    billing: 'Facturación',
    product: 'Producto',
    account: 'Cuenta',
    general: 'General'
  };

  const priorityLabels: Record<string, string> = {
    low: 'Baja',
    medium: 'Media',
    high: 'Alta',
    urgent: 'Urgente'
  };

  const priorityColors: Record<string, string> = {
    low: 'bg-green-100 text-green-800',
    medium: 'bg-yellow-100 text-yellow-800',
    high: 'bg-orange-100 text-orange-800',
    urgent: 'bg-red-100 text-red-800'
  };

  if (session?.user?.role !== 'admin') {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-md">
        <p className="text-red-600">No tienes permisos para acceder a esta sección</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard de Soporte</h1>
        <div className="flex items-center space-x-2">
          <label htmlFor="timeRange" className="text-sm text-gray-600">
            Período:
          </label>
          <select
            id="timeRange"
            value={selectedTimeRange}
            onChange={(e) => setSelectedTimeRange(e.target.value)}
            className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="7">Últimos 7 días</option>
            <option value="30">Últimos 30 días</option>
            <option value="90">Últimos 90 días</option>
            <option value="365">Último año</option>
          </select>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-md">
          <p className="text-red-600 text-sm">{error}</p>
        </div>
      )}

      {stats && (
        <>
          {/* Métricas principales */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <div className="flex items-center">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-600">Total de Tickets</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.totalTickets}</p>
                </div>
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <svg className="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <div className="flex items-center">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-600">Tickets Abiertos</p>
                  <p className="text-2xl font-bold text-blue-600">{stats.openTickets}</p>
                </div>
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <svg className="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <div className="flex items-center">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-600">Tiempo Promedio</p>
                  <p className="text-2xl font-bold text-green-600">
                    {stats.avgResolutionTime ? formatDuration(stats.avgResolutionTime) : 'N/A'}
                  </p>
                </div>
                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                  <svg className="w-4 h-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <div className="flex items-center">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-600">Satisfacción</p>
                  <p className="text-2xl font-bold text-yellow-600">
                    {stats.avgSatisfactionRating ? `${stats.avgSatisfactionRating.toFixed(1)}/5` : 'N/A'}
                  </p>
                  {stats.totalSatisfactionRatings > 0 && (
                    <p className="text-xs text-gray-500">
                      {stats.totalSatisfactionRatings} evaluaciones
                    </p>
                  )}
                </div>
                <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center">
                  <svg className="w-4 h-4 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                  </svg>
                </div>
              </div>
            </div>
          </div>

          {/* Distribución por estado */}
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Estado de Tickets</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{stats.openTickets}</div>
                <div className="text-sm text-gray-600">Abiertos</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-600">{stats.inProgressTickets}</div>
                <div className="text-sm text-gray-600">En Progreso</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{stats.resolvedTickets}</div>
                <div className="text-sm text-gray-600">Resueltos</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-600">{stats.closedTickets}</div>
                <div className="text-sm text-gray-600">Cerrados</div>
              </div>
            </div>
          </div>

          {/* Distribución por categoría y prioridad */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Tickets por Categoría</h2>
              <div className="space-y-3">
                {stats.ticketsByCategory.map((item) => (
                  <div key={item._id} className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">
                      {categoryLabels[item._id] || item._id}
                    </span>
                    <span className="text-sm font-medium text-gray-900">
                      {item.count}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Tickets por Prioridad</h2>
              <div className="space-y-3">
                {stats.ticketsByPriority.map((item) => (
                  <div key={item._id} className="flex justify-between items-center">
                    <span className={`text-sm px-2 py-1 rounded-full ${priorityColors[item._id] || 'bg-gray-100 text-gray-800'}`}>
                      {priorityLabels[item._id] || item._id}
                    </span>
                    <span className="text-sm font-medium text-gray-900">
                      {item.count}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Actividad reciente */}
          {stats.recentActivity && stats.recentActivity.length > 0 && (
            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Actividad Reciente</h2>
              <div className="space-y-3">
                {stats.recentActivity.slice(0, 10).map((activity, index) => (
                  <div key={index} className="flex items-center space-x-3 text-sm">
                    <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                    <span className="text-gray-600">
                      {new Date(activity.timestamp).toLocaleString('es-ES')}
                    </span>
                    <span className="text-gray-900">
                      #{activity.ticketNumber} - {activity.message}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Lista de tickets para administración */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Todos los Tickets</h2>
        <SupportTicketList adminView={true} showFilters={true} />
      </div>
    </div>
  );
};

export default AdminSupportDashboard;
