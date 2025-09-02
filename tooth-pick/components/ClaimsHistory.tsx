'use client'

import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { toast } from 'react-hot-toast'
import { useSession } from 'next-auth/react'

interface RewardClaim {
  _id: string
  rewardSnapshot: {
    title: string
    description: string
    cost: number
    type: string
    imageUrl: string
  }
  status: 'pending' | 'approved' | 'rejected' | 'delivered' | 'cancelled'
  claimedAt: string
  processedAt?: string
  deliveredAt?: string
  trackingCode?: string
  adminNotes?: string
  pointsDeducted: number
  daysSinceClaim: number
  statusDisplay: string
}

const ClaimsHistory: React.FC = () => {
  const { data: session } = useSession()
  const [claims, setClaims] = useState<RewardClaim[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)

  useEffect(() => {
    fetchClaims()
  }, [filter, page])

  const fetchClaims = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      
      if (filter !== 'all') params.append('status', filter)
      params.append('page', page.toString())
      params.append('limit', '10')

      const response = await fetch(`/api/reward-store/claims?${params}`)
      const data = await response.json()

      if (data.success) {
        if (page === 1) {
          setClaims(data.claims)
        } else {
          setClaims(prev => [...prev, ...data.claims])
        }
        setHasMore(data.hasMore)
      } else {
        toast.error('Error al cargar historial')
      }
    } catch (error) {
      console.error('Error fetching claims:', error)
      toast.error('Error al cargar historial')
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800'
      case 'approved':
        return 'bg-blue-100 text-blue-800'
      case 'delivered':
        return 'bg-green-100 text-green-800'
      case 'rejected':
        return 'bg-red-100 text-red-800'
      case 'cancelled':
        return 'bg-gray-100 text-gray-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return '⏳'
      case 'approved':
        return '✅'
      case 'delivered':
        return '📦'
      case 'rejected':
        return '❌'
      case 'cancelled':
        return '🚫'
      default:
        return '❓'
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const statusFilters = [
    { value: 'all', label: 'Todos', count: claims.length },
    { value: 'pending', label: 'Pendientes', count: claims.filter(c => c.status === 'pending').length },
    { value: 'approved', label: 'Aprobados', count: claims.filter(c => c.status === 'approved').length },
    { value: 'delivered', label: 'Entregados', count: claims.filter(c => c.status === 'delivered').length },
    { value: 'rejected', label: 'Rechazados', count: claims.filter(c => c.status === 'rejected').length }
  ]

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Historial de Canjes
        </h1>
        <p className="text-gray-600">
          Revisa el estado de todas tus recompensas canjeadas
        </p>
      </div>

      {/* Filtros */}
      <div className="mb-6 bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex flex-wrap gap-2">
          {statusFilters.map((filterOption) => (
            <button
              key={filterOption.value}
              onClick={() => {
                setFilter(filterOption.value)
                setPage(1)
              }}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === filterOption.value
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {filterOption.label}
              {filterOption.count > 0 && (
                <span className="ml-2 text-xs opacity-75">
                  ({filterOption.count})
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Lista de claims */}
      {loading && page === 1 ? (
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-200 p-6 animate-pulse">
              <div className="flex items-start space-x-4">
                <div className="w-16 h-16 bg-gray-200 rounded-lg"></div>
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 rounded mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : claims.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
          <div className="text-6xl mb-4">📦</div>
          <h3 className="text-xl font-semibold text-gray-600 mb-2">
            No hay canjes registrados
          </h3>
          <p className="text-gray-500">
            Cuando canjees recompensas aparecerán aquí
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {claims.map((claim) => (
            <motion.div
              key={claim._id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg transition-shadow"
            >
              <div className="flex items-start space-x-4">
                {/* Imagen de la recompensa */}
                <div className="w-16 h-16 bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg flex items-center justify-center overflow-hidden">
                  {claim.rewardSnapshot.imageUrl ? (
                    <img
                      src={claim.rewardSnapshot.imageUrl}
                      alt={claim.rewardSnapshot.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-2xl">🎁</span>
                  )}
                </div>

                {/* Información del claim */}
                <div className="flex-1">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-1">
                        {claim.rewardSnapshot.title}
                      </h3>
                      <p className="text-sm text-gray-600 mb-2">
                        {claim.rewardSnapshot.description}
                      </p>
                    </div>

                    <div className="flex flex-col items-end space-y-2">
                      <span className={`inline-flex items-center space-x-1 px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(claim.status)}`}>
                        <span>{getStatusIcon(claim.status)}</span>
                        <span>{claim.statusDisplay}</span>
                      </span>
                      <span className="text-sm text-gray-500">
                        {claim.pointsDeducted} puntos
                      </span>
                    </div>
                  </div>

                  {/* Información de fechas */}
                  <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">Canjeado:</span>
                      <span className="ml-2 text-gray-900">
                        {formatDate(claim.claimedAt)}
                      </span>
                    </div>
                    
                    {claim.processedAt && (
                      <div>
                        <span className="text-gray-500">Procesado:</span>
                        <span className="ml-2 text-gray-900">
                          {formatDate(claim.processedAt)}
                        </span>
                      </div>
                    )}
                    
                    {claim.deliveredAt && (
                      <div>
                        <span className="text-gray-500">Entregado:</span>
                        <span className="ml-2 text-gray-900">
                          {formatDate(claim.deliveredAt)}
                        </span>
                      </div>
                    )}
                    
                    {claim.trackingCode && (
                      <div>
                        <span className="text-gray-500">Código de seguimiento:</span>
                        <span className="ml-2 text-gray-900 font-mono">
                          {claim.trackingCode}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Notas del admin */}
                  {claim.adminNotes && (
                    <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                      <span className="text-sm font-medium text-gray-700">Notas:</span>
                      <p className="text-sm text-gray-600 mt-1">{claim.adminNotes}</p>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          ))}

          {/* Botón cargar más */}
          {hasMore && (
            <div className="text-center mt-6">
              <button
                onClick={() => setPage(prev => prev + 1)}
                disabled={loading}
                className="px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors disabled:opacity-50"
              >
                {loading ? 'Cargando...' : 'Cargar más'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default ClaimsHistory
