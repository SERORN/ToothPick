'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { toast } from 'react-hot-toast'
import OrderTimeline from '@/components/OrderTimeline'

interface Order {
  _id: string
  orderNumber: string
  buyerId: {
    _id: string
    name: string
    email: string
  }
  sellerId: {
    _id: string
    name: string
    email: string
  }
  items: Array<{
    name: string
    brand: string
    price: number
    quantity: number
    subtotal: number
    image?: string
  }>
  subtotal: number
  platformFee: number
  total: number
  currency: string
  status: string
  orderType: 'b2c'
  
  // 📦 CAMPOS DE TRACKING
  trackingNumber?: string
  shippingProvider?: string
  trackingUrl?: string
  estimatedDelivery?: string
  
  // 📅 TIMESTAMPS
  confirmedAt?: string
  processingAt?: string
  shippedAt?: string
  deliveredAt?: string
  cancelledAt?: string
  
  createdAt: string
  updatedAt: string
}

export default function CustomerDashboardPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [showTimelineModal, setShowTimelineModal] = useState(false)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    }
    if (session?.user?.role !== 'customer') {
      router.push('/')
    }
  }, [session, status, router])

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const res = await fetch('/api/b2c-orders')
        if (res.ok) {
          const data = await res.json()
          setOrders(data)
        } else {
          toast.error('Error al cargar órdenes')
        }
      } catch (error) {
        toast.error('Error al cargar órdenes')
      } finally {
        setLoading(false)
      }
    }

    if (session?.user?.role === 'customer') {
      fetchOrders()
    }
  }, [session])

  const formatPrice = (price: number, currency: string) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: currency,
    }).format(price)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getStatusBadge = (status: string) => {
    const badges = {
      pending: 'bg-yellow-100 text-yellow-800',
      confirmed: 'bg-blue-100 text-blue-800',
      processing: 'bg-purple-100 text-purple-800',
      shipped: 'bg-indigo-100 text-indigo-800',
      delivered: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800'
    }
    
    const statusLabels = {
      pending: 'Pendiente',
      confirmed: 'Confirmada',
      processing: 'Procesando',
      shipped: 'Enviado',
      delivered: 'Entregado',
      cancelled: 'Cancelado'
    }

    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${badges[status as keyof typeof badges] || badges.pending}`}>
        {statusLabels[status as keyof typeof statusLabels] || status}
      </span>
    )
  }

  const openTimelineModal = (order: Order) => {
    setSelectedOrder(order)
    setShowTimelineModal(true)
  }

  const closeTimelineModal = () => {
    setShowTimelineModal(false)
    setSelectedOrder(null)
  }

  // Calcular estadísticas
  const totalGastado = orders.reduce((total, order) => total + order.total, 0)
  const ordenesEntregadas = orders.filter(o => o.status === 'delivered').length
  const ordenesEnProgreso = orders.filter(o => ['confirmed', 'processing', 'shipped'].includes(o.status)).length

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-lg">Cargando dashboard...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                🧑‍⚕️ Mi Dashboard
              </h1>
              <p className="text-gray-600 mt-1">
                Bienvenido, {session?.user?.name}
              </p>
            </div>
            
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.push('/catalog')}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
              >
                🛒 Ver Catálogo
              </button>
              <button
                onClick={() => router.push('/customer/rewards')}
                className="bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700"
              >
                🎁 Mis Recompensas
              </button>
              <button
                onClick={() => router.push('/customer/referrals')}
                className="bg-orange-600 text-white px-4 py-2 rounded-md hover:bg-orange-700"
              >
                🤝 Referir Amigos
              </button>
              <button
                onClick={() => router.push('/customer/lease-requests')}
                className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700"
              >
                📄 Mis Arrendamientos
              </button>
              <button
                onClick={() => router.push('/checkout')}
                className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700"
              >
                💳 Finalizar Compra
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        
        {/* Estadísticas */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <h3 className="text-sm font-medium text-gray-500">Total de Órdenes</h3>
            <p className="text-2xl font-bold text-gray-900">{orders.length}</p>
          </div>
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <h3 className="text-sm font-medium text-gray-500">En Progreso</h3>
            <p className="text-2xl font-bold text-blue-600">{ordenesEnProgreso}</p>
          </div>
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <h3 className="text-sm font-medium text-gray-500">Entregadas</h3>
            <p className="text-2xl font-bold text-green-600">{ordenesEntregadas}</p>
          </div>
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <h3 className="text-sm font-medium text-gray-500">Total Gastado</h3>
            <p className="text-2xl font-bold text-gray-900">
              {formatPrice(totalGastado, 'MXN')}
            </p>
          </div>
        </div>

        {/* Órdenes recientes */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-xl font-semibold mb-6">Mis Compras</h2>
          
          {orders.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-gray-500 text-lg mb-4">
                No has realizado compras aún
              </div>
              <p className="text-gray-400 mb-6">
                Explora nuestro catálogo y encuentra los productos que necesitas
              </p>
              <button
                onClick={() => router.push('/catalog')}
                className="bg-blue-600 text-white px-6 py-3 rounded-md hover:bg-blue-700"
              >
                🛒 Explorar Catálogo
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Orden
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Distribuidor
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Fecha
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Estado
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {orders.map((order) => (
                    <tr key={order._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="font-medium text-gray-900">{order.orderNumber}</div>
                        <div className="text-sm text-gray-500">{order.items.length} productos</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="font-medium text-gray-900">{order.sellerId.name}</div>
                        <div className="text-sm text-gray-500">{order.sellerId.email}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatDate(order.createdAt)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="font-medium text-gray-900">
                          {formatPrice(order.total, order.currency)}
                        </div>
                        <div className="text-xs text-gray-500">
                          +{formatPrice(order.platformFee, order.currency)} ToothPick
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(order.status)}
                        {order.trackingNumber && (
                          <div className="text-xs text-gray-500 mt-1">
                            📦 {order.trackingNumber}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2">
                        <button
                          onClick={() => router.push(`/orders/${order._id}`)}
                          className="text-blue-600 hover:text-blue-700"
                        >
                          Ver Detalle
                        </button>
                        
                        <button
                          onClick={() => openTimelineModal(order)}
                          className="bg-green-600 text-white px-3 py-1 rounded text-xs hover:bg-green-700"
                        >
                          🚚 Seguimiento
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        
        {/* Modal de Seguimiento */}
        {showTimelineModal && selectedOrder && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">
                  🚚 Seguimiento de Orden #{selectedOrder.orderNumber}
                </h3>
                <button 
                  onClick={closeTimelineModal}
                  className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
                >
                  ×
                </button>
              </div>
              
              {/* Información de la orden */}
              <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Distribuidor</p>
                    <p className="font-medium">{selectedOrder.sellerId.name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Total</p>
                    <p className="font-medium">{formatPrice(selectedOrder.total, selectedOrder.currency)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Productos</p>
                    <p className="font-medium">{selectedOrder.items.length} artículos</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Fecha</p>
                    <p className="font-medium">{formatDate(selectedOrder.createdAt)}</p>
                  </div>
                </div>
              </div>
              
              {/* Timeline */}
              <OrderTimeline
                status={selectedOrder.status}
                confirmedAt={selectedOrder.confirmedAt ? new Date(selectedOrder.confirmedAt) : undefined}
                processingAt={selectedOrder.processingAt ? new Date(selectedOrder.processingAt) : undefined}
                shippedAt={selectedOrder.shippedAt ? new Date(selectedOrder.shippedAt) : undefined}
                deliveredAt={selectedOrder.deliveredAt ? new Date(selectedOrder.deliveredAt) : undefined}
                cancelledAt={selectedOrder.cancelledAt ? new Date(selectedOrder.cancelledAt) : undefined}
                estimatedDelivery={selectedOrder.estimatedDelivery ? new Date(selectedOrder.estimatedDelivery) : undefined}
                trackingNumber={selectedOrder.trackingNumber}
                shippingProvider={selectedOrder.shippingProvider}
                trackingUrl={selectedOrder.trackingUrl}
                isProvider={false}
              />
              
              <div className="mt-6 flex justify-center">
                <button
                  onClick={() => {
                    closeTimelineModal()
                    router.push(`/orders/${selectedOrder._id}`)
                  }}
                  className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700"
                >
                  Ver Detalle Completo
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
