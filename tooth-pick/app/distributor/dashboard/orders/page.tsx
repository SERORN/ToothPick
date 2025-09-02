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
    price: number
    quantity: number
    subtotal: number
  }>
  subtotal: number
  platformFee: number
  total: number
  currency: string
  status: string
  
  // 📦 CAMPOS DE TRACKING EXPANDIDOS
  trackingNumber?: string
  shippingProvider?: string
  trackingUrl?: string
  estimatedDelivery?: string
  providerNotes?: string
  
  // 📅 TIMESTAMPS DETALLADOS
  confirmedAt?: string
  processingAt?: string
  shippedAt?: string
  deliveredAt?: string
  cancelledAt?: string
  
  createdAt: string
  updatedAt: string
}

export default function DistributorOrdersPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState('')
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [showTimelineModal, setShowTimelineModal] = useState(false)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    }
    if (session?.user?.role !== 'distributor') {
      router.push('/')
    }
  }, [session, status, router])

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const res = await fetch('/api/orders')
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

    if (session?.user?.role === 'distributor') {
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

  // 🚚 FUNCIONES PARA MANEJAR TIMELINE MODAL
  const openTimelineModal = (order: Order) => {
    setSelectedOrder(order)
    setShowTimelineModal(true)
  }

  const closeTimelineModal = () => {
    setShowTimelineModal(false)
    setSelectedOrder(null)
  }

  const filteredOrders = filterStatus
    ? orders.filter(order => order.status === filterStatus)
    : orders

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-lg">Cargando órdenes...</div>
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
              <button
                onClick={() => router.push('/distributor/dashboard')}
                className="text-blue-600 hover:text-blue-700 mb-4 flex items-center"
              >
                ← Volver al Dashboard
              </button>
              <h1 className="text-3xl font-bold text-gray-900">Mis Órdenes de Compra</h1>
              <p className="text-gray-600 mt-1">Gestiona todas tus compras a proveedores</p>
            </div>
            <div className="text-sm text-gray-500">
              {filteredOrders.length} de {orders.length} órdenes
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        
        {/* Filtros */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <h2 className="text-lg font-semibold">Filtrar Órdenes</h2>
            
            <div className="flex gap-4">
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Todos los estados</option>
                <option value="pending">Pendiente</option>
                <option value="confirmed">Confirmada</option>
                <option value="processing">Procesando</option>
                <option value="shipped">Enviado</option>
                <option value="delivered">Entregado</option>
                <option value="cancelled">Cancelado</option>
              </select>
              
              <button
                onClick={() => router.push('/distributor/dashboard/catalog')}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
              >
                Nueva Compra
              </button>
            </div>
          </div>
        </div>

        {/* Tabla de Órdenes */}
        {filteredOrders.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm p-12 text-center">
            <div className="text-gray-500 text-lg mb-4">No tienes órdenes aún</div>
            <button
              onClick={() => router.push('/distributor/dashboard/catalog')}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition"
            >
              Explorar Catálogo
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Orden
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Proveedor
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
                  {filteredOrders.map((order) => (
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
                          + {formatPrice(order.platformFee, order.currency)} ToothPick
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(order.status)}
                        {order.trackingNumber && (
                          <div className="text-xs text-gray-500 mt-1">
                            Tracking: {order.trackingNumber}
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
                        
                        {/* 🚚 NUEVO BOTÓN DE SEGUIMIENTO */}
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
          </div>
        )}
        
        {/* 🚚 MODAL DE SEGUIMIENTO CON TIMELINE */}
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
              
              {/* Información básica de la orden */}
              <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Proveedor</p>
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
                    <p className="text-sm text-gray-600">Fecha de Orden</p>
                    <p className="font-medium">{formatDate(selectedOrder.createdAt)}</p>
                  </div>
                </div>
                
                {/* Notas del proveedor si existen */}
                {selectedOrder.providerNotes && (
                  <div className="mt-4">
                    <p className="text-sm text-gray-600">Notas del Proveedor</p>
                    <p className="text-sm bg-blue-50 p-2 rounded mt-1">{selectedOrder.providerNotes}</p>
                  </div>
                )}
              </div>
              
              {/* Timeline de seguimiento */}
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
              
              {/* Botón para ir al detalle completo */}
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
