'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

export default function RegisterPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState('customer')
  const [referralCode, setReferralCode] = useState('')
  const [referralValid, setReferralValid] = useState<boolean | null>(null)
  const [referralMessage, setReferralMessage] = useState('')
  const [validatingReferral, setValidatingReferral] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // Pre-llenar código de referido desde URL
  useEffect(() => {
    const refCode = searchParams.get('ref')
    if (refCode) {
      setReferralCode(refCode)
    }
  }, [searchParams])

  // Validar código de referido en tiempo real
  useEffect(() => {
    if (referralCode.length >= 6) {
      validateReferralCode(referralCode)
    } else if (referralCode.length > 0) {
      setReferralValid(null)
      setReferralMessage('')
    }
  }, [referralCode])

  const validateReferralCode = async (code: string) => {
    setValidatingReferral(true)
    try {
      const response = await fetch('/api/referrals/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ referralCode: code })
      })
      
      const data = await response.json()
      
      if (response.ok && data.valid) {
        setReferralValid(true)
        setReferralMessage(data.message)
      } else {
        setReferralValid(false)
        setReferralMessage(data.error || 'Código inválido')
      }
    } catch (error) {
      setReferralValid(false)
      setReferralMessage('Error validando código')
    } finally {
      setValidatingReferral(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        name, 
        email, 
        password, 
        role,
        referralCode: referralCode.trim() || undefined
      }),
    })

    const data = await res.json()

    if (!res.ok) {
      setError(data.error || 'Error al registrar usuario.')
    } else {
      router.push('/login')
    }

    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-md p-8 space-y-6">
        <h1 className="text-2xl font-bold text-center text-gray-800">Crear Cuenta</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Nombre completo</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full mt-1 px-4 py-2 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Correo electrónico</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full mt-1 px-4 py-2 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Contraseña</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full mt-1 px-4 py-2 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Tipo de cuenta</label>
            <select
              required
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full mt-1 px-4 py-2 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="customer">🧑‍⚕️ Cliente (Clínica/Consultorio)</option>
              <option value="distributor">🏪 Distribuidor</option>
              <option value="provider">🏭 Proveedor</option>
              <option value="admin">👑 Administrador</option>
            </select>
            <p className="text-xs text-gray-500 mt-1">
              {role === 'customer' && 'Perfecto para clínicas y consultorios que necesitan productos dentales'}
              {role === 'distributor' && 'Para empresas que venden productos dentales'}
              {role === 'provider' && 'Para fabricantes y proveedores de productos dentales'}
              {role === 'admin' && 'Acceso completo a la plataforma'}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Código de referido <span className="text-gray-400">(opcional)</span>
            </label>
            <div className="relative">
              <input
                type="text"
                value={referralCode}
                onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                placeholder="Ej: ABC123DEF"
                className={`w-full mt-1 px-4 py-2 border rounded-xl focus:outline-none focus:ring-2 pr-10 ${
                  referralCode.length > 0 
                    ? referralValid === true 
                      ? 'border-green-300 focus:ring-green-500' 
                      : referralValid === false 
                        ? 'border-red-300 focus:ring-red-500'
                        : 'focus:ring-blue-500'
                    : 'focus:ring-blue-500'
                }`}
              />
              {validatingReferral && (
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                  <div className="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full"></div>
                </div>
              )}
              {!validatingReferral && referralCode.length > 0 && referralValid !== null && (
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                  {referralValid ? (
                    <span className="text-green-500 text-lg">✓</span>
                  ) : (
                    <span className="text-red-500 text-lg">✗</span>
                  )}
                </div>
              )}
            </div>
            {referralMessage && (
              <p className={`text-xs mt-1 ${
                referralValid ? 'text-green-600' : 'text-red-600'
              }`}>
                {referralValid ? '🎁 ' : '❌ '}{referralMessage}
              </p>
            )}
          </div>

          {error && <p className="text-red-500 text-sm">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded-xl transition disabled:opacity-50"
          >
            {loading ? 'Creando cuenta...' : 'Registrarse'}
          </button>
        </form>

        <div className="text-center">
          <p className="text-sm text-gray-600">
            ¿Ya tienes cuenta?{' '}
            <button
              onClick={() => router.push('/login')}
              className="text-blue-600 hover:text-blue-700 font-medium"
            >
              Inicia sesión aquí
            </button>
          </p>
        </div>
      </div>
    </div>
  )
}
