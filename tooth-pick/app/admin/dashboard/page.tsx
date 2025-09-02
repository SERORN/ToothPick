'use client'

import { useSession, signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import Link from 'next/link'

interface DashboardStats {
  overview: {
    totalUsers: number;
    totalProducts: number;
    totalOrders: number;
    totalRevenue: number;
    platformCommission: number;
    activeProviders: number;
    activeDistributors: number;
  };
  financial: {
    totalSales: number;
    totalCommissions: number;
    netRevenue: number;
    averageOrderValue: number;
  };
  topPerformers: {
    providers: Array<{
      _id: string;
      name: string;
      totalSales: number;
      orderCount: number;
    }>;
    distributors: Array<{
      _id: string;
      name: string;
      totalSpent: number;
      orderCount: number;
    }>;
    products: Array<{
      _id: string;
      name: string;
      quantitySold: number;
      revenue: number;
    }>;
  };
  monthlySales: Array<{
    month: string;
    sales: number;
    orders: number;
  }>;
}

export default function AdminDashboard() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    }
    if (session && session.user.role !== 'admin') {
      router.push('/')
    }
  }, [session, status, router])

  useEffect(() => {
    if (session?.user.role === 'admin') {
      fetchStats()
    }
  }, [session])

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/admin/stats')
      if (response.ok) {
        const data = await response.json()
        setStats(data)
      }
    } catch (error) {
      console.error('Error fetching stats:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP'
    }).format(amount)
  }

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <div className="text-lg">Cargando panel de administración...</div>
        </div>
      </div>
    )
  }

  if (!stats) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <h2 className="text-xl text-gray-600 mb-4">Error al cargar estadísticas</h2>
          <button 
            onClick={fetchStats}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
          >
            Reintentar
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Panel de Administración</h1>
              <p className="text-sm text-gray-600">Gestión completa del sistema Tooth Pick</p>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-700">
                👑 Admin: {session?.user.name}
              </span>
              <button
                onClick={() => signOut({ callbackUrl: '/login' })}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm transition"
              >
                Cerrar Sesión
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          
          {/* Stats Overview */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-blue-600 text-white rounded-xl p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold">Usuarios Totales</h3>
                  <p className="text-3xl font-bold">{stats.overview.totalUsers}</p>
                </div>
                <div className="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3z"/>
                  </svg>
                </div>
              </div>
              <p className="text-blue-200 text-sm mt-2">
                {stats.overview.activeProviders} proveedores, {stats.overview.activeDistributors} distribuidores
              </p>
            </div>
            
            <div className="bg-green-600 text-white rounded-xl p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold">Productos Activos</h3>
                  <p className="text-3xl font-bold">{stats.overview.totalProducts}</p>
                </div>
                <div className="w-12 h-12 bg-green-500 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 2L3 7v11a1 1 0 001 1h3a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1h3a1 1 0 001-1V7l-7-5z"/>
                  </svg>
                </div>
              </div>
              <p className="text-green-200 text-sm mt-2">Catálogo disponible</p>
            </div>
            
            <div className="bg-purple-600 text-white rounded-xl p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold">Órdenes Totales</h3>
                  <p className="text-3xl font-bold">{stats.overview.totalOrders}</p>
                </div>
                <div className="w-12 h-12 bg-purple-500 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M6 2a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2V4a2 2 0 00-2-2H6zm1 2a1 1 0 000 2h6a1 1 0 100-2H7zm6 7a1 1 0 11-2 0 1 1 0 012 0zm-3 3a1 1 0 11-2 0 1 1 0 012 0z"/>
                  </svg>
                </div>
              </div>
              <p className="text-purple-200 text-sm mt-2">
                Promedio: {formatCurrency(stats.financial.averageOrderValue)}
              </p>
            </div>
            
            <div className="bg-orange-600 text-white rounded-xl p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold">Comisiones ToothPick</h3>
                  <p className="text-3xl font-bold">{formatCurrency(stats.financial.totalCommissions)}</p>
                </div>
                <div className="w-12 h-12 bg-orange-500 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z"/>
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z"/>
                  </svg>
                </div>
              </div>
              <p className="text-orange-200 text-sm mt-2">5.5% comisión B2B | 8.5% comisión B2C</p>
            </div>
          </div>

          {/* Management Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            {/* Financial Summary */}
            <div className="bg-white shadow-md rounded-xl p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">� Resumen Financiero</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Ventas Totales:</span>
                  <span className="font-semibold">{formatCurrency(stats.financial.totalSales)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Comisiones ToothPick:</span>
                  <span className="font-semibold text-green-600">
                    {formatCurrency(stats.financial.totalCommissions)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Valor Promedio Orden:</span>
                  <span className="font-semibold">{formatCurrency(stats.financial.averageOrderValue)}</span>
                </div>
              </div>
            </div>

            {/* Top Providers */}
            <div className="bg-white shadow-md rounded-xl p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">🏆 Top Proveedores</h3>
              <div className="space-y-3">
                {stats.topPerformers.providers.slice(0, 3).map((provider, index) => (
                  <div key={provider._id} className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                        <span className="text-xs font-bold text-blue-600">{index + 1}</span>
                      </div>
                      <span className="text-sm text-gray-900">{provider.name}</span>
                    </div>
                    <span className="text-sm font-medium text-gray-600">
                      {formatCurrency(provider.totalSales)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Top Distributors */}
            <div className="bg-white shadow-md rounded-xl p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">🚚 Top Distribuidores</h3>
              <div className="space-y-3">
                {stats.topPerformers.distributors.slice(0, 3).map((distributor, index) => (
                  <div key={distributor._id} className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
                        <span className="text-xs font-bold text-green-600">{index + 1}</span>
                      </div>
                      <span className="text-sm text-gray-900">{distributor.name}</span>
                    </div>
                    <span className="text-sm font-medium text-gray-600">
                      {formatCurrency(distributor.totalSpent)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Monthly Sales */}
          <div className="bg-white shadow-md rounded-xl p-6 mb-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-6">📈 Ventas por Mes (Últimos 6 meses)</h3>
            <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
              {stats.monthlySales.map((month, index) => (
                <div key={index} className="text-center">
                  <div className="bg-blue-50 rounded-lg p-4 mb-2 hover:bg-blue-100 transition-colors">
                    <p className="text-sm text-gray-600 font-medium">{month.month}</p>
                    <p className="text-lg font-bold text-blue-600">
                      {formatCurrency(month.sales)}
                    </p>
                    <p className="text-xs text-gray-500">{month.orders} órdenes</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Top Products */}
          <div className="bg-white shadow-md rounded-xl p-6 mb-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-6">🏅 Productos Más Vendidos</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                  <tr>
                    <th className="px-6 py-3">Producto</th>
                    <th className="px-6 py-3">Cantidad Vendida</th>
                    <th className="px-6 py-3">Ingresos</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.topPerformers.products.map((product, index) => (
                    <tr key={product._id} className="bg-white border-b hover:bg-gray-50">
                      <td className="px-6 py-4 font-medium text-gray-900">
                        {product.name}
                      </td>
                      <td className="px-6 py-4">{product.quantitySold} unidades</td>
                      <td className="px-6 py-4">{formatCurrency(product.revenue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
            
            <Link href="/admin/users" className="bg-white shadow-md rounded-xl p-6 hover:shadow-lg transition-shadow block">
              <h2 className="text-xl font-semibold mb-2 text-gray-800">👥 Gestionar Usuarios</h2>
              <p className="text-gray-600 mb-4">Administrar roles, permisos y estado de usuarios.</p>
              <div className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm transition inline-block">
                Ir a Gestión
              </div>
            </Link>

            <Link href="/admin/products" className="bg-white shadow-md rounded-xl p-6 hover:shadow-lg transition-shadow block">
              <h2 className="text-xl font-semibold mb-2 text-gray-800">📦 Gestionar Productos</h2>
              <p className="text-gray-600 mb-4">Moderar productos y controlar activaciones.</p>
              <div className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm transition inline-block">
                Ir a Productos
              </div>
            </Link>

            <Link href="/admin/orders" className="bg-white shadow-md rounded-xl p-6 hover:shadow-lg transition-shadow block">
              <h2 className="text-xl font-semibold mb-2 text-gray-800">📋 Ver Órdenes</h2>
              <p className="text-gray-600 mb-4">Monitorear todas las transacciones de la plataforma.</p>
              <div className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-sm transition inline-block">
                Ver Órdenes
              </div>
            </Link>

            <Link href="/admin/reviews" className="bg-white shadow-md rounded-xl p-6 hover:shadow-lg transition-shadow block">
              <h2 className="text-xl font-semibold mb-2 text-gray-800">📝 Gestionar Reseñas</h2>
              <p className="text-gray-600 mb-4">Moderar reseñas y comentarios de productos.</p>
              <div className="bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded-lg text-sm transition inline-block">
                Ir a Reseñas
              </div>
            </Link>

            <Link href="/admin/rewards" className="bg-white shadow-md rounded-xl p-6 hover:shadow-lg transition-shadow block">
              <h2 className="text-xl font-semibold mb-2 text-gray-800">🎁 Gestionar Recompensas</h2>
              <p className="text-gray-600 mb-4">Administrar puntos y programa de fidelidad.</p>
              <div className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm transition inline-block">
                Ir a Recompensas
              </div>
            </Link>

            <Link href="/admin/lease-requests" className="bg-white shadow-md rounded-xl p-6 hover:shadow-lg transition-shadow block">
              <h2 className="text-xl font-semibold mb-2 text-gray-800">📄 Solicitudes de Arrendamiento</h2>
              <p className="text-gray-600 mb-4">Aprobar y gestionar solicitudes de financiamiento.</p>
              <div className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-sm transition inline-block">
                Ir a Arrendamientos
              </div>
            </Link>

          </div>

        </div>
      </main>
    </div>
  )
}
              <h2 className="text-xl font-semibold mb-2 text-gray-800">� Gestionar Usuarios</h2>
              <p className="text-gray-600 mb-4">Administrar roles, permisos y estado de usuarios.</p>
              <div className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm transition inline-block">
                Ir a Gestión
              </div>
            </Link>

            <Link href="/admin/products" className="bg-white shadow-md rounded-xl p-6 hover:shadow-lg transition-shadow block">
              <h2 className="text-xl font-semibold mb-2 text-gray-800">📦 Gestionar Productos</h2>
              <p className="text-gray-600 mb-4">Moderar productos y controlar activaciones.</p>
              <div className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm transition inline-block">
                Ir a Productos
              </div>
            </Link>

            <Link href="/admin/orders" className="bg-white shadow-md rounded-xl p-6 hover:shadow-lg transition-shadow block">
              <h2 className="text-xl font-semibold mb-2 text-gray-800">📋 Ver Órdenes</h2>
              <p className="text-gray-600 mb-4">Monitorear todas las transacciones de la plataforma.</p>
              <div className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-sm transition inline-block">
                Ver Órdenes
              </div>
            </Link>

          </div>

        </div>
      </main>
    </div>
  )
}
