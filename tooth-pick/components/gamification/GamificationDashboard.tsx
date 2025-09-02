'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Trophy, Flame, Star, TrendingUp, Calendar } from 'lucide-react';
import GamificationProgressBar from './GamificationProgressBar';
import GamificationStreak from './GamificationStreak';
import GamificationEventFeed from './GamificationEventFeed';
import BadgeGallery from './BadgeGallery';

interface UserGamificationProfile {
  userId: string;
  totalPoints: number;
  level: number;
  levelTitle: string;
  levelProgress: {
    current: number;
    nextLevelRequired: number;
    percentage: number;
  };
  badges: string[];
  achievements: Array<{
    badgeId: string;
    earnedAt: Date;
    pointsAwarded: number;
  }>;
  streak: {
    current: number;
    longest: number;
    lastActive: Date | null;
  };
  recentEvents: any[];
  monthlyStats: {
    totalPoints: number;
    eventsCount: number;
    badgesEarned: number;
  };
  leaderboardPosition: number | null;
  isStreakActive: boolean;
}

interface GamificationDashboardProps {
  userId: string;
  embedded?: boolean;
  showFeed?: boolean;
  showBadges?: boolean;
}

export default function GamificationDashboard({ 
  userId, 
  embedded = false, 
  showFeed = true, 
  showBadges = true 
}: GamificationDashboardProps) {
  const [profile, setProfile] = useState<UserGamificationProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchUserProfile();
  }, [userId]);

  const fetchUserProfile = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/gamification/profile?userId=${userId}`);
      
      if (!response.ok) {
        throw new Error('Error al cargar perfil de gamificación');
      }
      
      const data = await response.json();
      setProfile(data.profile);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <DashboardSkeleton embedded={embedded} />;
  }

  if (error || !profile) {
    return (
      <Card className={embedded ? '' : 'w-full max-w-6xl mx-auto'}>
        <CardContent className="flex items-center justify-center h-32">
          <p className="text-muted-foreground">
            {error || 'No se pudo cargar la información de gamificación'}
          </p>
        </CardContent>
      </Card>
    );
  }

  const containerClass = embedded 
    ? 'space-y-4' 
    : 'w-full max-w-6xl mx-auto space-y-6 p-4';

  return (
    <div className={containerClass}>
      {/* Header con estadísticas principales */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
      >
        <StatsCard
          icon={<Star className="h-6 w-6 text-yellow-500" />}
          title="Puntos Totales"
          value={profile.totalPoints.toLocaleString()}
          subtitle={`${profile.monthlyStats.totalPoints} este mes`}
          gradient="from-yellow-500 to-orange-500"
        />
        
        <StatsCard
          icon={<Trophy className="h-6 w-6 text-blue-500" />}
          title="Nivel"
          value={profile.level.toString()}
          subtitle={profile.levelTitle}
          gradient="from-blue-500 to-purple-500"
        />
        
        <StatsCard
          icon={<Flame className="h-6 w-6 text-red-500" />}
          title="Racha Actual"
          value={`${profile.streak.current} días`}
          subtitle={`Récord: ${profile.streak.longest} días`}
          gradient="from-red-500 to-pink-500"
          highlight={profile.isStreakActive}
        />
        
        <StatsCard
          icon={<TrendingUp className="h-6 w-6 text-green-500" />}
          title="Posición"
          value={profile.leaderboardPosition ? `#${profile.leaderboardPosition}` : 'N/A'}
          subtitle={`${profile.badges.length} insignias`}
          gradient="from-green-500 to-teal-500"
        />
      </motion.div>

      {/* Progreso de nivel */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Star className="h-5 w-5 text-yellow-500" />
              Progreso de Nivel
            </CardTitle>
          </CardHeader>
          <CardContent>
            <GamificationProgressBar
              currentLevel={profile.level}
              levelTitle={profile.levelTitle}
              currentXP={profile.levelProgress.current}
              requiredXP={profile.levelProgress.nextLevelRequired}
              percentage={profile.levelProgress.percentage}
            />
          </CardContent>
        </Card>
      </motion.div>

      {/* Racha diaria */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Flame className="h-5 w-5 text-red-500" />
              Racha Diaria
            </CardTitle>
          </CardHeader>
          <CardContent>
            <GamificationStreak
              currentStreak={profile.streak.current}
              longestStreak={profile.streak.longest}
              lastActive={profile.streak.lastActive}
              isActive={profile.isStreakActive}
            />
          </CardContent>
        </Card>
      </motion.div>

      {/* Grid de contenido */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Insignias */}
        {showBadges && (
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="h-5 w-5 text-blue-500" />
                  Insignias Recientes
                  <Badge variant="secondary" className="ml-auto">
                    {profile.badges.length}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <BadgeGallery
                  userBadges={profile.badges}
                  achievements={profile.achievements}
                  limit={embedded ? 6 : 12}
                  showAll={false}
                />
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Feed de eventos */}
        {showFeed && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-purple-500" />
                  Actividad Reciente
                </CardTitle>
              </CardHeader>
              <CardContent>
                <GamificationEventFeed
                  events={profile.recentEvents}
                  limit={embedded ? 5 : 10}
                />
              </CardContent>
            </Card>
          </motion.div>
        )}
      </div>

      {/* Estadísticas del mes */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.5 }}
      >
        <Card className="bg-gradient-to-r from-purple-500/10 to-blue-500/10 border-purple-200">
          <CardHeader>
            <CardTitle className="text-center">Resumen del Mes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-purple-600">
                  {profile.monthlyStats.totalPoints}
                </div>
                <div className="text-sm text-muted-foreground">Puntos Ganados</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-blue-600">
                  {profile.monthlyStats.eventsCount}
                </div>
                <div className="text-sm text-muted-foreground">Eventos Completados</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-green-600">
                  {profile.monthlyStats.badgesEarned}
                </div>
                <div className="text-sm text-muted-foreground">Insignias Desbloqueadas</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}

interface StatsCardProps {
  icon: React.ReactNode;
  title: string;
  value: string;
  subtitle: string;
  gradient: string;
  highlight?: boolean;
}

function StatsCard({ icon, title, value, subtitle, gradient, highlight }: StatsCardProps) {
  return (
    <Card className={`relative overflow-hidden ${highlight ? 'ring-2 ring-orange-400' : ''}`}>
      <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-5`} />
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <div className="flex items-center gap-2">
              <h3 className="text-2xl font-bold">{value}</h3>
              {highlight && <Flame className="h-4 w-4 text-orange-500 animate-pulse" />}
            </div>
            <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
          </div>
          <div className="opacity-80">{icon}</div>
        </div>
      </CardContent>
    </Card>
  );
}

function DashboardSkeleton({ embedded }: { embedded: boolean }) {
  const containerClass = embedded ? 'space-y-4' : 'w-full max-w-6xl mx-auto space-y-6 p-4';
  
  return (
    <div className={containerClass}>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <Skeleton className="h-4 w-20 mb-2" />
              <Skeleton className="h-8 w-16 mb-1" />
              <Skeleton className="h-3 w-24" />
            </CardContent>
          </Card>
        ))}
      </div>
      
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-40" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-4 w-full mb-2" />
          <Skeleton className="h-8 w-full" />
        </CardContent>
      </Card>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[...Array(2)].map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-6 w-32" />
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {[...Array(3)].map((_, j) => (
                  <Skeleton key={j} className="h-12 w-full" />
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
