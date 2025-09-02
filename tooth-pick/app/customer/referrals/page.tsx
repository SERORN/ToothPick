'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { redirect } from 'next/navigation'

interface ReferralStats {
  totalReferrals: number;
  completedReferrals: number;
  pendingReferrals: number;
  totalPointsEarned: number;
  recentReferrals: Array<{
    _id: string;
    referredUserName: string;
    referredUserEmail: string;
    status: 'pending' | 'completed';
    pointsAwarded: number;
    createdAt: string;
    completedAt?: string;
  }>;
}

export default function CustomerReferralsPage() {
  const { data: session, status } = useSession()
  const [referralCode, setReferralCode] = useState('')
  const [stats, setStats] = useState<ReferralStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)

  if (status === 'loading') return <div>Cargando...</div>
  if (!session) redirect('/login')
  if (session.user.role !== 'customer') redirect('/login')

  useEffect(() => {
    fetchReferralData()
  }, [])

  const fetchReferralData = async () => {
    try {
      const response = await fetch('/api/referrals/stats')
      if (response.ok) {
        const data = await response.json()
        setReferralCode(data.referralCode)
        setStats(data.stats)
      }
    } catch (error) {
      console.error('Error fetching referral data:', error)
    } finally {
      setLoading(false)
    }
  }

  const copyReferralLink = async () => {
    const referralLink = `${window.location.origin}/register?ref=${referralCode}`
    try {
      await navigator.clipboard.writeText(referralLink)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error('Error copying to clipboard:', error)
    }
  }

  const shareWhatsApp = () => {
    const referralLink = `${window.location.origin}/register?ref=${referralCode}`
    const message = `¡Únete a ToothPick, el marketplace dental! 🦷✨\n\nUsa mi código de referido ${referralCode} y ambos ganaremos 20 puntos de recompensa.\n\nRegistrate aquí: ${referralLink}`
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`
    window.open(whatsappUrl, '_blank')
  }

  const shareEmail = () => {
    const referralLink = `${window.location.origin}/register?ref=${referralCode}`
    const subject = '¡Únete a ToothPick con mi código de referido!'
    const body = `Hola,\n\nTe invito a unirte a ToothPick, el marketplace dental más completo.\n\nUsa mi código de referido ${referralCode} al registrarte y ambos ganaremos 20 puntos de recompensa que podrás usar en tus compras.\n\nRegistrate aquí: ${referralLink}\n\n¡Nos vemos en ToothPick! 🦷✨`
    window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-4xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded mb-6"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="h-64 bg-gray-200 rounded"></div>
              <div className="h-64 bg-gray-200 rounded"></div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="bg-white rounded-xl shadow-md p-6">
          <h1 className="text-2xl font-bold text-gray-800 mb-6">
            🤝 Programa de Referidos
          </h1>
          
          {/* Código de referido y compartir */}
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">
              Tu código de referido
            </h2>
            
            <div className="flex items-center space-x-4 mb-4">
              <div className="bg-white px-6 py-3 rounded-lg border-2 border-dashed border-blue-300">
                <span className="text-2xl font-mono font-bold text-blue-600">
                  {referralCode}
                </span>
              </div>
              <button
                onClick={copyReferralLink}
                className={`px-4 py-2 rounded-lg font-medium transition ${
                  copied 
                    ? 'bg-green-100 text-green-700 border border-green-300' 
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                {copied ? '✓ Copiado' : '📋 Copiar enlace'}
              </button>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                onClick={shareWhatsApp}
                className="flex items-center space-x-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition"
              >
                <span>💬</span>
                <span>WhatsApp</span>
              </button>
              <button
                onClick={shareEmail}
                className="flex items-center space-x-2 bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition"
              >
                <span>📧</span>
                <span>Email</span>
              </button>
            </div>

            <div className="mt-4 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
              <p className="text-sm text-yellow-800">
                💡 <strong>¿Cómo funciona?</strong> Comparte tu código con otros profesionales dentales. 
                Cuando se registren y realicen su primera compra, ¡ambos ganarán 20 puntos de recompensa!
              </p>
            </div>
          </div>

          {/* Estadísticas */}
          {stats && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-blue-50 p-4 rounded-lg text-center">
                <div className="text-2xl font-bold text-blue-600">{stats.totalReferrals}</div>
                <div className="text-sm text-blue-800">Total referidos</div>
              </div>
              <div className="bg-green-50 p-4 rounded-lg text-center">
                <div className="text-2xl font-bold text-green-600">{stats.completedReferrals}</div>
                <div className="text-sm text-green-800">Completados</div>
              </div>
              <div className="bg-yellow-50 p-4 rounded-lg text-center">
                <div className="text-2xl font-bold text-yellow-600">{stats.pendingReferrals}</div>
                <div className="text-sm text-yellow-800">Pendientes</div>
              </div>
              <div className="bg-purple-50 p-4 rounded-lg text-center">
                <div className="text-2xl font-bold text-purple-600">{stats.totalPointsEarned}</div>
                <div className="text-sm text-purple-800">Puntos ganados</div>
              </div>
            </div>
          )}

          {/* Historial de referidos */}
          {stats?.recentReferrals && stats.recentReferrals.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-4">
                Historial de referidos
              </h3>
              <div className="space-y-3">
                {stats.recentReferrals.map((referral) => (
                  <div key={referral._id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <div className="font-medium text-gray-800">
                        {referral.referredUserName}
                      </div>
                      <div className="text-sm text-gray-600">
                        {referral.referredUserEmail}
                      </div>
                      <div className="text-xs text-gray-500">
                        Registrado: {new Date(referral.createdAt).toLocaleDateString()}
                        {referral.completedAt && (
                          <span> • Completado: {new Date(referral.completedAt).toLocaleDateString()}</span>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        referral.status === 'completed' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {referral.status === 'completed' ? '✓ Completado' : '⏳ Pendiente'}
                      </div>
                      {referral.pointsAwarded > 0 && (
                        <div className="text-sm font-medium text-purple-600 mt-1">
                          +{referral.pointsAwarded} puntos
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Estado vacío */}
          {stats?.recentReferrals && stats.recentReferrals.length === 0 && (
            <div className="text-center py-8">
              <div className="text-6xl mb-4">🤝</div>
              <h3 className="text-lg font-medium text-gray-800 mb-2">
                ¡Comienza a referir!
              </h3>
              <p className="text-gray-600 mb-4">
                Aún no has referido a nadie. Comparte tu código y comienza a ganar puntos.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
