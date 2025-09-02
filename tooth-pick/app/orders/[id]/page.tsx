'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter, useParams } from 'next/navigation'
import { toast } from 'react-hot-toast'
import OrderTimeline from '@/components/OrderTimeline'
import { calculateSellerAmount, getFeePercentageString } from '@/lib/config/fees'

interface OrderItem {
  productId: string
  name: string
  brand: string
  price: number
  quantity: number
  subtotal: number
  currency: string
  image?: string
  provider: {
    id: string
    name: string
  }
}

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
  items: OrderItem[]
  shipping: {
    fullName: string
    company?: string
    address: string
    city: string
    state: string
    zipCode: string
    phone: string
    email: string
    notes?: string
  }
  subtotal: number
  platformFee: number
  total: number
  currency: string
  status: string
  orderType?: 'b2b' | 'b2c'
  
  // 📦 CAMPOS DE TRACKING EXPANDIDOS
  trackingNumber?: string
  shippingProvider?: string
  trackingUrl?: string
  
  // 📅 TIMESTAMPS DETALLADOS
  confirmedAt?: string
  processingAt?: string
  shippedAt?: string
  deliveredAt?: string
  cancelledAt?: string
  estimatedDelivery?: string
  
  providerNotes?: string
  createdAt: string
  updatedAt: string
}

