'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'react-hot-toast'
import { useSession } from 'next-auth/react'

interface RewardItem {
  _id: string
  title: string
  description: string
  cost: number
  type: string
  category: string
  imageUrl: string
  availableFor: string[]
  quantity?: number
  isActive: boolean
  expiresAt?: string
}

interface RewardFilters {
  type: string
  minCost: string
  maxCost: string
  search: string
}

const RewardStore: React.FC = () => {
  const { data: session } = useSession()
  const [rewards, setRewards] = useState<RewardItem[]>([])
  const [loading, setLoading] = useState(true)
  const [showFilters, setShowFilters] = useState(false)
  const [filters, setFilters] = useState<RewardFilters>({
    type: 'all',
    minCost: '',
    maxCost: '',
    search: ''
  })

  // Cargar recompensas
  useEffect(() => {
    fetchRewards()
  }, [filters])

  const fetchRewards = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      
      if (filters.type !== 'all') params.append('type', filters.type)
      if (filters.minCost) params.append('minCost', filters.minCost)
      if (filters.maxCost) params.append('maxCost', filters.maxCost)
      if (filters.search) params.append('search', filters.search)
      params.append('available', 'true')

      const response = await fetch(`/api/reward-store?${params}`)
      const data = await response.json()

      if (data.success) {
        setRewards(data.rewards)
      } else {
        toast.error('Error al cargar recompensas')
      }
    } catch (error) {
      console.error('Error fetching rewards:', error)
      toast.error('Error al cargar recompensas')
    } finally {
      setLoading(false)
    }
  }

  const handleClaimReward = async (rewardId: string, cost: number) => {
    try {
      const response = await fetch('/api/reward-store/claim', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          rewardId,
          metadata: {
            claimedAt: new Date().toISOString(),
            userAgent: navigator.userAgent
          }
        }),
      })

      const data = await response.json()

      if (data.success) {
        toast.success('¡Recompensa reclamada exitosamente!')
        fetchRewards() // Recargar para actualizar cantidades
      } else {
        toast.error(data.error || 'Error al reclamar recompensa')
      }
    } catch (error) {
      console.error('Error claiming reward:', error)
      toast.error('Error al reclamar recompensa')
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'descuento':
        return <span className="text-lg">💰</span>
      case 'producto':
        return <span className="text-lg">🎁</span>
      case 'digital':
        return <span className="text-lg">⭐</span>
      default:
        return <span className="text-lg">🏆</span>
    }
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'descuento':
        return 'bg-green-100 text-green-800'
      case 'producto':
        return 'bg-blue-100 text-blue-800'
      case 'digital':
        return 'bg-purple-100 text-purple-800'
      default:
        return 'bg-yellow-100 text-yellow-800'
    }
  }

  const rewardTypes = [
    { value: 'all', label: 'Todos' },
    { value: 'descuento', label: 'Descuentos' },
    { value: 'producto', label: 'Productos' },
    { value: 'digital', label: 'Digitales' },
    { value: 'experiencia', label: 'Experiencias' }
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-3 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl">
                <span className="text-2xl text-white">🛍️</span>
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">
                  Tienda de Recompensas
                </h1>
                <p className="text-gray-600 mt-1">
                  Canjea tus puntos por increíbles recompensas
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center space-x-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                <span>🔍</span>
                <span>Filtros</span>
              </button>
            </div>
          </div>

          {/* Barra de búsqueda */}
          <div className="mt-6 relative">
            <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">🔍</span>
            <input
              type="text"
              placeholder="Buscar recompensas..."
              value={filters.search}
              onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Panel de filtros */}
          <AnimatePresence>
            {showFilters && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-4 p-4 bg-gray-50 rounded-xl border border-gray-200"
              >
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Tipo
                    </label>
                    <select
                      value={filters.type}
                      onChange={(e) => setFilters(prev => ({ ...prev, type: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      {rewardTypes.map(type => (
                        <option key={type.value} value={type.value}>
                          {type.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Costo mínimo
                    </label>
                    <input
                      type="number"
                      placeholder="0"
                      value={filters.minCost}
                      onChange={(e) => setFilters(prev => ({ ...prev, minCost: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Costo máximo
                    </label>
                    <input
                      type="number"
                      placeholder="1000"
                      value={filters.maxCost}
                      onChange={(e) => setFilters(prev => ({ ...prev, maxCost: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="flex items-end">
                    <button
                      onClick={() => setFilters({
                        type: 'all',
                        minCost: '',
                        maxCost: '',
                        search: ''
                      })}
                      className="w-full px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg transition-colors"
                    >
                      Limpiar filtros
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Grid de recompensas */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden animate-pulse">
                <div className="h-48 bg-gray-200"></div>
                <div className="p-6">
                  <div className="h-4 bg-gray-200 rounded mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded mb-4"></div>
                  <div className="h-8 bg-gray-200 rounded"></div>
                </div>
              </div>
            ))}
          </div>
        ) : rewards.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">✨</div>
            <h3 className="text-xl font-semibold text-gray-600 mb-2">
              No hay recompensas disponibles
            </h3>
            <p className="text-gray-500">
              Intenta ajustar tus filtros de búsqueda
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {rewards.map((reward) => (
              <motion.div
                key={reward._id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow"
              >
                <div className="h-48 bg-gradient-to-br from-gray-100 to-gray-200 relative">
                  {reward.imageUrl ? (
                    <img
                      src={reward.imageUrl}
                      alt={reward.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      {getTypeIcon(reward.type)}
                    </div>
                  )}
                  
                  <div className="absolute top-3 left-3">
                    <span className={`inline-flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium ${getTypeColor(reward.type)}`}>
                      {getTypeIcon(reward.type)}
                      <span className="capitalize">{reward.type}</span>
                    </span>
                  </div>

                  {reward.quantity !== undefined && reward.quantity <= 5 && (
                    <div className="absolute top-3 right-3">
                      <span className="bg-red-100 text-red-800 text-xs font-medium px-2 py-1 rounded-full">
                        ¡Últimas {reward.quantity}!
                      </span>
                    </div>
                  )}
                </div>

                <div className="p-6">
                  <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2">
                    {reward.title}
                  </h3>
                  <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                    {reward.description}
                  </p>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-1">
                      <span className="text-lg">✨</span>
                      <span className="font-bold text-lg text-gray-900">
                        {reward.cost}
                      </span>
                      <span className="text-sm text-gray-500">puntos</span>
                    </div>

                    <button
                      onClick={() => handleClaimReward(reward._id, reward.cost)}
                      disabled={reward.quantity === 0}
                      className="px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {reward.quantity === 0 ? 'Agotado' : 'Canjear'}
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default RewardStore
