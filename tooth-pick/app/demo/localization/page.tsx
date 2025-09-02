'use client';

import React, { useState } from 'react';
import { Calendar, Clock, DollarSign, Globe, TrendingUp, ShoppingCart } from 'lucide-react';
import { useLocale } from '@/lib/hooks/useLocale';
import { useCurrency } from '@/lib/hooks/useCurrency';
import { LocaleQuickSettings, LocaleStatus } from '@/components/locale/LocaleSelectors';

// Datos de ejemplo para demostrar localización
const sampleData = {
  orders: [
    { id: '001', date: new Date('2025-01-15'), amount: 150.50, status: 'delivered', customer: 'Dr. García' },
    { id: '002', date: new Date('2025-01-20'), amount: 89.99, status: 'pending', customer: 'Clínica Dental Norte' },
    { id: '003', date: new Date('2025-01-25'), amount: 299.00, status: 'processing', customer: 'Dr. Silva' }
  ],
  appointments: [
    { id: '1', date: new Date('2025-01-28'), patient: 'María González', treatment: 'Limpieza dental' },
    { id: '2', date: new Date('2025-01-29'), patient: 'Carlos Mendoza', treatment: 'Endodoncia' },
    { id: '3', date: new Date('2025-01-30'), patient: 'Ana Ruiz', treatment: 'Ortodoncia' }
  ],
  products: [
    { id: 'P001', name: 'Kit de Blanqueamiento', price: 45.99, category: 'Estética' },
    { id: 'P002', name: 'Resina Compuesta', price: 128.50, category: 'Materiales' },
    { id: 'P003', name: 'Anestesia Local', price: 89.90, category: 'Farmacología' }
  ],
  statistics: {
    totalRevenue: 15420.80,
    monthlyGrowth: 12.5,
    newPatients: 23,
    totalOrders: 145
  }
};

