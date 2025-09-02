// 🎯 FASE 30: Componente Geographic Analytics
// ✅ Análisis geográfico de ventas y distribución

'use client';

import React, { useState, useEffect } from 'react';
import { MapPin, Globe, TrendingUp, Users, DollarSign, BarChart3, Map, Navigation } from 'lucide-react';

interface GeographicData {
  country: string;
  countryCode: string;
  state?: string;
  city?: string;
  totalRevenue: number;
  orderCount: number;
  customerCount: number;
  averageOrderValue: number;
  marketShare: number;
  growth: number;
  coordinates?: {
    lat: number;
    lng: number;
  };
}

interface GeographicAnalyticsProps {
  organizationId: string;
  currency?: string;
  groupBy?: 'country' | 'state' | 'city';
  dateRange?: {
    startDate: string;
    endDate: string;
  };
}

export default function GeographicAnalytics({ 
  organizationId, 
  currency = 'USD',
  groupBy = 'country',
  dateRange 
}: GeographicAnalyticsProps) {
  const [geographicData, setGeographicData] = useState<GeographicData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'table' | 'cards' | 'map'>('cards');
  const [sortBy, setSortBy] = useState<'totalRevenue' | 'orderCount' | 'customerCount' | 'growth'>('totalRevenue');

  // Cargar datos geográficos
  const loadGeographicData = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        currency,
        groupBy,
        sortBy,
        ...(dateRange?.startDate && { startDate: dateRange.startDate }),
        ...(dateRange?.endDate && { endDate: dateRange.endDate })
      });

      const response = await fetch(`/api/analytics/geographic?${params}`, {
        headers: {
          'Authorization': 'Bearer mock-token'
        }
      });

      if (!response.ok) {
        throw new Error('Error cargando datos geográficos');
      }

      const data = await response.json();
      setGeographicData(data.data || []);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadGeographicData();
  }, [currency, groupBy, dateRange, sortBy]);

  // Formatear moneda
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  // Obtener bandera del país
  const getCountryFlag = (countryCode: string) => {
    return countryCode
      .split('')
      .map(char => String.fromCodePoint(127397 + char.charCodeAt(0)))
      .join('');
  };

  // Calcular métricas generales
  const totalRevenue = geographicData.reduce((sum, item) => sum + item.totalRevenue, 0);
  const totalOrders = geographicData.reduce((sum, item) => sum + item.orderCount, 0);
  const totalCustomers = geographicData.reduce((sum, item) => sum + item.customerCount, 0);
  const averageGrowth = geographicData.length > 0 
    ? geographicData.reduce((sum, item) => sum + item.growth, 0) / geographicData.length 
    : 0;

  // Top 5 mercados
  const topMarkets = [...geographicData]
    .sort((a, b) => b.totalRevenue - a.totalRevenue)
    .slice(0, 5);

  if (loading) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <div className="text-center">
          <p className="text-red-600">{error}</p>
          <button 
            onClick={loadGeographicData}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header con controles */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div>
            <h3 className="text-lg font-medium text-gray-900 flex items-center gap-2">
              <Globe className="w-5 h-5 text-blue-600" />
              Análisis Geográfico
            </h3>
            <p className="text-gray-600">Distribución de ventas por ubicación</p>
          </div>
          
          <div className="flex items-center gap-2">
            <select 
              value={groupBy} 
              onChange={(e) => loadGeographicData()}
              className="px-3 py-2 border border-gray-300 rounded text-sm"
            >
              <option value="country">Por País</option>
              <option value="state">Por Estado</option>
              <option value="city">Por Ciudad</option>
            </select>
            
            <select 
              value={sortBy} 
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-3 py-2 border border-gray-300 rounded text-sm"
            >
              <option value="totalRevenue">Por ingresos</option>
              <option value="orderCount">Por pedidos</option>
              <option value="customerCount">Por clientes</option>
              <option value="growth">Por crecimiento</option>
            </select>
          </div>
        </div>

        {/* Controles de vista */}
        <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
          {[
            { id: 'cards', label: 'Tarjetas', icon: BarChart3 },
            { id: 'table', label: 'Tabla', icon: Globe },
            { id: 'map', label: 'Mapa', icon: Map }
          ].map(view => {
            const Icon = view.icon;
            return (
              <button
                key={view.id}
                onClick={() => setViewMode(view.id as any)}
                className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  viewMode === view.id 
                    ? 'bg-white text-blue-600 shadow-sm' 
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Icon className="w-4 h-4" />
                {view.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Métricas generales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Ingresos Totales</p>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalRevenue)}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Pedidos</p>
              <p className="text-2xl font-bold text-gray-900">{totalOrders.toLocaleString()}</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
              <BarChart3 className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Clientes Únicos</p>
              <p className="text-2xl font-bold text-gray-900">{totalCustomers.toLocaleString()}</p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
              <Users className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Crecimiento Promedio</p>
              <p className="text-2xl font-bold text-gray-900">
                {averageGrowth > 0 ? '+' : ''}{averageGrowth.toFixed(1)}%
              </p>
            </div>
            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
              averageGrowth >= 0 ? 'bg-green-100' : 'bg-red-100'
            }`}>
              <TrendingUp className={`w-6 h-6 ${
                averageGrowth >= 0 ? 'text-green-600' : 'text-red-600'
              }`} />
            </div>
          </div>
        </div>
      </div>

      {/* Top 5 mercados */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <h4 className="text-lg font-medium text-gray-900 mb-4">Top 5 Mercados</h4>
        <div className="space-y-4">
          {topMarkets.map((market, index) => (
            <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-4">
                <div className="flex items-center justify-center w-8 h-8 bg-blue-600 text-white rounded-full text-sm font-bold">
                  {index + 1}
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{getCountryFlag(market.countryCode)}</span>
                  <div>
                    <h5 className="font-medium text-gray-900">
                      {market.country}
                      {market.state && ` - ${market.state}`}
                      {market.city && ` - ${market.city}`}
                    </h5>
                    <p className="text-sm text-gray-600">
                      {market.customerCount} clientes • {market.orderCount} pedidos
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="text-right">
                <p className="text-lg font-bold text-gray-900">
                  {formatCurrency(market.totalRevenue)}
                </p>
                <p className="text-sm text-gray-600">
                  {market.marketShare.toFixed(1)}% del total
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Contenido principal según vista */}
      {geographicData.length === 0 ? (
        <div className="bg-white p-12 rounded-lg shadow-sm border text-center">
          <MapPin className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">No hay datos geográficos disponibles</p>
        </div>
      ) : (
        <>
          {viewMode === 'cards' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {geographicData.map((location, index) => (
                <div key={index} className="bg-white p-6 rounded-lg shadow-sm border hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{getCountryFlag(location.countryCode)}</span>
                      <div>
                        <h4 className="font-medium text-gray-900">
                          {location.country}
                          {location.state && ` - ${location.state}`}
                          {location.city && ` - ${location.city}`}
                        </h4>
                        <p className="text-sm text-gray-600">
                          {location.marketShare.toFixed(1)}% del mercado
                        </p>
                      </div>
                    </div>
                    
                    <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                      location.growth >= 0 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      <TrendingUp className={`w-3 h-3 ${
                        location.growth >= 0 ? '' : 'rotate-180'
                      }`} />
                      {location.growth > 0 ? '+' : ''}{location.growth.toFixed(1)}%
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <p className="text-sm text-gray-600">Ingresos</p>
                      <p className="text-xl font-bold text-gray-900">
                        {formatCurrency(location.totalRevenue)}
                      </p>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-600">Pedidos</p>
                        <p className="text-lg font-semibold text-blue-600">
                          {location.orderCount.toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Clientes</p>
                        <p className="text-lg font-semibold text-green-600">
                          {location.customerCount.toLocaleString()}
                        </p>
                      </div>
                    </div>

                    <div>
                      <p className="text-sm text-gray-600">Ticket Promedio</p>
                      <p className="text-lg font-semibold text-purple-600">
                        {formatCurrency(location.averageOrderValue)}
                      </p>
                    </div>

                    <div className="pt-2">
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-600">Participación</span>
                        <span className="font-medium">{location.marketShare.toFixed(1)}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${location.marketShare}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {viewMode === 'table' && (
            <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200">
                <h4 className="text-lg font-medium text-gray-900">Datos Detallados por Ubicación</h4>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Ubicación
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Ingresos
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Pedidos
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Clientes
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Ticket Promedio
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Participación
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Crecimiento
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {geographicData.map((location, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-3">
                            <span className="text-xl">{getCountryFlag(location.countryCode)}</span>
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {location.country}
                                {location.state && ` - ${location.state}`}
                                {location.city && ` - ${location.city}`}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {formatCurrency(location.totalRevenue)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {location.orderCount.toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {location.customerCount.toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatCurrency(location.averageOrderValue)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="text-sm text-gray-900 mr-2">
                              {location.marketShare.toFixed(1)}%
                            </div>
                            <div className="w-16 bg-gray-200 rounded-full h-2">
                              <div 
                                className="bg-blue-500 h-2 rounded-full"
                                style={{ width: `${location.marketShare}%` }}
                              ></div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium w-fit ${
                            location.growth >= 0 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-red-100 text-red-800'
                          }`}>
                            <TrendingUp className={`w-3 h-3 ${
                              location.growth >= 0 ? '' : 'rotate-180'
                            }`} />
                            {location.growth > 0 ? '+' : ''}{location.growth.toFixed(1)}%
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {viewMode === 'map' && (
            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <div className="text-center py-12">
                <Map className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h4 className="text-lg font-medium text-gray-900 mb-2">Vista de Mapa</h4>
                <p className="text-gray-600 mb-4">
                  La integración con mapas interactivos estará disponible próximamente
                </p>
                <div className="text-sm text-gray-500">
                  <p>Funcionalidades planeadas:</p>
                  <ul className="mt-2 space-y-1">
                    <li>• Mapa mundial interactivo</li>
                    <li>• Markers con datos de ventas</li>
                    <li>• Filtros por región</li>
                    <li>• Heatmap de actividad</li>
                  </ul>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
