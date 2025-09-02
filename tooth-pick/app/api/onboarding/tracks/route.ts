import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';
import OnboardingService from '@/lib/services/OnboardingService';

// GET /api/onboarding/tracks - Obtener tracks por rol
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
    const role = searchParams.get('role');
    const difficulty = searchParams.get('difficulty');
    const category = searchParams.get('category');
    const limit = searchParams.get('limit');

    if (!role) {
      return NextResponse.json(
        { error: 'El parámetro role es requerido' },
        { status: 400 }
      );
    }

    const tracks = await OnboardingService.getTracksByRole(role, {
      difficulty: difficulty || undefined,
      category: category || undefined,
      limit: limit ? parseInt(limit) : undefined
    });

    return NextResponse.json({
      tracks,
      count: tracks.length
    });

  } catch (error) {
    console.error('Error obteniendo tracks:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// POST /api/onboarding/tracks - Crear nuevo track (solo admins)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // En una implementación real, aquí verificarías la autenticación y rol de admin
    const createdBy = 'admin'; // Temporalmente hardcodeado
    
    const {
      role,
      title,
      description,
      icon,
      difficulty,
      category,
      steps,
      completionRewards
    } = body;

    // Validaciones básicas
    if (!role || !title || !description || !steps || steps.length === 0) {
      return NextResponse.json(
        { error: 'Faltan campos requeridos' },
        { status: 400 }
      );
    }

    const track = await OnboardingService.createTrack({
      role,
      title,
      description,
      icon: icon || '🎓',
      difficulty: difficulty || 'beginner',
      category: category || 'General',
      steps,
      completionRewards: completionRewards || {
        points: 100,
        certificate: 'Certificado de ' + title,
        unlockFeatures: [],
        badge: 'Completado'
      }
    }, createdBy);

    return NextResponse.json({
      success: true,
      track
    }, { status: 201 });

  } catch (error) {
    console.error('Error creando track:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
