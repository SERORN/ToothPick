'use client';

import { ReactNode } from 'react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import { Calendar, Star, Trophy, Lock, Target } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BadgeData {
  id: string;
  title: string;
  description: string;
  iconEmoji: string;
  category: string;
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
  isSecret: boolean;
  earned?: boolean;
  earnedAt?: Date;
  pointsReward?: number;
  currentHolders?: number;
  criteria?: {
    type: string;
    description?: string;
    minCount?: number;
    minStreak?: number;
    minLevel?: number;
    minPoints?: number;
    events?: string[];
  };
}

interface BadgeTooltipProps {
  badge: BadgeData;
  children: ReactNode;
  showProgress?: boolean;
  currentProgress?: number;
}

export default function BadgeTooltip({ 
  badge, 
  children, 
  showProgress = false,
  currentProgress = 0
}: BadgeTooltipProps) {
  const rarityColors = {
    common: { bg: 'bg-gray-100', text: 'text-gray-700', border: 'border-gray-200' },
    uncommon: { bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-200' },
    rare: { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-200' },
    epic: { bg: 'bg-purple-100', text: 'text-purple-700', border: 'border-purple-200' },
    legendary: { bg: 'bg-yellow-100', text: 'text-yellow-700', border: 'border-yellow-200' }
  };

  const rarityColor = rarityColors[badge.rarity];

  return (
    <TooltipProvider>
      <Tooltip delayDuration={300}>
        <TooltipTrigger asChild>
          {children}
        </TooltipTrigger>
        <TooltipContent 
          side="top" 
          className={cn(
            "max-w-sm p-0 border-0 shadow-lg",
            rarityColor.border
          )}
        >
          <div className={cn(
            "p-4 rounded-lg border-2",
            rarityColor.bg,
            rarityColor.border
          )}>
            {/* Header */}
            <div className="flex items-start gap-3 mb-3">
              <div className="text-2xl">
                {badge.isSecret && !badge.earned ? '🔒' : badge.iconEmoji}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className={cn("font-semibold text-sm", rarityColor.text)}>
                    {badge.isSecret && !badge.earned ? 'Insignia Secreta' : badge.title}
                  </h3>
                  {badge.earned && (
                    <Trophy className="h-4 w-4 text-yellow-600" />
                  )}
                </div>
                <Badge 
                  variant="secondary" 
                  className={cn(
                    "text-xs capitalize",
                    rarityColor.bg,
                    rarityColor.text
                  )}
                >
                  {badge.rarity}
                </Badge>
              </div>
            </div>

            {/* Descripción */}
            <p className="text-sm text-gray-700 mb-3">
              {badge.isSecret && !badge.earned 
                ? 'Esta insignia secreta se desbloqueará completando acciones especiales en la plataforma.'
                : badge.description
              }
            </p>

            {/* Criterios de obtención */}
            {!badge.earned && badge.criteria && !badge.isSecret && (
              <div className="mb-3 p-2 bg-white/50 rounded border">
                <div className="flex items-center gap-1 mb-1">
                  <Target className="h-3 w-3 text-gray-600" />
                  <span className="text-xs font-medium text-gray-700">
                    Requisitos:
                  </span>
                </div>
                <p className="text-xs text-gray-600">
                  {getCriteriaDescription(badge.criteria)}
                </p>
                
                {/* Progreso */}
                {showProgress && badge.criteria.minCount && (
                  <div className="mt-2">
                    <div className="flex justify-between text-xs text-gray-600 mb-1">
                      <span>Progreso</span>
                      <span>{currentProgress} / {badge.criteria.minCount}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-1.5">
                      <div 
                        className="bg-blue-500 h-1.5 rounded-full transition-all duration-300"
                        style={{ 
                          width: `${Math.min((currentProgress / badge.criteria.minCount) * 100, 100)}%` 
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Información de recompensa */}
            {badge.pointsReward && badge.pointsReward > 0 && (
              <div className="flex items-center gap-1 mb-2">
                <Star className="h-3 w-3 text-yellow-500" />
                <span className="text-xs text-gray-700">
                  Recompensa: {badge.pointsReward} puntos
                </span>
              </div>
            )}

            {/* Fecha de obtención */}
            {badge.earned && badge.earnedAt && (
              <div className="flex items-center gap-1 mb-2">
                <Calendar className="h-3 w-3 text-gray-500" />
                <span className="text-xs text-gray-700">
                  Obtenida: {new Date(badge.earnedAt).toLocaleDateString('es-ES', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </span>
              </div>
            )}

            {/* Estadísticas de rareza */}
            {badge.currentHolders !== undefined && (
              <div className="flex items-center gap-1">
                <Trophy className="h-3 w-3 text-gray-500" />
                <span className="text-xs text-gray-700">
                  {badge.currentHolders === 0 
                    ? 'Nadie la ha obtenido aún'
                    : `${badge.currentHolders} ${badge.currentHolders === 1 ? 'persona la tiene' : 'personas la tienen'}`
                  }
                </span>
              </div>
            )}

            {/* Insignia bloqueada */}
            {!badge.earned && (
              <div className="flex items-center gap-1 mt-2 pt-2 border-t border-gray-300">
                <Lock className="h-3 w-3 text-gray-500" />
                <span className="text-xs text-gray-600">
                  {badge.isSecret ? 'Insignia secreta' : 'Sin desbloquear'}
                </span>
              </div>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function getCriteriaDescription(criteria: BadgeData['criteria']): string {
  if (!criteria) return '';

  switch (criteria.type) {
    case 'events':
      if (criteria.events && criteria.minCount) {
        const eventNames = criteria.events.map(formatEventName).join(', ');
        return `Completar "${eventNames}" ${criteria.minCount} ${criteria.minCount === 1 ? 'vez' : 'veces'}`;
      }
      break;
    
    case 'streak':
      return `Mantener una racha de ${criteria.minStreak} días consecutivos`;
    
    case 'level':
      return `Alcanzar el nivel ${criteria.minLevel}`;
    
    case 'points':
      return `Acumular ${criteria.minPoints?.toLocaleString()} puntos`;
    
    case 'custom':
      return criteria.description || 'Completar actividades especiales';
    
    default:
      return criteria.description || 'Completar requisitos específicos';
  }

  return '';
}

function formatEventName(eventType: string): string {
  const eventNames: { [key: string]: string } = {
    'daily_login': 'Inicio de sesión diario',
    'profile_completed': 'Perfil completado',
    'lesson_completed': 'Lección completada',
    'track_completed': 'Track completado',
    'appointment_booked': 'Cita agendada',
    'appointment_attended': 'Cita atendida',
    'order_placed': 'Pedido realizado',
    'first_order': 'Primera compra',
    'review_written': 'Reseña escrita',
    'referral_sent': 'Referido enviado',
    'referral_joined': 'Referido exitoso'
  };
  
  return eventNames[eventType] || eventType
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}
