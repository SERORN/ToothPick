'use client';

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { useGamification, useGamificationNotifications } from '../hooks/useGamification';

interface GamificationContextType {
  // Datos del usuario actual
  userData: any;
  loading: boolean;
  error: string | null;
  
  // Funciones de acción
  awardPoints: (eventType: string, metadata?: any) => Promise<boolean>;
  checkBadges: () => Promise<void>;
  refreshData: () => Promise<void>;
  
  // Notificaciones
  notifications: any[];
  addNotification: (notification: any) => void;
  removeNotification: (id: string) => void;
  
  // Estado global
  isGamificationEnabled: boolean;
  showNotifications: boolean;
  setShowNotifications: (show: boolean) => void;
}

const GamificationContext = createContext<GamificationContextType | null>(null);

interface GamificationProviderProps {
  children: React.ReactNode;
  userId: string;
  enabled?: boolean;
}

export function GamificationProvider({ 
  children, 
  userId, 
  enabled = true 
}: GamificationProviderProps) {
  const [showNotifications, setShowNotifications] = useState(true);
  
  const {
    userData,
    loading,
    error,
    refreshData,
    awardPoints: baseAwardPoints,
    checkBadges
  } = useGamification(userId);

  const {
    notifications,
    addNotification,
    removeNotification
  } = useGamificationNotifications();

  // Envolver awardPoints para manejar notificaciones automáticas
  const awardPoints = useCallback(async (eventType: string, metadata: any = {}) => {
    const success = await baseAwardPoints(eventType, metadata);
    
    if (success && showNotifications) {
      // Las notificaciones se manejarán desde la respuesta del API
      // o mediante WebSocket en implementaciones futuras
    }
    
    return success;
  }, [baseAwardPoints, showNotifications]);

  // Función para mostrar notificaciones manuales (para testing)
  const showTestNotification = useCallback((type: 'points' | 'badge' | 'level' | 'streak') => {
    if (!showNotifications) return;
    
    const notifications = {
      points: {
        type: 'points' as const,
        title: '¡Puntos ganados!',
        message: 'Has ganado 50 puntos por completar una acción',
        points: 50
      },
      badge: {
        type: 'badge' as const,
        title: '¡Nueva insignia!',
        message: 'Has desbloqueado "Primer Paciente"',
        badgeId: 'FIRST_PATIENT'
      },
      level: {
        type: 'level' as const,
        title: '¡Nivel aumentado!',
        message: 'Has alcanzado el nivel 5: Experto',
        level: 5
      },
      streak: {
        type: 'streak' as const,
        title: '¡Racha activa!',
        message: 'Llevas 7 días consecutivos de actividad'
      }
    };
    
    addNotification(notifications[type]);
  }, [addNotification, showNotifications]);

  const contextValue: GamificationContextType = {
    userData,
    loading,
    error,
    awardPoints,
    checkBadges,
    refreshData,
    notifications,
    addNotification,
    removeNotification,
    isGamificationEnabled: enabled,
    showNotifications,
    setShowNotifications
  };

  return (
    <GamificationContext.Provider value={contextValue}>
      {children}
      {/* Render de notificaciones globales */}
      {enabled && showNotifications && (
        <GamificationNotifications 
          notifications={notifications}
          onRemove={removeNotification}
        />
      )}
    </GamificationContext.Provider>
  );
}

export function useGamificationContext() {
  const context = useContext(GamificationContext);
  if (!context) {
    throw new Error('useGamificationContext debe usarse dentro de GamificationProvider');
  }
  return context;
}

// Componente para renderizar notificaciones
interface GamificationNotificationsProps {
  notifications: any[];
  onRemove: (id: string) => void;
}

function GamificationNotifications({ notifications, onRemove }: GamificationNotificationsProps) {
  if (notifications.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2 pointer-events-none">
      {notifications.map((notification) => (
        <GamificationNotificationCard
          key={notification.id}
          notification={notification}
          onRemove={onRemove}
        />
      ))}
    </div>
  );
}

