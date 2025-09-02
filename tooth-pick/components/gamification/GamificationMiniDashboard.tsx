'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Trophy, Flame, Star, ArrowRight, TrendingUp } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';

interface GamificationMiniDashboardProps {
  userId: string;
  role: "dentist" | "patient" | "distributor";
  showRacha?: boolean;
  showNivel?: boolean;
  showBadgesPreview?: boolean;
  linkToFullProfile?: boolean;
}

interface GamificationStats {
  level: number;
  xp: number;
  xpRequired: number;
  levelTitle: string;
  dailyStreak: number;
  lastActivityDate: string;
  recentBadges: Array<{
    id: string;
    name: string;
    icon: string;
    rarity: 'common' | 'rare' | 'epic' | 'legendary';
    earnedAt: string;
  }>;
  totalPoints: number;
  monthlyPoints: number;
  leaderboardPosition?: number;
}

export default function GamificationMiniDashboard({
  userId,
  role,
  showRacha = true,
  showNivel = true,
  showBadgesPreview = true,
  linkToFullProfile = true
}: GamificationMiniDashboardProps) {
  const [stats, setStats] = useState<GamificationStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [previousLevel, setPreviousLevel] = useState<number | null>(null);
  const [previousStreak, setPreviousStreak] = useState<number | null>(null);
  const router = useRouter();

  // Mapeo de colores por rareza
  const rarityColors = {
    common: 'text-gray-600 bg-gray-100',
    rare: 'text-green-600 bg-green-100',
    epic: 'text-purple-600 bg-purple-100',
    legendary: 'text-orange-600 bg-orange-100'
  };

  // Títulos personalizados por rol
  const roleTitles = {
    patient: 'Tu Progreso Dental',
    dentist: 'Excelencia Profesional',
    distributor: 'Rendimiento Comercial'
  };

  useEffect(() => {
    fetchGamificationStats();
  }, [userId]);

  const fetchGamificationStats = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`/api/gamification/stats?userId=${userId}`);
      
      if (!response.ok) {
        throw new Error('Error al cargar estadísticas de gamificación');
      }
      
      const data = await response.json();
      
      if (data.success) {
        const newStats = data.data;
        
        // Verificar si subió de nivel
        if (previousLevel !== null && newStats.level > previousLevel) {
          toast.success(`¡Subiste al nivel ${newStats.level}! 🔥`, {
            duration: 4000,
            icon: '🎉'
          });
        }
        
        // Verificar racha mejorada
        if (previousStreak !== null && newStats.dailyStreak > previousStreak) {
          toast.success(`¡Sigues con tu racha de ${newStats.dailyStreak} días! 💪`, {
            duration: 3000,
            icon: '🔥'
          });
        }
        
        // Actualizar estados
        setPreviousLevel(stats?.level || null);
        setPreviousStreak(stats?.dailyStreak || null);
        setStats(newStats);
      } else {
        throw new Error(data.message || 'Error desconocido');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
      console.error('Error fetching gamification stats:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleViewFullProfile = () => {
    router.push('/profile/gamification');
  };

  const handleViewLeaderboard = () => {
    router.push('/leaderboards');
  };

  const handleViewBadges = () => {
    router.push('/badges');
  };

  const handleViewAcademy = () => {
    router.push('/academy');
  };

  const handleViewRewards = () => {
    router.push('/rewards');
  };

  // Calcular progreso de nivel
  const levelProgress = stats ? (stats.xp / stats.xpRequired) * 100 : 0;

  // Verificar si la racha está activa (actividad en las últimas 24 horas)
  const isStreakActive = stats ? 
    new Date().getTime() - new Date(stats.lastActivityDate).getTime() < 24 * 60 * 60 * 1000 : false;

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded mb-4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="text-center text-gray-500">
          <Trophy className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No se pudo cargar la gamificación</p>
          <button 
            onClick={fetchGamificationStats}
            className="text-blue-600 text-xs hover:underline mt-1"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg border border-purple-200 p-6 shadow-sm"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <Star className="w-5 h-5 text-purple-600" />
          {roleTitles[role]}
        </h3>
        {linkToFullProfile && (
          <button
            onClick={handleViewFullProfile}
            className="text-purple-600 hover:text-purple-800 transition-colors"
          >
            <ArrowRight className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        
        {/* Nivel y Progreso */}
        {showNivel && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">Nivel {stats.level}</span>
              <span className="text-xs text-gray-500">{stats.levelTitle}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <motion.div
                className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${levelProgress}%` }}
                transition={{ duration: 1, ease: "easeOut" }}
              />
            </div>
            <div className="flex justify-between text-xs text-gray-600">
              <span>{stats.xp} XP</span>
              <span>{stats.xpRequired} XP</span>
            </div>
          </div>
        )}

        {/* Racha Diaria */}
        {showRacha && (
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Flame className={`w-5 h-5 ${isStreakActive ? 'text-orange-500' : 'text-gray-400'}`} />
              <span className="text-2xl font-bold text-gray-900">{stats.dailyStreak}</span>
            </div>
            <p className="text-xs text-gray-600">días de racha</p>
            {isStreakActive && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="text-xs text-orange-600 font-medium mt-1"
              >
                ¡Racha activa!
              </motion.div>
            )}
          </div>
        )}

        {/* Posición en Leaderboard */}
        <div className="text-center">
          <div className="flex items-center justify-center gap-1 mb-1">
            <Trophy className="w-5 h-5 text-yellow-500" />
            <span className="text-2xl font-bold text-gray-900">
              #{stats.leaderboardPosition || '?'}
            </span>
          </div>
          <p className="text-xs text-gray-600">en ranking</p>
        </div>
      </div>

      {/* Insignias Recientes */}
      {showBadgesPreview && stats.recentBadges.length > 0 && (
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">Insignias Recientes</span>
            <button
              onClick={handleViewBadges}
              className="text-xs text-purple-600 hover:underline"
            >
              Ver todas
            </button>
          </div>
          <div className="flex gap-2">
            {stats.recentBadges.slice(0, 3).map((badge) => (
              <motion.div
                key={badge.id}
                whileHover={{ scale: 1.1 }}
                className={`
                  px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1
                  ${rarityColors[badge.rarity]}
                `}
                title={`${badge.name} - ${badge.rarity}`}
              >
                <span>{badge.icon}</span>
                <span className="hidden sm:inline">{badge.name}</span>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Accesos Rápidos */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
        <button
          onClick={handleViewRewards}
          className="flex items-center justify-center gap-1 p-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg hover:from-green-600 hover:to-emerald-700 transition-colors text-xs"
        >
          <span className="text-sm">🛍️</span>
          <span className="hidden sm:inline">Tienda</span>
        </button>

        <button
          onClick={handleViewLeaderboard}
          className="flex items-center justify-center gap-1 p-2 bg-white rounded-lg border border-gray-200 hover:border-purple-300 transition-colors text-xs"
        >
          <Trophy className="w-3 h-3" />
          <span className="hidden sm:inline">Ranking</span>
        </button>
        
        <button
          onClick={handleViewBadges}
          className="flex items-center justify-center gap-1 p-2 bg-white rounded-lg border border-gray-200 hover:border-purple-300 transition-colors text-xs"
        >
          <Star className="w-3 h-3" />
          <span className="hidden sm:inline">Insignias</span>
        </button>
        
        <button
          onClick={handleViewAcademy}
          className="flex items-center justify-center gap-1 p-2 bg-white rounded-lg border border-gray-200 hover:border-purple-300 transition-colors text-xs"
        >
          <TrendingUp className="w-3 h-3" />
          <span className="hidden sm:inline">Academia</span>
        </button>
        
        {linkToFullProfile && (
          <button
            onClick={handleViewFullProfile}
            className="flex items-center justify-center gap-1 p-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-xs"
          >
            <ArrowRight className="w-3 h-3" />
            <span className="hidden sm:inline">Ver Todo</span>
          </button>
        )}
      </div>

      {/* Stats adicionales para distribuidores */}
      {role === 'distributor' && (
        <div className="mt-4 pt-4 border-t border-purple-200">
          <div className="grid grid-cols-2 gap-4 text-center">
            <div>
              <div className="text-lg font-bold text-purple-600">{stats.totalPoints}</div>
              <div className="text-xs text-gray-600">Total Puntos</div>
            </div>
            <div>
              <div className="text-lg font-bold text-purple-600">{stats.monthlyPoints}</div>
              <div className="text-xs text-gray-600">Este Mes</div>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}
