'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
// import { useToast } from '@/hooks/use-toast'; // TODO: Implement toast hook or use alternative
import { Sparkles, Gift, Trophy, Zap } from 'lucide-react';

interface LoyaltyTier {
  tier: string;
  tierLevel: number;
  points: number;
  nextTierPoints: number;
  nextTierBonus: number;
  tierBenefits: string[];
  color: string;
}

interface LoyaltyCardProps {
  userId: string;
  organizationId: string;
}

const TIER_CONFIGS = {
  'Bronze': { 
    color: 'from-orange-400 to-orange-600', 
    icon: '🥉',
    bgColor: 'bg-orange-50',
    textColor: 'text-orange-700'
  },
  'Silver': { 
    color: 'from-gray-400 to-gray-600', 
    icon: '🥈',
    bgColor: 'bg-gray-50',
    textColor: 'text-gray-700'
  },
  'Gold': { 
    color: 'from-yellow-400 to-yellow-600', 
    icon: '🥇',
    bgColor: 'bg-yellow-50',
    textColor: 'text-yellow-700'
  },
  'Platinum': { 
    color: 'from-purple-400 to-purple-600', 
    icon: '💎',
    bgColor: 'bg-purple-50',
    textColor: 'text-purple-700'
  }
};

export function LoyaltyCard({ userId, organizationId }: LoyaltyCardProps) {
  const [loyaltyData, setLoyaltyData] = useState<LoyaltyTier | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  // const { toast } = useToast(); // TODO: Implement toast

  useEffect(() => {
    fetchLoyaltyData();
  }, [userId, organizationId]);

  const fetchLoyaltyData = async () => {
    try {
      const response = await fetch(`/api/loyalty/summary?userId=${userId}&organizationId=${organizationId}`);
      if (!response.ok) {
        throw new Error('Error cargando datos de fidelización');
      }
      
      const data = await response.json();
      setLoyaltyData(data.tierInfo);
    } catch (error) {
      console.error('Error:', error);
      // TODO: Show toast notification
      console.warn('No se pudieron cargar los datos de fidelización');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-8 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!loyaltyData) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardContent className="p-6 text-center">
          <p className="text-gray-500">No se encontraron datos de fidelización</p>
        </CardContent>
      </Card>
    );
  }

  const tierConfig = TIER_CONFIGS[loyaltyData.tier as keyof typeof TIER_CONFIGS];
  const progress = (loyaltyData.points / loyaltyData.nextTierPoints) * 100;
  const pointsToNext = loyaltyData.nextTierPoints - loyaltyData.points;

  return (
    <Card className="w-full max-w-md mx-auto overflow-hidden">
      {/* Header con gradiente de tier */}
      <div className={`bg-gradient-to-r ${tierConfig.color} p-6 text-white`}>
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold">Nivel de Fidelización</h3>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-2xl">{tierConfig.icon}</span>
              <span className="text-xl font-bold">{loyaltyData.tier}</span>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm opacity-90">Puntos totales</p>
            <p className="text-2xl font-bold">{loyaltyData.points.toLocaleString()}</p>
          </div>
        </div>
      </div>

      <CardContent className="p-6 space-y-4">
        {/* Progreso hacia siguiente tier */}
        {loyaltyData.tierLevel < 4 && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Progreso al siguiente nivel</span>
              <span className="font-medium">
                {pointsToNext.toLocaleString()} puntos restantes
              </span>
            </div>
            <Progress value={progress} className="h-3" />
            <p className="text-xs text-gray-600">
              ¡Gana {loyaltyData.nextTierBonus}% más puntos al alcanzar el siguiente nivel!
            </p>
          </div>
        )}

        {/* Beneficios actuales */}
        <div className="space-y-2">
          <h4 className="font-medium flex items-center gap-2">
            <Gift className="h-4 w-4" />
            Beneficios Actuales
          </h4>
          <div className="space-y-1">
            {loyaltyData.tierBenefits.map((benefit, index) => (
              <div key={index} className="flex items-center gap-2 text-sm">
                <Sparkles className="h-3 w-3 text-yellow-500" />
                <span>{benefit}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Estadísticas rápidas */}
        <div className="grid grid-cols-2 gap-4 pt-4 border-t">
          <div className={`${tierConfig.bgColor} rounded-lg p-3 text-center`}>
            <Trophy className={`h-5 w-5 mx-auto mb-1 ${tierConfig.textColor}`} />
            <p className="text-xs text-gray-600">Tier Actual</p>
            <p className={`font-semibold ${tierConfig.textColor}`}>#{loyaltyData.tierLevel}</p>
          </div>
          <div className={`${tierConfig.bgColor} rounded-lg p-3 text-center`}>
            <Zap className={`h-5 w-5 mx-auto mb-1 ${tierConfig.textColor}`} />
            <p className="text-xs text-gray-600">Bonus Activo</p>
            <p className={`font-semibold ${tierConfig.textColor}`}>+{loyaltyData.nextTierBonus}%</p>
          </div>
        </div>

        {/* Call to action */}
        {loyaltyData.tierLevel < 4 && (
          <div className="bg-blue-50 rounded-lg p-3 text-center">
            <p className="text-sm text-blue-700">
              ¡Estás a solo <strong>{pointsToNext.toLocaleString()} puntos</strong> del siguiente nivel!
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default LoyaltyCard;
