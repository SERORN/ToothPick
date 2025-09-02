'use client';

import { useState, useEffect } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { 
  Flag, 
  Eye, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Filter,
  Search,
  AlertTriangle,
  User,
  MessageSquare,
  TrendingUp,
  BarChart3
} from 'lucide-react';
import { StarDisplay } from './StarRating';

interface ReviewReport {
  _id: string;
  reviewId: {
    _id: string;
    user: {
      name: string;
      email: string;
    };
    rating: number;
    title: string;
    content: string;
    targetType: string;
    targetId: string;
    createdAt: string;
  };
  reportedBy: {
    _id: string;
    name: string;
    email: string;
  };
  reason: string;
  additionalComments?: string;
  status: 'pending' | 'reviewed' | 'resolved';
  resolution?: 'dismissed' | 'review_removed' | 'review_edited' | 'user_warned';
  resolvedBy?: {
    name: string;
  };
  resolvedAt?: string;
  createdAt: string;
}

interface ReportStats {
  totalReports: number;
  pendingReports: number;
  resolvedReports: number;
  dismissedReports: number;
  topReasons: Array<{ reason: string; count: number }>;
}

interface ReviewAdminPanelProps {
  className?: string;
}

export default function ReviewAdminPanel({ className = '' }: ReviewAdminPanelProps) {
  const [reports, setReports] = useState<ReviewReport[]>([]);
  const [stats, setStats] = useState<ReportStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<string>('pending');
  const [searchTerm, setSearchTerm] = useState('');
  const [processingReports, setProcessingReports] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchReports();
    fetchStats();
  }, [selectedStatus, searchTerm]);

  const fetchReports = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        ...(selectedStatus !== 'all' && { status: selectedStatus }),
        ...(searchTerm && { search: searchTerm })
      });

      const response = await fetch(`/api/reviews/reports?${params}`);
      if (!response.ok) {
        throw new Error('Error al cargar los reportes');
      }

      const data = await response.json();
      setReports(data.reports || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/reviews/reports/stats');
      if (!response.ok) {
        throw new Error('Error al cargar estadísticas');
      }

      const data = await response.json();
      setStats(data);
    } catch (err) {
      console.error('Error fetching stats:', err);
    }
  };

  const handleResolveReport = async (reportId: string, resolution: string, notes?: string) => {
    if (processingReports.has(reportId)) return;

    setProcessingReports(prev => new Set(prev).add(reportId));

    try {
      const response = await fetch(`/api/reviews/reports/${reportId}/resolve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ resolution, notes }),
      });

      if (!response.ok) {
        throw new Error('Error al resolver el reporte');
      }

      // Actualizar la lista de reportes
      await fetchReports();
      await fetchStats();
    } catch (err) {
      console.error('Error resolving report:', err);
      alert('Error al resolver el reporte. Inténtalo de nuevo.');
    } finally {
      setProcessingReports(prev => {
        const newSet = new Set(prev);
        newSet.delete(reportId);
        return newSet;
      });
    }
  };

  const getReasonLabel = (reason: string) => {
    const reasons: Record<string, string> = {
      spam: 'Spam',
      inappropriate: 'Contenido inapropiado',
      fake: 'Reseña falsa',
      irrelevant: 'No relacionado',
      harassment: 'Acoso',
      other: 'Otro'
    };
    return reasons[reason] || reason;
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
      pending: {
        label: 'Pendiente',
        color: 'bg-yellow-100 text-yellow-800',
        icon: <Clock className="w-3 h-3" />
      },
      reviewed: {
        label: 'Revisado',
        color: 'bg-blue-100 text-blue-800',
        icon: <Eye className="w-3 h-3" />
      },
      resolved: {
        label: 'Resuelto',
        color: 'bg-green-100 text-green-800',
        icon: <CheckCircle className="w-3 h-3" />
      }
    };

    const badge = badges[status];
    return (
      <span className={`inline-flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium ${badge.color}`}>
        {badge.icon}
        <span>{badge.label}</span>
      </span>
    );
  };

  const getResolutionBadge = (resolution?: string) => {
    if (!resolution) return null;

    const badges: Record<string, { label: string; color: string }> = {
      dismissed: { label: 'Descartado', color: 'bg-gray-100 text-gray-800' },
      review_removed: { label: 'Reseña eliminada', color: 'bg-red-100 text-red-800' },
      review_edited: { label: 'Reseña editada', color: 'bg-blue-100 text-blue-800' },
      user_warned: { label: 'Usuario advertido', color: 'bg-orange-100 text-orange-800' }
    };

    const badge = badges[resolution];
    return (
      <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${badge.color}`}>
        {badge.label}
      </span>
    );
  };

  const StatsCard = ({ title, value, icon, color }: { 
    title: string; 
    value: number; 
    icon: React.ReactNode; 
    color: string;
  }) => (
    <div className="bg-white p-6 rounded-lg border border-gray-200">
      <div className="flex items-center">
        <div className={`p-2 rounded-lg ${color}`}>
          {icon}
        </div>
        <div className="ml-4">
          <p className="text-sm text-gray-600">{title}</p>
          <p className="text-2xl font-semibold text-gray-900">{value}</p>
        </div>
      </div>
    </div>
  );

  const ReportCard = ({ report }: { report: ReviewReport }) => (
    <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center space-x-3">
          <Flag className="w-5 h-5 text-red-500 flex-shrink-0" />
          <div>
            <div className="flex items-center space-x-2">
              {getStatusBadge(report.status)}
              {getResolutionBadge(report.resolution)}
            </div>
            <p className="text-sm text-gray-600 mt-1">
              Reportado {formatDistanceToNow(new Date(report.createdAt), { 
                addSuffix: true, 
                locale: es 
              })}
            </p>
          </div>
        </div>
        <div className="text-right text-sm text-gray-500">
          ID: {report._id.slice(-8)}
        </div>
      </div>

      {/* Report Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <h4 className="font-medium text-gray-900 mb-2">Motivo del reporte</h4>
          <p className="text-sm text-gray-700">{getReasonLabel(report.reason)}</p>
          {report.additionalComments && (
            <p className="text-sm text-gray-600 mt-1 italic">
              "{report.additionalComments}"
            </p>
          )}
        </div>
        <div>
          <h4 className="font-medium text-gray-900 mb-2">Reportado por</h4>
          <div className="flex items-center space-x-2 text-sm">
            <User className="w-4 h-4 text-gray-400" />
            <span>{report.reportedBy.name}</span>
            <span className="text-gray-500">({report.reportedBy.email})</span>
          </div>
        </div>
      </div>

      {/* Review Content */}
      <div className="bg-gray-50 rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-medium text-gray-900">Reseña reportada</h4>
          <StarDisplay rating={report.reviewId.rating} size="sm" showValue={false} />
        </div>
        
        <div className="space-y-2">
          <h5 className="font-medium text-gray-800">{report.reviewId.title}</h5>
          <p className="text-sm text-gray-700 leading-relaxed">
            {report.reviewId.content}
          </p>
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>Por: {report.reviewId.user.name}</span>
            <span>
              {formatDistanceToNow(new Date(report.reviewId.createdAt), { 
                addSuffix: true, 
                locale: es 
              })}
            </span>
          </div>
        </div>
      </div>

      {/* Resolution Details */}
      {report.status === 'resolved' && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center space-x-2 mb-2">
            <CheckCircle className="w-4 h-4 text-green-600" />
            <span className="font-medium text-green-800">Resuelto</span>
          </div>
          <p className="text-sm text-green-700">
            Resuelto por {report.resolvedBy?.name} el{' '}
            {report.resolvedAt && formatDistanceToNow(new Date(report.resolvedAt), { 
              addSuffix: true, 
              locale: es 
            })}
          </p>
        </div>
      )}

      {/* Actions */}
      {report.status === 'pending' && (
        <div className="flex flex-wrap gap-2 pt-4 border-t border-gray-100">
          <button
            onClick={() => handleResolveReport(report._id, 'dismissed')}
            disabled={processingReports.has(report._id)}
            className="px-3 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 text-sm disabled:opacity-50"
          >
            Descartar
          </button>
          <button
            onClick={() => handleResolveReport(report._id, 'user_warned')}
            disabled={processingReports.has(report._id)}
            className="px-3 py-1 bg-orange-100 text-orange-700 rounded hover:bg-orange-200 text-sm disabled:opacity-50"
          >
            Advertir usuario
          </button>
          <button
            onClick={() => handleResolveReport(report._id, 'review_edited')}
            disabled={processingReports.has(report._id)}
            className="px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 text-sm disabled:opacity-50"
          >
            Editar reseña
          </button>
          <button
            onClick={() => handleResolveReport(report._id, 'review_removed')}
            disabled={processingReports.has(report._id)}
            className="px-3 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200 text-sm disabled:opacity-50"
          >
            Eliminar reseña
          </button>
        </div>
      )}
    </div>
  );

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">
          Panel de Administración - Reportes de Reseñas
        </h1>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <StatsCard
            title="Total Reportes"
            value={stats.totalReports}
            icon={<Flag className="w-5 h-5 text-white" />}
            color="bg-blue-500"
          />
          <StatsCard
            title="Pendientes"
            value={stats.pendingReports}
            icon={<Clock className="w-5 h-5 text-white" />}
            color="bg-yellow-500"
          />
          <StatsCard
            title="Resueltos"
            value={stats.resolvedReports}
            icon={<CheckCircle className="w-5 h-5 text-white" />}
            color="bg-green-500"
          />
          <StatsCard
            title="Descartados"
            value={stats.dismissedReports}
            icon={<XCircle className="w-5 h-5 text-white" />}
            color="bg-gray-500"
          />
        </div>
      )}

      {/* Filters */}
      <div className="bg-white p-4 border border-gray-200 rounded-lg">
        <div className="flex flex-col md:flex-row md:items-center space-y-4 md:space-y-0 md:space-x-4">
          <div className="flex items-center space-x-2">
            <Filter className="w-4 h-4 text-gray-500" />
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="pending">Pendientes</option>
              <option value="reviewed">Revisados</option>
              <option value="resolved">Resueltos</option>
              <option value="all">Todos</option>
            </select>
          </div>
          
          <div className="flex-1 relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar por ID, usuario o contenido..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Reports List */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white p-6 border border-gray-200 rounded-lg">
              <div className="animate-pulse space-y-4">
                <div className="flex justify-between">
                  <div className="flex space-x-3">
                    <div className="w-5 h-5 bg-gray-300 rounded"></div>
                    <div className="h-4 bg-gray-300 rounded w-32"></div>
                  </div>
                  <div className="h-4 bg-gray-300 rounded w-16"></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="h-4 bg-gray-300 rounded"></div>
                  <div className="h-4 bg-gray-300 rounded"></div>
                </div>
                <div className="h-20 bg-gray-300 rounded"></div>
              </div>
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="text-center py-8">
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Error</h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={fetchReports}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Reintentar
          </button>
        </div>
      ) : reports.length === 0 ? (
        <div className="text-center py-8">
          <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No hay reportes
          </h3>
          <p className="text-gray-600">
            No se encontraron reportes con los filtros seleccionados.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {reports.map((report) => (
            <ReportCard key={report._id} report={report} />
          ))}
        </div>
      )}
    </div>
  );
}
