'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { toast } from 'react-hot-toast'
import DashboardHeader from '@/components/DashboardHeader'

interface RewardUser {
  _id: string
  name: string
  email: string
  totalPoints: number
  totalEarned: number
  totalRedeemed: number
  loyaltyLevel: {
    level: string
    name: string
    emoji: string
  }
  lastActivity: string
}

export default function AdminRewardsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  
  const [users, setUsers] = useState<RewardUser[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedUser, setSelectedUser] = useState<string>('')
  const [manualPoints, setManualPoints] = useState('')
  const [manualReason, setManualReason] = useState('')
  const [processing, setProcessing] = useState(false)

  useEffect(() => {
    if (status === 'loading') return

    if (!session) {
      router.push('/login')
      return
    }

    if (session.user.role !== 'admin') {
      toast.error('Acceso denegado')
      router.push('/dashboard')
      return
    }

    fetchRewardUsers()
  }, [session, status, router])

  const fetchRewardUsers = async () => {
    try {
      const res = await fetch('/api/admin/rewards')
      if (res.ok) {
        const data = await res.json()
        setUsers(data)
      } else {
        toast.error('Error al cargar usuarios')
      }
    } catch (error) {
      toast.error('Error de conexión')
    } finally {
      setLoading(false)
    }
  }

  const handleManualPoints = async () => {
    if (!selectedUser || !manualPoints || !manualReason) {
      toast.error('Completa todos los campos')
      return
    }

    const points = parseInt(manualPoints)
    if (isNaN(points) || points === 0) {
      toast.error('Ingresa una cantidad válida de puntos')
      return
    }

    setProcessing(true)

    try {
      const res = await fetch('/api/admin/rewards/manual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: selectedUser,
          points,
          description: manualReason
        })
      })

      if (res.ok) {
        toast.success('Puntos agregados exitosamente')
        setSelectedUser('')
        setManualPoints('')
        setManualReason('')
        fetchRewardUsers()
      } else {
        const data = await res.json()
        toast.error(data.error || 'Error al agregar puntos')
      }
    } catch (error) {
      toast.error('Error de conexión')
    } finally {
      setProcessing(false)
    }
  }

  const filteredUsers = users.filter(user =>
    user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const totalStats = users.reduce((acc, user) => ({
    totalUsers: acc.totalUsers + 1,
    totalPointsInSystem: acc.totalPointsInSystem + user.totalPoints,
    totalPointsEarned: acc.totalPointsEarned + user.totalEarned,
    totalPointsRedeemed: acc.totalPointsRedeemed + user.totalRedeemed
  }), {
    totalUsers: 0,
    totalPointsInSystem: 0,
    totalPointsEarned: 0,
    totalPointsRedeemed: 0
  })

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-lg">Cargando datos de recompensas...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardHeader title="Panel de Administración" />

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="bg-white rounded-xl shadow-sm p-6 mb-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">
            🎁 Gestión de Recompensas
          </h1>

          {/* Estadísticas globales */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-blue-50 p-4 rounded-lg">
              <h3 className="text-sm font-medium text-blue-800">Usuarios Activos</h3>
              <p className="text-2xl font-bold text-blue-900">{totalStats.totalUsers}</p>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <h3 className="text-sm font-medium text-green-800">Puntos en Circulación</h3>
              <p className="text-2xl font-bold text-green-900">{totalStats.totalPointsInSystem.toLocaleString()}</p>
            </div>
            <div className="bg-yellow-50 p-4 rounded-lg">
              <h3 className="text-sm font-medium text-yellow-800">Puntos Otorgados</h3>
              <p className="text-2xl font-bold text-yellow-900">{totalStats.totalPointsEarned.toLocaleString()}</p>
            </div>
            <div className="bg-red-50 p-4 rounded-lg">
              <h3 className="text-sm font-medium text-red-800">Puntos Redimidos</h3>
              <p className="text-2xl font-bold text-red-900">{totalStats.totalPointsRedeemed.toLocaleString()}</p>
            </div>
          </div>

          {/* Agregar puntos manualmente */}
          <div className="bg-gray-50 p-6 rounded-lg mb-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              👮‍♂️ Agregar Puntos Manualmente
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Usuario
                </label>
                <select
                  value={selectedUser}
                  onChange={(e) => setSelectedUser(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Seleccionar usuario</option>
                  {users.map(user => (
                    <option key={user._id} value={user._id}>
                      {user.name} ({user.email})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Puntos
                </label>
                <input
                  type="number"
                  value={manualPoints}
                  onChange={(e) => setManualPoints(e.target.value)}
                  placeholder="ej: 50 o -25"
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Motivo
                </label>
                <input
                  type="text"
                  value={manualReason}
                  onChange={(e) => setManualReason(e.target.value)}
                  placeholder="ej: Compensación por error"
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-end">
                <button
                  onClick={handleManualPoints}
                  disabled={processing || !selectedUser || !manualPoints || !manualReason}
                  className={`w-full py-2 px-4 rounded-md font-medium ${
                    processing || !selectedUser || !manualPoints || !manualReason
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}
                >
                  {processing ? 'Procesando...' : 'Agregar'}
                </button>
              </div>
            </div>
          </div>

          {/* Búsqueda */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Buscar Usuario
            </label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Nombre o email..."
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Lista de usuarios */}
        {filteredUsers.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm p-12 text-center">
            <div className="text-gray-500 text-lg mb-4">
              No se encontraron usuarios
            </div>
            <p className="text-gray-400">
              Ajusta la búsqueda para ver más usuarios
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Usuario
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Nivel
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Puntos Disponibles
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total Ganado
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total Redimido
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Última Actividad
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredUsers.map((user) => (
                    <tr key={user._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {user.name}
                          </div>
                          <div className="text-sm text-gray-500">
                            {user.email}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <span className="text-lg mr-2">{user.loyaltyLevel.emoji}</span>
                          <span className="text-sm font-medium text-gray-900">
                            {user.loyaltyLevel.name}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-bold text-green-600">
                          {user.totalPoints.toLocaleString()} pts
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {user.totalEarned.toLocaleString()} pts
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-red-600">
                          {user.totalRedeemed.toLocaleString()} pts
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(user.lastActivity).toLocaleDateString('es-MX')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
