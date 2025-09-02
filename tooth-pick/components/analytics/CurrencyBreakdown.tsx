// 🎯 FASE 30: Componente Currency Breakdown
// ✅ Análisis de distribución por monedas con conversiones

'use client';

import React, { useState, useEffect } from 'react';
import { DollarSign, TrendingUp, TrendingDown, RefreshCw, Globe } from 'lucide-react';

interface CurrencyData {
  currency: string;
  totalAmount: number;
  convertedAmount: number; // En moneda base
  transactionCount: number;
  averageAmount: number;
  exchangeRate: number;
  trend: 'up' | 'down' | 'stable';
  trendPercentage: number;
  percentage: number;
}

interface CurrencyBreakdownProps {
  organizationId: string;
  baseCurrency?: string;
  dateRange?: {
    startDate: string;
    endDate: string;
  };
}

export default function CurrencyBreakdown({ 
  organizationId, 
  baseCurrency = 'USD',
  dateRange 
}: CurrencyBreakdownProps) {
  const [currencyData, setCurrencyData] = useState<CurrencyData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Cargar datos de monedas
  const loadCurrencyData = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        baseCurrency,
        ...(dateRange?.startDate && { startDate: dateRange.startDate }),
        ...(dateRange?.endDate && { endDate: dateRange.endDate })
      });

      const response = await fetch(`/api/analytics/currencies?${params}`, {
        headers: {
          'Authorization': 'Bearer mock-token'
        }
      });

      if (!response.ok) {
        throw new Error('Error cargando datos de monedas');
      }

      const data = await response.json();
      
      // Mock data para desarrollo (en producción vendría del API)
      const mockCurrencyData: CurrencyData[] = [
        {
          currency: 'USD',
          totalAmount: 245680,
          convertedAmount: 245680,
          transactionCount: 156,
          averageAmount: 1575,
          exchangeRate: 1.0,
          trend: 'up',
          trendPercentage: 12.5,
          percentage: 45.2
        },
        {
          currency: 'EUR',
          totalAmount: 89420,
          convertedAmount: 97650,
          transactionCount: 67,
          averageAmount: 1334,
          exchangeRate: 1.092,
          trend: 'up',
          trendPercentage: 8.3,
          percentage: 18.0
        },
        {
          currency: 'MXN',
          totalAmount: 1456800,
          convertedAmount: 85600,
          transactionCount: 89,
          averageAmount: 16368,
          exchangeRate: 0.059,
          trend: 'stable',
          trendPercentage: 2.1,
          percentage: 15.8
        },
        {
          currency: 'COP',
          totalAmount: 298450000,
          convertedAmount: 76800,
          transactionCount: 54,
          averageAmount: 5526852,
          exchangeRate: 0.000257,
          trend: 'down',
          trendPercentage: -1.2,
          percentage: 14.1
        },
        {
          currency: 'CAD',
          totalAmount: 45320,
          convertedAmount: 33890,
          transactionCount: 23,
          averageAmount: 1970,
          exchangeRate: 0.748,
          trend: 'up',
          trendPercentage: 5.7,
          percentage: 6.9
        }
      ];
      
      setCurrencyData(mockCurrencyData);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCurrencyData();
  }, [baseCurrency, dateRange]);

  // Formatear moneda
  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  // Calcular totales
  const totalRevenue = currencyData.reduce((sum, item) => sum + item.convertedAmount, 0);
  const totalTransactions = currencyData.reduce((sum, item) => sum + item.transactionCount, 0);

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
            onClick={loadCurrencyData}
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
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-medium text-gray-900 flex items-center gap-2">
              <Globe className="w-5 h-5 text-blue-600" />
              Distribución por Monedas
            </h3>
            <p className="text-gray-600">
              Análisis de ingresos en {baseCurrency} y conversiones automáticas
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewMode('grid')}
              className={`px-3 py-2 rounded text-sm font-medium transition-colors ${
                viewMode === 'grid' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Tarjetas
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-2 rounded text-sm font-medium transition-colors ${
                viewMode === 'list' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Lista
            </button>
            <button
              onClick={loadCurrencyData}
              className="px-3 py-2 bg-gray-100 text-gray-700 hover:bg-gray-200 rounded text-sm font-medium transition-colors flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Actualizar
            </button>
          </div>
        </div>
      </div>

      {/* Resumen general */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Ingresos Totales</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(totalRevenue, baseCurrency)}
              </p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Monedas Activas</p>
              <p className="text-2xl font-bold text-gray-900">
                {currencyData.length}
              </p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
              <Globe className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Transacciones</p>
              <p className="text-2xl font-bold text-gray-900">
                {totalTransactions.toLocaleString()}
              </p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Datos por moneda */}
      {currencyData.length === 0 ? (
        <div className="bg-white p-12 rounded-lg shadow-sm border text-center">
          <Globe className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">No hay datos de transacciones por moneda disponibles</p>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {currencyData.map((currency) => (
            <div key={currency.currency} className="bg-white p-6 rounded-lg shadow-sm border hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                    <span className="text-white font-bold text-sm">
                      {currency.currency}
                    </span>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">{currency.currency}</h4>
                    <p className="text-sm text-gray-600">
                      1 {currency.currency} = {currency.exchangeRate.toFixed(4)} {baseCurrency}
                    </p>
                  </div>
                </div>
                
                <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                  currency.trend === 'up' 
                    ? 'bg-green-100 text-green-800' 
                    : currency.trend === 'down'
                    ? 'bg-red-100 text-red-800'
                    : 'bg-gray-100 text-gray-800'
                }`}>
                  {currency.trend === 'up' ? (
                    <TrendingUp className="w-3 h-3" />
                  ) : currency.trend === 'down' ? (
                    <TrendingDown className="w-3 h-3" />
                  ) : (
                    <div className="w-3 h-3 bg-gray-400 rounded-full" />
                  )}
                  {currency.trendPercentage.toFixed(1)}%
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <p className="text-sm text-gray-600">Ingresos Originales</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {formatCurrency(currency.totalAmount, currency.currency)}
                  </p>
                </div>
                
                <div>
                  <p className="text-sm text-gray-600">Convertido a {baseCurrency}</p>
                  <p className="text-lg font-semibold text-blue-600">
                    {formatCurrency(currency.convertedAmount, baseCurrency)}
                  </p>
                </div>

                <div className="pt-3 border-t border-gray-100">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Transacciones:</span>
                    <span className="font-medium">{currency.transactionCount}</span>
                  </div>
                  <div className="flex justify-between text-sm mt-1">
                    <span className="text-gray-600">Promedio:</span>
                    <span className="font-medium">
                      {formatCurrency(currency.averageAmount, currency.currency)}
                    </span>
                  </div>
                </div>

                <div className="pt-2">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600">% del total</span>
                    <span className="font-medium">
                      {((currency.convertedAmount / totalRevenue) * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${(currency.convertedAmount / totalRevenue) * 100}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h4 className="text-lg font-medium text-gray-900">Detalle por Moneda</h4>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Moneda
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ingresos Originales
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Convertido ({baseCurrency})
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tipo de Cambio
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Transacciones
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tendencia
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    % del Total
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {currencyData.map((currency) => (
                  <tr key={currency.currency} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mr-3">
                          <span className="text-white font-bold text-xs">
                            {currency.currency}
                          </span>
                        </div>
                        <div className="text-sm font-medium text-gray-900">
                          {currency.currency}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatCurrency(currency.totalAmount, currency.currency)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-600">
                      {formatCurrency(currency.convertedAmount, baseCurrency)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {currency.exchangeRate.toFixed(4)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {currency.transactionCount.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium w-fit ${
                        currency.trend === 'up' 
                          ? 'bg-green-100 text-green-800' 
                          : currency.trend === 'down'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {currency.trend === 'up' ? (
                          <TrendingUp className="w-3 h-3" />
                        ) : currency.trend === 'down' ? (
                          <TrendingDown className="w-3 h-3" />
                        ) : (
                          <div className="w-3 h-3 bg-gray-400 rounded-full" />
                        )}
                        {currency.trendPercentage.toFixed(1)}%
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="text-sm text-gray-900 mr-2">
                          {((currency.convertedAmount / totalRevenue) * 100).toFixed(1)}%
                        </div>
                        <div className="w-16 bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-blue-500 h-2 rounded-full"
                            style={{ width: `${(currency.convertedAmount / totalRevenue) * 100}%` }}
                          ></div>
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
