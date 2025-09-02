'use client'

import { useSession, signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { GamificationProvider } from '@/lib/contexts/GamificationContext'
import { GamificationIntegrator } from '@/components/gamification/GamificationIntegrator'
import GamificationMiniDashboard from '@/components/gamification/GamificationMiniDashboard'

export default function ClientDashboard() {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    }
    if (session && session.user.role !== 'client') {
      router.push('/')
    }
  }, [session, status, router])

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-lg">Cargando...</div>
      </div>
    )
  }

  return (
    <GamificationProvider userId={session?.user?.id || ''}>
      <div className="min-h-screen bg-gray-100">
        {/* Header */}
        <header className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-4">
              <h1 className="text-2xl font-bold text-gray-900">Panel del Cliente</h1>
              <div className="flex items-center space-x-4">
                <span className="text-sm text-gray-700">
                  Bienvenido, {session?.user.name}
                </span>
                <button
                  onClick={() => signOut({ callbackUrl: '/login' })}
                  className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm transition"
                >
                  Cerrar Sesión
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="px-4 py-6 sm:px-0">
            
            {/* Gamification Mini Dashboard - Arriba del calendario */}
            <div className="mb-6">
              <GamificationMiniDashboard
                userId={session?.user?.id || ''}
                role="patient"
                showRacha={true}
                showNivel={true}
                showBadgesPreview={true}
                linkToFullProfile={true}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              
              {/* Welcome Card */}
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-2">
                  ¡Bienvenido!
                </h2>
                <p className="text-gray-600">
                  Estás conectado como <span className="font-medium text-blue-600">Cliente</span>
                </p>
                <p className="text-sm text-gray-500 mt-2">
                  Email: {session?.user.email}
                </p>
              </div>

              {/* Orders Card */}
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-2">
                  Mis Pedidos
                </h2>
                <p className="text-gray-600">
                  Visualiza y gestiona tus pedidos
                </p>
                <button className="mt-4 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm transition">
                  Ver Pedidos
                </button>
              </div>

              {/* Products Card */}
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-2">
                  Catálogo
                </h2>
                <p className="text-gray-600">
                  Explora nuestros productos disponibles
                </p>
                <button className="mt-4 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm transition">
                  Ver Catálogo
                </button>
              </div>

            </div>
          </div>
        </main>
        
        {/* Integrador de Gamificación */}
        <GamificationIntegrator
          userId={session?.user?.id || ''}
          module="dashboard"
          showMiniDashboard={false}
          autoTrack={{ pageView: true, timeSpent: true }}
        />
      </div>
    </GamificationProvider>
  )
}
