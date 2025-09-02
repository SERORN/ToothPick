'use client';

import React, { useState, useEffect } from 'react';
import { SubscriptionPlan } from '@/lib/config/subscription-plans';

interface ExtendedSubscriptionPlan extends SubscriptionPlan {
  isUpgrade?: boolean;
  isDowngrade?: boolean;
  isCurrent?: boolean;
}

interface SubscriptionData {
  id: string;
  plan: string;
  status: string;
  startedAt: string;
  expiresAt: string;
  pricing: {
    amount: number;
    currency: string;
    interval: string;
  };
  usage: {
    appointmentsThisMonth: number;
    revenue: number;
  };
  limits: {
    canCreateAppointment: boolean;
    appointmentsUsed: number;
    appointmentsLimit: number;
    needsUpgrade: boolean;
  };
  planDetails: SubscriptionPlan;
}

const SubscriptionDashboard: React.FC = () => {
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null);
  const [plans, setPlans] = useState<ExtendedSubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Cargar suscripción actual
      const subResponse = await fetch('/api/subscription');
      if (subResponse.ok) {
        const subData = await subResponse.json();
        setSubscription(subData.subscription);
      }
      
      // Cargar planes disponibles
      const plansResponse = await fetch(`/api/subscription/plans?features=true&current=${subscription?.plan || ''}`);
      if (plansResponse.ok) {
        const plansData = await plansResponse.json();
        setPlans(plansData.plans);
      }
      
    } catch (error) {
      console.error('Error loading subscription data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePlanChange = async (action: string, planId?: string) => {
    try {
      setActionLoading(action);
      
      const response = await fetch('/api/subscription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action,
          planId,
          metadata: {
            reason: `User ${action}`,
            source: 'subscription_dashboard'
          }
        }),
      });
      
      const result = await response.json();
      
      if (response.ok) {
        // Recargar datos
        await loadData();
        alert(result.message || 'Acción completada exitosamente');
      } else {
        alert(result.error || 'Error al procesar la acción');
      }
      
    } catch (error) {
      console.error('Error changing plan:', error);
      alert('Error interno del servidor');
    } finally {
      setActionLoading(null);
    }
  };

  const formatPrice = (amount: number, currency: string) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: currency || 'MXN',
    }).format(amount / 100);
  };

  const getStatusBadge = (status: string) => {
    const statusClasses = {
      active: 'bg-green-100 text-green-800',
      trial: 'bg-blue-100 text-blue-800',
      canceling: 'bg-yellow-100 text-yellow-800',
      canceled: 'bg-red-100 text-red-800',
      past_due: 'bg-orange-100 text-orange-800'
    };

    const statusTexts = {
      active: 'Activa',
      trial: 'Periodo de Prueba',
      canceling: 'Cancelando',
      canceled: 'Cancelada',
      past_due: 'Pago Vencido'
    };

    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusClasses[status as keyof typeof statusClasses] || 'bg-gray-100 text-gray-800'}`}>
        {statusTexts[status as keyof typeof statusTexts] || status}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!subscription) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">No se pudo cargar la información de suscripción</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8">
      {/* Header con información actual */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-gray-900">Mi Suscripción</h1>
          {getStatusBadge(subscription.status)}
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{subscription.planDetails.name}</h3>
            <p className="text-gray-600">{subscription.planDetails.description}</p>
            <p className="text-2xl font-bold text-blue-600 mt-2">
              {formatPrice(subscription.pricing.amount, subscription.pricing.currency)}
              <span className="text-sm text-gray-500">/{subscription.pricing.interval}</span>
            </p>
          </div>
          
          <div>
            <h4 className="font-medium text-gray-900 mb-2">Uso este mes</h4>
            <div className="space-y-1">
              <p className="text-sm text-gray-600">
                Citas: {subscription.usage.appointmentsThisMonth} / {subscription.limits.appointmentsLimit === -1 ? '∞' : subscription.limits.appointmentsLimit}
              </p>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full" 
                  style={{ 
                    width: subscription.limits.appointmentsLimit === -1 ? '30%' : 
                           `${Math.min((subscription.usage.appointmentsThisMonth / subscription.limits.appointmentsLimit) * 100, 100)}%` 
                  }}
                ></div>
              </div>
              {subscription.limits.needsUpgrade && (
                <p className="text-xs text-red-600">¡Límite alcanzado! Considera mejorar tu plan.</p>
              )}
            </div>
          </div>
          
          <div>
            <h4 className="font-medium text-gray-900 mb-2">Facturación</h4>
            <p className="text-sm text-gray-600">
              Próxima renovación: {new Date(subscription.expiresAt).toLocaleDateString('es-MX')}
            </p>
            <p className="text-sm text-gray-600">
              Revenue generado: {formatPrice(subscription.usage.revenue, subscription.pricing.currency)}
            </p>
          </div>
        </div>
      </div>

      {/* Características del plan actual */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Características incluidas</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {subscription.planDetails.features.featureList.map((feature, index) => (
            <div key={index} className="flex items-center">
              <svg className="h-5 w-5 text-green-500 mr-3" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              <span className="text-gray-700">{feature}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Planes disponibles */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-6">Cambiar plan</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map((plan) => (
            <div key={plan.id} className={`border rounded-lg p-6 relative ${plan.isCurrent ? 'border-blue-500 bg-blue-50' : 'border-gray-200'} ${plan.popular ? 'ring-2 ring-blue-500' : ''}`}>
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <span className="bg-blue-500 text-white px-3 py-1 rounded-full text-xs font-medium">
                    Más Popular
                  </span>
                </div>
              )}
              
              {plan.isCurrent && (
                <div className="absolute -top-3 right-4">
                  <span className="bg-green-500 text-white px-3 py-1 rounded-full text-xs font-medium">
                    Plan Actual
                  </span>
                </div>
              )}
              
              <div className="text-center">
                <h3 className="text-lg font-semibold text-gray-900">{plan.name}</h3>
                <p className="text-gray-600 text-sm mt-1">{plan.description}</p>
                <div className="mt-4">
                  <span className="text-3xl font-bold text-gray-900">
                    {formatPrice(plan.price.monthly, plan.price.currency)}
                  </span>
                  <span className="text-gray-500">/mes</span>
                </div>
              </div>
              
              <div className="mt-6 space-y-3">
                {plan.features.featureList.slice(0, 4).map((feature, index) => (
                  <div key={index} className="flex items-center text-sm">
                    <svg className="h-4 w-4 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <span className="text-gray-600">{feature}</span>
                  </div>
                ))}
              </div>
              
              <div className="mt-6">
                {plan.isCurrent ? (
                  <button 
                    disabled 
                    className="w-full bg-gray-100 text-gray-500 py-2 px-4 rounded-md font-medium cursor-not-allowed"
                  >
                    Plan Actual
                  </button>
                ) : plan.isUpgrade ? (
                  <button
                    onClick={() => handlePlanChange('upgrade', plan.id)}
                    disabled={actionLoading === 'upgrade'}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-md font-medium transition-colors disabled:opacity-50"
                  >
                    {actionLoading === 'upgrade' ? 'Procesando...' : 'Mejorar Plan'}
                  </button>
                ) : (
                  <button
                    onClick={() => handlePlanChange('downgrade', plan.id)}
                    disabled={actionLoading === 'downgrade'}
                    className="w-full bg-gray-600 hover:bg-gray-700 text-white py-2 px-4 rounded-md font-medium transition-colors disabled:opacity-50"
                  >
                    {actionLoading === 'downgrade' ? 'Procesando...' : 'Cambiar a este Plan'}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Acciones de suscripción */}
      {subscription.status === 'active' && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Gestionar suscripción</h2>
          <div className="flex space-x-4">
            <button
              onClick={() => handlePlanChange('cancel')}
              disabled={actionLoading === 'cancel'}
              className="bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded-md font-medium transition-colors disabled:opacity-50"
            >
              {actionLoading === 'cancel' ? 'Procesando...' : 'Cancelar Suscripción'}
            </button>
          </div>
          <p className="text-sm text-gray-500 mt-2">
            Al cancelar, mantendrás acceso hasta el final de tu período de facturación actual.
          </p>
        </div>
      )}

      {subscription.status === 'canceling' && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <h2 className="text-xl font-bold text-yellow-800 mb-2">Suscripción programada para cancelación</h2>
          <p className="text-yellow-700 mb-4">
            Tu suscripción se cancelará el {new Date(subscription.expiresAt).toLocaleDateString('es-MX')}. 
            Puedes reactivarla en cualquier momento antes de esa fecha.
          </p>
          <button
            onClick={() => handlePlanChange('reactivate')}
            disabled={actionLoading === 'reactivate'}
            className="bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-md font-medium transition-colors disabled:opacity-50"
          >
            {actionLoading === 'reactivate' ? 'Procesando...' : 'Reactivar Suscripción'}
          </button>
        </div>
      )}
    </div>
  );
};

export default SubscriptionDashboard;
