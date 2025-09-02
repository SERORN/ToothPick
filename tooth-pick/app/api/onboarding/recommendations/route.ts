import { NextRequest, NextResponse } from 'next/server';
import OnboardingService from '@/lib/services/OnboardingService';

// GET /api/onboarding/recommendations - Obtener recomendaciones para el usuario
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId');
    const role = searchParams.get('role');

    if (!userId || !role) {
      return NextResponse.json(
        { error: 'Los parámetros userId y role son requeridos' },
        { status: 400 }
      );
    }

    const recommendations = await OnboardingService.getRecommendations(userId, role);

    return NextResponse.json(recommendations);

  } catch (error) {
    console.error('Error obteniendo recomendaciones:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
