// 🎯 FASE 30: Componente Payment Charts (Versión Simplificada)
// ✅ Análisis visual de métodos de pago sin dependencias externas

'use client';

import React, { useState, useEffect } from 'react';
import { TrendingUp, CreditCard, Percent, DollarSign, BarChart3, PieChart, TrendingDown } from 'lucide-react';

interface PaymentMethodData {
  method: string;
  provider: string;
  totalAmount: number;
  transactionCount: number;
  averageAmount: number;
  successRate: number;
  currency: string;
}

interface TimeSeriesData {
  date: string;
  revenue: number;
  transactions: number;
  averageValue: number;
  currency: string;
}

interface PaymentChartProps {
  organizationId: string;
  currency?: string;
  dateRange?: {
    startDate: string;
    endDate: string;
  };
}

export default function PaymentChart({ 
  organizationId, 
  currency = 'USD',
  dateRange 
}: PaymentChartProps) {
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethodData[]>([]);
  const [timeSeries, setTimeSeries] = useState<TimeSeriesData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<'chart' | 'table'>('chart');
  const [activeChart, setActiveChart] = useState<'bar' | 'pie' | 'line'>('bar');

  // Colores para los gráficos
  const COLORS = [
    '#3B82F6', // blue
    '#10B981', // green
    '#F59E0B', // yellow
    '#EF4444', // red
    '#8B5CF6', // purple
    '#F97316', // orange
    '#06B6D4', // cyan
    '#84CC16'  // lime
  ];

  // Cargar datos
  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        currency,
        groupBy: 'day',
        ...(dateRange?.startDate && { startDate: dateRange.startDate }),
        ...(dateRange?.endDate && { endDate: dateRange.endDate })
      });

      const response = await fetch(`/api/analytics/transactions?${params}`, {
        headers: {
          'Authorization': 'Bearer mock-token'
        }
      });

      if (!response.ok) {
        throw new Error('Error cargando datos de transacciones');
      }

      const data = await response.json();
      setPaymentMethods(data.data.paymentMethods || []);
      setTimeSeries(data.data.timeSeries || []);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [currency, dateRange]);

  // Formatear moneda
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  // Preparar datos para gráfico de barras
  const barChartData = paymentMethods.map(method => ({
    name: method.provider || method.method,
    ingresos: method.totalAmount,
    transacciones: method.transactionCount,
    promedio: method.averageAmount,
    exito: method.successRate
  }));

  // Preparar datos para gráfico circular
  const pieChartData = paymentMethods.map((method, index) => ({
    name: method.provider || method.method,
    value: method.totalAmount,
    percentage: 0, // Se calculará después
    color: COLORS[index % COLORS.length]
  }));

  // Calcular porcentajes para el pie chart
  const totalAmount = pieChartData.reduce((sum, item) => sum + item.value, 0);
  const totalRevenue = totalAmount;
  pieChartData.forEach(item => {
    item.percentage = totalAmount > 0 ? (item.value / totalAmount) * 100 : 0;
  });

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
            onClick={loadData}
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
      {/* Controles del gráfico */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-medium text-gray-900">Análisis de Métodos de Pago</h3>
            <p className="text-gray-600">Distribución de ingresos por proveedor</p>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveChart('bar')}
              className={`px-3 py-2 rounded text-sm font-medium transition-colors ${
                activeChart === 'bar' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Barras
            </button>
            <button
              onClick={() => setActiveChart('pie')}
              className={`px-3 py-2 rounded text-sm font-medium transition-colors ${
                activeChart === 'pie' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Circular
            </button>
            <button
              onClick={() => setActiveChart('line')}
              className={`px-3 py-2 rounded text-sm font-medium transition-colors ${
                activeChart === 'line' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Tendencia
            </button>
          </div>
        </div>
      </div>

      {/* Gráfico principal */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        {paymentMethods.length === 0 ? (
          <div className="text-center py-12">
            <CreditCard className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No hay datos de transacciones disponibles</p>
          </div>
        ) : (
          <div className="h-80">
            {activeChart === 'bar' && (
              <div className="h-full flex flex-col">
                <div className="mb-4 flex gap-6 text-sm text-gray-600">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-blue-500 rounded"></div>
                    <span>Ingresos</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-green-500 rounded"></div>
                    <span>Transacciones</span>
                  </div>
                </div>
                <div className="flex-1 flex items-end justify-between gap-4 px-4">
                  {barChartData.map((item, index) => {
                    const maxIngresos = Math.max(...barChartData.map(d => d.ingresos));
                    const maxTransacciones = Math.max(...barChartData.map(d => d.transacciones));
                    const heightIngresos = (item.ingresos / maxIngresos) * 80;
                    const heightTransacciones = (item.transacciones / maxTransacciones) * 80;
                    
                    return (
                      <div key={index} className="flex flex-col items-center gap-2 flex-1 max-w-32">
                        <div className="flex items-end gap-1 h-48">
                          <div 
                            className="bg-blue-500 rounded-t min-w-[20px] relative group cursor-pointer"
                            style={{ height: `${heightIngresos}%` }}
                          >
                            <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white px-2 py-1 rounded text-xs opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                              {formatCurrency(item.ingresos)}
                            </div>
                          </div>
                          <div 
                            className="bg-green-500 rounded-t min-w-[20px] relative group cursor-pointer"
                            style={{ height: `${heightTransacciones}%` }}
                          >
                            <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white px-2 py-1 rounded text-xs opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                              {item.transacciones}
                            </div>
                          </div>
                        </div>
                        <div className="text-xs text-gray-600 text-center truncate w-full">
                          {item.name}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {activeChart === 'pie' && (
              <div className="h-full flex items-center justify-center">
                <div className="relative w-64 h-64">
                  <svg width="256" height="256" className="transform -rotate-90">
                    {pieChartData.map((item, index) => {
                      const prevSum = pieChartData.slice(0, index).reduce((sum, d) => sum + d.percentage, 0);
                      const strokeDasharray = `${item.percentage * 2.51} 251`;
                      const strokeDashoffset = -(prevSum * 2.51);
                      
                      return (
                        <circle
                          key={index}
                          cx="128"
                          cy="128"
                          r="40"
                          fill="transparent"
                          stroke={item.color}
                          strokeWidth="32"
                          strokeDasharray={strokeDasharray}
                          strokeDashoffset={strokeDashoffset}
                          className="cursor-pointer hover:opacity-80 transition-opacity"
                        />
                      );
                    })}
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-gray-900">
                        {formatCurrency(totalRevenue)}
                      </div>
                      <div className="text-sm text-gray-600">Total</div>
                    </div>
                  </div>
                </div>
                <div className="ml-8 space-y-3">
                  {pieChartData.map((item, index) => (
                    <div key={index} className="flex items-center gap-3">
                      <div 
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: item.color }}
                      ></div>
                      <div className="flex-1">
                        <div className="text-sm font-medium text-gray-900">{item.name}</div>
                        <div className="text-xs text-gray-600">
                          {formatCurrency(item.value)} ({item.percentage.toFixed(1)}%)
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeChart === 'line' && timeSeries.length > 0 && (
              <div className="h-full flex flex-col">
                <div className="mb-4 flex gap-6 text-sm text-gray-600">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-1 bg-blue-500 rounded"></div>
                    <span>Ingresos</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-1 bg-green-500 rounded"></div>
                    <span>Transacciones</span>
                  </div>
                </div>
                <div className="flex-1 relative">
                  <svg width="100%" height="100%" className="absolute inset-0">
                    <defs>
                      <linearGradient id="revenueGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.3"/>
                        <stop offset="100%" stopColor="#3B82F6" stopOpacity="0"/>
                      </linearGradient>
                    </defs>
                    
                    {/* Líneas de cuadrícula */}
                    {[0, 25, 50, 75, 100].map(y => (
                      <line
                        key={y}
                        x1="40"
                        y1={`${y}%`}
                        x2="100%"
                        y2={`${y}%`}
                        stroke="#E5E7EB"
                        strokeWidth="1"
                      />
                    ))}
                    
                    {timeSeries.length > 1 && (
                      <>
                        {/* Línea de ingresos */}
                        <polyline
                          fill="none"
                          stroke="#3B82F6"
                          strokeWidth="2"
                          points={timeSeries.map((point, index) => {
                            const x = 40 + ((100 - 40) / (timeSeries.length - 1)) * index;
                            const maxRevenue = Math.max(...timeSeries.map(d => d.revenue));
                            const y = 90 - ((point.revenue / maxRevenue) * 80);
                            return `${x},${y}`;
                          }).join(' ')}
                        />
                        
                        {/* Puntos de datos */}
                        {timeSeries.map((point, index) => {
                          const x = 40 + ((100 - 40) / (timeSeries.length - 1)) * index;
                          const maxRevenue = Math.max(...timeSeries.map(d => d.revenue));
                          const y = 90 - ((point.revenue / maxRevenue) * 80);
                          return (
                            <circle
                              key={index}
                              cx={`${x}%`}
                              cy={`${y}%`}
                              r="4"
                              fill="#3B82F6"
                              className="cursor-pointer hover:r-6 transition-all"
                            />
                          );
                        })}
                      </>
                    )}
                  </svg>
                  
                  {/* Etiquetas del eje Y */}
                  <div className="absolute left-0 top-0 h-full flex flex-col justify-between text-xs text-gray-600 py-2">
                    {timeSeries.length > 0 && [
                      Math.max(...timeSeries.map(d => d.revenue)),
                      Math.max(...timeSeries.map(d => d.revenue)) * 0.75,
                      Math.max(...timeSeries.map(d => d.revenue)) * 0.5,
                      Math.max(...timeSeries.map(d => d.revenue)) * 0.25,
                      0
                    ].map((value, index) => (
                      <span key={index}>{formatCurrency(value)}</span>
                    ))}
                  </div>
                  
                  {/* Etiquetas del eje X */}
                  <div className="absolute bottom-0 left-10 right-0 flex justify-between text-xs text-gray-600 pb-2">
                    {timeSeries.map((point, index) => (
                      <span key={index} className="transform -rotate-45 origin-left">
                        {point.date}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Tabla de resumen */}
      {paymentMethods.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h4 className="text-lg font-medium text-gray-900">Detalle por Método de Pago</h4>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Método
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ingresos
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Transacciones
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Promedio
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tasa de Éxito
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {paymentMethods.map((method, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className={`w-3 h-3 rounded-full mr-3`} 
                             style={{ backgroundColor: COLORS[index % COLORS.length] }}>
                        </div>
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {method.provider || method.method}
                          </div>
                          <div className="text-sm text-gray-500">
                            {method.method}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatCurrency(method.totalAmount)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {method.transactionCount.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatCurrency(method.averageAmount)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="text-sm text-gray-900">
                          {method.successRate.toFixed(1)}%
                        </div>
                        <div className="ml-2 w-16 bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-green-500 h-2 rounded-full"
                            style={{ width: `${method.successRate}%` }}
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
