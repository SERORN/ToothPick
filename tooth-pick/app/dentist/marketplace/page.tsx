'use client';

import React, { useState } from 'react';
import DashboardHeader from '@/components/DashboardHeader';
import ProductsManager from '@/components/dentist/ProductsManager';
import OrdersManager from '@/components/dentist/OrdersManager';
import { Package, ShoppingCart, TrendingUp, Store } from 'lucide-react';

export default function DentistMarketplacePage() {
  const [activeTab, setActiveTab] = useState('overview');

  const tabs = [
    {
      id: 'overview',
      name: 'Resumen',
      icon: TrendingUp,
      description: 'Vista general de tu marketplace'
    },
    {
      id: 'products',
      name: 'Productos',
      icon: Package,
      description: 'Gestiona tus productos y servicios'
    },
    {
      id: 'orders',
      name: 'Órdenes',
      icon: ShoppingCart,
      description: 'Administra las órdenes recibidas'
    },
    {
      id: 'store',
      name: 'Mi Tienda',
      icon: Store,
      description: 'Vista previa de tu tienda'
    }
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'overview':
        return <MarketplaceOverview />;
      case 'products':
        return <ProductsManager />;
      case 'orders':
        return <OrdersManager />;
      case 'store':
        return <StorePreview />;
      default:
        return <MarketplaceOverview />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardHeader
        title="Marketplace"
        subtitle="Vende productos y servicios desde tu clínica"
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Navegación por pestañas */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8 px-6" aria-label="Tabs">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`group inline-flex items-center py-4 px-1 border-b-2 font-medium text-sm ${
                      activeTab === tab.id
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <Icon
                      className={`-ml-0.5 mr-2 h-5 w-5 ${
                        activeTab === tab.id
                          ? 'text-blue-500'
                          : 'text-gray-400 group-hover:text-gray-500'
                      }`}
                    />
                    <span>{tab.name}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Descripción de la pestaña activa */}
          <div className="px-6 py-3 bg-gray-50">
            <p className="text-sm text-gray-600">
              {tabs.find(tab => tab.id === activeTab)?.description}
            </p>
          </div>
        </div>

        {/* Contenido de la pestaña */}
        <div className="space-y-6">
          {renderContent()}
        </div>
      </div>
    </div>
  );
}

// Componente de resumen del marketplace
const MarketplaceOverview: React.FC = () => {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  React.useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const response = await fetch('/api/dentist/marketplace-stats');
      const data = await response.json();

      if (response.ok) {
        setStats(data);
      }
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Cargando estadísticas...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Estadísticas principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Package className="h-8 w-8 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Productos Activos</p>
              <p className="text-2xl font-bold text-gray-900">
                {stats?.stats?.products?.activeProducts || 0}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <ShoppingCart className="h-8 w-8 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Órdenes Totales</p>
              <p className="text-2xl font-bold text-gray-900">
                {stats?.stats?.sales?.totalOrders || 0}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <TrendingUp className="h-8 w-8 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Ingresos Brutos</p>
              <p className="text-2xl font-bold text-gray-900">
                ${stats?.stats?.sales?.totalRevenue?.toLocaleString() || 0}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="h-8 w-8 bg-purple-600 rounded-full flex items-center justify-center">
                <span className="text-white font-bold text-sm">$</span>
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Ingresos Netos</p>
              <p className="text-2xl font-bold text-gray-900">
                ${stats?.netRevenue?.toLocaleString() || 0}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Límites del plan */}
      {stats?.limits && (
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Límites de tu Plan
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Productos creados:</span>
              <span className="font-medium">
                {stats.limits.current || 0}
                {stats.limits.limit && ` / ${stats.limits.limit}`}
              </span>
            </div>
            {!stats.limits.canCreate && stats.limits.reason && (
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm text-yellow-800">
                  {stats.limits.reason}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Productos top */}
      {stats?.topProducts && stats.topProducts.length > 0 && (
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Productos Más Vendidos
          </h3>
          <div className="space-y-3">
            {stats.topProducts.map((product: any, index: number) => (
              <div key={product._id} className="flex justify-between items-center py-2">
                <div className="flex items-center space-x-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-800 rounded-full flex items-center justify-center text-sm font-medium">
                    {index + 1}
                  </span>
                  <div>
                    <p className="font-medium text-gray-900">{product.name}</p>
                    <p className="text-sm text-gray-500">${product.price.toLocaleString()}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-medium text-gray-900">{product.totalSold} vendidos</p>
                  <p className="text-sm text-gray-500">
                    ${product.totalRevenue.toLocaleString()} generados
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Información sobre comisiones */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-blue-900 mb-2">
          💡 Información sobre Comisiones
        </h3>
        <div className="text-sm text-blue-800 space-y-2">
          <p>
            <strong>Plan Free:</strong> 8.5% de comisión por venta
          </p>
          <p>
            <strong>Plan Pro/Elite:</strong> 0% de comisión por venta
          </p>
          <p>
            Actualiza tu plan para maximizar tus ganancias y acceder a funciones premium del marketplace.
          </p>
        </div>
      </div>
    </div>
  );
};

// Componente de vista previa de la tienda
const StorePreview: React.FC = () => {
  const [dentistId, setDentistId] = useState<string>('');

  React.useEffect(() => {
    // En un caso real, obtendríamos el ID del dentista de la sesión
    // Por ahora simulamos que está disponible
    const getCurrentDentistId = async () => {
      // Implementar lógica para obtener el ID del dentista actual
      // setDentistId(id);
    };
    getCurrentDentistId();
  }, []);

  return (
    <div className="space-y-6">
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <h3 className="text-lg font-semibold text-yellow-800 mb-2">
          Vista Previa de tu Tienda
        </h3>
        <p className="text-yellow-700 text-sm">
          Así es como los clientes verán tus productos. Esta vista es pública y se puede compartir.
        </p>
      </div>

      {/* Aquí iría el componente DentistStorePreview cuando tengamos el dentistId */}
      <div className="bg-white p-8 rounded-lg shadow text-center">
        <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          Vista Previa de la Tienda
        </h3>
        <p className="text-gray-600">
          Agrega productos para ver cómo se verá tu tienda para los clientes.
        </p>
      </div>
    </div>
  );
};
