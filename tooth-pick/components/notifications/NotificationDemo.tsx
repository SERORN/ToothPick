'use client';

import React, { useState } from 'react';
import { 
  Bell, 
  Play, 
  Settings, 
  CheckCircle,
  AlertCircle,
  Info,
  Star,
  ShoppingCart,
  CreditCard,
  MessageSquare,
  Shield,
  Gift,
  Zap
} from 'lucide-react';
import { cn } from '@/lib/utils';
import NotificationBell from './NotificationBell';
import NotificationService from '@/lib/services/NotificationService';

interface DemoNotification {
  id: string;
  title: string;
  message: string;
  type: string;
  category: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  icon: string;
  url?: string;
}

const NotificationDemo: React.FC = () => {
  const [isCreating, setIsCreating] = useState(false);
  const [lastCreated, setLastCreated] = useState<string | null>(null);

  // Ejemplos de notificaciones para demo
  const demoNotifications: DemoNotification[] = [
    {
      id: 'order-success',
      title: '¡Pedido confirmado!',
      message: 'Tu pedido #ORD-2024-001 por $150.000 CLP ha sido procesado exitosamente.',
      type: 'order_success',
      category: 'order',
      priority: 'medium',
      icon: '🛒',
      url: '/orders/demo-order-1'
    },
    {
      id: 'verification-approved',
      title: '✅ Verificación aprobada',
      message: 'Tu cuenta ha sido verificada exitosamente. Ya puedes acceder a todas las funcionalidades.',
      type: 'verification_approved',
      category: 'verification',
      priority: 'high',
      icon: '✅',
      url: '/verification/demo-verification-1'
    },
    {
      id: 'support-reply',
      title: 'Nueva respuesta en tu ticket',
      message: 'Hay una nueva respuesta en tu ticket #SUP-001: Problema con el envío',
      type: 'support_reply',
      category: 'support',
      priority: 'medium',
      icon: '💬',
      url: '/support/demo-ticket-1'
    },
    {
      id: 'loyalty-points',
      title: '🎉 ¡Puntos ganados!',
      message: 'Has ganado 150 puntos por tu compra reciente',
      type: 'loyalty_points_earned',
      category: 'loyalty',
      priority: 'low',
      icon: '⭐',
      url: '/loyalty'
    },
    {
      id: 'payment-failed',
      title: '❌ Pago fallido',
      message: 'Tu pago para el pedido #ORD-2024-002 no pudo ser procesado. Revisa tu método de pago.',
      type: 'payment_failed',
      category: 'payment',
      priority: 'urgent',
      icon: '💳'
    },
    {
      id: 'subscription-upgraded',
      title: '🎯 Suscripción actualizada',
      message: 'Tu suscripción ha sido actualizada al plan Pro. ¡Disfruta de las nuevas funcionalidades!',
      type: 'subscription_upgraded',
      category: 'subscription',
      priority: 'medium',
      icon: '🎯',
      url: '/subscription'
    },
    {
      id: 'system-announcement',
      title: '📢 Nuevo sistema de notificaciones',
      message: 'Hemos lanzado un nuevo sistema de notificaciones con más funcionalidades y mejor rendimiento.',
      type: 'system_announcement',
      category: 'system',
      priority: 'low',
      icon: '📢'
    }
  ];

  const createTestNotification = async (demo: DemoNotification) => {
    setIsCreating(true);
    setLastCreated(null);

    try {
      const response = await fetch('/api/notifications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: demo.title,
          message: demo.message,
          type: demo.type,
          category: demo.category,
          priority: demo.priority,
          icon: demo.icon,
          url: demo.url,
          metadata: {
            demo: true,
            createdAt: new Date().toISOString()
          }
        })
      });

      if (response.ok) {
        setLastCreated(demo.id);
        
        // Auto-reset después de 3 segundos
        setTimeout(() => {
          setLastCreated(null);
        }, 3000);
      } else {
        console.error('Error creating notification');
      }
    } catch (error) {
      console.error('Error creating notification:', error);
    } finally {
      setIsCreating(false);
    }
  };

  const createBulkNotifications = async () => {
    setIsCreating(true);
    
    try {
      // Crear múltiples notificaciones
      for (const demo of demoNotifications.slice(0, 3)) {
        await createTestNotification(demo);
        // Pequeña pausa entre notificaciones
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    } catch (error) {
      console.error('Error creating bulk notifications:', error);
    } finally {
      setIsCreating(false);
    }
  };

  const getPriorityColor = (priority: string) => {
    const colors = {
      urgent: 'border-red-200 bg-red-50 text-red-800',
      high: 'border-orange-200 bg-orange-50 text-orange-800',
      medium: 'border-blue-200 bg-blue-50 text-blue-800',
      low: 'border-gray-200 bg-gray-50 text-gray-800'
    };
    return colors[priority as keyof typeof colors] || colors.medium;
  };

  const getCategoryIcon = (category: string) => {
    const icons: Record<string, React.ReactNode> = {
      order: <ShoppingCart className="w-5 h-5" />,
      verification: <Shield className="w-5 h-5" />,
      support: <MessageSquare className="w-5 h-5" />,
      loyalty: <Star className="w-5 h-5" />,
      payment: <CreditCard className="w-5 h-5" />,
      subscription: <Gift className="w-5 h-5" />,
      system: <Settings className="w-5 h-5" />
    };
    return icons[category] || <Bell className="w-5 h-5" />;
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="text-center">
        <div className="flex items-center justify-center space-x-3 mb-4">
          <Bell className="w-10 h-10 text-blue-600" />
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white">
            Demo - Sistema de Notificaciones
          </h1>
        </div>
        <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
          Prueba el sistema de notificaciones en tiempo real. Crea notificaciones de ejemplo y ve cómo aparecen en el bell de notificaciones.
        </p>
      </div>

      {/* Componente de prueba */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Campana de Notificaciones en Vivo
          </h2>
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-600 dark:text-gray-400">
              Haz clic en las notificaciones de abajo para probar →
            </span>
            <NotificationBell size="lg" />
          </div>
        </div>

        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-700">
          <div className="flex items-start space-x-3">
            <Info className="w-5 h-5 text-blue-600 mt-0.5" />
            <div>
              <h3 className="font-medium text-blue-900 dark:text-blue-100 mb-1">
                Cómo usar esta demo
              </h3>
              <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
                <li>• Haz clic en cualquier botón de notificación para crearla</li>
                <li>• Ve cómo aparece el badge en la campana de notificaciones</li>
                <li>• Haz clic en la campana para ver el dropdown</li>
                <li>• Prueba marcar como leídas o eliminar notificaciones</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Acciones rápidas */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          Acciones Rápidas
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            onClick={createBulkNotifications}
            disabled={isCreating}
            className={cn(
              "flex items-center justify-center space-x-2 p-4 rounded-lg border-2 border-dashed",
              "border-purple-300 bg-purple-50 text-purple-700 hover:bg-purple-100",
              "dark:border-purple-600 dark:bg-purple-900/20 dark:text-purple-300",
              "transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            )}
          >
            <Zap className="w-5 h-5" />
            <span className="font-medium">
              {isCreating ? 'Creando...' : 'Crear 3 Notificaciones'}
            </span>
          </button>

          <a
            href="/notifications"
            target="_blank"
            className="flex items-center justify-center space-x-2 p-4 rounded-lg border-2 border-dashed border-green-300 bg-green-50 text-green-700 hover:bg-green-100 dark:border-green-600 dark:bg-green-900/20 dark:text-green-300 transition-colors"
          >
            <Bell className="w-5 h-5" />
            <span className="font-medium">Ver Centro de Notificaciones</span>
          </a>

          <a
            href="/api/notifications/stats"
            target="_blank"
            className="flex items-center justify-center space-x-2 p-4 rounded-lg border-2 border-dashed border-blue-300 bg-blue-50 text-blue-700 hover:bg-blue-100 dark:border-blue-600 dark:bg-blue-900/20 dark:text-blue-300 transition-colors"
          >
            <Settings className="w-5 h-5" />
            <span className="font-medium">Ver API Stats</span>
          </a>
        </div>
      </div>

      {/* Lista de notificaciones de demo */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
          Tipos de Notificaciones Disponibles
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {demoNotifications.map((demo) => (
            <div
              key={demo.id}
              className={cn(
                "border rounded-lg p-4 transition-all hover:shadow-md",
                getPriorityColor(demo.priority),
                lastCreated === demo.id && "ring-2 ring-green-500 ring-opacity-50"
              )}
            >
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0">
                  {getCategoryIcon(demo.category)}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900 dark:text-white mb-1">
                        {demo.title}
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                        {demo.message}
                      </p>
                      
                      <div className="flex items-center space-x-2 text-xs">
                        <span className="px-2 py-1 bg-white dark:bg-gray-700 rounded-md font-medium">
                          {demo.category}
                        </span>
                        <span className="px-2 py-1 bg-white dark:bg-gray-700 rounded-md font-medium">
                          {demo.priority}
                        </span>
                        <span className="text-lg">{demo.icon}</span>
                      </div>
                    </div>
                    
                    <button
                      onClick={() => createTestNotification(demo)}
                      disabled={isCreating}
                      className={cn(
                        "flex items-center space-x-1 px-3 py-1 bg-white dark:bg-gray-700 rounded-md text-sm font-medium transition-colors",
                        "hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed",
                        lastCreated === demo.id && "bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300"
                      )}
                    >
                      {lastCreated === demo.id ? (
                        <>
                          <CheckCircle className="w-4 h-4" />
                          <span>¡Creada!</span>
                        </>
                      ) : (
                        <>
                          <Play className="w-4 h-4" />
                          <span>Crear</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Información técnica */}
      <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          🛠️ Información Técnica
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="font-medium text-gray-900 dark:text-white mb-2">
              Características del Sistema
            </h3>
            <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
              <li>• Notificaciones en tiempo real</li>
              <li>• Múltiples tipos y categorías</li>
              <li>• Sistema de prioridades</li>
              <li>• Filtros avanzados</li>
              <li>• Marcado como leído automático</li>
              <li>• Limpieza automática de notificaciones antiguas</li>
              <li>• Estadísticas detalladas</li>
            </ul>
          </div>
          
          <div>
            <h3 className="font-medium text-gray-900 dark:text-white mb-2">
              API Endpoints
            </h3>
            <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
              <li>• <code>GET /api/notifications</code> - Listar notificaciones</li>
              <li>• <code>POST /api/notifications</code> - Crear/actualizar</li>
              <li>• <code>GET /api/notifications/unread-count</code> - Conteo</li>
              <li>• <code>GET /api/notifications/stats</code> - Estadísticas</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotificationDemo;
