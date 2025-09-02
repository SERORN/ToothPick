import { NextRequest, NextResponse } from 'next/server';
import GamificationService from '@/lib/services/GamificationService';
import dbConnect from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    await dbConnect();
    
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'global';
    const userId = searchParams.get('userId');
    const timeframe = searchParams.get('timeframe') as 'week' | 'month' | 'year' | 'all' || 'month';
    const role = searchParams.get('role');

    let stats;

    switch (type) {
      case 'global':
        stats = await GamificationService.getGlobalStats();
        break;
        
      case 'user':
        if (!userId) {
          return NextResponse.json({
            success: false,
            message: 'ID de usuario requerido para estadísticas de usuario'
          }, { status: 400 });
        }
        
        const UserEventLog = (await import('@/lib/models/UserEventLog')).default;
        const userStats = await (UserEventLog as any).getUserStats(userId, timeframe);
        const userProfile = await GamificationService.getUserProfile(userId);
        
        stats = {
          user: userProfile,
          activity: userStats,
          timeframe
        };
        break;
        
      case 'leaderboard':
        const leaderboard = await GamificationService.getLeaderboard(
          role || undefined, 
          50, 
          timeframe === 'year' ? 'all' : timeframe as 'all' | 'month' | 'week'
        );
        stats = {
          leaderboard,
          filters: { role, timeframe },
          totalUsers: leaderboard.length
        };
        break;
        
      case 'activity':
        const now = new Date();
        let startDate = new Date();
        
        switch (timeframe) {
          case 'week':
            startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            break;
          case 'month':
            startDate = new Date(now.getFullYear(), now.getMonth(), 1);
            break;
          case 'year':
            startDate = new Date(now.getFullYear(), 0, 1);
            break;
          case 'all':
            startDate = new Date(2024, 0, 1); // Inicio del servicio
            break;
        }
        
        const activityReport = await GamificationService.getActivityReport(
          startDate, 
          now, 
          timeframe === 'week' || timeframe === 'month' ? 'day' : 'month'
        );
        
        stats = {
          activityReport,
          timeframe,
          startDate,
          endDate: now
        };
        break;
        
      case 'badges':
        const Badge = (await import('@/lib/models/Badge')).default;
        
        // Estadísticas de insignias
        const badgeStats = await Badge.aggregate([
          {
            $group: {
              _id: '$category',
              total: { $sum: 1 },
              earned: { $sum: '$currentHolders' },
              avgRarity: { $avg: { $switch: {
                branches: [
                  { case: { $eq: ['$rarity', 'common'] }, then: 1 },
                  { case: { $eq: ['$rarity', 'uncommon'] }, then: 2 },
                  { case: { $eq: ['$rarity', 'rare'] }, then: 3 },
                  { case: { $eq: ['$rarity', 'epic'] }, then: 4 },
                  { case: { $eq: ['$rarity', 'legendary'] }, then: 5 }
                ],
                default: 1
              }}}
            }
          },
          {
            $sort: { total: -1 }
          }
        ]);
        
        const mostEarnedBadges = await Badge.find()
          .sort({ currentHolders: -1 })
          .limit(10)
          .select('id title iconEmoji currentHolders rarity category');
          
        const rarestBadges = await Badge.find({ currentHolders: { $gt: 0 } })
          .sort({ currentHolders: 1 })
          .limit(10)
          .select('id title iconEmoji currentHolders rarity category');
        
        stats = {
          categoryStats: badgeStats,
          mostEarnedBadges,
          rarestBadges,
          totalBadges: await Badge.countDocuments(),
          activeBadges: await Badge.countDocuments({ isActive: true })
        };
        break;
        
      default:
        return NextResponse.json({
          success: false,
          message: 'Tipo de estadística no válido'
        }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      type,
      data: stats,
      timestamp: new Date(),
      filters: {
        userId: userId || null,
        timeframe,
        role: role || null
      }
    });
  } catch (error) {
    console.error('Error en /api/gamification/stats:', error);
    return NextResponse.json({
      success: false,
      message: 'Error interno del servidor',
      error: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await dbConnect();
    
    const body = await request.json();
    const { action, userId, timeframe = 'month' } = body;

    switch (action) {
      case 'reset_user_stats':
        if (!userId) {
          return NextResponse.json({
            success: false,
            message: 'ID de usuario requerido para resetear estadísticas'
          }, { status: 400 });
        }
        
        // Resetear estadísticas de usuario (solo en desarrollo/testing)
        const UserGamification = (await import('@/lib/models/UserGamification')).default;
        await UserGamification.findOneAndUpdate(
          { userId },
          {
            $set: {
              totalPoints: 0,
              level: 1,
              badges: [],
              achievements: [],
              'streak.current': 0,
              'streak.longest': 0,
              'streak.lastActive': null
            }
          }
        );
        
        return NextResponse.json({
          success: true,
          message: 'Estadísticas de usuario reseteadas'
        });
        
      case 'recalculate_leaderboard':
        // Recalcular posiciones del leaderboard
        const leaderboard = await GamificationService.getLeaderboard(undefined, 1000);
        
        return NextResponse.json({
          success: true,
          message: 'Leaderboard recalculado',
          totalUsers: leaderboard.length
        });
        
      case 'sync_badges':
        if (!userId) {
          return NextResponse.json({
            success: false,
            message: 'ID de usuario requerido para sincronizar insignias'
          }, { status: 400 });
        }
        
        // Verificar y otorgar insignias pendientes
        const badgeCheck = await GamificationService.checkAllBadgesForUser(userId);
        
        return NextResponse.json({
          success: true,
          message: 'Insignias sincronizadas',
          newBadges: badgeCheck.newBadges.length,
          pointsAwarded: badgeCheck.totalPointsAwarded
        });
        
      default:
        return NextResponse.json({
          success: false,
          message: 'Acción no válida'
        }, { status: 400 });
    }
  } catch (error) {
    console.error('Error en POST /api/gamification/stats:', error);
    return NextResponse.json({
      success: false,
      message: 'Error interno del servidor',
      error: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 });
  }
}
