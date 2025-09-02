'use client';

import React, { useEffect, useState } from 'react';
import { useGamificationActions } from '../../lib/contexts/GamificationContext';

interface GamificationIntegratorProps {
  // Configuración general
  userId: string;
  module: 'onboarding' | 'marketplace' | 'appointments' | 'profile' | 'orders' | 'reviews' | 'academy' | 'dashboard';
  
  // Eventos específicos a trackear
  events?: {
    eventType: string;
    trigger: 'mount' | 'unmount' | 'manual';
    metadata?: any;
  }[];
  
  // Configuración de tracking automático
  autoTrack?: {
    pageView?: boolean;
    timeSpent?: boolean;
    interactions?: boolean;
  };
  
  // Triggers personalizados
  onEvent?: (eventType: string, metadata?: any) => void;
  
  // UI
  showMiniDashboard?: boolean;
  showProgressBar?: boolean;
  position?: 'top-right' | 'bottom-right' | 'top-left' | 'bottom-left';
}

export function GamificationIntegrator({
  userId,
  module,
  events = [],
  autoTrack = {},
  onEvent,
  showMiniDashboard = false,
  showProgressBar = false,
  position = 'top-right'
}: GamificationIntegratorProps) {
  const [timeSpent, setTimeSpent] = useState(0);
  const [interactions, setInteractions] = useState(0);
  const [mounted, setMounted] = useState(false);
  
  const gamificationActions = useGamificationActions();

  // Track page view al montar
  useEffect(() => {
    setMounted(true);
    
    if (autoTrack.pageView) {
      gamificationActions.trackEvent(`${module.toUpperCase()}_PAGE_VIEW`, {
        module,
        timestamp: new Date().toISOString()
      });
    }

    // Ejecutar eventos configurados para 'mount'
    events
      .filter(event => event.trigger === 'mount')
      .forEach(event => {
        gamificationActions.trackEvent(event.eventType, {
          ...event.metadata,
          module,
          trigger: 'mount'
        });
      });

    return () => {
      // Ejecutar eventos configurados para 'unmount'
      events
        .filter(event => event.trigger === 'unmount')
        .forEach(event => {
          gamificationActions.trackEvent(event.eventType, {
            ...event.metadata,
            module,
            trigger: 'unmount'
          });
        });

      // Track time spent si está habilitado
      if (autoTrack.timeSpent && timeSpent > 30) { // Mínimo 30 segundos
        gamificationActions.trackEvent('TIME_SPENT_MILESTONE', {
          module,
          timeSpentSeconds: timeSpent,
          tier: getTimeSpentTier(timeSpent)
        });
      }
    };
  }, []);

  // Track tiempo en página
  useEffect(() => {
    if (!autoTrack.timeSpent || !mounted) return;

    const interval = setInterval(() => {
      setTimeSpent(prev => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [autoTrack.timeSpent, mounted]);

  // Track interacciones
  useEffect(() => {
    if (!autoTrack.interactions || !mounted) return;

    const trackInteraction = () => {
      setInteractions(prev => {
        const newCount = prev + 1;
        
        // Track milestones de interacción
        if (newCount % 10 === 0) {
          gamificationActions.trackEvent('INTERACTION_MILESTONE', {
            module,
            interactions: newCount,
            tier: getInteractionTier(newCount)
          });
        }
        
        return newCount;
      });
    };

    // Agregar listeners para diferentes tipos de interacción
    const events = ['click', 'scroll', 'keydown', 'touchstart'];
    events.forEach(eventType => {
      document.addEventListener(eventType, trackInteraction, { passive: true });
    });

    return () => {
      events.forEach(eventType => {
        document.removeEventListener(eventType, trackInteraction);
      });
    };
  }, [autoTrack.interactions, mounted, module]);

  // Función para trigger manual de eventos
  const triggerEvent = (eventType: string, metadata: any = {}) => {
    gamificationActions.trackEvent(eventType, {
      ...metadata,
      module,
      trigger: 'manual'
    });
    
    if (onEvent) {
      onEvent(eventType, metadata);
    }
  };

  // Helpers para determinar tiers
  const getTimeSpentTier = (seconds: number): string => {
    if (seconds >= 300) return 'expert'; // 5+ minutos
    if (seconds >= 120) return 'engaged'; // 2+ minutos
    if (seconds >= 60) return 'interested'; // 1+ minuto
    return 'visitor';
  };

  const getInteractionTier = (count: number): string => {
    if (count >= 50) return 'power_user';
    if (count >= 20) return 'active_user';
    if (count >= 10) return 'engaged_user';
    return 'casual_user';
  };

  // Posicionamiento del mini dashboard
  const getPositionClasses = () => {
    const base = 'fixed z-40 pointer-events-auto';
    switch (position) {
      case 'top-right': return `${base} top-4 right-4`;
      case 'bottom-right': return `${base} bottom-4 right-4`;
      case 'top-left': return `${base} top-4 left-4`;
      case 'bottom-left': return `${base} bottom-4 left-4`;
      default: return `${base} top-4 right-4`;
    }
  };

  if (!mounted) return null;

  return (
    <>
      {/* Mini Dashboard */}
      {showMiniDashboard && (
        <div className={getPositionClasses()}>
          <GamificationMiniDashboard 
            userId={userId}
            module={module}
            timeSpent={timeSpent}
            interactions={interactions}
            onTriggerEvent={triggerEvent}
          />
        </div>
      )}

      {/* Progress Bar */}
      {showProgressBar && (
        <div className="fixed top-0 left-0 right-0 z-50 pointer-events-none">
          <GamificationProgressBanner 
            userId={userId}
            module={module}
          />
        </div>
      )}
    </>
  );
}

// Mini dashboard flotante
interface GamificationMiniDashboardProps {
  userId: string;
  module: string;
  timeSpent: number;
  interactions: number;
  onTriggerEvent: (eventType: string, metadata?: any) => void;
}

function GamificationMiniDashboard({ 
  userId, 
  module, 
  timeSpent, 
  interactions,
  onTriggerEvent 
}: GamificationMiniDashboardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [userData, setUserData] = useState<any>(null);

  useEffect(() => {
    // Cargar datos básicos del usuario
    fetch(`/api/gamification/profile?userId=${userId}`)
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setUserData(data.profile);
        }
      })
      .catch(console.error);
  }, [userId]);

  if (!userData) return null;

  return (
    <div className={`
      bg-white rounded-lg shadow-lg border border-gray-200 
      transition-all duration-300 
      ${isExpanded ? 'w-80' : 'w-16'}
    `}>
      {/* Header compacto */}
      <div 
        className="p-3 cursor-pointer flex items-center justify-between"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center space-x-2">
          <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white text-sm font-bold">
            {userData.level || 1}
          </div>
          {isExpanded && (
            <div>
              <div className="text-sm font-semibold text-gray-900">
                Nivel {userData.level || 1}
              </div>
              <div className="text-xs text-gray-500">
                {userData.totalPoints || 0} puntos
              </div>
            </div>
          )}
        </div>
        <div className="text-gray-400">
          {isExpanded ? '−' : '+'}
        </div>
      </div>

      {/* Contenido expandido */}
      {isExpanded && (
        <div className="px-3 pb-3 space-y-3">
          {/* Progress bar del nivel */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-gray-600">
              <span>Progreso</span>
              <span>{userData.levelProgress?.percentage || 0}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${userData.levelProgress?.percentage || 0}%` }}
              />
            </div>
          </div>

          {/* Stats de sesión */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="text-center p-2 bg-blue-50 rounded">
              <div className="font-semibold text-blue-600">{Math.floor(timeSpent / 60)}m</div>
              <div className="text-blue-500">Tiempo</div>
            </div>
            <div className="text-center p-2 bg-green-50 rounded">
              <div className="font-semibold text-green-600">{interactions}</div>
              <div className="text-green-500">Acciones</div>
            </div>
          </div>

          {/* Acciones rápidas */}
          <div className="flex space-x-2">
            <button
              onClick={() => onTriggerEvent('MANUAL_ENGAGEMENT', { module })}
              className="flex-1 bg-purple-100 text-purple-700 text-xs py-2 px-3 rounded hover:bg-purple-200 transition-colors"
            >
              +10 pts
            </button>
            <button
              onClick={() => window.open('/profile/gamification', '_blank')}
              className="flex-1 bg-gray-100 text-gray-700 text-xs py-2 px-3 rounded hover:bg-gray-200 transition-colors"
            >
              Ver más
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// Banner de progreso superior
interface GamificationProgressBannerProps {
  userId: string;
  module: string;
}

function GamificationProgressBanner({ userId, module }: GamificationProgressBannerProps) {
  const [userData, setUserData] = useState<any>(null);

  useEffect(() => {
    fetch(`/api/gamification/profile?userId=${userId}`)
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setUserData(data.profile);
        }
      })
      .catch(console.error);
  }, [userId]);

  if (!userData) return null;

  return (
    <div className="bg-gradient-to-r from-purple-500 to-pink-500 text-white p-2">
      <div className="container mx-auto flex items-center justify-between">
        <div className="flex items-center space-x-4 text-sm">
          <span className="font-semibold">
            Nivel {userData.level} - {userData.levelTitle}
          </span>
          <span className="opacity-90">
            {userData.totalPoints} puntos
          </span>
        </div>
        
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <span className="text-xs opacity-90">Progreso:</span>
            <div className="w-24 bg-white/20 rounded-full h-2">
              <div 
                className="bg-white h-2 rounded-full transition-all duration-300"
                style={{ width: `${userData.levelProgress?.percentage || 0}%` }}
              />
            </div>
            <span className="text-xs">{userData.levelProgress?.percentage || 0}%</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// Hook para integración fácil
export function useGamificationIntegration(module: string) {
  const gamificationActions = useGamificationActions();

  const trackModuleEvent = (eventType: string, metadata: any = {}) => {
    return gamificationActions.trackEvent(`${module.toUpperCase()}_${eventType}`, {
      ...metadata,
      module,
      timestamp: new Date().toISOString()
    });
  };

  return {
    // Eventos comunes
    trackPageView: () => trackModuleEvent('PAGE_VIEW'),
    trackFeatureUsed: (feature: string) => trackModuleEvent('FEATURE_USED', { feature }),
    trackActionCompleted: (action: string) => trackModuleEvent('ACTION_COMPLETED', { action }),
    trackMilestone: (milestone: string) => trackModuleEvent('MILESTONE', { milestone }),
    
    // Eventos específicos por módulo
    onboarding: {
      trackStepCompleted: (step: string) => trackModuleEvent('STEP_COMPLETED', { step }),
      trackOnboardingCompleted: () => trackModuleEvent('COMPLETED')
    },
    
    marketplace: {
      trackProductViewed: (productId: string) => trackModuleEvent('PRODUCT_VIEWED', { productId }),
      trackOrderPlaced: (orderId: string, amount: number) => trackModuleEvent('ORDER_PLACED', { orderId, amount })
    },
    
    appointments: {
      trackAppointmentBooked: (appointmentId: string) => trackModuleEvent('APPOINTMENT_BOOKED', { appointmentId }),
      trackAppointmentCompleted: (appointmentId: string) => trackModuleEvent('APPOINTMENT_COMPLETED', { appointmentId })
    },
    
    // Función genérica
    track: trackModuleEvent
  };
}
