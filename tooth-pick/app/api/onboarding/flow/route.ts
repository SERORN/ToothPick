import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import OnboardingService from '@/lib/services/OnboardingService';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'No autenticado' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const roleParam = searchParams.get('role');
    const role = roleParam as 'provider' | 'distributor' | 'clinic' | 'admin' | undefined;
    const userId = searchParams.get('userId') || session.user.id;

    // Verificar permisos (solo el usuario puede ver su propio onboarding o admin puede ver todos)
    if (userId !== session.user.id && session.user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Sin permisos para acceder a este onboarding' },
        { status: 403 }
      );
    }

    const flowResponse = await OnboardingService.getOnboardingFlow(userId, role || undefined);

    return NextResponse.json({
      success: true,
      ...flowResponse
    });

  } catch (error) {
    console.error('Error en GET /api/onboarding/flow:', error);
    
    return NextResponse.json(
      { 
        error: 'Error interno del servidor', 
        details: error instanceof Error ? error.message : 'Error desconocido' 
      },
      { status: 500 }
    );
  }
}

// Método POST para crear/actualizar configuración de onboarding (solo admins)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'No autenticado' },
        { status: 401 }
      );
    }

    // Verificar que sea admin
    if (session.user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Solo administradores pueden modificar configuraciones de onboarding' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { userId, role, customSteps, skipSteps } = body;

    if (!userId || !role) {
      return NextResponse.json(
        { error: 'userId y role son requeridos' },
        { status: 400 }
      );
    }

    // Obtener flujo actual
    const currentFlow = await OnboardingService.getOnboardingFlow(userId, role);
    
    // Aplicar modificaciones personalizadas
    let updatedSteps = currentFlow.flow.steps;
    
    if (skipSteps && Array.isArray(skipSteps)) {
      // Marcar pasos como completados para omitirlos
      for (const stepId of skipSteps) {
        await OnboardingService.completeStep(userId, stepId, { skipped: true });
      }
    }

    if (customSteps && Array.isArray(customSteps)) {
      // Agregar pasos personalizados (funcionalidad futura)
      // updatedSteps = [...updatedSteps, ...customSteps];
    }

    // Obtener flujo actualizado
    const updatedFlow = await OnboardingService.getOnboardingFlow(userId, role);

    return NextResponse.json({
      success: true,
      message: 'Configuración de onboarding actualizada',
      flow: updatedFlow.flow
    });

  } catch (error) {
    console.error('Error en POST /api/onboarding/flow:', error);
    
    return NextResponse.json(
      { 
        error: 'Error interno del servidor', 
        details: error instanceof Error ? error.message : 'Error desconocido' 
      },
      { status: 500 }
    );
  }
}

// Método DELETE para reiniciar onboarding
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'No autenticado' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId') || session.user.id;

    // Verificar permisos
    if (userId !== session.user.id && session.user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Sin permisos para reiniciar este onboarding' },
        { status: 403 }
      );
    }

    const result = await OnboardingService.resetOnboarding(userId);

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: 'Onboarding reiniciado exitosamente'
      });
    } else {
      return NextResponse.json(
        { error: 'Error al reiniciar onboarding' },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Error en DELETE /api/onboarding/flow:', error);
    
    return NextResponse.json(
      { 
        error: 'Error interno del servidor', 
        details: error instanceof Error ? error.message : 'Error desconocido' 
      },
      { status: 500 }
    );
  }
}
