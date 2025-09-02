// 🏢 FASE 28.1: Dashboard Administrativo de Facturación
// ✅ /admin/invoices - Panel avanzado para administradores y dentistas

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  FileText, 
  TrendingUp, 
  AlertCircle, 
  Users, 
  Download,
  Calendar,
  DollarSign,
  RefreshCw,
  Filter,
  Search,
  MoreVertical,
  Eye,
  Send,
  X,
  CheckCircle,
  Clock,
  Building,
  Globe,
  BarChart3
} from 'lucide-react';
import { useInvoices } from '@/lib/hooks/useInvoices';
import { formatCurrency, formatInvoiceDate, getStatusConfig, getTimeAgo } from '@/lib/utils/invoiceUtils';
import InvoiceFilters from '@/components/billing/InvoiceFilters';
import InvoiceTable from '@/components/billing/InvoiceTable';
import DownloadInvoiceButton from '@/components/billing/DownloadInvoiceButton';
import Link from 'next/link';

interface StatCard {
  title: string;
  value: string | number;
  change?: string;
  changeType?: 'positive' | 'negative' | 'neutral';
  icon: any;
  color: string;
  onClick?: () => void;
}

interface AdminStats {
  totalFacturas: number;
  importeTotal: number;
  facturasEnviadas: number;
  facturasPendientes: number;
  facturasError: number;
  organizacionesActivas: number;
  crecimientoFacturas: number;
  crecimientoImporte: number;
  nuevasOrganizaciones: number;
  distribucionEstados: Array<{
    estado: string;
    cantidad: number;
    porcentaje: number;
  }>;
  tiempoPromedioMinutos: number;
  tasaExitoEnvio: number;
  facturasInternacionales: number;
  porcentajeInternacionales: number;
  topOrganizaciones: Array<{
    id: string;
    nombre: string;
    tipo: string;
    totalFacturas: number;
    totalImporte: number;
  }>;
  colaProcesamientoPendientes: number;
  facturasConErrores: Array<{
    id: string;
    folioCompleto: string;
    organizacion: { nombre: string };
    fechaEmision: string;
    ultimoError: string;
    fechaUltimoIntento: string;
  }>;
  facturasPorHora: number;
  tiempoRespuestaAPI: number;
  uptimePercentage: number;
  almacenamientoUsado: number;
  organizaciones: Array<{
    id: string;
    nombre: string;
  }>;
}

