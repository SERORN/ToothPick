'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import LoyaltyCard from '@/components/LoyaltyCard';
import LoyaltyHistory from '@/components/LoyaltyHistory';
import LoyaltyTriggerList from '@/components/LoyaltyTriggerList';
import { Crown, Trophy, Gift, TrendingUp, Users, Sparkles } from 'lucide-react';

// Mock data para demostración
const DEMO_USER = {
  id: 'demo-user-123',
  organizationId: 'demo-org-456',
  tier: 'Gold',
  points: 2450,
  email: 'usuario@ejemplo.com'
};

export default function LoyaltyDemoPage() {
  const [activeTab, setActiveTab] = useState('overview');

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 p-4">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="text-center mb-6">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
            🎯 FASE 32: Sistema de Fidelización Dinámico
          </h1>
          <p className="text-xl text-gray-600 mb-4">
            Demo completo del sistema de fidelización integrado
          </p>
          <div className="flex items-center justify-center gap-4">
            <Badge variant="outline" className="text-green-700 border-green-300">
              ✅ Backend Completo
            </Badge>
            <Badge variant="outline" className="text-blue-700 border-blue-300">
              ✅ API Endpoints
            </Badge>
            <Badge variant="outline" className="text-purple-700 border-purple-300">
              ✅ Componentes React
            </Badge>
            <Badge variant="outline" className="text-orange-700 border-orange-300">
              ✅ Webhook Integration
            </Badge>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-100 text-sm">Puntos Totales</p>
                  <p className="text-2xl font-bold">2,450</p>
                </div>
                <Sparkles className="h-8 w-8 text-blue-200" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-r from-purple-500 to-purple-600 text-white">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-purple-100 text-sm">Tier Actual</p>
                  <p className="text-2xl font-bold">Gold 🥇</p>
                </div>
                <Crown className="h-8 w-8 text-purple-200" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-100 text-sm">Eventos</p>
                  <p className="text-2xl font-bold">47</p>
                </div>
                <Trophy className="h-8 w-8 text-green-200" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-r from-orange-500 to-orange-600 text-white">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-orange-100 text-sm">Referencias</p>
                  <p className="text-2xl font-bold">12</p>
                </div>
                <Users className="h-8 w-8 text-orange-200" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-8">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <Crown className="h-4 w-4" />
              Resumen
            </TabsTrigger>
            <TabsTrigger value="opportunities" className="flex items-center gap-2">
              <Gift className="h-4 w-4" />
              Oportunidades
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Historial
            </TabsTrigger>
            <TabsTrigger value="system" className="flex items-center gap-2">
              <Trophy className="h-4 w-4" />
              Sistema
            </TabsTrigger>
          </TabsList>

          {/* Tab: Resumen General */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Loyalty Card */}
              <div className="lg:col-span-1">
                <LoyaltyCard 
                  userId={DEMO_USER.id}
                  organizationId={DEMO_USER.organizationId}
                />
              </div>
              
              {/* Quick Actions */}
              <div className="lg:col-span-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Gift className="h-5 w-5" />
                      Acciones Rápidas
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Button variant="outline" className="p-6 h-auto flex-col">
                        <CreditCard className="h-6 w-6 mb-2 text-green-600" />
                        <span className="font-medium">Pagar Suscripción</span>
                        <span className="text-sm text-gray-500">+100 puntos</span>
                      </Button>
                      
                      <Button variant="outline" className="p-6 h-auto flex-col">
                        <Users className="h-6 w-6 mb-2 text-blue-600" />
                        <span className="font-medium">Referir Amigo</span>
                        <span className="text-sm text-gray-500">+300 puntos</span>
                      </Button>
                      
                      <Button variant="outline" className="p-6 h-auto flex-col">
                        <TrendingUp className="h-6 w-6 mb-2 text-purple-600" />
                        <span className="font-medium">Upgrade Plan</span>
                        <span className="text-sm text-gray-500">+500 puntos</span>
                      </Button>
                      
                      <Button variant="outline" className="p-6 h-auto flex-col">
                        <Trophy className="h-6 w-6 mb-2 text-orange-600" />
                        <span className="font-medium">Completar Perfil</span>
                        <span className="text-sm text-gray-500">+150 puntos</span>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* Tab: Oportunidades */}
          <TabsContent value="opportunities">
            <LoyaltyTriggerList 
              userId={DEMO_USER.id}
              organizationId={DEMO_USER.organizationId}
              userTier={DEMO_USER.tier}
            />
          </TabsContent>

          {/* Tab: Historial */}
          <TabsContent value="history">
            <LoyaltyHistory 
              userId={DEMO_USER.id}
              organizationId={DEMO_USER.organizationId}
              maxEvents={20}
            />
          </TabsContent>

          {/* Tab: Información del Sistema */}
          <TabsContent value="system" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Componentes Implementados */}
              <Card>
                <CardHeader>
                  <CardTitle>🔧 Componentes Backend</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">✅</Badge>
                    <span>LoyaltyTrigger.ts - Modelo de triggers</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">✅</Badge>
                    <span>LoyaltyEvent.ts - Modelo de eventos</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">✅</Badge>
                    <span>UserSubscription.ts - Extensión con loyalty</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">✅</Badge>
                    <span>LoyaltyService.ts - Lógica de negocio</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">✅</Badge>
                    <span>LoyaltyWebhookProcessor.ts - Procesamiento automático</span>
                  </div>
                </CardContent>
              </Card>

              {/* API Endpoints */}
              <Card>
                <CardHeader>
                  <CardTitle>🚀 API Endpoints</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">✅</Badge>
                    <span>/api/loyalty/triggers - Gestión de triggers</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">✅</Badge>
                    <span>/api/loyalty/events - Historial de eventos</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">✅</Badge>
                    <span>/api/loyalty/summary - Dashboard del usuario</span>
                  </div>
                </CardContent>
              </Card>

              {/* Componentes Frontend */}
              <Card>
                <CardHeader>
                  <CardTitle>🎨 Componentes React</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">✅</Badge>
                    <span>LoyaltyCard.tsx - Tarjeta de tier y progreso</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">✅</Badge>
                    <span>LoyaltyHistory.tsx - Historial de eventos</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">✅</Badge>
                    <span>LoyaltyTriggerList.tsx - Oportunidades disponibles</span>
                  </div>
                </CardContent>
              </Card>

              {/* Integraciones */}
              <Card>
                <CardHeader>
                  <CardTitle>🔗 Integraciones</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">✅</Badge>
                    <span>FASE 31 - Suscripciones SaaS</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">✅</Badge>
                    <span>FASE 29 - Sistema de Pagos</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">✅</Badge>
                    <span>Sistema de Gamificación</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">✅</Badge>
                    <span>Webhooks Automáticos</span>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Detalles técnicos */}
            <Card>
              <CardHeader>
                <CardTitle>📋 Características Implementadas</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-medium mb-3">Sistema de Triggers</h4>
                    <ul className="space-y-1 text-sm text-gray-600">
                      <li>• Triggers dinámicos configurables</li>
                      <li>• Condiciones personalizables</li>
                      <li>• Límites de frecuencia</li>
                      <li>• Bonos por tier automáticos</li>
                      <li>• Triggers estacionales</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-medium mb-3">Sistema de Eventos</h4>
                    <ul className="space-y-1 text-sm text-gray-600">
                      <li>• Deduplicación por fingerprint</li>
                      <li>• Audit trail completo</li>
                      <li>• Reversión de eventos</li>
                      <li>• Snapshots de estado</li>
                      <li>• Agregaciones estadísticas</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-medium mb-3">Sistema de Tiers</h4>
                    <ul className="space-y-1 text-sm text-gray-600">
                      <li>• 4 tiers: Bronze, Silver, Gold, Platinum</li>
                      <li>• Progresión automática</li>
                      <li>• Beneficios escalables</li>
                      <li>• Bonos por tier</li>
                      <li>• Ranking entre usuarios</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-medium mb-3">Procesamiento Automático</h4>
                    <ul className="space-y-1 text-sm text-gray-600">
                      <li>• Webhooks para pagos</li>
                      <li>• Webhooks para suscripciones</li>
                      <li>• Webhooks para referencias</li>
                      <li>• Procesamiento de campaigns</li>
                      <li>• Detección de milestones</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
