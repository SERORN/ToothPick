// 🎯 FASE 31: Dashboard de Gestión de Suscripción
// ✅ Componente para gestionar suscripción actual del usuario

'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  CreditCard, Calendar, AlertCircle, CheckCircle, 
  Pause, Play, Settings, Download, ExternalLink 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useSession } from 'next-auth/react';

interface SubscriptionStatus {
  isActive: boolean;
  isTrialing: boolean;
  daysRemaining: number;
  currentPlan: {
    _id: string;
    name: { [key: string]: string };
    tier: string;
    features: {
      maxUsers: number | null;
      maxOrders: number | null;
      maxProducts: number | null;
      features: string[];
    };
  } | null;
  subscription: {
    _id: string;
    status: string;
    amount: number;
    currency: string;
    billingCycle: 'monthly' | 'annually';
    currentPeriodEnd: string;
    trialEnd?: string;
    canceledAt?: string;
    endedAt?: string;
    paymentMethod?: {
      type: string;
      last4?: string;
      brand?: string;
    };
  } | null;
  restrictions: {
    maxUsers: number | null;
    maxOrders: number | null;
    maxProducts: number | null;
    features: string[];
  };
}

interface SubscriptionDashboardProps {
  organizationId: string;
  onUpgrade?: () => void;
}