// Card individual de notificación
interface GamificationNotificationCardProps {
  notification: any;
  onRemove: (id: string) => void;
}

function GamificationNotificationCard({ notification, onRemove }: GamificationNotificationCardProps) {
  const getIcon = () => {
    switch (notification.type) {
      case 'points':
        return '🎯';
      case 'badge':
        return '🏆';
      case 'level':
        return '⭐';
      case 'streak':
        return '🔥';
      default:
        return '🎉';
    }
  };

  const getColors = () => {
    switch (notification.type) {
      case 'points':
        return 'bg-blue-500 border-blue-400';
      case 'badge':
        return 'bg-yellow-500 border-yellow-400';
      case 'level':
        return 'bg-purple-500 border-purple-400';
      case 'streak':
        return 'bg-orange-500 border-orange-400';
      default:
        return 'bg-green-500 border-green-400';
    }
  };

  return (
    <div className={`
      ${getColors()}
      text-white rounded-lg p-4 shadow-lg border-l-4 
      pointer-events-auto cursor-pointer transform transition-all duration-300
      animate-in slide-in-from-right-full
      hover:scale-105 active:scale-95
      max-w-sm
    `}
    onClick={() => onRemove(notification.id)}
    >
      <div className="flex items-start space-x-3">
        <div className="text-2xl flex-shrink-0">
          {getIcon()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-sm">
            {notification.title}
          </div>
          <div className="text-xs opacity-90 mt-1">
            {notification.message}
          </div>
          {notification.points && (
            <div className="text-xs font-bold mt-2">
              +{notification.points} puntos
            </div>
          )}
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove(notification.id);
          }}
          className="text-white/70 hover:text-white text-xs flex-shrink-0"
        >
          ✕
        </button>
      </div>
    </div>
  );
}

// Hook para acciones rápidas de gamificación
export function useGamificationActions() {
  const { awardPoints, addNotification, showNotifications } = useGamificationContext();

  const trackEvent = useCallback(async (eventType: string, metadata: any = {}) => {
    const success = await awardPoints(eventType, metadata);
    
    if (success && showNotifications) {
      // Mostrar notificación basada en el tipo de evento
      const eventNotifications: Record<string, any> = {
        'PROFILE_COMPLETE': {
          type: 'points',
          title: '¡Perfil completado!',
          message: 'Has ganado puntos por completar tu perfil',
          points: 100
        },
        'FIRST_APPOINTMENT': {
          type: 'badge',
          title: '¡Primera cita!',
          message: 'Has desbloqueado tu primera insignia',
          badgeId: 'FIRST_APPOINTMENT'
        },
        'DAILY_LOGIN': {
          type: 'streak',
          title: '¡Racha diaria!',
          message: 'Sigues activo día tras día'
        }
      };
      
      const notification = eventNotifications[eventType];
      if (notification) {
        addNotification(notification);
      }
    }
    
    return success;
  }, [awardPoints, addNotification, showNotifications]);

  return {
    trackEvent,
    trackProfileComplete: () => trackEvent('PROFILE_COMPLETE'),
    trackAppointmentBooked: () => trackEvent('APPOINTMENT_BOOKED'),
    trackOrderPlaced: () => trackEvent('ORDER_PLACED'),
    trackReviewSubmitted: () => trackEvent('REVIEW_SUBMITTED'),
    trackDailyLogin: () => trackEvent('DAILY_LOGIN'),
    trackFirstAppointment: () => trackEvent('FIRST_APPOINTMENT'),
    trackStreakMilestone: (days: number) => trackEvent('STREAK_MILESTONE', { days }),
    trackReferralSuccess: () => trackEvent('REFERRAL_SUCCESS'),
    trackCourseCompleted: (courseId: string) => trackEvent('COURSE_COMPLETED', { courseId })
  };
}
