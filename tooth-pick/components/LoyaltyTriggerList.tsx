'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Sparkles, Target, Clock, Gift, ArrowRight, CheckCircle } from 'lucide-react';

interface LoyaltyTrigger {
  _id: string;
  name: string;
  description: string;
  eventType: string;
  isActive: boolean;
  pointsReward: number;
  xpReward?: number;
  conditions: {
    minAmount?: number;
    currency?: string;
    userRole?: string[];
    subscriptionTier?: string[];
    [key: string]: any;
  };
  frequency: {
    type: 'ONCE' | 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'UNLIMITED';
    limitPerPeriod?: number;
  };
  validFrom?: string;
  validUntil?: string;
  tierBonuses?: {
    Bronze?: number;
    Silver?: number;
    Gold?: number;
    Platinum?: number;
  };
}

interface LoyaltyTriggerListProps {
  userId: string;
  organizationId: string;
  userTier?: string;
}

const FREQUENCY_LABELS = {
  'ONCE': 'Una vez',
  'DAILY': 'Diario',
  'WEEKLY': 'Semanal',
  'MONTHLY': 'Mensual',
  'UNLIMITED': 'Sin límite'
};

const EVENT_TYPE_LABELS = {
  'PAY_ON_TIME': '💳 Pago Puntual',
  'RENEW_SUBSCRIPTION': '🔄 Renovar Suscripción',
  'UPGRADE_SUBSCRIPTION': '⬆️ Mejorar Plan',
  'REFER_USER': '👥 Referir Usuario',
  'PARTICIPATE_IN_CAMPAIGN': '🎯 Participar en Campaña',
  'MILESTONE_ACHIEVED': '🏆 Lograr Milestone',
  'WELCOME_BONUS': '🎉 Bono de Bienvenida',
  'SPEND_OVER_X': '💰 Gasto Alto'
};

