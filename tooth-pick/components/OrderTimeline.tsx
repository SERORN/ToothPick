'use client';

import { useState } from 'react';

interface OrderTimelineProps {
  status: string;
  confirmedAt?: Date;
  processingAt?: Date;
  shippedAt?: Date;
  deliveredAt?: Date;
  cancelledAt?: Date;
  estimatedDelivery?: Date;
  trackingNumber?: string;
  shippingProvider?: string;
  trackingUrl?: string;
  isProvider?: boolean; // Para mostrar vista diferente al proveedor
}

export default function OrderTimeline({
  status,
  confirmedAt,
  processingAt,
  shippedAt,
  deliveredAt,
  cancelledAt,
  estimatedDelivery,
  trackingNumber,
  shippingProvider,
  trackingUrl,
  isProvider = false
}: OrderTimelineProps) {
  
  const getStatusConfig = () => {
    const baseSteps = [
      {
        key: 'pending',
        label: 'Orden Recibida',
        description: 'Esperando confirmación del proveedor',
        icon: '📋',
        timestamp: null
      },
      {
        key: 'confirmed',
        label: 'Orden Confirmada',
        description: 'El proveedor aceptó tu orden',
        icon: '✅',
        timestamp: confirmedAt
      },
      {
        key: 'processing',
        label: 'Preparando Envío',
        description: 'Empacando y preparando productos',
        icon: '📦',
        timestamp: processingAt
      },
      {
        key: 'shipped',
        label: 'En Camino',
        description: 'Tu orden está en tránsito',
        icon: '🚚',
        timestamp: shippedAt
      },
      {
        key: 'delivered',
        label: 'Entregado',
        description: 'Tu orden fue entregada exitosamente',
        icon: '🎉',
        timestamp: deliveredAt
      }
    ];

    // Si está cancelada, solo mostrar hasta el punto de cancelación
    if (status === 'cancelled') {
      return [
        ...baseSteps.slice(0, getStatusIndex(status)),
        {
          key: 'cancelled',
          label: 'Orden Cancelada',
          description: 'La orden fue cancelada',
          icon: '❌',
          timestamp: cancelledAt
        }
      ];
    }

    return baseSteps;
  };

  const getStatusIndex = (currentStatus: string) => {
    const statusOrder = ['pending', 'confirmed', 'processing', 'shipped', 'delivered'];
    return statusOrder.indexOf(currentStatus);
  };

  const getCurrentStepIndex = () => {
    return getStatusIndex(status);
  };

  const isStepCompleted = (stepIndex: number) => {
    return stepIndex <= getCurrentStepIndex();
  };

  const isStepActive = (stepIndex: number) => {
    return stepIndex === getCurrentStepIndex();
  };

  const formatDate = (date: Date | undefined) => {
    if (!date) return '';
    return new Date(date).toLocaleDateString('es-MX', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const steps = getStatusConfig();

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-6">
        🚚 Seguimiento de Orden
      </h3>

      {/* Timeline */}
      <div className="relative">
        {steps.map((step, index) => {
          const isCompleted = isStepCompleted(index);
          const isActive = isStepActive(index);
          const isCancelled = status === 'cancelled' && step.key === 'cancelled';
          
          return (
            <div key={step.key} className="relative flex items-start mb-8 last:mb-0">
              {/* Línea conectora */}
              {index < steps.length - 1 && (
                <div 
                  className={`absolute left-6 top-12 w-0.5 h-16 ${
                    isCompleted ? 'bg-green-500' : 'bg-gray-200'
                  }`} 
                />
              )}
              
              {/* Ícono */}
              <div className={`relative z-10 flex items-center justify-center w-12 h-12 rounded-full text-lg ${
                isCancelled 
                  ? 'bg-red-100 border-2 border-red-500 text-red-600'
                  : isCompleted 
                    ? 'bg-green-100 border-2 border-green-500 text-green-600' 
                    : isActive 
                      ? 'bg-blue-100 border-2 border-blue-500 text-blue-600'
                      : 'bg-gray-100 border-2 border-gray-300 text-gray-400'
              }`}>
                {step.icon}
              </div>
              
              {/* Contenido */}
              <div className="ml-4 flex-1">
                <div className="flex items-center justify-between">
                  <h4 className={`font-medium ${
                    isCancelled 
                      ? 'text-red-900'
                      : isCompleted 
                        ? 'text-green-900' 
                        : isActive 
                          ? 'text-blue-900'
                          : 'text-gray-500'
                  }`}>
                    {step.label}
                  </h4>
                  
                  {step.timestamp && (
                    <span className="text-xs text-gray-500">
                      {formatDate(step.timestamp)}
                    </span>
                  )}
                </div>
                
                <p className={`text-sm mt-1 ${
                  isCancelled 
                    ? 'text-red-600'
                    : isCompleted 
                      ? 'text-green-600' 
                      : isActive 
                        ? 'text-blue-600'
                        : 'text-gray-400'
                }`}>
                  {step.description}
                </p>

                {/* Información adicional para paso activo */}
                {isActive && step.key === 'shipped' && trackingNumber && (
                  <div className="mt-3 p-3 bg-blue-50 rounded-md">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-blue-900">
                          📦 Número de Rastreo: <span className="font-mono">{trackingNumber}</span>
                        </p>
                        {shippingProvider && (
                          <p className="text-xs text-blue-700 mt-1">
                            Paquetería: {shippingProvider}
                          </p>
                        )}
                      </div>
                      
                      {trackingUrl && (
                        <a 
                          href={trackingUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                        >
                          Rastrear 🔗
                        </a>
                      )}
                    </div>
                  </div>
                )}

                {/* Fecha estimada de entrega */}
                {isActive && (step.key === 'shipped' || step.key === 'processing') && estimatedDelivery && (
                  <div className="mt-2 p-2 bg-yellow-50 rounded-md">
                    <p className="text-sm text-yellow-800">
                      📅 Entrega estimada: <span className="font-medium">
                        {formatDate(estimatedDelivery)}
                      </span>
                    </p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Resumen inferior */}
      <div className="mt-6 pt-4 border-t border-gray-200">
        {status === 'delivered' && (
          <div className="flex items-center text-green-600">
            <span className="text-lg mr-2">🎉</span>
            <span className="font-medium">¡Entrega completada exitosamente!</span>
          </div>
        )}
        
        {status === 'cancelled' && (
          <div className="flex items-center text-red-600">
            <span className="text-lg mr-2">❌</span>
            <span className="font-medium">Esta orden fue cancelada</span>
          </div>
        )}
        
        {!['delivered', 'cancelled'].includes(status) && estimatedDelivery && (
          <div className="flex items-center text-blue-600">
            <span className="text-lg mr-2">⏰</span>
            <span className="text-sm">
              Entrega estimada: <span className="font-medium">{formatDate(estimatedDelivery)}</span>
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
