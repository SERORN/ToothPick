// 🎯 FASE 30: Componente Customer Analytics
// ✅ Análisis de comportamiento y segmentación de clientes

'use client';

import React, { useState, useEffect } from 'react';
import { Users, Star, TrendingUp, Award, Calendar, DollarSign, Filter, Download } from 'lucide-react';

interface CustomerData {
  id: string;
  name: string;
  email: string;
  type: 'dentist' | 'clinic' | 'distributor';
  totalSpent: number;
  orderCount: number;
  averageOrderValue: number;
  lastPurchase: string;
  loyaltyScore: number;
  status: 'active' | 'inactive' | 'at_risk';
  lifetimeValue: number;
  preferredPaymentMethod: string;
  currency: string;
}

interface CustomerSegment {
  segment: string;
  count: number;
  totalValue: number;
  averageValue: number;
  color: string;
}

interface CustomerAnalyticsProps {
  organizationId: string;
  currency?: string;
  dateRange?: {
    startDate: string;
    endDate: string;
  };
}

export default function CustomerAnalytics({ 
  organizationId, 
  currency = 'USD',
  dateRange 
}: CustomerAnalyticsProps) {
  const [customers, setCustomers] = useState<CustomerData[]>([]);
  const [segments, setSegments] = useState<CustomerSegment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'segments' | 'top' | 'detailed'>('overview');
  const [sortBy, setSortBy] = useState<'totalSpent' | 'orderCount' | 'lastPurchase' | 'loyaltyScore'>('totalSpent');
  const [filterType, setFilterType] = useState<'all' | 'dentist' | 'clinic' | 'distributor'>('all');

  // Cargar datos de clientes
  const loadCustomerData = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        currency,
        sortBy,
        ...(filterType !== 'all' && { type: filterType }),
        ...(dateRange?.startDate && { startDate: dateRange.startDate }),
        ...(dateRange?.endDate && { endDate: dateRange.endDate })
      });

      const response = await fetch(`/api/analytics/customers?${params}`, {
        headers: {
          'Authorization': 'Bearer mock-token'
        }
      });

      if (!response.ok) {
        throw new Error('Error cargando datos de clientes');
      }

      const data = await response.json();
      setCustomers(data.data.customers || []);
      setSegments(data.data.segments || []);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCustomerData();
  }, [currency, dateRange, sortBy, filterType]);

  // Formatear moneda
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  // Formatear fecha
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Obtener color del status
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'inactive': return 'bg-gray-100 text-gray-800';
      case 'at_risk': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Obtener icono del tipo
  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'dentist': return '🦷';
      case 'clinic': return '🏥';
      case 'distributor': return '📦';
      default: return '👤';
    }
  };

  // Calcular métricas generales
  const totalCustomers = customers.length;
  const totalRevenue = customers.reduce((sum, customer) => sum + customer.totalSpent, 0);
  const averageOrderValue = customers.length > 0 
    ? customers.reduce((sum, customer) => sum + customer.averageOrderValue, 0) / customers.length 
    : 0;
  const activeCustomers = customers.filter(c => c.status === 'active').length;

  // Top customers
  const topCustomers = [...customers]
    .sort((a, b) => b.totalSpent - a.totalSpent)
    .slice(0, 10);

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
            onClick={loadCustomerData}
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
      {/* Header con navegación */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div>
            <h3 className="text-lg font-medium text-gray-900 flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-600" />
              Análisis de Clientes
            </h3>
            <p className="text-gray-600">Insights de comportamiento y segmentación</p>
          </div>
          
          <div className="flex items-center gap-2">
            <select 
              value={filterType} 
              onChange={(e) => setFilterType(e.target.value as any)}
              className="px-3 py-2 border border-gray-300 rounded text-sm"
            >
              <option value="all">Todos los tipos</option>
              <option value="dentist">Dentistas</option>
              <option value="clinic">Clínicas</option>
              <option value="distributor">Distribuidores</option>
            </select>
            
            <select 
              value={sortBy} 
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-3 py-2 border border-gray-300 rounded text-sm"
            >
              <option value="totalSpent">Por gasto total</option>
              <option value="orderCount">Por # pedidos</option>
              <option value="lastPurchase">Por última compra</option>
              <option value="loyaltyScore">Por lealtad</option>
            </select>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
          {[
            { id: 'overview', label: 'Resumen', icon: TrendingUp },
            { id: 'segments', label: 'Segmentos', icon: Filter },
            { id: 'top', label: 'Top Clientes', icon: Award },
            { id: 'detailed', label: 'Detallado', icon: Users }
          ].map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeTab === tab.id 
                    ? 'bg-white text-blue-600 shadow-sm' 
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Contenido según tab activo */}
      {activeTab === 'overview' && (
        <>
          {/* Métricas generales */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Clientes</p>
                  <p className="text-2xl font-bold text-gray-900">{totalCustomers}</p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <Users className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Clientes Activos</p>
                  <p className="text-2xl font-bold text-gray-900">{activeCustomers}</p>
                  <p className="text-xs text-green-600">
                    {totalCustomers > 0 ? ((activeCustomers / totalCustomers) * 100).toFixed(1) : 0}% del total
                  </p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Ingresos Totales</p>
                  <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalRevenue)}</p>
                </div>
                <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                  <DollarSign className="w-6 h-6 text-purple-600" />
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Ticket Promedio</p>
                  <p className="text-2xl font-bold text-gray-900">{formatCurrency(averageOrderValue)}</p>
                </div>
                <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                  <Star className="w-6 h-6 text-orange-600" />
                </div>
              </div>
            </div>
          </div>

          {/* Distribución por tipo */}
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <h4 className="text-lg font-medium text-gray-900 mb-4">Distribución por Tipo de Cliente</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {['dentist', 'clinic', 'distributor'].map(type => {
                const typeCustomers = customers.filter(c => c.type === type);
                const typeRevenue = typeCustomers.reduce((sum, c) => sum + c.totalSpent, 0);
                
                return (
                  <div key={type} className="p-4 border rounded-lg">
                    <div className="flex items-center gap-3 mb-3">
                      <span className="text-2xl">{getTypeIcon(type)}</span>
                      <div>
                        <h5 className="font-medium text-gray-900 capitalize">
                          {type === 'dentist' ? 'Dentistas' : type === 'clinic' ? 'Clínicas' : 'Distribuidores'}
                        </h5>
                        <p className="text-sm text-gray-600">{typeCustomers.length} clientes</p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Ingresos:</span>
                        <span className="font-medium">{formatCurrency(typeRevenue)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">% del total:</span>
                        <span className="font-medium">
                          {totalRevenue > 0 ? ((typeRevenue / totalRevenue) * 100).toFixed(1) : 0}%
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${totalRevenue > 0 ? (typeRevenue / totalRevenue) * 100 : 0}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}

      {activeTab === 'segments' && (
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h4 className="text-lg font-medium text-gray-900 mb-6">Segmentación de Clientes</h4>
          {segments.length === 0 ? (
            <div className="text-center py-12">
              <Filter className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No hay datos de segmentación disponibles</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {segments.map((segment, index) => (
                <div key={index} className="p-6 border rounded-lg hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-3 mb-4">
                    <div 
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: segment.color }}
                    ></div>
                    <h5 className="font-medium text-gray-900">{segment.segment}</h5>
                  </div>
                  
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm text-gray-600">Clientes</p>
                      <p className="text-xl font-bold text-gray-900">{segment.count}</p>
                    </div>
                    
                    <div>
                      <p className="text-sm text-gray-600">Valor Total</p>
                      <p className="text-lg font-semibold text-blue-600">
                        {formatCurrency(segment.totalValue)}
                      </p>
                    </div>
                    
                    <div>
                      <p className="text-sm text-gray-600">Valor Promedio</p>
                      <p className="text-lg font-semibold text-green-600">
                        {formatCurrency(segment.averageValue)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'top' && (
        <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h4 className="text-lg font-medium text-gray-900">Top 10 Clientes</h4>
          </div>
          {topCustomers.length === 0 ? (
            <div className="text-center py-12">
              <Award className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No hay datos de clientes disponibles</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {topCustomers.map((customer, index) => (
                <div key={customer.id} className="p-6 hover:bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full">
                        <span className="text-white font-bold text-lg">#{index + 1}</span>
                      </div>
                      <div>
                        <h5 className="font-medium text-gray-900">{customer.name}</h5>
                        <p className="text-sm text-gray-600 flex items-center gap-2">
                          <span className="text-lg">{getTypeIcon(customer.type)}</span>
                          {customer.email}
                        </p>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <p className="text-lg font-bold text-gray-900">
                        {formatCurrency(customer.totalSpent)}
                      </p>
                      <p className="text-sm text-gray-600">
                        {customer.orderCount} pedidos
                      </p>
                    </div>
                  </div>
                  
                  <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Último pedido:</span>
                      <span className="ml-2 font-medium">{formatDate(customer.lastPurchase)}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Ticket promedio:</span>
                      <span className="ml-2 font-medium">{formatCurrency(customer.averageOrderValue)}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Score lealtad:</span>
                      <span className="ml-2 font-medium">{customer.loyaltyScore}/100</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'detailed' && (
        <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <h4 className="text-lg font-medium text-gray-900">Lista Detallada de Clientes</h4>
            <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm">
              <Download className="w-4 h-4" />
              Exportar
            </button>
          </div>
          
          {customers.length === 0 ? (
            <div className="text-center py-12">
              <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No hay clientes disponibles</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Cliente
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Tipo
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total Gastado
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Pedidos
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Ticket Promedio
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Última Compra
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Estado
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Lealtad
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {customers.map((customer) => (
                    <tr key={customer.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{customer.name}</div>
                          <div className="text-sm text-gray-500">{customer.email}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{getTypeIcon(customer.type)}</span>
                          <span className="text-sm text-gray-900 capitalize">
                            {customer.type === 'dentist' ? 'Dentista' : customer.type === 'clinic' ? 'Clínica' : 'Distribuidor'}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {formatCurrency(customer.totalSpent)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {customer.orderCount}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatCurrency(customer.averageOrderValue)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatDate(customer.lastPurchase)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(customer.status)}`}>
                          {customer.status === 'active' ? 'Activo' : customer.status === 'inactive' ? 'Inactivo' : 'En Riesgo'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="text-sm text-gray-900 mr-2">
                            {customer.loyaltyScore}/100
                          </div>
                          <div className="w-16 bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-blue-500 h-2 rounded-full"
                              style={{ width: `${customer.loyaltyScore}%` }}
                            ></div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
