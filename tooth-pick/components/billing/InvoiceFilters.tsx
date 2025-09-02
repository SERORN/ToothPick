// 🔍 FASE 28.1: Componente de Filtros para Facturas
// ✅ InvoiceFilters - Filtros dinámicos y responsive

'use client';

import { useState, useEffect } from 'react';
import { Search, Filter, X, Calendar, DollarSign, FileText, User } from 'lucide-react';
import { InvoiceFilters } from '@/lib/hooks/useInvoices';
import { CURRENCY_SYMBOLS, INVOICE_STATUS_CONFIG, INVOICE_TYPE_CONFIG } from '@/lib/utils/invoiceUtils';

interface InvoiceFiltersProps {
  filters: InvoiceFilters;
  onFiltersChange: (filters: InvoiceFilters) => void;
  onClearFilters: () => void;
  onSearch: (searchText: string) => void;
  loading?: boolean;
  userRole?: string;
}

export default function InvoiceFiltersComponent({
  filters,
  onFiltersChange,
  onClearFilters,
  onSearch,
  loading = false,
  userRole = 'paciente'
}: InvoiceFiltersProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [localFilters, setLocalFilters] = useState<InvoiceFilters>(filters);

  // 🔄 Sincronizar filtros locales con props
  useEffect(() => {
    setLocalFilters(filters);
  }, [filters]);

  // 📝 Manejar cambio en filtros locales
  const handleFilterChange = (key: keyof InvoiceFilters, value: any) => {
    const newFilters = { ...localFilters, [key]: value };
    setLocalFilters(newFilters);
    onFiltersChange(newFilters);
  };

  // 🔍 Manejar búsqueda
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchText.trim()) {
      onSearch(searchText.trim());
    }
  };

  // 🧹 Limpiar filtros
  const handleClear = () => {
    setSearchText('');
    setLocalFilters({});
    onClearFilters();
  };

  // 📊 Contar filtros activos
  const activeFiltersCount = Object.keys(localFilters).filter(key => {
    const value = localFilters[key as keyof InvoiceFilters];
    return value !== undefined && value !== null && value !== '';
  }).length;

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
      {/* Barra de búsqueda principal */}
      <div className="p-4 border-b border-gray-200">
        <form onSubmit={handleSearch} className="flex gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              placeholder="Buscar por folio, RFC, UUID, o nombre..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={loading}
            />
          </div>
          
          <button
            type="submit"
            disabled={loading || !searchText.trim()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <Search className="w-4 h-4" />
            Buscar
          </button>

          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2 relative"
          >
            <Filter className="w-4 h-4" />
            Filtros
            {activeFiltersCount > 0 && (
              <span className="absolute -top-2 -right-2 bg-blue-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {activeFiltersCount}
              </span>
            )}
          </button>

          {activeFiltersCount > 0 && (
            <button
              type="button"
              onClick={handleClear}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-600 flex items-center gap-2"
            >
              <X className="w-4 h-4" />
              Limpiar
            </button>
          )}
        </form>
      </div>

      {/* Filtros expandidos */}
      {isExpanded && (
        <div className="p-4 bg-gray-50 border-t border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            
            {/* Filtro por Status */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <FileText className="w-4 h-4 inline mr-1" />
                Estado
              </label>
              <select
                value={localFilters.status as string || ''}
                onChange={(e) => handleFilterChange('status', e.target.value || undefined)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Todos los estados</option>
                {Object.entries(INVOICE_STATUS_CONFIG).map(([value, config]) => (
                  <option key={value} value={value}>
                    {config.icon} {config.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Filtro por Tipo */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <FileText className="w-4 h-4 inline mr-1" />
                Tipo
              </label>
              <select
                value={localFilters.tipo as string || ''}
                onChange={(e) => handleFilterChange('tipo', e.target.value || undefined)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Todos los tipos</option>
                {Object.entries(INVOICE_TYPE_CONFIG).map(([value, config]) => (
                  <option key={value} value={value}>
                    {config.flag} {config.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Filtro por Moneda */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <DollarSign className="w-4 h-4 inline mr-1" />
                Moneda
              </label>
              <select
                value={localFilters.moneda || ''}
                onChange={(e) => handleFilterChange('moneda', e.target.value || undefined)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Todas las monedas</option>
                {Object.entries(CURRENCY_SYMBOLS).map(([currency, symbol]) => (
                  <option key={currency} value={currency}>
                    {symbol} {currency}
                  </option>
                ))}
              </select>
            </div>

            {/* Filtro por Automática */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                🤖 Tipo de generación
              </label>
              <select
                value={localFilters.esAutomatica?.toString() || ''}
                onChange={(e) => handleFilterChange('esAutomatica', e.target.value === '' ? undefined : e.target.value === 'true')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Todas</option>
                <option value="true">Automáticas</option>
                <option value="false">Manuales</option>
              </select>
            </div>

            {/* Filtro por Fecha Desde */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Calendar className="w-4 h-4 inline mr-1" />
                Fecha desde
              </label>
              <input
                type="date"
                value={localFilters.fechaDesde || ''}
                onChange={(e) => handleFilterChange('fechaDesde', e.target.value || undefined)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Filtro por Fecha Hasta */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Calendar className="w-4 h-4 inline mr-1" />
                Fecha hasta
              </label>
              <input
                type="date"
                value={localFilters.fechaHasta || ''}
                onChange={(e) => handleFilterChange('fechaHasta', e.target.value || undefined)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Filtros administrativos */}
            {['admin', 'dentista'].includes(userRole) && (
              <>
                {/* Filtro por Paciente */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <User className="w-4 h-4 inline mr-1" />
                    ID Paciente
                  </label>
                  <input
                    type="text"
                    value={localFilters.pacienteId || ''}
                    onChange={(e) => handleFilterChange('pacienteId', e.target.value || undefined)}
                    placeholder="ID del paciente"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Filtro por Orden */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    📦 ID Orden
                  </label>
                  <input
                    type="text"
                    value={localFilters.ordenId || ''}
                    onChange={(e) => handleFilterChange('ordenId', e.target.value || undefined)}
                    placeholder="ID de la orden"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </>
            )}
          </div>

          {/* Filtros de ordenamiento */}
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  📋 Ordenar por
                </label>
                <select
                  value={localFilters.sortBy || 'fechaEmision'}
                  onChange={(e) => handleFilterChange('sortBy', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="fechaEmision">Fecha de emisión</option>
                  <option value="fechaTimbrado">Fecha de timbrado</option>
                  <option value="total">Total</option>
                  <option value="folio">Folio</option>
                  <option value="createdAt">Fecha de creación</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  🔄 Orden
                </label>
                <select
                  value={localFilters.sortOrder || 'desc'}
                  onChange={(e) => handleFilterChange('sortOrder', e.target.value as 'asc' | 'desc')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="desc">Más reciente primero</option>
                  <option value="asc">Más antiguo primero</option>
                </select>
              </div>
            </div>
          </div>

          {/* Límite de resultados */}
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  📊 Resultados por página
                </label>
                <select
                  value={localFilters.limit || 20}
                  onChange={(e) => handleFilterChange('limit', parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value={10}>10 por página</option>
                  <option value={20}>20 por página</option>
                  <option value={50}>50 por página</option>
                  <option value={100}>100 por página</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filtros activos (chips) */}
      {activeFiltersCount > 0 && (
        <div className="px-4 py-3 bg-blue-50 border-t border-blue-200">
          <div className="flex flex-wrap gap-2">
            <span className="text-sm text-blue-700 font-medium">Filtros activos:</span>
            
            {localFilters.status && (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                Estado: {INVOICE_STATUS_CONFIG[localFilters.status as keyof typeof INVOICE_STATUS_CONFIG]?.label}
                <button
                  onClick={() => handleFilterChange('status', undefined)}
                  className="text-blue-600 hover:text-blue-800"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {localFilters.tipo && (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                Tipo: {INVOICE_TYPE_CONFIG[localFilters.tipo as keyof typeof INVOICE_TYPE_CONFIG]?.label}
                <button
                  onClick={() => handleFilterChange('tipo', undefined)}
                  className="text-blue-600 hover:text-blue-800"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {localFilters.moneda && (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                Moneda: {localFilters.moneda}
                <button
                  onClick={() => handleFilterChange('moneda', undefined)}
                  className="text-blue-600 hover:text-blue-800"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {localFilters.fechaDesde && (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                Desde: {localFilters.fechaDesde}
                <button
                  onClick={() => handleFilterChange('fechaDesde', undefined)}
                  className="text-blue-600 hover:text-blue-800"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {localFilters.fechaHasta && (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                Hasta: {localFilters.fechaHasta}
                <button
                  onClick={() => handleFilterChange('fechaHasta', undefined)}
                  className="text-blue-600 hover:text-blue-800"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
