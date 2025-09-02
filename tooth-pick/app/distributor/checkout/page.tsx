'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useCart } from '@/lib/contexts/CartContext'
import { toast } from 'react-hot-toast'
import { calculatePlatformFee, getFeePercentageString } from '@/lib/config/fees'

interface ShippingInfo {
  fullName: string
  company: string
  address: string
  city: string
  state: string
  zipCode: string
  phone: string
  email: string
  notes: string
}

export default function CheckoutPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const { state: cartState, clearCart } = useCart()
  
  const [loading, setLoading] = useState(false)
  const [shippingInfo, setShippingInfo] = useState<ShippingInfo>({
    fullName: '',
    company: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    phone: '',
    email: '',
    notes: ''
  })

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    }
    if (session?.user?.role !== 'distributor') {
      router.push('/')
    }
    if (cartState.items.length === 0) {
      router.push('/distributor/dashboard/catalog')
    }
  }, [session, status, router, cartState.items.length])

  useEffect(() => {
    if (session?.user) {
      setShippingInfo(prev => ({
        ...prev,
        fullName: session.user.name || '',
        email: session.user.email || ''
      }))
    }
  }, [session])

  const formatPrice = (price: number, currency: string) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: currency,
    }).format(price)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setShippingInfo(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      // Crear la orden
      const orderData = {
        items: cartState.items,
        shippingInfo
      }

      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderData)
      })

      if (res.ok) {
        const response = await res.json()
        toast.success(response.message || 'Órdenes creadas exitosamente!')
        clearCart()
        // Redirigir al dashboard de órdenes
        router.push('/distributor/dashboard/orders')
      } else {
        const error = await res.json()
        toast.error(error.error || 'Error al crear las órdenes')
      }
    } catch (error) {
      toast.error('Error inesperado al procesar las órdenes')
    } finally {
      setLoading(false)
    }
  }

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-lg">Cargando checkout...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.push('/distributor/dashboard/catalog')}
            className="text-blue-600 hover:text-blue-700 mb-4 flex items-center"
          >
            ← Volver al Catálogo
          </button>
          <h1 className="text-3xl font-bold text-gray-900">Checkout</h1>
          <p className="text-gray-600 mt-2">Finaliza tu compra</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Formulario de Envío */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-xl font-semibold mb-6">Información de Envío</h2>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nombre Completo *
                  </label>
                  <input
                    type="text"
                    name="fullName"
                    value={shippingInfo.fullName}
                    onChange={handleInputChange}
                    required
                    className="w-full border border-gray-300 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Empresa
                  </label>
                  <input
                    type="text"
                    name="company"
                    value={shippingInfo.company}
                    onChange={handleInputChange}
                    className="w-full border border-gray-300 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Dirección *
                </label>
                <input
                  type="text"
                  name="address"
                  value={shippingInfo.address}
                  onChange={handleInputChange}
                  required
                  className="w-full border border-gray-300 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Ciudad *
                  </label>
                  <input
                    type="text"
                    name="city"
                    value={shippingInfo.city}
                    onChange={handleInputChange}
                    required
                    className="w-full border border-gray-300 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Estado *
                  </label>
                  <input
                    type="text"
                    name="state"
                    value={shippingInfo.state}
                    onChange={handleInputChange}
                    required
                    className="w-full border border-gray-300 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Código Postal *
                  </label>
                  <input
                    type="text"
                    name="zipCode"
                    value={shippingInfo.zipCode}
                    onChange={handleInputChange}
                    required
                    className="w-full border border-gray-300 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Teléfono *
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    value={shippingInfo.phone}
                    onChange={handleInputChange}
                    required
                    className="w-full border border-gray-300 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email *
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={shippingInfo.email}
                    onChange={handleInputChange}
                    required
                    className="w-full border border-gray-300 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notas Especiales
                </label>
                <textarea
                  name="notes"
                  value={shippingInfo.notes}
                  onChange={handleInputChange}
                  rows={3}
                  className="w-full border border-gray-300 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Instrucciones especiales de entrega..."
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                {loading ? 'Procesando...' : 'Confirmar Orden'}
              </button>
            </form>
          </div>

          {/* Resumen de Orden */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-xl font-semibold mb-6">Resumen de la Orden</h2>
            
            <div className="space-y-4 mb-6">
              {cartState.items.map((item) => (
                <div key={item.productId} className="flex items-center space-x-4 border-b pb-4">
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
                    <p className="text-sm text-blue-600">Cantidad: {item.quantity}</p>
                  </div>
                  
                  <div className="text-right">
                    <p className="font-semibold">
                      {formatPrice(item.price * item.quantity, item.currency)}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Totales */}
            <div className="border-t pt-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span>Subtotal:</span>
                <span>{formatPrice(cartState.totalAmount, 'MXN')}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Comisión ToothPick ({getFeePercentageString('b2b')}):</span>
                <span>{formatPrice(calculatePlatformFee(cartState.totalAmount, 'b2b'), 'MXN')}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>IVA (16%):</span>
                <span>{formatPrice((cartState.totalAmount + calculatePlatformFee(cartState.totalAmount, 'b2b')) * 0.16, 'MXN')}</span>
              </div>
              <div className="flex justify-between text-lg font-semibold pt-2 border-t">
                <span>Total:</span>
                <span>{formatPrice((cartState.totalAmount + calculatePlatformFee(cartState.totalAmount, 'b2b')) * 1.16, 'MXN')}</span>
              </div>
            </div>

            {/* Información de Pago */}
            <div className="mt-6 p-4 bg-blue-50 rounded-lg">
              <h3 className="font-medium text-blue-900 mb-2">Información de Pago</h3>
              <p className="text-sm text-blue-700">
                Por el momento, todas las órdenes se procesan por transferencia bancaria. 
                Te contactaremos para coordinar el pago y envío.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
