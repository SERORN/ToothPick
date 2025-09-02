'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { toast } from 'react-hot-toast'
import { useCart } from '@/lib/contexts/CartContext'
import { calculatePlatformFee, getFeePercentageString } from '@/lib/config/fees'

interface ShippingInfo {
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

export default function CheckoutPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const { state: cartState, clearCart } = useCart()
  
  const [loading, setLoading] = useState(false)
  
  // 🎁 ESTADO PARA RECOMPENSAS
  const [userPoints, setUserPoints] = useState(0)
  const [pointsToUse, setPointsToUse] = useState('')
  const [pointsDiscount, setPointsDiscount] = useState(0)
  const [loadingPoints, setLoadingPoints] = useState(false)
  
  const [shippingInfo, setShippingInfo] = useState<ShippingInfo>({
    fullName: '',
    company: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    phone: '',
    email: session?.user?.email || '',
    notes: ''
  })

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login?redirect=/checkout')
      return
    }

    if (session?.user?.role !== 'customer') {
      toast.error('Solo los clientes pueden realizar checkout')
      router.push('/catalog')
      return
    }

    if (cartState.items.length === 0) {
      toast.error('Tu carrito está vacío')
      router.push('/catalog')
      return
    }

    // Actualizar email del usuario logueado
    if (session?.user?.email) {
      setShippingInfo(prev => ({ ...prev, email: session.user.email }))
    }

    // 🎁 CARGAR PUNTOS DEL USUARIO
    fetchUserPoints()
  }, [session, status, router, cartState.items.length])

  // 🎁 FUNCIONES PARA RECOMPENSAS
  const fetchUserPoints = async () => {
    if (!session?.user || session.user.role !== 'customer') return

    try {
      const res = await fetch('/api/rewards')
      if (res.ok) {
        const data = await res.json()
        setUserPoints(data.totalPoints)
      }
    } catch (error) {
      console.error('Error cargando puntos:', error)
    }
  }

  const applyPointsDiscount = async () => {
    if (!pointsToUse || parseInt(pointsToUse) <= 0) {
      toast.error('Ingresa una cantidad válida de puntos')
      return
    }

    const points = parseInt(pointsToUse)
    if (points > userPoints) {
      toast.error('No tienes suficientes puntos')
      return
    }

    setLoadingPoints(true)

    try {
      const res = await fetch('/api/rewards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          pointsToRedeem: points, 
          orderTotal: totalBeforeDiscount 
        })
      })

      const data = await res.json()

      if (res.ok) {
        setPointsDiscount(data.discount)
        toast.success(`Descuento de $${data.discount.toFixed(2)} MXN aplicado`)
      } else {
        toast.error(data.error)
      }
    } catch (error) {
      toast.error('Error aplicando descuento')
    } finally {
      setLoadingPoints(false)
    }
  }

  const removePointsDiscount = () => {
    setPointsDiscount(0)
    setPointsToUse('')
    toast.success('Descuento por puntos removido')
  }

  const formatPrice = (price: number, currency: string = 'MXN') => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: currency,
    }).format(price)
  }

  // Calcular totales B2C
  const subtotal = cartState.totalAmount
  const platformFee = calculatePlatformFee(subtotal, 'b2c') // 8.5%
  const totalBeforeDiscount = subtotal + platformFee
  const total = Math.max(0, totalBeforeDiscount - pointsDiscount) // No puede ser negativo

  // Agrupar items por distribuidor (en B2C cada orden es de un solo distribuidor)
  const distributorGroups = cartState.items.reduce((groups, item) => {
    const distributorId = item.distributorId
    if (!distributorId) return groups

    if (!groups[distributorId]) {
      groups[distributorId] = {
        distributorId,
        distributorName: item.distributorName || 'Distribuidor',
        items: []
      }
    }
    groups[distributorId].items.push(item)
    return groups
  }, {} as Record<string, any>)

  const distributorKeys = Object.keys(distributorGroups)

  const handleInputChange = (field: keyof ShippingInfo, value: string) => {
    setShippingInfo(prev => ({ ...prev, [field]: value }))
  }

  const validateShippingInfo = () => {
    const required = ['fullName', 'address', 'city', 'state', 'zipCode', 'phone', 'email']
    const missing = required.filter(field => !shippingInfo[field as keyof ShippingInfo])
    
    if (missing.length > 0) {
      toast.error(`Campos requeridos: ${missing.join(', ')}`)
      return false
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(shippingInfo.email)) {
      toast.error('Email inválido')
      return false
    }

    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateShippingInfo()) return
    
    if (distributorKeys.length !== 1) {
      toast.error('El carrito debe contener productos de un solo distribuidor')
      return
    }

    setLoading(true)

    try {
      const distributorGroup = distributorGroups[distributorKeys[0]]
      
      // Preparar items para la orden
      const orderItems = distributorGroup.items.map((item: any) => ({
        productId: item.productId,
        name: item.name,
        brand: item.brand,
        price: item.price,
        quantity: item.quantity,
        subtotal: item.price * item.quantity,
        currency: item.currency,
        image: item.image
      }))

      const orderData = {
        items: orderItems,
        shipping: shippingInfo,
        distributorId: distributorGroup.distributorId,
        subtotal,
        platformFee,
        total,
        currency: 'MXN'
      }

      const res = await fetch('/api/b2c-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderData)
      })

      const data = await res.json()

      if (res.ok) {
        toast.success('¡Orden creada exitosamente!')
        clearCart()
        router.push(`/orders/${data.order._id}`)
      } else {
        toast.error(data.error || 'Error al crear la orden')
      }
    } catch (error) {
      console.error('Error en checkout:', error)
      toast.error('Error al procesar la orden')
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
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center">
            <button
              onClick={() => router.push('/catalog')}
              className="text-blue-600 hover:text-blue-700 mr-4"
            >
              ← Volver al catálogo
            </button>
            <h1 className="text-3xl font-bold text-gray-900">
              💳 Finalizar Compra
            </h1>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Formulario de envío */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-xl font-semibold mb-6">Información de Envío</h2>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nombre completo *
                  </label>
                  <input
                    type="text"
                    required
                    value={shippingInfo.fullName}
                    onChange={(e) => handleInputChange('fullName', e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Empresa/Clínica
                  </label>
                  <input
                    type="text"
                    value={shippingInfo.company}
                    onChange={(e) => handleInputChange('company', e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Dirección *
                </label>
                <input
                  type="text"
                  required
                  value={shippingInfo.address}
                  onChange={(e) => handleInputChange('address', e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Ciudad *
                  </label>
                  <input
                    type="text"
                    required
                    value={shippingInfo.city}
                    onChange={(e) => handleInputChange('city', e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Estado *
                  </label>
                  <input
                    type="text"
                    required
                    value={shippingInfo.state}
                    onChange={(e) => handleInputChange('state', e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Código Postal *
                  </label>
                  <input
                    type="text"
                    required
                    value={shippingInfo.zipCode}
                    onChange={(e) => handleInputChange('zipCode', e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Teléfono *
                  </label>
                  <input
                    type="tel"
                    required
                    value={shippingInfo.phone}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email *
                  </label>
                  <input
                    type="email"
                    required
                    value={shippingInfo.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notas especiales
                </label>
                <textarea
                  value={shippingInfo.notes}
                  onChange={(e) => handleInputChange('notes', e.target.value)}
                  rows={3}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Instrucciones especiales para la entrega..."
                />
              </div>

              <button
                type="submit"
                disabled={loading || cartState.items.length === 0}
                className="w-full bg-green-600 text-white py-3 px-4 rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                {loading ? 'Procesando...' : `Confirmar Orden - ${formatPrice(total)}`}
              </button>
            </form>
          </div>

          {/* Resumen de la orden */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-xl font-semibold mb-6">Resumen de la Orden</h2>
            
            {/* Productos */}
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
                      <div className="w-full h-full flex items-center justify-center text-gray-400">
                        🦷
                      </div>
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-gray-900 truncate">{item.name}</h3>
                    <p className="text-sm text-gray-600">{item.brand}</p>
                    <p className="text-xs text-blue-600">
                      Vendido por: {item.distributorName}
                    </p>
                  </div>
                  
                  <div className="text-right">
                    <div className="font-medium text-gray-900">
                      {formatPrice(item.price * item.quantity, item.currency)}
                    </div>
                    <div className="text-sm text-gray-500">
                      {item.quantity} × {formatPrice(item.price, item.currency)}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* 🎁 SECCIÓN DE RECOMPENSAS */}
            {userPoints > 0 && (
              <div className="border-t pt-4">
                <h3 className="font-medium text-gray-900 mb-3">
                  🎁 Usar Puntos de Recompensa
                </h3>
                
                <div className="bg-purple-50 p-3 rounded-lg mb-3">
                  <p className="text-sm text-purple-800">
                    Tienes <strong>{userPoints} puntos</strong> disponibles
                    <br />
                    <span className="text-xs">1 punto = $0.50 MXN • Máximo 50% de descuento</span>
                  </p>
                </div>

                {pointsDiscount > 0 ? (
                  <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                    <div>
                      <span className="text-sm font-medium text-green-800">
                        Descuento aplicado: ${pointsDiscount.toFixed(2)} MXN
                      </span>
                    </div>
                    <button
                      onClick={removePointsDiscount}
                      className="text-red-600 hover:text-red-700 text-sm underline"
                    >
                      Remover
                    </button>
                  </div>
                ) : (
                  <div className="flex space-x-2">
                    <input
                      type="number"
                      value={pointsToUse}
                      onChange={(e) => setPointsToUse(e.target.value)}
                      placeholder="Puntos a usar"
                      min="50"
                      max={userPoints}
                      className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                    <button
                      onClick={applyPointsDiscount}
                      disabled={loadingPoints || !pointsToUse}
                      className={`px-4 py-2 rounded-md text-sm font-medium ${
                        loadingPoints || !pointsToUse
                          ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                          : 'bg-purple-600 text-white hover:bg-purple-700'
                      }`}
                    >
                      {loadingPoints ? 'Aplicando...' : 'Aplicar'}
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Cálculos */}
            <div className="space-y-2 border-t pt-4">
              <div className="flex justify-between">
                <span className="text-gray-600">Subtotal</span>
                <span className="font-medium">{formatPrice(subtotal)}</span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-gray-600">
                  Comisión ToothPick ({getFeePercentageString('b2c')})
                </span>
                <span className="font-medium">{formatPrice(platformFee)}</span>
              </div>

              {pointsDiscount > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>Descuento por puntos</span>
                  <span>-{formatPrice(pointsDiscount)}</span>
                </div>
              )}
              
              <div className="flex justify-between text-lg font-bold border-t pt-2">
                <span>Total</span>
                <span>{formatPrice(total)}</span>
              </div>
            </div>

            {/* Información sobre la comisión */}
            <div className="mt-6 p-4 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-800">
                💡 <strong>Comisión B2C:</strong> ToothPick retiene {getFeePercentageString('b2c')} para cubrir costos de plataforma, pagos seguros y soporte al cliente.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
