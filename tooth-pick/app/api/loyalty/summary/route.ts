// 🎯 FASE 32: API - Resumen de Fidelización
// ✅ Dashboard de fidelización del usuario con estadísticas y ranking

import { NextRequest, NextResponse } from 'next/server';
import { LoyaltyService } from '@/lib/services/LoyaltyService';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

// Obtener resumen completo de fidelización
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }
    
    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get('organizationId');
    const userId = searchParams.get('userId') || session.user.id;
    
    if (!organizationId) {
      return NextResponse.json(
        { error: 'organizationId requerido' },
        { status: 400 }
      );
    }
    
    // Solo admin puede ver resumen de otros usuarios
    if (userId !== session.user.id && session.user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Acceso denegado' },
        { status: 403 }
      );
    }
    
    const loyaltySummary = await LoyaltyService.getUserLoyaltySummary(userId, organizationId);
    
    if (!loyaltySummary) {
      return NextResponse.json({
        success: true,
        data: {
          hasSubscription: false,
          message: 'Usuario sin suscripción activa'
        }
      });
    }
    
    // Obtener triggers disponibles para motivar acciones
    const availableTriggers = await LoyaltyService.getActiveTriggers();
    const motivationalTriggers = availableTriggers
      .filter(trigger => trigger.metadata.difficulty === 'easy')
      .slice(0, 5)
      .map(trigger => ({
        _id: trigger._id,
        name: trigger.name,
        description: trigger.description,
        points: trigger.rewards.basePoints,
        category: trigger.metadata.category,
        estimatedTime: trigger.metadata.estimatedCompletionTime
      }));
    
    return NextResponse.json({
      success: true,
      data: {
        ...loyaltySummary,
        motivationalActions: motivationalTriggers,
        hasSubscription: true
      }
    });
    
  } catch (error: any) {
    console.error('Error al obtener resumen de fidelización:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Error interno del servidor',
        details: error.message 
      },
      { status: 500 }
    );
  }
}
