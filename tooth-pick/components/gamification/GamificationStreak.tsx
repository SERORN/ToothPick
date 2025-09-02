'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Flame, Calendar, Trophy, Target } from 'lucide-react';
import { cn } from '@/lib/utils';

interface GamificationStreakProps {
  currentStreak: number;
  longestStreak: number;
  lastActive: Date | null;
  isActive: boolean;
  showCalendar?: boolean;
}

export default function GamificationStreak({
  currentStreak,
  longestStreak,
  lastActive,
  isActive,
  showCalendar = true
}: GamificationStreakProps) {
  const [hoveredDay, setHoveredDay] = useState<number | null>(null);

  // Calcular días para mostrar en el calendario (últimos 7 días)
  const today = new Date();
  const days = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(today);
    date.setDate(date.getDate() - (6 - i));
    return date;
  });

  const isStreakDay = (date: Date) => {
    if (!lastActive) return false;
    const daysDiff = Math.floor((today.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    return daysDiff < currentStreak;
  };

  const getStreakLevel = (streak: number) => {
    if (streak >= 100) return { level: 'legendary', color: 'text-purple-600', bg: 'bg-purple-100' };
    if (streak >= 30) return { level: 'epic', color: 'text-blue-600', bg: 'bg-blue-100' };
    if (streak >= 14) return { level: 'rare', color: 'text-green-600', bg: 'bg-green-100' };
    if (streak >= 7) return { level: 'uncommon', color: 'text-orange-600', bg: 'bg-orange-100' };
    return { level: 'common', color: 'text-gray-600', bg: 'bg-gray-100' };
  };

  const streakLevel = getStreakLevel(currentStreak);
  const isNewRecord = currentStreak === longestStreak && currentStreak > 0;

  return (
    <div className="space-y-4">
      {/* Estadísticas principales */}
      <div className="grid grid-cols-2 gap-4">
        <Card className={cn(
          "p-4 text-center relative overflow-hidden",
          isActive ? "ring-2 ring-orange-400 bg-gradient-to-br from-orange-50 to-red-50" : ""
        )}>
          <div className="flex items-center justify-center mb-2">
            <Flame className={cn(
              "h-8 w-8",
              isActive ? "text-orange-500" : "text-gray-400"
            )} />
          </div>
          <div className={cn(
            "text-2xl font-bold",
            streakLevel.color
          )}>
            {currentStreak}
          </div>
          <p className="text-sm text-muted-foreground">Racha Actual</p>
          {isNewRecord && (
            <Badge className="absolute top-2 right-2 bg-yellow-500 hover:bg-yellow-600">
              ¡Récord!
            </Badge>
          )}
        </Card>

        <Card className="p-4 text-center">
          <div className="flex items-center justify-center mb-2">
            <Trophy className="h-8 w-8 text-yellow-500" />
          </div>
          <div className="text-2xl font-bold text-yellow-600">
            {longestStreak}
          </div>
          <p className="text-sm text-muted-foreground">Mejor Racha</p>
        </Card>
      </div>

      {/* Nivel de racha */}
      <div className={cn(
        "p-3 rounded-lg text-center",
        streakLevel.bg
      )}>
        <div className="flex items-center justify-center gap-2 mb-1">
          <Target className={cn("h-4 w-4", streakLevel.color)} />
          <span className={cn("font-medium text-sm", streakLevel.color)}>
            Nivel: {streakLevel.level.charAt(0).toUpperCase() + streakLevel.level.slice(1)}
          </span>
        </div>
        <p className="text-xs text-muted-foreground">
          {getStreakMessage(currentStreak, isActive)}
        </p>
      </div>

      {/* Calendario semanal */}
      {showCalendar && (
        <div>
          <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Últimos 7 días
          </h4>
          <div className="grid grid-cols-7 gap-2">
            {days.map((date, index) => {
              const isToday = date.toDateString() === today.toDateString();
              const hasActivity = isStreakDay(date);
              const dayName = date.toLocaleDateString('es-ES', { weekday: 'short' });
              const dayNumber = date.getDate();

              return (
                <div
                  key={index}
                  className={cn(
                    "relative p-2 rounded-lg text-center cursor-pointer transition-all duration-200",
                    hasActivity 
                      ? "bg-orange-100 border-2 border-orange-300 hover:bg-orange-200" 
                      : "bg-gray-50 border-2 border-gray-200 hover:bg-gray-100",
                    isToday && "ring-2 ring-blue-400",
                    hoveredDay === index && "scale-105"
                  )}
                  onMouseEnter={() => setHoveredDay(index)}
                  onMouseLeave={() => setHoveredDay(null)}
                >
                  <div className="text-xs font-medium text-muted-foreground mb-1">
                    {dayName}
                  </div>
                  <div className={cn(
                    "text-sm font-bold",
                    hasActivity ? "text-orange-700" : "text-gray-500"
                  )}>
                    {dayNumber}
                  </div>
                  
                  {hasActivity && (
                    <Flame className="h-3 w-3 text-orange-500 absolute top-1 right-1" />
                  )}
                  
                  {isToday && (
                    <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-blue-500 rounded-full" />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Motivación */}
      <div className="text-center">
        {isActive ? (
          <p className="text-sm text-green-600 font-medium">
            ¡Mantén tu racha activa! 🔥
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">
            Inicia sesión hoy para comenzar una nueva racha
          </p>
        )}
        
        {currentStreak > 0 && (
          <div className="mt-2 text-xs text-muted-foreground">
            {getNextMilestone(currentStreak)}
          </div>
        )}
      </div>
    </div>
  );
}

function getStreakMessage(streak: number, isActive: boolean): string {
  if (!isActive) return "Inicia sesión para reactivar tu racha";
  
  if (streak >= 100) return "¡Eres una leyenda viviente!";
  if (streak >= 30) return "¡Increíble dedicación!";
  if (streak >= 14) return "¡Vas por buen camino!";
  if (streak >= 7) return "¡Una semana completa!";
  if (streak >= 3) return "¡Construyendo el hábito!";
  return "¡Comienza tu aventura!";
}

function getNextMilestone(currentStreak: number): string {
  const milestones = [7, 14, 30, 50, 100];
  const nextMilestone = milestones.find(m => m > currentStreak);
  
  if (nextMilestone) {
    const remaining = nextMilestone - currentStreak;
    return `${remaining} días más para alcanzar ${nextMilestone} días`;
  }
  
  return "¡Has alcanzado todos los hitos disponibles!";
}