export default function OrderDetailPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const params = useParams()
  const orderId = params?.id

  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    }
  }, [session, status, router])

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        const res = await fetch(`/api/orders/${orderId}`)
        if (res.ok) {
          const data = await res.json()
          setOrder(data)
        } else {
          toast.error('Error al cargar orden')
          router.push('/dashboard')
        }
      } catch (error) {
        toast.error('Error al cargar orden')
        router.push('/dashboard')
      } finally {
        setLoading(false)
      }
    }

    if (orderId && session) {
      fetchOrder()
    }
  }, [orderId, session, router])

  const formatPrice = (price: number, currency: string) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: currency,
    }).format(price)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getStatusInfo = (status: string) => {
    const statusConfig = {
      pending: { 
        color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
        icon: '⏳',
        label: 'Pendiente de Confirmación'
      },
      confirmed: { 
        color: 'bg-blue-100 text-blue-800 border-blue-200',
        icon: '✅',
        label: 'Confirmada'
      },
      processing: { 
        color: 'bg-purple-100 text-purple-800 border-purple-200',
        icon: '⚙️',
        label: 'En Procesamiento'
      },
      shipped: { 
        color: 'bg-indigo-100 text-indigo-800 border-indigo-200',
        icon: '🚚',
        label: 'Enviado'
      },
      delivered: { 
        color: 'bg-green-100 text-green-800 border-green-200',
        icon: '📦',
        label: 'Entregado'
      },
      cancelled: { 
        color: 'bg-red-100 text-red-800 border-red-200',
        icon: '❌',
        label: 'Cancelado'
      }
    }

    return statusConfig[status as keyof typeof statusConfig] || statusConfig.pending
  }

  const handleGoBack = () => {
    if (session?.user?.role === 'distributor') {
      router.push('/distributor/dashboard/orders')
    } else if (session?.user?.role === 'provider') {
      router.push('/provider/dashboard/orders')
    } else {
      router.push('/dashboard')
    }
  }

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-lg">Cargando orden...</div>
      </div>
    )
  }

  if (!order) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Orden no encontrada</h2>
          <button
            onClick={handleGoBack}
            className="text-blue-600 hover:text-blue-700"
          >
            ← Volver
          </button>
        </div>
      </div>
    )
  }

  const statusInfo = getStatusInfo(order.status)
  const isProvider = session?.user?.role === 'provider' && 
                    order?.sellerId._id === session?.user?.id
  const isBuyer = order?.buyerId._id === session?.user?.id
  const isDistributor = session?.user?.role === 'distributor'
  
  const sellerReceives = calculateSellerAmount(order.subtotal, order.orderType || 'b2b')
  const feePercentage = getFeePercentageString(order.orderType || 'b2b')

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4">
        
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={handleGoBack}
            className="text-blue-600 hover:text-blue-700 mb-4 flex items-center"
          >
            ← Volver a {isProvider ? 'Órdenes Recibidas' : 'Mis Órdenes'}
          </button>
          
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">
                  Orden #{order.orderNumber}
                </h1>
                <p className="text-gray-600">
                  Creada el {formatDate(order.createdAt)}
                </p>
              </div>
              
              <div className="mt-4 lg:mt-0">
                <div className={`inline-flex items-center px-4 py-2 rounded-lg border ${statusInfo.color}`}>
                  <span className="mr-2 text-lg">{statusInfo.icon}</span>
                  <span className="font-medium">{statusInfo.label}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Columna Principal - Timeline y Detalles */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* 🚚 TIMELINE DE SEGUIMIENTO - NUEVA SECCIÓN */}
            <OrderTimeline
              status={order.status}
              confirmedAt={order.confirmedAt ? new Date(order.confirmedAt) : undefined}
              processingAt={order.processingAt ? new Date(order.processingAt) : undefined}
              shippedAt={order.shippedAt ? new Date(order.shippedAt) : undefined}
              deliveredAt={order.deliveredAt ? new Date(order.deliveredAt) : undefined}
              cancelledAt={order.cancelledAt ? new Date(order.cancelledAt) : undefined}
              estimatedDelivery={order.estimatedDelivery ? new Date(order.estimatedDelivery) : undefined}
              trackingNumber={order.trackingNumber}
              shippingProvider={order.shippingProvider}
              trackingUrl={order.trackingUrl}
              isProvider={isProvider}
            />
            
            {/* Productos */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-xl font-semibold mb-6">📦 Productos Ordenados</h2>
              
              <div className="space-y-4">
                {order.items.map((item, index) => (
                  <div key={index} className="flex items-center space-x-4 border-b pb-4 last:border-b-0">
                    <div className="w-16 h-16 bg-gray-100 rounded-lg flex-shrink-0 overflow-hidden">
                      {item.image ? (
                        <img
                          src={item.image}
                          alt={item.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">
                          Sin imagen
                        </div>
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-gray-900 truncate">{item.name}</h3>
                      <p className="text-sm text-gray-600">{item.brand}</p>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-sm text-gray-500">
                          {formatPrice(item.price, item.currency)} × {item.quantity}
                        </span>
                        <span className="font-semibold text-gray-900">
                          {formatPrice(item.subtotal, item.currency)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Información de Envío */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-xl font-semibold mb-6">Información de Envío</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h3 className="font-medium text-gray-900 mb-2">Destinatario</h3>
                  <p className="text-gray-600">{order.shipping.fullName}</p>
                  {order.shipping.company && (
                    <p className="text-gray-600">{order.shipping.company}</p>
                  )}
                  <p className="text-gray-600">{order.shipping.email}</p>
                  <p className="text-gray-600">{order.shipping.phone}</p>
                </div>
                
                <div>
                  <h3 className="font-medium text-gray-900 mb-2">Dirección</h3>
                  <p className="text-gray-600">{order.shipping.address}</p>
                  <p className="text-gray-600">
                    {order.shipping.city}, {order.shipping.state} {order.shipping.zipCode}
                  </p>
                </div>
              </div>
              
              {order.shipping.notes && (
                <div className="mt-4">
                  <h3 className="font-medium text-gray-900 mb-2">Notas Especiales</h3>
                  <p className="text-gray-600 bg-gray-50 p-3 rounded-lg">{order.shipping.notes}</p>
                </div>
              )}
            </div>

            {/* Tracking */}
            {order.trackingNumber && (
              <div className="bg-white rounded-xl shadow-sm p-6">
                <h2 className="text-xl font-semibold mb-4">Información de Seguimiento</h2>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center">
                    <span className="text-blue-600 mr-2">📦</span>
                    <div>
                      <p className="font-medium text-blue-900">Número de Tracking</p>
                      <p className="text-blue-700 font-mono">{order.trackingNumber}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            
            {/* Resumen Financiero */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-xl font-semibold mb-6">Resumen de Costos</h2>
              
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Subtotal:</span>
                  <span className="font-medium">{formatPrice(order.subtotal, order.currency)}</span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-gray-600">Comisión ToothPick:</span>
                  <span className="font-medium text-blue-600">{formatPrice(order.platformFee, order.currency)}</span>
                </div>
                
                <div className="border-t pt-3">
                  <div className="flex justify-between">
                    <span className="text-lg font-semibold">Total:</span>
                    <span className="text-lg font-bold">{formatPrice(order.total, order.currency)}</span>
                  </div>
                </div>
              </div>

              {isProvider && (
                <div className="mt-6 pt-6 border-t">
                  <h3 className="font-medium text-gray-900 mb-2">Tu Ganancia</h3>
                  <p className="text-2xl font-bold text-green-600">
                    {formatPrice(order.subtotal, order.currency)}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    (Sin incluir comisión ToothPick)
                  </p>
                </div>
              )}
            </div>

            {/* Información de Contacto */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-xl font-semibold mb-6">
                {isProvider ? 'Comprador' : 'Proveedor'}
              </h2>
              
              <div className="space-y-3">
                <div>
                  <p className="font-medium text-gray-900">
                    {isProvider ? order.buyerId.name : order.sellerId.name}
                  </p>
                  <p className="text-gray-600">
                    {isProvider ? order.buyerId.email : order.sellerId.email}
                  </p>
                </div>
              </div>
            </div>

            {/* Timeline */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-xl font-semibold mb-6">Estado de la Orden</h2>
              
              <div className="space-y-4">
                <div className="flex items-center">
                  <div className="w-8 h-8 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-sm font-medium mr-3">
                    ✓
                  </div>
                  <div>
                    <p className="font-medium">Orden Creada</p>
                    <p className="text-sm text-gray-500">{formatDate(order.createdAt)}</p>
                  </div>
                </div>
                
                {order.status !== 'pending' && (
                  <div className="flex items-center">
                    <div className="w-8 h-8 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-sm font-medium mr-3">
                      ✓
                    </div>
                    <div>
                      <p className="font-medium">Confirmada</p>
                      <p className="text-sm text-gray-500">Por el proveedor</p>
                    </div>
                  </div>
                )}
                
                {['processing', 'shipped', 'delivered'].includes(order.status) && (
                  <div className="flex items-center">
                    <div className="w-8 h-8 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-sm font-medium mr-3">
                      ✓
                    </div>
                    <div>
                      <p className="font-medium">En Proceso</p>
                      <p className="text-sm text-gray-500">Preparando envío</p>
                    </div>
                  </div>
                )}
                
                {['shipped', 'delivered'].includes(order.status) && (
                  <div className="flex items-center">
                    <div className="w-8 h-8 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-sm font-medium mr-3">
                      ✓
                    </div>
                    <div>
                      <p className="font-medium">Enviado</p>
                      <p className="text-sm text-gray-500">En camino</p>
                    </div>
                  </div>
                )}
                
                {order.status === 'delivered' && order.deliveredAt && (
                  <div className="flex items-center">
                    <div className="w-8 h-8 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-sm font-medium mr-3">
                      ✓
                    </div>
                    <div>
                      <p className="font-medium">Entregado</p>
                      <p className="text-sm text-gray-500">{formatDate(order.deliveredAt)}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
