'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import DashboardHeader from '@/components/DashboardHeader'
import { GamificationProvider } from '@/lib/contexts/GamificationContext'
import { GamificationIntegrator } from '@/components/gamification/GamificationIntegrator'
import GamificationMiniDashboard from '@/components/gamification/GamificationMiniDashboard'

export default function DistributorDashboard() {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    }
    if (session && session.user.role !== 'distributor') {
      router.push('/')
    }
  }, [session, status, router])

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-lg">Cargando panel del distribuidor...</div>
      </div>
    )
  }

  return (
    <GamificationProvider userId={session?.user?.id || ''}>
      <div className="min-h-screen bg-gray-50">
        {/* Header with Notifications */}
        <DashboardHeader 
          title="Panel del Distribuidor"
          subtitle="Conectando proveedores con clientes finales"
        />

        {/* Main Content */}
        <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="px-4 py-6 sm:px-0">
            
            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <div className="bg-blue-600 text-white rounded-xl p-6">
                <h3 className="text-lg font-semibold">Productos Publicados</h3>
                <p className="text-3xl font-bold">42</p>
                <p className="text-blue-200 text-sm">+7 este mes</p>
              </div>
              <div className="bg-green-600 text-white rounded-xl p-6">
                <h3 className="text-lg font-semibold">Órdenes del Mes</h3>
                <p className="text-3xl font-bold">18</p>
                <p className="text-green-200 text-sm">+25% vs anterior</p>
              </div>
              <div className="bg-purple-600 text-white rounded-xl p-6">
                <h3 className="text-lg font-semibold">Ventas del Mes</h3>
                <p className="text-3xl font-bold">$35,890</p>
                <p className="text-purple-200 text-sm">Margen: 18%</p>
              </div>
              <div className="bg-orange-600 text-white rounded-xl p-6">
                <h3 className="text-lg font-semibold">Clientes Activos</h3>
                <p className="text-3xl font-bold">12</p>
                <p className="text-orange-200 text-sm">3 nuevos</p>
              </div>
            </div>

            {/* Grid con Gamification en columna derecha */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              
              {/* Management Cards - Columnas izquierdas */}
              <div className="lg:col-span-3 grid grid-cols-1 sm:grid-cols-2 gap-6">
                
                <div className="bg-white shadow-md rounded-xl p-6 hover:shadow-lg transition-shadow">
                  <h2 className="text-xl font-semibold mb-2 text-gray-800">🛒 Catálogo de Proveedores</h2>
                  <p className="text-gray-600 mb-4">Busca y compra productos directamente.</p>
                  <button 
                    onClick={() => router.push('/distributor/dashboard/catalog')}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm transition"
                  >
                    Explorar Catálogo
                  </button>
                </div>

            <div className="bg-white shadow-md rounded-xl p-6 hover:shadow-lg transition-shadow">
              <h2 className="text-xl font-semibold mb-2 text-gray-800">📦 Mis Órdenes</h2>
              <p className="text-gray-600 mb-4">Historial y estado de tus compras.</p>
              <button 
                onClick={() => router.push('/distributor/dashboard/orders')}
                className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-sm transition"
              >
                Ver Órdenes
              </button>
            </div>

            <div className="bg-white shadow-md rounded-xl p-6 hover:shadow-lg transition-shadow">
              <h2 className="text-xl font-semibold mb-2 text-gray-800">📥 Órdenes Entrantes</h2>
              <p className="text-gray-600 mb-4">Revisa pedidos de clínicas y laboratorios.</p>
              <div className="flex items-center justify-between">
                <button className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-sm transition">
                  Ver Órdenes
                </button>
                <span className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded-full">5 pendientes</span>
              </div>
            </div>

            <div className="bg-white shadow-md rounded-xl p-6 hover:shadow-lg transition-shadow">
              <h2 className="text-xl font-semibold mb-2 text-gray-800">🛍️ Mis Compras</h2>
              <p className="text-gray-600 mb-4">Historial de compras a proveedores.</p>
              <button className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm transition">
                Ver Historial
              </button>
            </div>

            <div className="bg-white shadow-md rounded-xl p-6 hover:shadow-lg transition-shadow">
              <h2 className="text-xl font-semibold mb-2 text-gray-800">🏦 Arrendamiento</h2>
              <p className="text-gray-600 mb-4">Solicita financiamiento para tus clientes.</p>
              <button className="bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded-lg text-sm transition">
                Gestionar Solicitudes
              </button>
            </div>

            <div className="bg-white shadow-md rounded-xl p-6 hover:shadow-lg transition-shadow">
              <h2 className="text-xl font-semibold mb-2 text-gray-800">📊 Reportes</h2>
              <p className="text-gray-600 mb-4">Visualiza métricas y rendimiento de ventas.</p>
              <button className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg text-sm transition">
                Ver Reportes
              </button>
            </div>

          </div>

          {/* Two Column Layout */}
          <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Recent Sales */}
            <div className="bg-white rounded-xl shadow-md p-6">
              <h2 className="text-xl font-semibold mb-4 text-gray-800">Ventas Recientes</h2>
              <div className="space-y-3">
                <div className="flex items-center justify-between py-2 border-b border-gray-100">
                  <div>
                    <p className="font-medium text-gray-800">Clínica Dental Sur</p>
                    <p className="text-sm text-gray-600">Instrumental quirúrgico</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-green-600">$4,850</p>
                    <p className="text-xs text-gray-500">Hace 2 horas</p>
                  </div>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-gray-100">
                  <div>
                    <p className="font-medium text-gray-800">Laboratorio XYZ</p>
                    <p className="text-sm text-gray-600">Material de impresión</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-green-600">$2,340</p>
                    <p className="text-xs text-gray-500">Ayer</p>
                  </div>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-gray-100">
                  <div>
                    <p className="font-medium text-gray-800">Dr. Martínez</p>
                    <p className="text-sm text-gray-600">Implantes dentales</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-green-600">$8,900</p>
                    <p className="text-xs text-gray-500">Hace 2 días</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Pending Orders */}
            <div className="bg-white rounded-xl shadow-md p-6">
              <h2 className="text-xl font-semibold mb-4 text-gray-800">Órdenes Pendientes</h2>
              <div className="space-y-3">
                <div className="flex items-center justify-between py-2 border-b border-gray-100">
                  <div>
                    <p className="font-medium text-gray-800">Pedido #ORD-456</p>
                    <p className="text-sm text-gray-600">Consultorio ABC</p>
                  </div>
                  <div className="text-right">
                    <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded-full">Pendiente</span>
                    <p className="text-xs text-gray-500 mt-1">$3,450</p>
                  </div>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-gray-100">
                  <div>
                    <p className="font-medium text-gray-800">Pedido #ORD-457</p>
                    <p className="text-sm text-gray-600">Clínica Norte</p>
                  </div>
                  <div className="text-right">
                    <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">En proceso</span>
                    <p className="text-xs text-gray-500 mt-1">$6,780</p>
                  </div>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-gray-100">
                  <div>
                    <p className="font-medium text-gray-800">Pedido #ORD-458</p>
                    <p className="text-sm text-gray-600">Dr. González</p>
                  </div>
                  <div className="text-right">
                    <span className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded-full">Urgente</span>
                    <p className="text-xs text-gray-500 mt-1">$1,890</p>
                  </div>
                </div>
              </div>
            </div>

          </div>

        </div>
      </main>
    </div>
  )
}
