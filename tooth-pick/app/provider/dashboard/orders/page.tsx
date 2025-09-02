'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { toast } from 'react-hot-toast'

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
  
  // 📦 CAMPOS EXPANDIDOS PARA TRACKING
  trackingNumber?: string
  shippingProvider?: string
  trackingUrl?: string
  estimatedDelivery?: string
  providerNotes?: string
  
  createdAt: string
  updatedAt: string
}

export default function ProviderOrdersPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState('')
  const [updatingOrder, setUpdatingOrder] = useState<string | null>(null)
  
  // 📝 ESTADO PARA FORMULARIO DE TRACKING
  const [showTrackingModal, setShowTrackingModal] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [trackingForm, setTrackingForm] = useState({
    status: '',
    trackingNumber: '',
    shippingProvider: '',
    trackingUrl: '',
    estimatedDelivery: '',
    providerNotes: ''
  })

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    }
    if (session?.user?.role !== 'provider') {
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

    if (session?.user?.role === 'provider') {
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

  // 📝 FUNCIONES PARA MANEJAR TRACKING MODAL
  const openTrackingModal = (order: Order) => {
    setSelectedOrder(order)
    setTrackingForm({
      status: order.status,
      trackingNumber: order.trackingNumber || '',
      shippingProvider: order.shippingProvider || '',
      trackingUrl: order.trackingUrl || '',
      estimatedDelivery: order.estimatedDelivery ? 
        new Date(order.estimatedDelivery).toISOString().split('T')[0] : '',
      providerNotes: order.providerNotes || ''
    })
    setShowTrackingModal(true)
  }

  const closeTrackingModal = () => {
    setShowTrackingModal(false)
    setSelectedOrder(null)
    setTrackingForm({
      status: '',
      trackingNumber: '',
      shippingProvider: '',
      trackingUrl: '',
      estimatedDelivery: '',
      providerNotes: ''
    })
  }

  const submitTrackingUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedOrder) return

    setUpdatingOrder(selectedOrder._id)

    try {
      const updateData = {
        ...trackingForm,
        estimatedDelivery: trackingForm.estimatedDelivery ? 
          new Date(trackingForm.estimatedDelivery).toISOString() : undefined
      }

      const res = await fetch(`/api/orders/${selectedOrder._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData)
      })

      if (res.ok) {
        const data = await res.json()
        toast.success('Orden actualizada exitosamente')
        
        // Actualizar la orden en la lista
        setOrders(orders.map(order => 
          order._id === selectedOrder._id ? 
          { ...order, ...data.order } : order
        ))
        
        closeTrackingModal()
      } else {
        const errorData = await res.json()
        toast.error(errorData.error || 'Error al actualizar orden')
      }
    } catch (error) {
      console.error('Error:', error)
      toast.error('Error de conexión')
    } finally {
      setUpdatingOrder(null)
    }
  }

  const updateOrderStatus = async (orderId: string, newStatus: string, trackingNumber?: string) => {
    setUpdatingOrder(orderId)
    
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          status: newStatus,
          ...(trackingNumber && { trackingNumber })
        })
      })

      if (res.ok) {
        // Actualizar el estado local
        setOrders(orders.map(order => 
          order._id === orderId 
            ? { ...order, status: newStatus, ...(trackingNumber && { trackingNumber }) }
            : order
        ))
        toast.success('Estado actualizado exitosamente')
      } else {
        toast.error('Error al actualizar estado')
      }
    } catch (error) {
      toast.error('Error al actualizar estado')
    } finally {
      setUpdatingOrder(null)
    }
  }

  const getNextStatus = (currentStatus: string) => {
    const statusFlow = {
      pending: 'confirmed',
      confirmed: 'processing',
      processing: 'shipped',
      shipped: 'delivered'
    }
    return statusFlow[currentStatus as keyof typeof statusFlow]
  }

  const getNextStatusLabel = (currentStatus: string) => {
    const labels = {
      pending: 'Confirmar',
      confirmed: 'Procesar',
      processing: 'Enviar',
      shipped: 'Marcar Entregado'
    }
    return labels[currentStatus as keyof typeof labels]
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
                onClick={() => router.push('/provider/dashboard')}
                className="text-blue-600 hover:text-blue-700 mb-4 flex items-center"
              >
                ← Volver al Dashboard
              </button>
              <h1 className="text-3xl font-bold text-gray-900">Órdenes Recibidas</h1>
              <p className="text-gray-600 mt-1">Gestiona las ventas de tus productos</p>
            </div>
            <div className="text-sm text-gray-500">
              {filteredOrders.length} de {orders.length} órdenes
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        
        {/* Estadísticas rápidas */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <h3 className="text-sm font-medium text-gray-500">Total Órdenes</h3>
            <p className="text-2xl font-bold text-gray-900">{orders.length}</p>
          </div>
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <h3 className="text-sm font-medium text-gray-500">Pendientes</h3>
            <p className="text-2xl font-bold text-yellow-600">
              {orders.filter(o => o.status === 'pending').length}
            </p>
          </div>
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <h3 className="text-sm font-medium text-gray-500">En Proceso</h3>
            <p className="text-2xl font-bold text-blue-600">
              {orders.filter(o => ['confirmed', 'processing'].includes(o.status)).length}
            </p>
          </div>
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <h3 className="text-sm font-medium text-gray-500">Entregadas</h3>
            <p className="text-2xl font-bold text-green-600">
              {orders.filter(o => o.status === 'delivered').length}
            </p>
          </div>
        </div>

        {/* Filtros */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <h2 className="text-lg font-semibold">Filtrar Órdenes</h2>
            
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
          </div>
        </div>

        {/* Tabla de Órdenes */}
        {filteredOrders.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm p-12 text-center">
            <div className="text-gray-500 text-lg mb-4">No hay órdenes aún</div>
            <p className="text-gray-400">Las órdenes aparecerán aquí cuando los distribuidores compren tus productos</p>
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
                      Distribuidor
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Fecha
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Monto
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
                        <div className="font-medium text-gray-900">{order.buyerId.name}</div>
                        <div className="text-sm text-gray-500">{order.buyerId.email}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatDate(order.createdAt)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="font-medium text-gray-900">
                          {formatPrice(order.subtotal, order.currency)}
                        </div>
                        <div className="text-xs text-gray-500">
                          (Total: {formatPrice(order.total, order.currency)})
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
                        
                        {/* 📝 NUEVO BOTÓN PARA TRACKING COMPLETO */}
                        <button
                          onClick={() => openTrackingModal(order)}
                          className="bg-blue-600 text-white px-3 py-1 rounded text-xs hover:bg-blue-700"
                        >
                          📦 Actualizar
                        </button>
                        
                        {getNextStatus(order.status) && (
                          <button
                            onClick={() => {
                              const nextStatus = getNextStatus(order.status)
                              updateOrderStatus(order._id, nextStatus)
                            }}
                            disabled={updatingOrder === order._id}
                            className="bg-green-600 text-white px-3 py-1 rounded text-xs hover:bg-green-700 disabled:opacity-50"
                          >
                            {updatingOrder === order._id ? 'Actualizando...' : getNextStatusLabel(order.status)}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
        
        {/* 📝 MODAL DE TRACKING COMPLETO */}
        {showTrackingModal && selectedOrder && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">
                  📦 Actualizar Orden #{selectedOrder.orderNumber}
                </h3>
                <button 
                  onClick={closeTrackingModal}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
              
              <form onSubmit={submitTrackingUpdate} className="space-y-4">
                {/* Estado */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Estado de la Orden
                  </label>
                  <select
                    value={trackingForm.status}
                    onChange={(e) => setTrackingForm({...trackingForm, status: e.target.value})}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="pending">⏳ Pendiente</option>
                    <option value="confirmed">✅ Confirmada</option>
                    <option value="processing">🔄 Procesando</option>
                    <option value="shipped">📦 Enviado</option>
                    <option value="delivered">🎉 Entregado</option>
                    <option value="cancelled">❌ Cancelado</option>
                  </select>
                </div>

                {/* Paquetería */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Paquetería
                  </label>
                  <select
                    value={trackingForm.shippingProvider}
                    onChange={(e) => setTrackingForm({...trackingForm, shippingProvider: e.target.value})}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Seleccionar paquetería</option>
                    <option value="FedEx">FedEx</option>
                    <option value="DHL">DHL</option>
                    <option value="Estafeta">Estafeta</option>
                    <option value="Paquete Express">Paquete Express</option>
                    <option value="UPS">UPS</option>
                    <option value="Correos de México">Correos de México</option>
                    <option value="Otro">Otro</option>
                  </select>
                </div>

                {/* Número de rastreo */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Número de Rastreo
                  </label>
                  <input
                    type="text"
                    value={trackingForm.trackingNumber}
                    onChange={(e) => setTrackingForm({...trackingForm, trackingNumber: e.target.value})}
                    placeholder="Ej: 1234567890"
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* URL de rastreo */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    URL de Rastreo (opcional)
                  </label>
                  <input
                    type="url"
                    value={trackingForm.trackingUrl}
                    onChange={(e) => setTrackingForm({...trackingForm, trackingUrl: e.target.value})}
                    placeholder="https://..."
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Fecha estimada */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Fecha Estimada de Entrega
                  </label>
                  <input
                    type="date"
                    value={trackingForm.estimatedDelivery}
                    onChange={(e) => setTrackingForm({...trackingForm, estimatedDelivery: e.target.value})}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Notas del proveedor */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Notas Adicionales
                  </label>
                  <textarea
                    value={trackingForm.providerNotes}
                    onChange={(e) => setTrackingForm({...trackingForm, providerNotes: e.target.value})}
                    placeholder="Información adicional sobre el envío..."
                    rows={3}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Botones */}
                <div className="flex space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={closeTrackingModal}
                    className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-400"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={updatingOrder === selectedOrder._id}
                    className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50"
                  >
                    {updatingOrder === selectedOrder._id ? 'Actualizando...' : 'Actualizar'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
