// 🎨 FASE 30: Componente Analytics Overview
// ✅ Dashboard principal de métricas y KPIs

'use client';

import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  CreditCard, 
  Users, 
  RefreshCw,
  Calendar,
  Filter,
  Download
} from 'lucide-react';

interface OverviewMetrics {
  totalRevenue: number;
  totalTransactions: number;
  averageTransactionValue: number;
  completedPayments: number;
  failedPayments: number;
  refundedAmount: number;
  conversionRate: number;
  currency: string;
  period: string;
  previousPeriodComparison: {
    revenueGrowth: number;
    transactionGrowth: number;
    conversionRateChange: number;
  };
}

interface AnalyticsOverviewProps {
  organizationId: string;
  defaultCurrency?: string;
}

export default function AnalyticsOverview({ 
  organizationId, 
  defaultCurrency = 'USD' 
}: AnalyticsOverviewProps) {
  const [metrics, setMetrics] = useState<OverviewMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState('month');
  const [currency, setCurrency] = useState(defaultCurrency);
  const [filters, setFilters] = useState({
    paymentMethod: '',
    status: '',
    country: ''
  });

  // Cargar métricas
  const loadMetrics = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        period,
        currency,
        ...(filters.paymentMethod && { paymentMethod: filters.paymentMethod }),
        ...(filters.status && { status: filters.status }),
        ...(filters.country && { country: filters.country })
      });

      const response = await fetch(`/api/analytics/overview?${params}`, {
        headers: {
          'Authorization': 'Bearer mock-token'  // En producción usar token real
        }
      });

      if (!response.ok) {
        throw new Error('Error cargando métricas');
      }

      const data = await response.json();
      setMetrics(data.data);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMetrics();
  }, [period, currency, filters]);

  // Formatear moneda
  const formatCurrency = (amount: number, curr: string = currency) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: curr,
      minimumFractionDigits: 2
    }).format(amount);
  };

  // Formatear porcentaje
  const formatPercentage = (value: number) => {
    const sign = value >= 0 ? '+' : '';
    return `${sign}${value.toFixed(1)}%`;
  };

  // Componente de métrica
  const MetricCard = ({ 
    title, 
    value, 
    growth, 
    icon: Icon, 
    format = 'number',
    color = 'blue' 
  }: {
    title: string;
    value: number;
    growth?: number;
    icon: any;
    format?: 'currency' | 'number' | 'percentage';
    color?: 'blue' | 'green' | 'purple' | 'orange' | 'red';
  }) => {
    const colorClasses = {
      blue: 'bg-blue-500',
      green: 'bg-green-500',
      purple: 'bg-purple-500',
      orange: 'bg-orange-500',
      red: 'bg-red-500'
    };

    const formatValue = (val: number) => {
      switch (format) {
        case 'currency':
          return formatCurrency(val);
        case 'percentage':
          return `${val.toFixed(1)}%`;
        default:
          return val.toLocaleString();
      }
    };

    return (
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">{title}</p>
            <p className="text-2xl font-bold text-gray-900">
              {formatValue(value)}
            </p>
            {growth !== undefined && (
              <div className={`flex items-center mt-2 text-sm ${
                growth >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {growth >= 0 ? (
                  <TrendingUp className="w-4 h-4 mr-1" />
                ) : (
                  <TrendingDown className="w-4 h-4 mr-1" />
                )}
                {formatPercentage(growth)}
              </div>
            )}
          </div>
          <div className={`p-3 rounded-full ${colorClasses[color]}`}>
            <Icon className="w-6 h-6 text-white" />
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">Analytics Overview</h2>
          <div className="animate-spin">
            <RefreshCw className="w-6 h-6 text-gray-500" />
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-gray-200 animate-pulse h-32 rounded-lg"></div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <h3 className="text-lg font-medium text-red-800">Error cargando analytics</h3>
        <p className="text-red-600 mt-2">{error}</p>
        <button 
          onClick={loadMetrics}
          className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
        >
          Reintentar
        </button>
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
        <p className="text-gray-600">No hay datos disponibles</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header con controles */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Analytics Overview</h2>
          <p className="text-gray-600">{metrics.period}</p>
        </div>
        
        <div className="flex items-center gap-4">
          {/* Selector de período */}
          <select 
            value={period} 
            onChange={(e) => setPeriod(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm"
          >
            <option value="day">Último día</option>
            <option value="week">Última semana</option>
            <option value="month">Último mes</option>
            <option value="quarter">Último trimestre</option>
            <option value="year">Último año</option>
          </select>

          {/* Selector de moneda */}
          <select 
            value={currency} 
            onChange={(e) => setCurrency(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm"
          >
            <option value="USD">USD</option>
            <option value="EUR">EUR</option>
            <option value="MXN">MXN</option>
            <option value="BRL">BRL</option>
            <option value="CAD">CAD</option>
            <option value="GBP">GBP</option>
          </select>

          {/* Botón de filtros */}
          <button className="p-2 border border-gray-300 rounded-md hover:bg-gray-50">
            <Filter className="w-5 h-5 text-gray-600" />
          </button>

          {/* Botón de exportar */}
          <button className="p-2 border border-gray-300 rounded-md hover:bg-gray-50">
            <Download className="w-5 h-5 text-gray-600" />
          </button>

          {/* Botón de refresh */}
          <button 
            onClick={loadMetrics}
            className="p-2 border border-gray-300 rounded-md hover:bg-gray-50"
          >
            <RefreshCw className="w-5 h-5 text-gray-600" />
          </button>
        </div>
      </div>

      {/* Grid de métricas principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Ingresos Totales"
          value={metrics.totalRevenue}
          growth={metrics.previousPeriodComparison.revenueGrowth}
          icon={DollarSign}
          format="currency"
          color="green"
        />
        
        <MetricCard
          title="Transacciones"
          value={metrics.totalTransactions}
          growth={metrics.previousPeriodComparison.transactionGrowth}
          icon={CreditCard}
          color="blue"
        />
        
        <MetricCard
          title="Valor Promedio"
          value={metrics.averageTransactionValue}
          icon={TrendingUp}
          format="currency"
          color="purple"
        />
        
        <MetricCard
          title="Tasa de Conversión"
          value={metrics.conversionRate}
          growth={metrics.previousPeriodComparison.conversionRateChange}
          icon={Users}
          format="percentage"
          color="orange"
        />
      </div>

      {/* Métricas secundarias */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Estado de Pagos</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-green-600">Completados</span>
              <span className="font-medium">{metrics.completedPayments}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-red-600">Fallidos</span>
              <span className="font-medium">{metrics.failedPayments}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Tasa de éxito</span>
              <span className="font-medium">
                {metrics.conversionRate.toFixed(1)}%
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Reembolsos</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">Monto total</span>
              <span className="font-medium text-red-600">
                {formatCurrency(metrics.refundedAmount)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">% de ingresos</span>
              <span className="font-medium">
                {((metrics.refundedAmount / metrics.totalRevenue) * 100).toFixed(1)}%
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Resumen</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">Moneda base</span>
              <span className="font-medium">{metrics.currency}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Período</span>
              <span className="font-medium text-sm">{period}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Última actualización</span>
              <span className="font-medium text-sm">
                {new Date().toLocaleTimeString()}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
