import { NextRequest, NextResponse } from 'next/server';
import OnboardingService from '@/lib/services/OnboardingService';

// GET /api/onboarding/stats - Obtener estadísticas del usuario
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId');
    const type = searchParams.get('type');

    if (!userId) {
      return NextResponse.json(
        { error: 'El parámetro userId es requerido' },
        { status: 400 }
      );
    }

    if (type === 'leaderboard') {
      const role = searchParams.get('role');
      const limit = searchParams.get('limit');
      
      const leaderboard = await OnboardingService.getLeaderboard(
        role || undefined,
        limit ? parseInt(limit) : 10
      );

      return NextResponse.json({
        leaderboard
      });
    }

    const stats = await OnboardingService.getUserStats(userId);

    return NextResponse.json(stats);

  } catch (error) {
    console.error('Error obteniendo estadísticas:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
