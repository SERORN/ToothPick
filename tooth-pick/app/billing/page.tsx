// 💳 FASE 28.1: Página Principal de Facturación
// ✅ /billing - Dashboard de facturas para usuarios

'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { 
  FileText, 
  Download, 
  DollarSign, 
  Calendar,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Clock,
  RefreshCw,
  Plus
} from 'lucide-react';
import { useInvoices } from '@/lib/hooks/useInvoices';
import { formatCurrency, calculateInvoiceSummary } from '@/lib/utils/invoiceUtils';
import InvoiceFilters from '@/components/billing/InvoiceFilters';
import InvoiceTable from '@/components/billing/InvoiceTable';
import Link from 'next/link';

export default function BillingPage() {
  const { data: session } = useSession();
  const {
    facturas,
    pagination,
    stats,
    filters,
    loading,
    error,
    loadInvoices,
    refreshInvoices,
    goToPage,
    applyFilters,
    clearFilters,
    searchByText,
    hasFacturas,
    isEmpty,
    userRole,
    canManageInvoices
  } = useInvoices({
    page: 1,
    limit: 20,
    sortBy: 'fechaEmision',
    sortOrder: 'desc'
  });

  // 📊 Calcular resumen local
  const localSummary = calculateInvoiceSummary(facturas);

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-4 text-lg font-medium text-gray-900">Acceso requerido</h3>
          <p className="text-gray-500">Debe iniciar sesión para ver sus facturas.</p>
          <Link href="/login" className="mt-4 inline-block bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
            Iniciar sesión
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <FileText className="h-8 w-8 text-blue-600" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Mis Facturas</h1>
                <p className="text-sm text-gray-500">
                  Gestiona y descarga tus comprobantes fiscales
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Refresh */}
              <button
                onClick={refreshInvoices}
                disabled={loading}
                className="p-2 text-gray-400 hover:text-gray-600 disabled:opacity-50"
                title="Actualizar"
              >
                <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
              </button>

              {/* Admin access */}
              {canManageInvoices && (
                <Link
                  href="/admin/invoices"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  <Plus className="w-4 h-4" />
                  Panel Admin
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Estadísticas rápidas */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          
          {/* Total de facturas */}
          <div className="bg-white rounded-lg p-6 border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Facturas</p>
                <p className="text-2xl font-bold text-gray-900">
                  {stats.total || localSummary.total}
                </p>
              </div>
              <div className="p-3 bg-blue-100 rounded-full">
                <FileText className="w-6 h-6 text-blue-600" />
              </div>
            </div>
            {localSummary.automaticas > 0 && (
              <p className="text-xs text-gray-500 mt-2">
                {localSummary.automaticas} automáticas
              </p>
            )}
          </div>

          {/* Total importe */}
          <div className="bg-white rounded-lg p-6 border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Facturado</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatCurrency(stats.totalImporte || localSummary.totalImporte, 'MXN', true, false)}
                </p>
              </div>
              <div className="p-3 bg-green-100 rounded-full">
                <DollarSign className="w-6 h-6 text-green-600" />
              </div>
            </div>
            {Object.keys(localSummary.porMoneda).length > 1 && (
              <p className="text-xs text-gray-500 mt-2">
                {Object.keys(localSummary.porMoneda).length} monedas
              </p>
            )}
          </div>

          {/* Facturas emitidas */}
          <div className="bg-white rounded-lg p-6 border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Emitidas</p>
                <p className="text-2xl font-bold text-green-600">
                  {(stats.statusCounts?.emitida || 0) + (stats.statusCounts?.enviada || 0) || 
                   (localSummary.porStatus.emitida || 0) + (localSummary.porStatus.enviada || 0)}
                </p>
              </div>
              <div className="p-3 bg-green-100 rounded-full">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
            </div>
            {localSummary.conEmail > 0 && (
              <p className="text-xs text-gray-500 mt-2">
                {localSummary.conEmail} enviadas por email
              </p>
            )}
          </div>

          {/* Facturas pendientes */}
          <div className="bg-white rounded-lg p-6 border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Borradores</p>
                <p className="text-2xl font-bold text-orange-600">
                  {stats.statusCounts?.borrador || localSummary.porStatus.borrador || 0}
                </p>
              </div>
              <div className="p-3 bg-orange-100 rounded-full">
                <Clock className="w-6 h-6 text-orange-600" />
              </div>
            </div>
            {(stats.statusCounts?.error || localSummary.porStatus.error) && (
              <p className="text-xs text-red-500 mt-2">
                {stats.statusCounts?.error || localSummary.porStatus.error} con errores
              </p>
            )}
          </div>
        </div>

        {/* Distribución por moneda */}
        {Object.keys(localSummary.porMoneda).length > 1 && (
          <div className="bg-white rounded-lg p-6 border border-gray-200 shadow-sm mb-8">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Distribución por Moneda
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-6 gap-4">
              {Object.entries(localSummary.porMoneda).map(([moneda, data]) => (
                <div key={moneda} className="text-center">
                  <div className="text-lg font-semibold text-gray-900">
                    {formatCurrency(data.total, moneda, true, true)}
                  </div>
                  <div className="text-sm text-gray-500">
                    {data.count} factura{data.count !== 1 ? 's' : ''}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Error state */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-8">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="text-sm font-medium text-red-800">Error al cargar facturas</h3>
                <p className="text-sm text-red-700 mt-1">{error}</p>
                <button
                  onClick={refreshInvoices}
                  className="mt-2 text-sm text-red-600 hover:text-red-800 underline"
                >
                  Intentar nuevamente
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Filtros */}
        <div className="mb-6">
          <InvoiceFilters
            filters={filters}
            onFiltersChange={applyFilters}
            onClearFilters={clearFilters}
            onSearch={searchByText}
            loading={loading}
            userRole={userRole}
          />
        </div>

        {/* Tabla de facturas */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
          {/* Header de la tabla */}
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900">
                Facturas
                {pagination.total > 0 && (
                  <span className="text-sm font-normal text-gray-500 ml-2">
                    ({pagination.total} total{pagination.total !== 1 ? 'es' : ''})
                  </span>
                )}
              </h3>

              {hasFacturas && (
                <div className="flex items-center gap-3 text-sm text-gray-500">
                  <span>
                    Página {pagination.page} de {pagination.pages}
                  </span>
                  {pagination.total > 0 && (
                    <span>
                      Mostrando {((pagination.page - 1) * pagination.limit) + 1} - {Math.min(pagination.page * pagination.limit, pagination.total)} de {pagination.total}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Tabla */}
          <InvoiceTable
            facturas={facturas}
            loading={loading}
            userRole={userRole}
            showPaciente={canManageInvoices}
            showUsuario={canManageInvoices}
            onRefresh={refreshInvoices}
          />

          {/* Paginación */}
          {pagination.pages > 1 && (
            <div className="px-6 py-4 border-t border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => goToPage(pagination.page - 1)}
                    disabled={!pagination.hasPrev || loading}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Anterior
                  </button>
                  
                  <span className="text-sm text-gray-700">
                    Página {pagination.page} de {pagination.pages}
                  </span>
                  
                  <button
                    onClick={() => goToPage(pagination.page + 1)}
                    disabled={!pagination.hasNext || loading}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Siguiente
                  </button>
                </div>

                {/* Navegación rápida */}
                <div className="hidden sm:flex items-center gap-1">
                  {Array.from({ length: Math.min(pagination.pages, 7) }, (_, i) => {
                    let page: number;
                    
                    if (pagination.pages <= 7) {
                      page = i + 1;
                    } else if (pagination.page <= 4) {
                      page = i + 1;
                    } else if (pagination.page >= pagination.pages - 3) {
                      page = pagination.pages - 6 + i;
                    } else {
                      page = pagination.page - 3 + i;
                    }

                    return (
                      <button
                        key={page}
                        onClick={() => goToPage(page)}
                        disabled={loading}
                        className={`px-3 py-2 text-sm rounded-lg disabled:cursor-not-allowed ${
                          page === pagination.page
                            ? 'bg-blue-600 text-white'
                            : 'text-gray-700 hover:bg-gray-100'
                        }`}
                      >
                        {page}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Empty state */}
        {isEmpty && (
          <div className="text-center py-12">
            <FileText className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-4 text-lg font-medium text-gray-900">
              No tienes facturas aún
            </h3>
            <p className="text-gray-500 mt-2">
              Las facturas aparecerán aquí cuando realices compras o se generen automáticamente.
            </p>
            {canManageInvoices && (
              <Link
                href="/admin/invoices"
                className="mt-4 inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
              >
                <Plus className="w-4 h-4" />
                Ir al panel administrativo
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
