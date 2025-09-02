import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import OnboardingService from '@/lib/services/OnboardingService';
import { connectToDatabase } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'No autenticado' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { 
      userId, 
      stepId, 
      stepData,
      completed = true,
      progress 
    } = body;

    // Validar datos requeridos
    if (!stepId) {
      return NextResponse.json(
        { error: 'stepId es requerido' },
        { status: 400 }
      );
    }

    const targetUserId = userId || session.user.id;

    // Verificar permisos (solo el usuario puede completar sus propios pasos o admin puede gestionar todos)
    if (targetUserId !== session.user.id && session.user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Sin permisos para modificar este onboarding' },
        { status: 403 }
      );
    }

    let result;

    if (completed) {
      // Completar paso
      result = await OnboardingService.completeStep(targetUserId, stepId, stepData);
    } else {
      // Solo actualizar progreso sin completar
      if (progress) {
        result = await OnboardingService.updateProgress(targetUserId, progress);
      } else {
        return NextResponse.json(
          { error: 'Se requiere datos de progreso para actualización' },
          { status: 400 }
        );
      }
    }

    if (result.success) {
      // Obtener flujo actualizado para devolver estado completo
      const updatedFlow = await OnboardingService.getOnboardingFlow(targetUserId);
      
      return NextResponse.json({
        success: true,
        message: completed ? 'Paso completado exitosamente' : 'Progreso actualizado',
        nextStep: (result as any).nextStep,
        flow: updatedFlow.flow,
        progress: updatedFlow.progress
      });
    } else {
      return NextResponse.json(
        { error: 'Error al procesar el paso' },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Error en POST /api/onboarding/step/complete:', error);
    
    return NextResponse.json(
      { 
        error: 'Error interno del servidor', 
        details: error instanceof Error ? error.message : 'Error desconocido' 
      },
      { status: 500 }
    );
  }
}

// Método GET para obtener información específica de un paso
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
    const stepId = searchParams.get('stepId');
    const userId = searchParams.get('userId') || session.user.id;

    if (!stepId) {
      return NextResponse.json(
        { error: 'stepId es requerido' },
        { status: 400 }
      );
    }

    // Verificar permisos
    if (userId !== session.user.id && session.user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Sin permisos para acceder a este onboarding' },
        { status: 403 }
      );
    }

    // Obtener el flujo completo para encontrar el paso
    const flowResponse = await OnboardingService.getOnboardingFlow(userId);
    const step = flowResponse.flow.steps.find(s => s.id === stepId);

    if (!step) {
      return NextResponse.json(
        { error: 'Paso no encontrado' },
        { status: 404 }
      );
    }

    // Obtener datos guardados del paso si existen
    const { db } = await connectToDatabase();
    const progress = await db.collection('onboarding_progress').findOne({ userId });
    const stepData = progress?.stepData?.[stepId] || {};

    return NextResponse.json({
      success: true,
      step: {
        ...step,
        savedData: stepData
      },
      canAccess: step.isCompleted || step.id === flowResponse.flow.currentStep || 
                 flowResponse.flow.completedSteps.includes(step.id),
      isCurrentStep: step.id === flowResponse.flow.currentStep
    });

  } catch (error) {
    console.error('Error en GET /api/onboarding/step/complete:', error);
    
    return NextResponse.json(
      { 
        error: 'Error interno del servidor', 
        details: error instanceof Error ? error.message : 'Error desconocido' 
      },
      { status: 500 }
    );
  }
}

// Método PUT para actualizar datos de un paso sin completarlo
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'No autenticado' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { userId, stepId, stepData } = body;

    if (!stepId || !stepData) {
      return NextResponse.json(
        { error: 'stepId y stepData son requeridos' },
        { status: 400 }
      );
    }

    const targetUserId = userId || session.user.id;

    // Verificar permisos
    if (targetUserId !== session.user.id && session.user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Sin permisos para modificar este onboarding' },
        { status: 403 }
      );
    }

    // Actualizar solo los datos del paso sin completarlo
    const { db } = await connectToDatabase();
    
    await db.collection('onboarding_progress').updateOne(
      { userId: targetUserId },
      { 
        $set: {
          [`stepData.${stepId}`]: stepData,
          lastUpdatedAt: new Date()
        }
      }
    );

    return NextResponse.json({
      success: true,
      message: 'Datos del paso guardados exitosamente'
    });

  } catch (error) {
    console.error('Error en PUT /api/onboarding/step/complete:', error);
    
    return NextResponse.json(
      { 
        error: 'Error interno del servidor', 
        details: error instanceof Error ? error.message : 'Error desconocido' 
      },
      { status: 500 }
    );
  }
}
