// 🎯 FASE 31: Página Principal de Suscripciones
// ✅ Interfaz completa para gestión de suscripciones SaaS

'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import PlanComparison from '@/components/subscription/PlanComparison';
import SubscriptionDashboard from '@/components/subscription/SubscriptionDashboard';

export default function SubscriptionPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'dashboard');
  const [organizationId, setOrganizationId] = useState('default-org-id');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
      return;
    }

    // Verificar si hay parámetros de éxito o cancelación
    if (searchParams.get('success') === 'true') {
      setActiveTab('dashboard');
    } else if (searchParams.get('canceled') === 'true') {
      setActiveTab('plans');
    }
  }, [session, status, router, searchParams]);

  const handleSelectPlan = async (planId: string, billingCycle: 'monthly' | 'annually') => {
    if (!session?.user || !organizationId) {
      router.push('/login');
      return;
    }

    try {
      setLoading(true);
      
      const response = await fetch('/api/subscriptions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          planId,
          organizationId,
          billingCycle,
          currency: session.user.preferredCurrency || 'USD',
          paymentMethod: 'stripe',
          successUrl: `${window.location.origin}/subscription?tab=dashboard&success=true`,
          cancelUrl: `${window.location.origin}/subscription?tab=plans&canceled=true`
        }),
      });

      if (!response.ok) {
        throw new Error('Error al crear suscripción');
      }

      const data = await response.json();
      
      if (data.data.checkoutUrl) {
        // Redirigir a Stripe Checkout
        window.location.href = data.data.checkoutUrl;
      } else {
        // Suscripción creada directamente
        setActiveTab('dashboard');
      }
      
    } catch (error: any) {
      console.error('Error al seleccionar plan:', error);
      alert(error.message || 'Error al procesar la suscripción');
    } finally {
      setLoading(false);
    }
  };

  const handleUpgrade = () => {
    setActiveTab('plans');
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gray-50 flex justify-center items-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!session?.user) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="py-8">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <Card>
              <CardContent className="p-6">
                <div className="text-center">
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    Acceso Requerido
                  </h3>
                  <p className="text-gray-600 mb-4">
                    Debes estar autenticado para gestionar suscripciones
                  </p>
                  <Button onClick={() => router.push('/login')}>
                    Iniciar Sesión
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Gestión de Suscripciones
            </h1>
            <p className="text-gray-600">
              Administra tu plan, facturación y configuraciones de suscripción
            </p>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="dashboard">Mi Suscripción</TabsTrigger>
              <TabsTrigger value="plans">Planes Disponibles</TabsTrigger>
              <TabsTrigger value="billing">Facturación</TabsTrigger>
            </TabsList>

            <TabsContent value="dashboard" className="space-y-6">
              <SubscriptionDashboard
                organizationId={organizationId}
                onUpgrade={handleUpgrade}
              />
            </TabsContent>

            <TabsContent value="plans" className="space-y-6">
              <PlanComparison
                userRole={session.user.role}
                currency={session.user.preferredCurrency || 'USD'}
                organizationId={organizationId}
                onSelectPlan={handleSelectPlan}
              />
            </TabsContent>

            <TabsContent value="billing" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Historial de Facturación</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8">
                    <p className="text-gray-600 mb-4">
                      El historial de facturación estará disponible próximamente
                    </p>
                    <p className="text-sm text-gray-500">
                      Mientras tanto, puedes acceder a tus facturas desde el portal de cliente
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {loading && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white p-6 rounded-lg shadow-lg">
                <div className="flex items-center space-x-3">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                  <span>Procesando suscripción...</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