const SubscriptionDashboard: React.FC<SubscriptionDashboardProps> = ({
  organizationId,
  onUpgrade
}) => {
  const { data: session } = useSession();
  const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showCancelDialog, setShowCancelDialog] = useState(false);

  useEffect(() => {
    fetchSubscriptionStatus();
  }, [organizationId]);

  const fetchSubscriptionStatus = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/subscriptions?organizationId=${organizationId}`);
      
      if (!response.ok) {
        throw new Error('Error al cargar estado de suscripción');
      }
      
      const data = await response.json();
      setSubscriptionStatus(data.data);
    } catch (error: any) {
      console.error('Error al cargar estado de suscripción:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelSubscription = async (immediate: boolean = false) => {
    if (!subscriptionStatus?.subscription) return;

    try {
      setActionLoading('cancel');
      const response = await fetch(
        `/api/subscriptions/${subscriptionStatus.subscription._id}?immediate=${immediate}&reason=user_requested`,
        {
          method: 'DELETE'
        }
      );

      if (!response.ok) {
        throw new Error('Error al cancelar suscripción');
      }

      console.log(immediate ? 'Suscripción cancelada inmediatamente' : 'Suscripción programada para cancelación');
      setShowCancelDialog(false);
      await fetchSubscriptionStatus();
    } catch (error: any) {
      console.error('Error al cancelar suscripción:', error);
    } finally {
      setActionLoading(null);
    }
  };

  const handleReactivateSubscription = async () => {
    if (!subscriptionStatus?.subscription) return;

    try {
      setActionLoading('reactivate');
      const response = await fetch(
        `/api/subscriptions/${subscriptionStatus.subscription._id}/reactivate`,
        {
          method: 'POST'
        }
      );

      if (!response.ok) {
        throw new Error('Error al reactivar suscripción');
      }

      console.log('Suscripción reactivada exitosamente');
      await fetchSubscriptionStatus();
    } catch (error: any) {
      console.error('Error al reactivar suscripción:', error);
    } finally {
      setActionLoading(null);
    }
  };

  const openCustomerPortal = async () => {
    if (!subscriptionStatus?.subscription?.paymentMethod || 
        subscriptionStatus.subscription.paymentMethod.type !== 'stripe') {
      console.error('Portal de cliente solo disponible para suscripciones de Stripe');
      return;
    }

    try {
      setActionLoading('portal');
      // Aquí iría la llamada para crear el portal session
      console.log('Redirigiendo al portal de cliente...');
      // window.open(portalUrl, '_blank');
    } catch (error: any) {
      console.error('Error al abrir portal de cliente:', error);
    } finally {
      setActionLoading(null);
    }
  };

  const formatPrice = (amount: number, currency: string): string => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: currency
    }).format(amount);
  };

  const formatDate = (dateString: string): string => {
    return new Intl.DateTimeFormat('es-MX', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }).format(new Date(dateString));
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'trialing':
        return <Badge className="bg-blue-100 text-blue-800">Período de Prueba</Badge>;
      case 'active':
        return <Badge className="bg-green-100 text-green-800">Activa</Badge>;
      case 'past_due':
        return <Badge className="bg-yellow-100 text-yellow-800">Pago Pendiente</Badge>;
      case 'canceled':
        return <Badge className="bg-red-100 text-red-800">Cancelada</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!subscriptionStatus) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">
            <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No tienes una suscripción activa
            </h3>
            <p className="text-gray-600 mb-4">
              Suscríbete para acceder a todas las funcionalidades
            </p>
            <Button onClick={onUpgrade}>
              Ver Planes Disponibles
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const { subscription, currentPlan, isTrialing, daysRemaining } = subscriptionStatus;

  return (
    <div className="space-y-6">
      {/* Estado Actual */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="w-5 h-5" />
            Estado de Suscripción
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Plan Actual */}
            <div>
              <label className="text-sm font-medium text-gray-500">Plan Actual</label>
              <div className="mt-1">
                <div className="text-lg font-semibold">
                  {currentPlan?.name[session?.user?.preferredLanguage || 'es'] || currentPlan?.name.en || 'Sin Plan'}
                </div>
                {subscription && getStatusBadge(subscription.status)}
              </div>
            </div>

            {/* Precio */}
            <div>
              <label className="text-sm font-medium text-gray-500">Precio</label>
              <div className="mt-1">
                <div className="text-lg font-semibold">
                  {subscription ? formatPrice(subscription.amount, subscription.currency) : 'Gratis'}
                </div>
                <div className="text-sm text-gray-600">
                  {subscription?.billingCycle === 'monthly' ? 'por mes' : 'por año'}
                </div>
              </div>
            </div>

            {/* Próximo Pago */}
            <div>
              <label className="text-sm font-medium text-gray-500">
                {isTrialing ? 'Fin del Trial' : 'Próximo Pago'}
              </label>
              <div className="mt-1">
                <div className="text-lg font-semibold">
                  {subscription?.currentPeriodEnd ? 
                    formatDate(subscription.currentPeriodEnd) : 
                    'N/A'
                  }
                </div>
                {daysRemaining > 0 && (
                  <div className="text-sm text-gray-600">
                    {daysRemaining} días restantes
                  </div>
                )}
              </div>
            </div>

            {/* Método de Pago */}
            <div>
              <label className="text-sm font-medium text-gray-500">Método de Pago</label>
              <div className="mt-1">
                <div className="text-lg font-semibold capitalize">
                  {subscription?.paymentMethod?.type || 'No configurado'}
                </div>
                {subscription?.paymentMethod?.last4 && (
                  <div className="text-sm text-gray-600">
                    {subscription.paymentMethod.brand} •••• {subscription.paymentMethod.last4}
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Alertas */}
      {isTrialing && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Tu período de prueba termina en {daysRemaining} días. 
            {daysRemaining <= 3 && ' ¡Actualiza tu plan para continuar sin interrupciones!'}
          </AlertDescription>
        </Alert>
      )}

      {subscription?.status === 'past_due' && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Tu pago está atrasado. Actualiza tu método de pago para continuar usando el servicio.
          </AlertDescription>
        </Alert>
      )}

      {subscription?.canceledAt && !subscription?.endedAt && (
        <Alert className="border-yellow-200 bg-yellow-50">
          <AlertCircle className="h-4 w-4 text-yellow-600" />
          <AlertDescription className="text-yellow-800">
            Tu suscripción está programada para cancelarse el {formatDate(subscription.currentPeriodEnd)}.
            Puedes reactivarla antes de esa fecha.
          </AlertDescription>
        </Alert>
      )}

      {/* Límites y Uso */}
      <Card>
        <CardHeader>
          <CardTitle>Límites del Plan</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-6">
            <div>
              <label className="text-sm font-medium text-gray-500">Usuarios</label>
              <div className="mt-1 text-lg font-semibold">
                {subscriptionStatus.restrictions.maxUsers || 'Ilimitados'}
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Pedidos por mes</label>
              <div className="mt-1 text-lg font-semibold">
                {subscriptionStatus.restrictions.maxOrders || 'Ilimitados'}
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Productos</label>
              <div className="mt-1 text-lg font-semibold">
                {subscriptionStatus.restrictions.maxProducts || 'Ilimitados'}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Acciones */}
      <Card>
        <CardHeader>
          <CardTitle>Gestionar Suscripción</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            {/* Actualizar Plan */}
            <Button onClick={onUpgrade} variant="outline">
              <Settings className="w-4 h-4 mr-2" />
              Cambiar Plan
            </Button>

            {/* Portal de Cliente (solo Stripe) */}
            {subscription?.paymentMethod?.type === 'stripe' && (
              <Button 
                onClick={openCustomerPortal}
                disabled={actionLoading === 'portal'}
                variant="outline"
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                Portal de Cliente
              </Button>
            )}

            {/* Descargar Facturas */}
            <Button variant="outline">
              <Download className="w-4 h-4 mr-2" />
              Descargar Facturas
            </Button>

            {/* Cancelar/Reactivar */}
            {subscription && (
              <>
                {subscription.status === 'canceled' ? (
                  <Button 
                    onClick={handleReactivateSubscription}
                    disabled={actionLoading === 'reactivate'}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <Play className="w-4 h-4 mr-2" />
                    Reactivar
                  </Button>
                ) : (
                  <div className="space-y-2">
                    <Button
                      onClick={() => setShowCancelDialog(!showCancelDialog)}
                      variant="destructive"
                    >
                      <Pause className="w-4 h-4 mr-2" />
                      Cancelar
                    </Button>
                    
                    {showCancelDialog && (
                      <div className="border p-4 rounded-lg bg-gray-50">
                        <h4 className="font-medium mb-2">Cancelar Suscripción</h4>
                        <p className="text-sm text-gray-600 mb-4">
                          ¿Estás seguro de que quieres cancelar tu suscripción?
                        </p>
                        <div className="flex gap-2">
                          <Button
                            onClick={() => handleCancelSubscription(false)}
                            disabled={actionLoading === 'cancel'}
                            variant="outline"
                            size="sm"
                          >
                            Cancelar al final del período
                          </Button>
                          <Button
                            onClick={() => handleCancelSubscription(true)}
                            disabled={actionLoading === 'cancel'}
                            variant="destructive"
                            size="sm"
                          >
                            Cancelar inmediatamente
                          </Button>
                          <Button
                            onClick={() => setShowCancelDialog(false)}
                            variant="outline"
                            size="sm"
                          >
                            Cerrar
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SubscriptionDashboard;
