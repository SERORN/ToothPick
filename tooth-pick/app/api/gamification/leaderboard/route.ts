import { NextRequest, NextResponse } from 'next/server';
import GamificationService from '@/lib/services/GamificationService';
import dbConnect from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    await dbConnect();
    
    const { searchParams } = new URL(request.url);
    const role = searchParams.get('role');
    const limit = parseInt(searchParams.get('limit') || '10');
    const timeframe = searchParams.get('timeframe') as 'all' | 'month' | 'week' || 'all';

    if (limit > 100) {
      return NextResponse.json({
        success: false,
        message: 'Límite máximo: 100 usuarios'
      }, { status: 400 });
    }

    const leaderboard = await GamificationService.getLeaderboard(
      role || undefined,
      limit,
      timeframe
    );

    // Agregar posiciones
    const leaderboardWithPositions = leaderboard.map((entry, index) => ({
      ...entry,
      position: index + 1,
      // Formatear datos sensibles
      user: {
        name: entry.user.name,
        avatar: entry.user.avatar,
        role: entry.user.role
      }
    }));

    return NextResponse.json({
      success: true,
      leaderboard: leaderboardWithPositions,
      filters: {
        role: role || 'all',
        limit,
        timeframe
      }
    });
  } catch (error) {
    console.error('Error en /api/gamification/leaderboard:', error);
    return NextResponse.json({
      success: false,
      message: 'Error interno del servidor',
      error: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 });
  }
}
