'use client';

import { useState, useEffect, useCallback } from 'react';

interface UserGamificationData {
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

interface GamificationHookReturn {
  userData: UserGamificationData | null;
  loading: boolean;
  error: string | null;
  refreshData: () => Promise<void>;
  awardPoints: (eventType: string, metadata?: any) => Promise<boolean>;
  checkBadges: () => Promise<void>;
}

export function useGamification(userId: string): GamificationHookReturn {
  const [userData, setUserData] = useState<UserGamificationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUserData = useCallback(async () => {
    if (!userId) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`/api/gamification/profile?userId=${userId}`);
      
      if (!response.ok) {
        throw new Error('Error al cargar datos de gamificación');
      }
      
      const data = await response.json();
      
      if (data.success) {
        setUserData(data.profile);
      } else {
        throw new Error(data.message || 'Error desconocido');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
      console.error('Error fetching gamification data:', err);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  const refreshData = useCallback(async () => {
    await fetchUserData();
  }, [fetchUserData]);

  const awardPoints = useCallback(async (eventType: string, metadata: any = {}): Promise<boolean> => {
    try {
      const response = await fetch('/api/gamification/activity', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          eventType,
          metadata,
          source: 'manual'
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        // Actualizar datos locales sin refetch completo
        if (userData) {
          setUserData(prev => prev ? {
            ...prev,
            totalPoints: prev.totalPoints + (data.pointsEarned || 0),
            badges: data.badgesEarned ? [...prev.badges, ...data.badgesEarned] : prev.badges,
            // Actualizar otros campos si hay levelUp o streakUpdated
            ...(data.levelUp && { level: prev.level + 1 }),
          } : null);
        }
        
        return true;
      } else {
        console.error('Error awarding points:', data.message);
        return false;
      }
    } catch (error) {
      console.error('Error awarding points:', error);
      return false;
    }
  }, [userId, userData]);

  const checkBadges = useCallback(async () => {
    try {
      const response = await fetch('/api/gamification/stats', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'sync_badges',
          userId
        }),
      });

      const data = await response.json();
      
      if (data.success && data.newBadges > 0) {
        // Refrescar datos para obtener las nuevas insignias
        await refreshData();
      }
    } catch (error) {
      console.error('Error checking badges:', error);
    }
  }, [userId, refreshData]);

  useEffect(() => {
    fetchUserData();
  }, [fetchUserData]);

  return {
    userData,
    loading,
    error,
    refreshData,
    awardPoints,
    checkBadges
  };
}

// Hook para obtener datos del leaderboard
export function useLeaderboard(role?: string, timeframe: 'all' | 'month' | 'week' = 'all', limit = 50) {
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLeaderboard = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const params = new URLSearchParams({
        limit: limit.toString(),
        timeframe,
        ...(role && role !== 'all' && { role })
      });

      const response = await fetch(`/api/gamification/leaderboard?${params}`);
      
      if (!response.ok) {
        throw new Error('Error al cargar leaderboard');
      }
      
      const data = await response.json();
      
      if (data.success) {
        setLeaderboard(data.leaderboard || []);
      } else {
        throw new Error(data.message || 'Error desconocido');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
      console.error('Error fetching leaderboard:', err);
    } finally {
      setLoading(false);
    }
  }, [role, timeframe, limit]);

  useEffect(() => {
    fetchLeaderboard();
  }, [fetchLeaderboard]);

  return {
    leaderboard,
    loading,
    error,
    refresh: fetchLeaderboard
  };
}

// Hook para obtener insignias
export function useBadges(userId?: string) {
  const [badges, setBadges] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBadges = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const params = new URLSearchParams();
      if (userId) {
        params.append('userId', userId);
      }

      const response = await fetch(`/api/gamification/badges?${params}`);
      
      if (!response.ok) {
        throw new Error('Error al cargar insignias');
      }
      
      const data = await response.json();
      
      if (data.success) {
        setBadges(data.badges || []);
      } else {
        throw new Error(data.message || 'Error desconocido');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
      console.error('Error fetching badges:', err);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchBadges();
  }, [fetchBadges]);

  return {
    badges,
    loading,
    error,
    refresh: fetchBadges
  };
}

// Hook para obtener estadísticas globales
export function useGamificationStats() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/gamification/stats?type=global');
      
      if (!response.ok) {
        throw new Error('Error al cargar estadísticas');
      }
      
      const data = await response.json();
      
      if (data.success) {
        setStats(data.data);
      } else {
        throw new Error(data.message || 'Error desconocido');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
      console.error('Error fetching stats:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return {
    stats,
    loading,
    error,
    refresh: fetchStats
  };
}

// Hook para manejar notificaciones de gamificación
export function useGamificationNotifications() {
  const [notifications, setNotifications] = useState<any[]>([]);
  
  const addNotification = useCallback((notification: {
    type: 'points' | 'badge' | 'level' | 'streak';
    title: string;
    message: string;
    points?: number;
    badgeId?: string;
    level?: number;
  }) => {
    const newNotification = {
      id: Date.now().toString(),
      timestamp: new Date(),
      ...notification
    };
    
    setNotifications(prev => [newNotification, ...prev].slice(0, 10));
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== newNotification.id));
    }, 5000);
  }, []);

  const removeNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  return {
    notifications,
    addNotification,
    removeNotification
  };
}