export function LoyaltyTriggerList({ userId, organizationId, userTier = 'Bronze' }: LoyaltyTriggerListProps) {
  const [triggers, setTriggers] = useState<LoyaltyTrigger[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchTriggers();
  }, [userId, organizationId]);

  const fetchTriggers = async () => {
    try {
      const response = await fetch(
        `/api/loyalty/triggers?organizationId=${organizationId}`
      );
      
      if (!response.ok) {
        throw new Error('Error cargando triggers');
      }
      
      const data = await response.json();
      setTriggers(data.triggers || []);
    } catch (error) {
      console.error('Error cargando triggers:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const calculateTotalReward = (trigger: LoyaltyTrigger) => {
    const basePoints = trigger.pointsReward;
    const tierBonus = trigger.tierBonuses?.[userTier as keyof typeof trigger.tierBonuses] || 0;
    return Math.floor(basePoints * (1 + tierBonus / 100));
  };

  const isAvailable = (trigger: LoyaltyTrigger) => {
    if (!trigger.isActive) return false;
    
    const now = new Date();
    
    if (trigger.validFrom && new Date(trigger.validFrom) > now) return false;
    if (trigger.validUntil && new Date(trigger.validUntil) < now) return false;
    
    return true;
  };

  const getEventTypeLabel = (eventType: string) => {
    return EVENT_TYPE_LABELS[eventType as keyof typeof EVENT_TYPE_LABELS] || eventType;
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Oportunidades de Puntos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="animate-pulse p-4 border rounded-lg">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2 mb-2"></div>
                <div className="h-6 bg-gray-200 rounded w-1/4"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const activeTriggers = triggers.filter(isAvailable);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Oportunidades de Puntos
          </div>
          <Badge variant="secondary">
            {activeTriggers.length} disponibles
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {activeTriggers.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Target className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No hay oportunidades disponibles</p>
            <p className="text-sm">Nuevas oportunidades aparecerán pronto</p>
          </div>
        ) : (
          <div className="space-y-4">
            {activeTriggers.map((trigger) => {
              const totalReward = calculateTotalReward(trigger);
              const tierBonus = trigger.tierBonuses?.[userTier as keyof typeof trigger.tierBonuses] || 0;
              
              return (
                <div
                  key={trigger._id}
                  className="p-4 border rounded-lg hover:shadow-md transition-shadow bg-gradient-to-r from-blue-50 to-purple-50"
                >
                  {/* Header del trigger */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900 mb-1">
                        {trigger.name}
                      </h4>
                      <p className="text-sm text-gray-600">
                        {trigger.description}
                      </p>
                    </div>
                    <div className="ml-4 text-right">
                      <div className="flex items-center gap-1">
                        <Sparkles className="h-4 w-4 text-yellow-500" />
                        <span className="font-bold text-lg text-blue-600">
                          {totalReward}
                        </span>
                        <span className="text-sm text-gray-500">pts</span>
                      </div>
                      {trigger.xpReward && (
                        <div className="text-xs text-purple-600">
                          +{trigger.xpReward} XP
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Detalles del trigger */}
                  <div className="flex items-center gap-4 text-xs text-gray-500 mb-3">
                    <div className="flex items-center gap-1">
                      <Target className="h-3 w-3" />
                      <span>{getEventTypeLabel(trigger.eventType)}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      <span>{FREQUENCY_LABELS[trigger.frequency.type]}</span>
                    </div>
                    {trigger.frequency.limitPerPeriod && (
                      <span>Máx: {trigger.frequency.limitPerPeriod}</span>
                    )}
                  </div>

                  {/* Condiciones */}
                  {Object.keys(trigger.conditions).length > 0 && (
                    <div className="mb-3">
                      <h5 className="text-xs font-medium text-gray-700 mb-1">Condiciones:</h5>
                      <div className="flex flex-wrap gap-1">
                        {trigger.conditions.minAmount && (
                          <Badge variant="outline" className="text-xs">
                            Mín: ${trigger.conditions.minAmount.toLocaleString()}
                          </Badge>
                        )}
                        {trigger.conditions.subscriptionTier && (
                          <Badge variant="outline" className="text-xs">
                            Plan: {trigger.conditions.subscriptionTier.join(', ')}
                          </Badge>
                        )}
                        {trigger.conditions.userRole && (
                          <Badge variant="outline" className="text-xs">
                            Rol: {trigger.conditions.userRole.join(', ')}
                          </Badge>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Bonus por tier */}
                  {tierBonus > 0 && (
                    <div className="flex items-center gap-2 p-2 bg-yellow-50 rounded border-l-4 border-yellow-400">
                      <Gift className="h-4 w-4 text-yellow-600" />
                      <span className="text-sm text-yellow-700">
                        <strong>Bonus {userTier}:</strong> +{tierBonus}% puntos extra
                      </span>
                    </div>
                  )}

                  {/* Fechas de validez */}
                  {(trigger.validFrom || trigger.validUntil) && (
                    <div className="mt-2 text-xs text-gray-500">
                      {trigger.validFrom && (
                        <span>Desde: {new Date(trigger.validFrom).toLocaleDateString()}</span>
                      )}
                      {trigger.validFrom && trigger.validUntil && ' • '}
                      {trigger.validUntil && (
                        <span>Hasta: {new Date(trigger.validUntil).toLocaleDateString()}</span>
                      )}
                    </div>
                  )}

                  {/* Call to action */}
                  <div className="mt-3 pt-3 border-t flex items-center justify-between">
                    <span className="text-sm text-gray-600">
                      ¡Realiza esta acción para ganar puntos!
                    </span>
                    <ArrowRight className="h-4 w-4 text-blue-500" />
                  </div>
                </div>
              );
            })}

            {/* Resumen de oportunidades */}
            <div className="mt-6 p-4 bg-blue-50 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="h-5 w-5 text-blue-600" />
                <h4 className="font-medium text-blue-900">
                  Maximiza tus Puntos
                </h4>
              </div>
              <p className="text-sm text-blue-700">
                Como usuario <strong>{userTier}</strong>, puedes ganar hasta{' '}
                <strong>
                  {activeTriggers
                    .reduce((sum, trigger) => sum + calculateTotalReward(trigger), 0)
                    .toLocaleString()}
                </strong>{' '}
                puntos completando todas las acciones disponibles.
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default LoyaltyTriggerList;
