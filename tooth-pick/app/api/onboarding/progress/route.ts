import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';
import OnboardingService from '@/lib/services/OnboardingService';

// GET /api/onboarding/progress - Obtener progreso del usuario
// 🔐 PROTEGIDO: Requiere autenticación
export async function GET(request: NextRequest) {
  try {
    // Verificar autenticación
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId');
    const trackId = searchParams.get('trackId');

    // Solo puede ver su propio progreso o ser admin
    if (userId !== session.user.id && session.user.role !== 'admin') {
      return NextResponse.json(
        { error: 'No autorizado para ver este progreso' },
        { status: 403 }
      );
    }

    if (!userId) {
      return NextResponse.json(
        { error: 'El parámetro userId es requerido' },
        { status: 400 }
      );
    }

    const progress = await OnboardingService.getUserProgress(
      userId,
      trackId || undefined
    );

    return NextResponse.json({
      progress,
      count: progress.length
    });

  } catch (error) {
    console.error('Error obteniendo progreso:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// POST /api/onboarding/progress - Iniciar track o completar paso
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, userId, trackId, stepId, data } = body;

    if (!action || !userId || !trackId) {
      return NextResponse.json(
        { error: 'Faltan parámetros requeridos' },
        { status: 400 }
      );
    }

    let result;

    switch (action) {
      case 'start_track':
        result = await OnboardingService.startTrack(userId, trackId);
        break;

      case 'complete_step':
        if (!stepId || !data) {
          return NextResponse.json(
            { error: 'stepId y data son requeridos para completar paso' },
            { status: 400 }
          );
        }
        result = await OnboardingService.completeStep(userId, trackId, stepId, data);
        break;

      case 'pause_track':
        result = await OnboardingService.pauseTrack(userId, trackId);
        break;

      case 'resume_track':
        result = await OnboardingService.resumeTrack(userId, trackId);
        break;

      default:
        return NextResponse.json(
          { error: 'Acción no válida' },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: true,
      progress: result
    });

  } catch (error) {
    console.error('Error procesando progreso:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