export default function AdminInvoicesDashboard() {
  const router = useRouter();
  const [activeView, setActiveView] = useState<'overview' | 'analytics' | 'monitoring'>('overview');
  const [selectedPeriod, setSelectedPeriod] = useState<'today' | 'week' | 'month' | 'quarter'>('month');
  const [selectedOrg, setSelectedOrg] = useState<string>('all');
  const [adminStats, setAdminStats] = useState<AdminStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);

  const {
    facturas,
    pagination,
    stats,
    filters,
    loading,
    error,
    refreshInvoices,
    applyFilters,
    goToPage,
    canManageInvoices
  } = useInvoices();

  // 🔄 Mock permissions for admin
  const permissions = {
    canDownload: true,
    canResend: canManageInvoices,
    canCancel: canManageInvoices,
    canViewLogs: true,
    isSuperAdmin: true
  };

  // 📊 Mock stats refresh
  const refreshStats = async () => {
    setStatsLoading(true);
    // Simulate API call
    setTimeout(() => {
      setAdminStats({
        totalFacturas: stats.total,
        importeTotal: stats.totalImporte,
        facturasEnviadas: Math.floor(stats.total * 0.7),
        facturasPendientes: Math.floor(stats.total * 0.2),
        facturasError: Math.floor(stats.total * 0.1),
        organizacionesActivas: 5,
        crecimientoFacturas: 15.2,
        crecimientoImporte: 23.8,
        nuevasOrganizaciones: 2,
        distribucionEstados: [
          { estado: 'enviada', cantidad: Math.floor(stats.total * 0.7), porcentaje: 70 },
          { estado: 'pendiente', cantidad: Math.floor(stats.total * 0.2), porcentaje: 20 },
          { estado: 'error', cantidad: Math.floor(stats.total * 0.1), porcentaje: 10 }
        ],
        tiempoPromedioMinutos: 5,
        tasaExitoEnvio: 95.5,
        facturasInternacionales: 12,
        porcentajeInternacionales: 8.5,
        topOrganizaciones: [],
        colaProcesamientoPendientes: 3,
        facturasConErrores: [],
        facturasPorHora: 45,
        tiempoRespuestaAPI: 250,
        uptimePercentage: 99.9,
        almacenamientoUsado: 2.3,
        organizaciones: [
          { id: '1', nombre: 'Clínica Dental Norte' },
          { id: '2', nombre: 'Centro Odontológico Sur' }
        ]
      });
      setStatsLoading(false);
    }, 1000);
  };

  // 📊 Configuración de tarjetas estadísticas
  const statCards: StatCard[] = [
    {
      title: 'Total Facturas',
      value: adminStats?.totalFacturas || stats.total,
      change: `+${adminStats?.crecimientoFacturas || 0}% vs período anterior`,
      changeType: (adminStats?.crecimientoFacturas || 0) >= 0 ? 'positive' : 'negative',
      icon: FileText,
      color: 'bg-blue-500',
      onClick: () => setFilters({ ...filters, status: '' })
    },
    {
      title: 'Importe Total',
      value: formatCurrency(adminStats?.importeTotal || stats.totalImporte, 'MXN'),
      change: `+${adminStats?.crecimientoImporte || 0}% vs período anterior`,
      changeType: (adminStats?.crecimientoImporte || 0) >= 0 ? 'positive' : 'negative',
      icon: DollarSign,
      color: 'bg-green-500'
    },
    {
      title: 'Facturas Enviadas',
      value: adminStats?.facturasEnviadas || Math.floor(stats.total * 0.7),
      change: `${((adminStats?.facturasEnviadas || Math.floor(stats.total * 0.7)) / (adminStats?.totalFacturas || stats.total) * 100).toFixed(1)}% del total`,
      changeType: 'neutral',
      icon: Send,
      color: 'bg-purple-500',
      onClick: () => setFilters({ ...filters, status: 'enviada' })
    },
    {
      title: 'Facturas Pendientes',
      value: adminStats?.facturasPendientes || Math.floor(stats.total * 0.2),
      change: (adminStats?.facturasPendientes || Math.floor(stats.total * 0.2)) > 0 ? 'Requieren atención' : 'Todo al día',
      changeType: (adminStats?.facturasPendientes || Math.floor(stats.total * 0.2)) > 0 ? 'negative' : 'positive',
      icon: Clock,
      color: 'bg-orange-500',
      onClick: () => setFilters({ ...filters, status: 'pendiente' })
    },
    {
      title: 'Con Errores',
      value: adminStats?.facturasError || Math.floor(stats.total * 0.1),
      change: (adminStats?.facturasError || Math.floor(stats.total * 0.1)) > 0 ? 'Necesitan revisión' : 'Sin errores',
      changeType: (adminStats?.facturasError || Math.floor(stats.total * 0.1)) > 0 ? 'negative' : 'positive',
      icon: AlertCircle,
      color: 'bg-red-500',
      onClick: () => setFilters({ ...filters, status: 'error' })
    },
    {
      title: 'Organizaciones Activas',
      value: adminStats?.organizacionesActivas || 5,
      change: `${adminStats?.nuevasOrganizaciones || 0} nuevas este período`,
      changeType: 'neutral',
      icon: Building,
      color: 'bg-indigo-500'
    }
  ];

  // 🔄 Refresh handler
  const handleRefresh = () => {
    refresh();
    refreshStats();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Dashboard de Facturación
              </h1>
              <p className="text-sm text-gray-500">
                Panel administrativo y analíticas avanzadas
              </p>
            </div>

            <div className="flex items-center gap-3">
              {/* Selector de período */}
              <select
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value as any)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="today">Hoy</option>
                <option value="week">Esta semana</option>
                <option value="month">Este mes</option>
                <option value="quarter">Este trimestre</option>
              </select>

              {/* Selector de organización (solo para superadmin) */}
              {permissions.isSuperAdmin && (
                <select
                  value={selectedOrg}
                  onChange={(e) => setSelectedOrg(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="all">Todas las organizaciones</option>
                  {stats?.organizaciones?.map((org: any) => (
                    <option key={org.id} value={org.id}>
                      {org.nombre}
                    </option>
                  ))}
                </select>
              )}

              {/* Botón de refresh */}
              <button
                onClick={handleRefresh}
                disabled={loading || statsLoading}
                className="p-2 text-gray-400 hover:text-gray-600 disabled:opacity-50"
              >
                <RefreshCw className={`w-5 h-5 ${(loading || statsLoading) ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Tabs de vista */}
        <div className="mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveView('overview')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeView === 'overview'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <FileText className="w-4 h-4 inline-block mr-2" />
                Vista General
              </button>
              <button
                onClick={() => setActiveView('analytics')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeView === 'analytics'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <BarChart3 className="w-4 h-4 inline-block mr-2" />
                Analíticas
              </button>
              <button
                onClick={() => setActiveView('monitoring')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeView === 'monitoring'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <AlertCircle className="w-4 h-4 inline-block mr-2" />
                Monitoreo
              </button>
            </nav>
          </div>
        </div>

        {/* Vista General */}
        {activeView === 'overview' && (
          <div className="space-y-6">
            {/* Tarjetas de estadísticas */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {statCards.map((card, index) => (
                <div
                  key={index}
                  className={`bg-white rounded-lg shadow-sm border border-gray-200 p-6 ${
                    card.onClick ? 'cursor-pointer hover:shadow-md transition-shadow' : ''
                  }`}
                  onClick={card.onClick}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">{card.title}</p>
                      <p className="text-2xl font-bold text-gray-900">{card.value}</p>
                      {card.change && (
                        <p className={`text-sm ${
                          card.changeType === 'positive' ? 'text-green-600' :
                          card.changeType === 'negative' ? 'text-red-600' :
                          'text-gray-500'
                        }`}>
                          {card.change}
                        </p>
                      )}
                    </div>
                    <div className={`p-3 rounded-full ${card.color}`}>
                      <card.icon className="w-6 h-6 text-white" />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Filtros */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <InvoiceFilters
                filters={filters}
                onChange={updateFilters}
                showAdvanced={true}
                showOrgFilter={permissions.isSuperAdmin}
              />
            </div>

            {/* Tabla de facturas */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900">
                  Facturas ({facturas.length})
                </h3>
                
                {facturas.length > 0 && (
                  <div className="flex gap-2">
                    <button className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm">
                      <Download className="w-4 h-4" />
                      Exportar
                    </button>
                  </div>
                )}
              </div>

              <InvoiceTable
                facturas={facturas}
                permissions={permissions}
                loading={loading}
                onRefresh={refreshFacturas}
                showAdvancedActions={true}
              />

              {/* Paginación */}
              {totalPages > 1 && (
                <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                  <div className="text-sm text-gray-700">
                    Página {currentPage} de {totalPages}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                      disabled={currentPage === 1}
                      className="px-3 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Anterior
                    </button>
                    <button
                      onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                      disabled={currentPage === totalPages}
                      className="px-3 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Siguiente
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Vista de Analíticas */}
        {activeView === 'analytics' && (
          <div className="space-y-6">
            {/* Gráficos de tendencias */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* Facturas por día */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  Facturas por día
                </h3>
                <div className="h-64 flex items-center justify-center text-gray-500">
                  <div className="text-center">
                    <BarChart3 className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                    <p>Gráfico de tendencias</p>
                    <p className="text-sm">(Integración con Chart.js pendiente)</p>
                  </div>
                </div>
              </div>

              {/* Distribución por estado */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  Distribución por estado
                </h3>
                <div className="space-y-3">
                  {stats?.distribucionEstados?.map((item: any) => (
                    <div key={item.estado} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${getStatusConfig(item.estado).color.replace('text-', 'bg-').replace('bg-', 'bg-').split(' ')[0]}`}></div>
                        <span className="text-sm text-gray-700">{getStatusConfig(item.estado).label}</span>
                      </div>
                      <div className="text-sm font-medium text-gray-900">
                        {item.cantidad} ({item.porcentaje.toFixed(1)}%)
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Métricas avanzadas */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h4 className="text-sm font-medium text-gray-600 mb-2">Tiempo promedio de procesamiento</h4>
                <p className="text-2xl font-bold text-gray-900">{stats?.tiempoPromedioMinutos || 0} min</p>
                <p className="text-sm text-gray-500">Desde creación hasta envío</p>
              </div>

              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h4 className="text-sm font-medium text-gray-600 mb-2">Tasa de éxito de envío</h4>
                <p className="text-2xl font-bold text-gray-900">{stats?.tasaExitoEnvio || 0}%</p>
                <p className="text-sm text-gray-500">Facturas enviadas exitosamente</p>
              </div>

              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h4 className="text-sm font-medium text-gray-600 mb-2">Facturas internacionales</h4>
                <p className="text-2xl font-bold text-gray-900">{stats?.facturasInternacionales || 0}</p>
                <p className="text-sm text-gray-500">{stats?.porcentajeInternacionales || 0}% del total</p>
              </div>
            </div>

            {/* Top organizaciones */}
            {permissions.isSuperAdmin && stats?.topOrganizaciones && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  Top organizaciones por volumen
                </h3>
                <div className="space-y-3">
                  {stats.topOrganizaciones.map((org: any, index: number) => (
                    <div key={org.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <span className="flex items-center justify-center w-8 h-8 bg-blue-100 text-blue-600 rounded-full text-sm font-medium">
                          {index + 1}
                        </span>
                        <div>
                          <p className="font-medium text-gray-900">{org.nombre}</p>
                          <p className="text-sm text-gray-500">{org.tipo}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-gray-900">{org.totalFacturas}</p>
                        <p className="text-sm text-gray-500">{formatCurrency(org.totalImporte, 'MXN')}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Vista de Monitoreo */}
        {activeView === 'monitoring' && (
          <div className="space-y-6">
            {/* Alertas del sistema */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Estado del sistema
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <span className="font-medium text-green-800">API Facturama</span>
                  </div>
                  <p className="text-sm text-green-600 mt-1">Operativo</p>
                </div>

                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <span className="font-medium text-green-800">Base de datos</span>
                  </div>
                  <p className="text-sm text-green-600 mt-1">Operativo</p>
                </div>

                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <span className="font-medium text-green-800">Envío de emails</span>
                  </div>
                  <p className="text-sm text-green-600 mt-1">Operativo</p>
                </div>

                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Clock className="w-5 h-5 text-yellow-600" />
                    <span className="font-medium text-yellow-800">Cola de procesamiento</span>
                  </div>
                  <p className="text-sm text-yellow-600 mt-1">{stats?.colaProcesamientoPendientes || 0} pendientes</p>
                </div>
              </div>
            </div>

            {/* Facturas con errores */}
            {stats?.facturasConErrores && stats.facturasConErrores.length > 0 && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h3 className="text-lg font-medium text-gray-900 flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 text-red-500" />
                    Facturas con errores ({stats.facturasConErrores.length})
                  </h3>
                </div>
                
                <div className="divide-y divide-gray-200">
                  {stats.facturasConErrores.map((factura: any) => (
                    <div key={factura.id} className="px-6 py-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <Link
                            href={`/invoice/${factura.id}`}
                            className="font-medium text-blue-600 hover:text-blue-800"
                          >
                            {factura.folioCompleto}
                          </Link>
                          <p className="text-sm text-gray-500">
                            {factura.organizacion?.nombre} • {formatInvoiceDate(factura.fechaEmision)}
                          </p>
                          <p className="text-sm text-red-600 mt-1">
                            {factura.ultimoError}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-gray-500">
                            {getTimeAgo(factura.fechaUltimoIntento)}
                          </span>
                          <Link
                            href={`/invoice/${factura.id}`}
                            className="p-2 text-gray-400 hover:text-gray-600"
                          >
                            <Eye className="w-4 h-4" />
                          </Link>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Métricas de rendimiento */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h4 className="text-sm font-medium text-gray-600 mb-2">Facturas/hora (promedio)</h4>
                <p className="text-2xl font-bold text-gray-900">{stats?.facturasPorHora || 0}</p>
              </div>

              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h4 className="text-sm font-medium text-gray-600 mb-2">Tiempo respuesta API</h4>
                <p className="text-2xl font-bold text-gray-900">{stats?.tiempoRespuestaAPI || 0}ms</p>
              </div>

              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h4 className="text-sm font-medium text-gray-600 mb-2">Uptime del sistema</h4>
                <p className="text-2xl font-bold text-green-600">{stats?.uptimePercentage || 99.9}%</p>
              </div>

              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h4 className="text-sm font-medium text-gray-600 mb-2">Uso de almacenamiento</h4>
                <p className="text-2xl font-bold text-gray-900">{stats?.almacenamientoUsado || 0}GB</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