export default function LocalizationDemo() {
  const { 
    formatDate, 
    formatTime, 
    formatDateTime, 
    formatRelativeTime, 
    formatNumber,
    currentLocale 
  } = useLocale();
  
  const { 
    formatCurrency, 
    convertCurrency, 
    currentCurrency 
  } = useCurrency();

  const [selectedTab, setSelectedTab] = useState<'dashboard' | 'orders' | 'appointments' | 'products'>('dashboard');

  // Simular traducciones básicas (en una implementación real usarías next-intl)
  const t = (key: string) => {
    const translations: Record<string, Record<string, string>> = {
      es: {
        dashboard: 'Panel de Control',
        orders: 'Pedidos',
        appointments: 'Citas',
        products: 'Productos',
        totalRevenue: 'Ingresos Totales',
        monthlyGrowth: 'Crecimiento Mensual',
        newPatients: 'Nuevos Pacientes',
        totalOrders: 'Total de Pedidos',
        recentOrders: 'Pedidos Recientes',
        upcomingAppointments: 'Próximas Citas',
        productCatalog: 'Catálogo de Productos',
        status: 'Estado',
        delivered: 'Entregado',
        pending: 'Pendiente',
        processing: 'Procesando',
        customer: 'Cliente',
        date: 'Fecha',
        amount: 'Monto',
        patient: 'Paciente',
        treatment: 'Tratamiento',
        time: 'Hora',
        name: 'Nombre',
        price: 'Precio',
        category: 'Categoría'
      },
      en: {
        dashboard: 'Dashboard',
        orders: 'Orders',
        appointments: 'Appointments',
        products: 'Products',
        totalRevenue: 'Total Revenue',
        monthlyGrowth: 'Monthly Growth',
        newPatients: 'New Patients',
        totalOrders: 'Total Orders',
        recentOrders: 'Recent Orders',
        upcomingAppointments: 'Upcoming Appointments',
        productCatalog: 'Product Catalog',
        status: 'Status',
        delivered: 'Delivered',
        pending: 'Pending',
        processing: 'Processing',
        customer: 'Customer',
        date: 'Date',
        amount: 'Amount',
        patient: 'Patient',
        treatment: 'Treatment',
        time: 'Time',
        name: 'Name',
        price: 'Price',
        category: 'Category'
      },
      pt: {
        dashboard: 'Painel',
        orders: 'Pedidos',
        appointments: 'Agendamentos',
        products: 'Produtos',
        totalRevenue: 'Receita Total',
        monthlyGrowth: 'Crescimento Mensal',
        newPatients: 'Novos Pacientes',
        totalOrders: 'Total de Pedidos',
        recentOrders: 'Pedidos Recentes',
        upcomingAppointments: 'Próximos Agendamentos',
        productCatalog: 'Catálogo de Produtos',
        status: 'Status',
        delivered: 'Entregue',
        pending: 'Pendente',
        processing: 'Processando',
        customer: 'Cliente',
        date: 'Data',
        amount: 'Valor',
        patient: 'Paciente',
        treatment: 'Tratamento',
        time: 'Hora',
        name: 'Nome',
        price: 'Preço',
        category: 'Categoria'
      },
      de: {
        dashboard: 'Dashboard',
        orders: 'Bestellungen',
        appointments: 'Termine',
        products: 'Produkte',
        totalRevenue: 'Gesamtumsatz',
        monthlyGrowth: 'Monatliches Wachstum',
        newPatients: 'Neue Patienten',
        totalOrders: 'Gesamtbestellungen',
        recentOrders: 'Letzte Bestellungen',
        upcomingAppointments: 'Kommende Termine',
        productCatalog: 'Produktkatalog',
        status: 'Status',
        delivered: 'Zugestellt',
        pending: 'Ausstehend',
        processing: 'In Bearbeitung',
        customer: 'Kunde',
        date: 'Datum',
        amount: 'Betrag',
        patient: 'Patient',
        treatment: 'Behandlung',
        time: 'Zeit',
        name: 'Name',
        price: 'Preis',
        category: 'Kategorie'
      }
    };
    
    return translations[currentLocale]?.[key] || key;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'delivered': return 'text-green-600 bg-green-100';
      case 'pending': return 'text-yellow-600 bg-yellow-100';
      case 'processing': return 'text-blue-600 bg-blue-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const tabs = [
    { id: 'dashboard', label: t('dashboard'), icon: TrendingUp },
    { id: 'orders', label: t('orders'), icon: ShoppingCart },
    { id: 'appointments', label: t('appointments'), icon: Calendar },
    { id: 'products', label: t('products'), icon: DollarSign }
  ] as const;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header con selectores de idioma y moneda */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">ToothPick i18n Demo</h1>
            <p className="text-gray-600 mt-2">
              Demostración completa del sistema de internacionalización y multimoneda
            </p>
          </div>
          <LocaleQuickSettings />
        </div>

        {/* Información de configuración regional */}
        <div className="mb-8">
          <LocaleStatus />
        </div>

        {/* Navegación por tabs */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="flex space-x-8">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setSelectedTab(tab.id)}
                  className={`flex items-center gap-2 py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                    selectedTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Contenido por tabs */}
        {selectedTab === 'dashboard' && (
          <div className="space-y-6">
            {/* Estadísticas principales */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white p-6 rounded-lg shadow">
                <div className="flex items-center">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <DollarSign className="h-6 w-6 text-green-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">{t('totalRevenue')}</p>
                    <p className="text-2xl font-semibold text-gray-900">
                      {formatCurrency(sampleData.statistics.totalRevenue)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg shadow">
                <div className="flex items-center">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <TrendingUp className="h-6 w-6 text-blue-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">{t('monthlyGrowth')}</p>
                    <p className="text-2xl font-semibold text-gray-900">
                      {formatNumber(sampleData.statistics.monthlyGrowth)}%
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg shadow">
                <div className="flex items-center">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <Calendar className="h-6 w-6 text-purple-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">{t('newPatients')}</p>
                    <p className="text-2xl font-semibold text-gray-900">
                      {formatNumber(sampleData.statistics.newPatients)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg shadow">
                <div className="flex items-center">
                  <div className="p-2 bg-orange-100 rounded-lg">
                    <ShoppingCart className="h-6 w-6 text-orange-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">{t('totalOrders')}</p>
                    <p className="text-2xl font-semibold text-gray-900">
                      {formatNumber(sampleData.statistics.totalOrders)}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {selectedTab === 'orders' && (
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">{t('recentOrders')}</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      ID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('customer')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('date')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('amount')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('status')}
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {sampleData.orders.map((order) => (
                    <tr key={order.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        #{order.id}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {order.customer}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div>
                          <div>{formatDate(order.date)}</div>
                          <div className="text-xs text-gray-400">
                            {formatRelativeTime(order.date)}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {formatCurrency(order.amount)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(order.status)}`}>
                          {t(order.status)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {selectedTab === 'appointments' && (
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">{t('upcomingAppointments')}</h3>
            </div>
            <div className="divide-y divide-gray-200">
              {sampleData.appointments.map((appointment) => (
                <div key={appointment.id} className="px-6 py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <Calendar className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <h4 className="text-sm font-medium text-gray-900">
                          {appointment.patient}
                        </h4>
                        <p className="text-sm text-gray-500">{appointment.treatment}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium text-gray-900">
                        {formatDate(appointment.date)}
                      </div>
                      <div className="text-sm text-gray-500">
                        {formatTime(appointment.date)}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {selectedTab === 'products' && (
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">{t('productCatalog')}</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
              {sampleData.products.map((product) => (
                <div key={product.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="text-sm font-medium text-gray-900">
                      {product.name}
                    </h4>
                    <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                      {product.category}
                    </span>
                  </div>
                  <p className="text-lg font-semibold text-blue-600">
                    {formatCurrency(product.price)}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    ID: {product.id}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
