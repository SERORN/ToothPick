'use client';

import React, { useEffect } from 'react';
import { GamificationIntegrator, useGamificationIntegration } from '../../components/gamification/GamificationIntegrator';
import { GamificationProvider } from '../../lib/contexts/GamificationContext';
import { useSession } from 'next-auth/react';

// Ejemplo 1: Página de Onboarding con Gamificación
export function OnboardingPageWithGamification() {
  const { data: session } = useSession();
  const integration = useGamificationIntegration('onboarding');

  const handleStepCompleted = (step: string) => {
    integration.onboarding.trackStepCompleted(step);
  };

  const handleOnboardingCompleted = () => {
    integration.onboarding.trackOnboardingCompleted();
  };

  if (!session?.user?.id) return <div>Cargando...</div>;

  return (
    <GamificationProvider userId={session.user.id}>
      <div className="min-h-screen bg-gray-50">
        {/* Integrador de gamificación */}
        <GamificationIntegrator
          userId={session.user.id}
          module="onboarding"
          events={[
            {
              eventType: 'ONBOARDING_STARTED',
              trigger: 'mount',
              metadata: { source: 'direct' }
            }
          ]}
          autoTrack={{
            pageView: true,
            timeSpent: true,
            interactions: true
          }}
          showMiniDashboard={true}
          showProgressBar={true}
          position="top-right"
        />

        {/* Contenido de onboarding */}
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-2xl mx-auto">
            <h1 className="text-3xl font-bold text-gray-900 mb-8">
              ¡Bienvenido a Tooth Pick!
            </h1>

            {/* Paso 1: Información personal */}
            <div className="bg-white rounded-lg shadow p-6 mb-6">
              <h2 className="text-xl font-semibold mb-4">Paso 1: Información Personal</h2>
              <form onSubmit={(e) => {
                e.preventDefault();
                handleStepCompleted('personal_info');
              }}>
                <div className="space-y-4">
                  <input
                    type="text"
                    placeholder="Nombre completo"
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <input
                    type="email"
                    placeholder="Correo electrónico"
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <button
                    type="submit"
                    className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Continuar (+50 puntos)
                  </button>
                </div>
              </form>
            </div>

            {/* Paso 2: Preferencias */}
            <div className="bg-white rounded-lg shadow p-6 mb-6">
              <h2 className="text-xl font-semibold mb-4">Paso 2: Preferencias de Tratamiento</h2>
              <form onSubmit={(e) => {
                e.preventDefault();
                handleStepCompleted('preferences');
              }}>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <label className="flex items-center space-x-2">
                      <input type="checkbox" className="rounded" />
                      <span>Limpieza dental</span>
                    </label>
                    <label className="flex items-center space-x-2">
                      <input type="checkbox" className="rounded" />
                      <span>Ortodoncia</span>
                    </label>
                    <label className="flex items-center space-x-2">
                      <input type="checkbox" className="rounded" />
                      <span>Blanqueamiento</span>
                    </label>
                    <label className="flex items-center space-x-2">
                      <input type="checkbox" className="rounded" />
                      <span>Implantes</span>
                    </label>
                  </div>
                  <button
                    type="submit"
                    className="w-full bg-green-600 text-white py-3 px-4 rounded-lg hover:bg-green-700 transition-colors"
                  >
                    Guardar Preferencias (+75 puntos)
                  </button>
                </div>
              </form>
            </div>

            {/* Paso 3: Completar onboarding */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4">¡Casi terminamos!</h2>
              <p className="text-gray-600 mb-4">
                Ya tienes todo listo para comenzar a usar Tooth Pick. 
                ¡Completar el proceso te dará una insignia especial!
              </p>
              <button
                onClick={handleOnboardingCompleted}
                className="w-full bg-purple-600 text-white py-3 px-4 rounded-lg hover:bg-purple-700 transition-colors"
              >
                Completar Onboarding (+200 puntos + Insignia)
              </button>
            </div>
          </div>
        </div>
      </div>
    </GamificationProvider>
  );
}

// Ejemplo 2: Página de Marketplace con Gamificación
export function MarketplacePageWithGamification() {
  const { data: session } = useSession();
  const integration = useGamificationIntegration('marketplace');

  const handleProductViewed = (productId: string) => {
    integration.marketplace.trackProductViewed(productId);
  };

  const handleOrderPlaced = (orderId: string, amount: number) => {
    integration.marketplace.trackOrderPlaced(orderId, amount);
  };

  if (!session?.user?.id) return <div>Cargando...</div>;

  return (
    <GamificationProvider userId={session.user.id}>
      <div className="min-h-screen bg-gray-50">
        <GamificationIntegrator
          userId={session.user.id}
          module="marketplace"
          events={[
            {
              eventType: 'MARKETPLACE_ENTERED',
              trigger: 'mount'
            }
          ]}
          autoTrack={{
            pageView: true,
            timeSpent: true,
            interactions: true
          }}
          showMiniDashboard={true}
          position="bottom-right"
        />

        <div className="container mx-auto px-4 py-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">Marketplace Dental</h1>

          {/* Grid de productos */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((productId) => (
              <div 
                key={productId}
                className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => handleProductViewed(productId.toString())}
              >
                <div className="h-48 bg-gray-200 rounded-t-lg"></div>
                <div className="p-4">
                  <h3 className="font-semibold text-lg mb-2">Producto {productId}</h3>
                  <p className="text-gray-600 text-sm mb-4">
                    Descripción del producto dental de alta calidad.
                  </p>
                  <div className="flex justify-between items-center">
                    <span className="text-xl font-bold text-green-600">$99.99</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOrderPlaced(`order-${productId}`, 99.99);
                      }}
                      className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors"
                    >
                      Comprar (+30 pts)
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </GamificationProvider>
  );
}

// Ejemplo 3: Página de Citas con Gamificación
export function AppointmentsPageWithGamification() {
  const { data: session } = useSession();
  const integration = useGamificationIntegration('appointments');

  const handleAppointmentBooked = (appointmentId: string) => {
    integration.appointments.trackAppointmentBooked(appointmentId);
  };

  if (!session?.user?.id) return <div>Cargando...</div>;

  return (
    <GamificationProvider userId={session.user.id}>
      <div className="min-h-screen bg-gray-50">
        <GamificationIntegrator
          userId={session.user.id}
          module="appointments"
          autoTrack={{
            pageView: true,
            timeSpent: true
          }}
          showProgressBar={true}
        />

        <div className="container mx-auto px-4 py-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">Reservar Cita</h1>

          <div className="max-w-2xl mx-auto">
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4">Selecciona tu dentista</h2>
              
              <div className="space-y-4">
                {['Dr. García', 'Dra. López', 'Dr. Martínez'].map((dentist, index) => (
                  <div key={dentist} className="border border-gray-200 rounded-lg p-4 hover:border-blue-500 cursor-pointer">
                    <div className="flex justify-between items-center">
                      <div>
                        <h3 className="font-semibold">{dentist}</h3>
                        <p className="text-gray-600">Especialista en odontología general</p>
                      </div>
                      <button
                        onClick={() => handleAppointmentBooked(`apt-${index + 1}`)}
                        className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition-colors"
                      >
                        Reservar (+100 pts)
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </GamificationProvider>
  );
}

// Ejemplo 4: Componente de Dashboard que integra gamificación
export function DashboardWithGamification() {
  const { data: session } = useSession();
  const integration = useGamificationIntegration('dashboard');

  useEffect(() => {
    // Track daily login
    integration.track('DAILY_LOGIN');
  }, []);

  if (!session?.user?.id) return <div>Cargando...</div>;

  return (
    <GamificationProvider userId={session.user.id}>
      <div className="min-h-screen bg-gray-50">
        <GamificationIntegrator
          userId={session.user.id}
          module="dashboard"
          events={[
            {
              eventType: 'DASHBOARD_ACCESSED',
              trigger: 'mount',
              metadata: { timeOfDay: new Date().getHours() }
            }
          ]}
          autoTrack={{
            pageView: true,
            timeSpent: true,
            interactions: true
          }}
          showMiniDashboard={true}
          showProgressBar={true}
          position="top-right"
        />

        <div className="container mx-auto px-4 py-8">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
            <button
              onClick={() => integration.track('PROFILE_ACCESSED')}
              className="text-blue-600 hover:text-blue-800"
            >
              Ver perfil completo de gamificación
            </button>
          </div>

          {/* Quick stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900">Próximas Citas</h3>
              <div className="text-3xl font-bold text-blue-600 mt-2">3</div>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900">Pedidos</h3>
              <div className="text-3xl font-bold text-green-600 mt-2">7</div>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900">Puntos</h3>
              <div className="text-3xl font-bold text-purple-600 mt-2">1,250</div>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900">Nivel</h3>
              <div className="text-3xl font-bold text-orange-600 mt-2">5</div>
            </div>
          </div>

          {/* Actions que generan puntos */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Acciones Rápidas</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <button
                onClick={() => integration.track('QUICK_ACTION', { action: 'update_profile' })}
                className="p-4 border border-gray-200 rounded-lg hover:border-blue-500 transition-colors"
              >
                <div className="text-blue-600 text-2xl mb-2">👤</div>
                <div className="font-semibold">Actualizar Perfil</div>
                <div className="text-sm text-gray-600">+25 puntos</div>
              </button>
              <button
                onClick={() => integration.track('QUICK_ACTION', { action: 'book_appointment' })}
                className="p-4 border border-gray-200 rounded-lg hover:border-green-500 transition-colors"
              >
                <div className="text-green-600 text-2xl mb-2">📅</div>
                <div className="font-semibold">Reservar Cita</div>
                <div className="text-sm text-gray-600">+100 puntos</div>
              </button>
              <button
                onClick={() => integration.track('QUICK_ACTION', { action: 'refer_friend' })}
                className="p-4 border border-gray-200 rounded-lg hover:border-purple-500 transition-colors"
              >
                <div className="text-purple-600 text-2xl mb-2">🤝</div>
                <div className="font-semibold">Referir Amigo</div>
                <div className="text-sm text-gray-600">+500 puntos</div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </GamificationProvider>
  );
}
