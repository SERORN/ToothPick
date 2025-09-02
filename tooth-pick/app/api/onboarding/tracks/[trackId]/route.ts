import { NextRequest, NextResponse } from 'next/server';
import OnboardingService from '@/lib/services/OnboardingService';

interface Context {
  params: {
    trackId: string;
  };
}

// GET /api/onboarding/tracks/[trackId] - Obtener track específico
export async function GET(request: NextRequest, { params }: Context) {
  try {
    const { trackId } = params;
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId');

    const result = await OnboardingService.getTrackById(trackId, userId || undefined);

    return NextResponse.json(result);

  } catch (error) {
    console.error('Error obteniendo track:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
