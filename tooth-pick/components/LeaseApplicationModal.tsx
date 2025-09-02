'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { calculatePaymentQuote, formatMXNPrice, calculateSavings } from '@/lib/utils/paymentSimulator'

interface Product {
  _id: string
  name: string
  brand: string
  price: number
  images?: string[]
  distributorId?: {
    _id: string
    name: string
  }
}

interface LeaseApplicationModalProps {
  product: Product
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export default function LeaseApplicationModal({
  product,
  isOpen,
  onClose,
  onSuccess
}: LeaseApplicationModalProps) {
  const { data: session } = useSession()
  const [formData, setFormData] = useState({
    leaseType: 'leasing' as 'leasing' | 'financing',
    months: 24 as 12 | 24 | 36,
    applicantInfo: {
      name: '',
      email: '',
      phone: '',
      company: ''
    }
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Pre-llenar datos del usuario
  useEffect(() => {
    if (session?.user) {
      setFormData(prev => ({
        ...prev,
        applicantInfo: {
          ...prev.applicantInfo,
          name: session.user.name || '',
          email: session.user.email || ''
        }
      }))
    }
  }, [session])

  if (!isOpen) return null

  const quote = calculatePaymentQuote(product.price, formData.months)
  const selectedQuote = quote[formData.leaseType]
  const savings = calculateSavings(product.price, formData.months)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/lease-applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: product._id,
          leaseType: formData.leaseType,
          months: formData.months,
          applicantInfo: formData.applicantInfo,
          orderType: session?.user?.role === 'customer' ? 'b2c' : 'b2b'
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Error al enviar solicitud')
      }

      onSuccess()
      onClose()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-800">
              📄 Solicitar Arrendamiento/Financiamiento
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-2xl"
            >
              ×
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Información del producto */}
          <div className="bg-gray-50 p-4 rounded-xl">
            <div className="flex items-start space-x-4">
              {product.images && product.images[0] && (
                <img
                  src={product.images[0]}
                  alt={product.name}
                  className="w-20 h-20 object-cover rounded-lg"
                />
              )}
              <div className="flex-1">
                <h3 className="font-semibold text-lg text-gray-800">{product.name}</h3>
                <p className="text-gray-600">{product.brand}</p>
                <p className="text-2xl font-bold text-blue-600">
                  {formatMXNPrice(product.price)}
                </p>
              </div>
            </div>
          </div>

          {/* Tipo de financiamiento */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Tipo de financiamiento
            </label>
            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, leaseType: 'leasing' }))}
                className={`p-4 rounded-xl border-2 text-left transition ${
                  formData.leaseType === 'leasing'
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="font-semibold text-blue-600">🏢 Arrendamiento</div>
                <div className="text-sm text-gray-600">
                  Menores tasas de interés, ideal para renovación de equipo
                </div>
              </button>
              <button
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, leaseType: 'financing' }))}
                className={`p-4 rounded-xl border-2 text-left transition ${
                  formData.leaseType === 'financing'
                    ? 'border-green-500 bg-green-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="font-semibold text-green-600">💳 Financiamiento</div>
                <div className="text-sm text-gray-600">
                  Compra a plazos, el equipo es tuyo al final
                </div>
              </button>
            </div>
          </div>

          {/* Plazo */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Plazo de pago
            </label>
            <div className="grid grid-cols-3 gap-4">
              {[12, 24, 36].map((months) => {
                const monthlyQuote = calculatePaymentQuote(product.price, months as 12 | 24 | 36)
                const selectedMonthlyQuote = monthlyQuote[formData.leaseType]
                
                return (
                  <button
                    key={months}
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, months: months as 12 | 24 | 36 }))}
                    className={`p-4 rounded-xl border-2 text-center transition ${
                      formData.months === months
                        ? 'border-purple-500 bg-purple-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="font-semibold text-purple-600">{months} meses</div>
                    <div className="text-sm text-gray-600">
                      {formatMXNPrice(selectedMonthlyQuote.monthlyPayment)}/mes
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Simulación de pagos */}
          <div className="bg-gradient-to-r from-purple-50 to-blue-50 p-6 rounded-xl">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">
              💰 Resumen de tu cotización
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {formatMXNPrice(selectedQuote.monthlyPayment)}
                </div>
                <div className="text-sm text-gray-600">Pago mensual</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {formatMXNPrice(selectedQuote.totalToPay)}
                </div>
                <div className="text-sm text-gray-600">Total a pagar</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {formatMXNPrice(selectedQuote.totalInterest)}
                </div>
                <div className="text-sm text-gray-600">Intereses totales</div>
              </div>
            </div>
            
            {formData.leaseType === 'leasing' && savings.amount > 0 && (
              <div className="mt-4 p-3 bg-green-100 rounded-lg">
                <div className="text-sm text-green-800">
                  💡 <strong>¡Ahorras {formatMXNPrice(savings.amount)}</strong> eligiendo 
                  arrendamiento vs financiamiento ({savings.percentage.toFixed(1)}% menos)
                </div>
              </div>
            )}
          </div>

          {/* Información del solicitante */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-800">
              👤 Información del solicitante
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Nombre completo *
                </label>
                <input
                  type="text"
                  required
                  value={formData.applicantInfo.name}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    applicantInfo: { ...prev.applicantInfo, name: e.target.value }
                  }))}
                  className="w-full mt-1 px-4 py-2 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Correo electrónico *
                </label>
                <input
                  type="email"
                  required
                  value={formData.applicantInfo.email}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    applicantInfo: { ...prev.applicantInfo, email: e.target.value }
                  }))}
                  className="w-full mt-1 px-4 py-2 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Teléfono *
                </label>
                <input
                  type="tel"
                  required
                  value={formData.applicantInfo.phone}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    applicantInfo: { ...prev.applicantInfo, phone: e.target.value }
                  }))}
                  className="w-full mt-1 px-4 py-2 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Empresa/Clínica (opcional)
                </label>
                <input
                  type="text"
                  value={formData.applicantInfo.company}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    applicantInfo: { ...prev.applicantInfo, company: e.target.value }
                  }))}
                  className="w-full mt-1 px-4 py-2 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Términos y condiciones */}
          <div className="bg-yellow-50 p-4 rounded-xl">
            <div className="text-sm text-yellow-800">
              <p className="font-medium mb-2">📋 Términos importantes:</p>
              <ul className="space-y-1 text-xs">
                <li>• La aprobación está sujeta a evaluación crediticia</li>
                <li>• Se requiere documentación adicional para procesar la solicitud</li>
                <li>• Las tasas de interés pueden variar según el perfil crediticio</li>
                <li>• ToothPick actúa como intermediario entre cliente y proveedor financiero</li>
              </ul>
            </div>
          </div>

          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}

          {/* Botones */}
          <div className="flex space-x-4 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 px-6 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-3 px-6 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition disabled:opacity-50"
            >
              {loading ? 'Enviando solicitud...' : 'Enviar solicitud'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
