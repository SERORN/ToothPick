'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { toast } from 'react-hot-toast'

interface RewardStats {
  totalPoints: number
  pointsFromPurchases: number
  pointsFromReviews: number
  pointsRedeemed: number
  loyaltyLevel: {
    level: string
    name: string
    emoji: string
    nextLevelPoints?: number
  }
  maxDiscount: number
  recentHistory: Array<{
    _id: string
    points: number
    reason: string
    description: string
    createdAt: string
  }>
  redemptionRules: {
    minRedemption: number
    pointsToMxn: number
    maxDiscountPercent: number
  }
}

export default function CustomerRewardsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  
  const [stats, setStats] = useState<RewardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [redeemAmount, setRedeemAmount] = useState('')
  const [orderTotal, setOrderTotal] = useState('')
  const [redeeming, setRedeeming] = useState(false)

  useEffect(() => {
    if (status === 'loading') return

    if (!session) {
      router.push('/login')
      return
    }

    if (session.user.role !== 'customer') {
      toast.error('Solo clientes pueden acceder a recompensas')
      router.push('/dashboard')
      return
    }

    fetchRewardStats()
  }, [session, status, router])

  const fetchRewardStats = async () => {
    try {
      const res = await fetch('/api/rewards')
      if (res.ok) {
        const data = await res.json()
        setStats(data)
      } else {
        toast.error('Error al cargar recompensas')
      }
    } catch (error) {
      toast.error('Error de conexión')
    } finally {
      setLoading(false)
    }
  }

  const handleRedeem = async () => {
    if (!stats || !redeemAmount || !orderTotal) {
      toast.error('Completa todos los campos')
      return
    }

    const pointsToRedeem = parseInt(redeemAmount)
    const total = parseFloat(orderTotal)

    if (pointsToRedeem < stats.redemptionRules.minRedemption) {
      toast.error(`Mínimo ${stats.redemptionRules.minRedemption} puntos para redimir`)
      return
    }

    if (pointsToRedeem > stats.totalPoints) {
      toast.error('No tienes suficientes puntos')
      return
    }

    setRedeeming(true)
    
    try {
      const res = await fetch('/api/rewards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pointsToRedeem, orderTotal: total })
      })

      const data = await res.json()

      if (res.ok) {
        toast.success(data.message)
        setRedeemAmount('')
        setOrderTotal('')
        fetchRewardStats()
      } else {
        toast.error(data.error)
      }
    } catch (error) {
      toast.error('Error al redimir puntos')
    } finally {
      setRedeeming(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-MX', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getPointsColor = (points: number) => {
    return points > 0 ? 'text-green-600' : 'text-red-600'
  }

  const getReasonIcon = (reason: string) => {
    switch (reason) {
      case 'compra': return '🛒'
      case 'reseña': return '⭐'
      case 'bienvenida': return '🎉'
      case 'redención': return '💰'
      case 'manual': return '👮‍♂️'
      case 'referido': return '👥'
      default: return '📝'
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-lg">Cargando recompensas...</div>
      </div>
    )
  }

  if (!stats) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Error al cargar recompensas
          </h2>
          <button
            onClick={fetchRewardStats}
            className="text-blue-600 hover:text-blue-700"
          >
            Intentar nuevamente
          </button>
        </div>
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
                🎁 Mis Recompensas
              </h1>
              <p className="text-gray-600 mt-1">
                Gana puntos con cada compra y reseña
              </p>
            </div>
            
            <button
              onClick={() => router.push('/customer/dashboard')}
              className="text-blue-600 hover:text-blue-700"
            >
              ← Volver al Dashboard
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        
        {/* Resumen de puntos */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-sm p-6 text-center">
            <div className="text-4xl mb-2">{stats.loyaltyLevel.emoji}</div>
            <h3 className="text-lg font-semibold text-gray-900 mb-1">
              Nivel {stats.loyaltyLevel.name}
            </h3>
            <p className="text-sm text-gray-600">
              {stats.loyaltyLevel.nextLevelPoints 
                ? `${stats.loyaltyLevel.nextLevelPoints} puntos para el siguiente nivel`
                : 'Nivel máximo alcanzado'
              }
            </p>
          </div>

          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-sm p-6 text-white text-center">
            <div className="text-3xl font-bold">{stats.totalPoints}</div>
            <p className="text-blue-100">Puntos Disponibles</p>
            <p className="text-xs text-blue-200 mt-1">
              ≈ ${stats.maxDiscount.toFixed(2)} MXN de descuento
            </p>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 text-center">
            <div className="text-2xl font-bold text-green-600">{stats.pointsFromPurchases}</div>
            <p className="text-gray-600">Por Compras</p>
            <div className="text-xs text-gray-500 mt-1">🛒</div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 text-center">
            <div className="text-2xl font-bold text-yellow-600">{stats.pointsFromReviews}</div>
            <p className="text-gray-600">Por Reseñas</p>
            <div className="text-xs text-gray-500 mt-1">⭐</div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Redimir puntos */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              💰 Redimir Puntos
            </h2>
            
            <div className="mb-4 p-4 bg-blue-50 rounded-lg">
              <h3 className="font-medium text-blue-900 mb-2">Reglas de Redención</h3>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Mínimo {stats.redemptionRules.minRedemption} puntos para redimir</li>
                <li>• 1 punto = ${stats.redemptionRules.pointsToMxn} MXN</li>
                <li>• Máximo {stats.redemptionRules.maxDiscountPercent}% de descuento por orden</li>
              </ul>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Puntos a redimir
                </label>
                <input
                  type="number"
                  value={redeemAmount}
                  onChange={(e) => setRedeemAmount(e.target.value)}
                  min={stats.redemptionRules.minRedemption}
                  max={stats.totalPoints}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder={`Mínimo ${stats.redemptionRules.minRedemption}`}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Total de la orden (MXN)
                </label>
                <input
                  type="number"
                  value={orderTotal}
                  onChange={(e) => setOrderTotal(e.target.value)}
                  step="0.01"
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="ej: 500.00"
                />
              </div>

              {redeemAmount && orderTotal && (
                <div className="p-3 bg-green-50 rounded-lg">
                  <p className="text-sm text-green-800">
                    Descuento estimado: ${Math.min(
                      parseInt(redeemAmount) * stats.redemptionRules.pointsToMxn,
                      parseFloat(orderTotal) * (stats.redemptionRules.maxDiscountPercent / 100)
                    ).toFixed(2)} MXN
                  </p>
                </div>
              )}

              <button
                onClick={handleRedeem}
                disabled={redeeming || !redeemAmount || !orderTotal}
                className={`w-full py-3 px-4 rounded-md font-medium ${
                  redeeming || !redeemAmount || !orderTotal
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                {redeeming ? 'Redimiendo...' : 'Redimir Puntos'}
              </button>
            </div>
          </div>

          {/* Historial */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              📋 Historial Reciente
            </h2>
            
            {stats.recentHistory.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <div className="text-4xl mb-2">📝</div>
                <p>No hay actividad reciente</p>
                <p className="text-sm">¡Haz tu primera compra para ganar puntos!</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {stats.recentHistory.map((item) => (
                  <div
                    key={item._id}
                    className="flex items-start justify-between p-3 border border-gray-200 rounded-lg"
                  >
                    <div className="flex items-start space-x-3">
                      <div className="text-xl">
                        {getReasonIcon(item.reason)}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">
                          {item.description}
                        </p>
                        <p className="text-xs text-gray-500">
                          {formatDate(item.createdAt)}
                        </p>
                      </div>
                    </div>
                    <div className={`font-bold ${getPointsColor(item.points)}`}>
                      {item.points > 0 ? '+' : ''}{item.points}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Cómo ganar más puntos */}
        <div className="mt-8 bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            🚀 Cómo Ganar Más Puntos
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center p-4 border border-gray-200 rounded-lg">
              <div className="text-3xl mb-2">🛒</div>
              <h3 className="font-medium mb-2">Realiza Compras</h3>
              <p className="text-sm text-gray-600">
                Gana 1 punto por cada $100 MXN en compras
              </p>
            </div>

            <div className="text-center p-4 border border-gray-200 rounded-lg">
              <div className="text-3xl mb-2">⭐</div>
              <h3 className="font-medium mb-2">Deja Reseñas</h3>
              <p className="text-sm text-gray-600">
                Gana 5 puntos por cada reseña aprobada
              </p>
            </div>

            <div className="text-center p-4 border border-gray-200 rounded-lg">
              <div className="text-3xl mb-2">👥</div>
              <h3 className="font-medium mb-2">Refiere Amigos</h3>
              <p className="text-sm text-gray-600">
                Gana 20 puntos por cada referido exitoso
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
