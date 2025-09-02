// 🎯 FASE 32: API - Triggers de Fidelización
// ✅ Endpoints para gestionar triggers de fidelidad (Admin y público)

import { NextRequest, NextResponse } from 'next/server';
import { LoyaltyService } from '@/lib/services/LoyaltyService';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

// Obtener triggers activos (público)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const includeInactive = searchParams.get('includeInactive') === 'true';
    
    if (includeInactive) {
      // Solo admin puede ver triggers inactivos
      const session = await getServerSession(authOptions);
      if (!session?.user || session.user.role !== 'admin') {
        return NextResponse.json(
          { error: 'Acceso denegado - Solo administradores' },
          { status: 403 }
        );
      }
    }
    
    const triggers = await LoyaltyService.getActiveTriggers(category || undefined);
    
    // Filtrar información sensible para usuarios no admin
    const session = await getServerSession(authOptions);
    const isAdmin = session?.user?.role === 'admin';
    
    const filteredTriggers = triggers.map(trigger => ({
      _id: trigger._id,
      name: trigger.name,
      description: trigger.description,
      triggerType: trigger.triggerType,
      actionType: trigger.actionType,
      rewards: {
        basePoints: trigger.rewards.basePoints,
        xpPoints: trigger.rewards.xpPoints,
        tierBonuses: trigger.rewards.tierBonuses
      },
      metadata: trigger.metadata,
      validity: isAdmin ? trigger.validity : {
        isActive: trigger.validity.isActive,
        endDate: trigger.validity.endDate
      },
      ...(isAdmin && {
        conditions: trigger.conditions,
        frequency: trigger.frequency,
        stats: trigger.stats
      })
    }));
    
    return NextResponse.json({
      success: true,
      data: {
        triggers: filteredTriggers,
        total: filteredTriggers.length
      }
    });
    
  } catch (error: any) {
    console.error('Error al obtener triggers:', error);
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

// Crear nuevo trigger (solo admin)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Acceso denegado - Solo administradores' },
        { status: 403 }
      );
    }
    
    const triggerData = await request.json();
    
    // Validaciones básicas
    if (!triggerData.name || !triggerData.actionType || !triggerData.rewards?.basePoints) {
      return NextResponse.json(
        { error: 'Campos requeridos: name, actionType, rewards.basePoints' },
        { status: 400 }
      );
    }
    
    const trigger = await LoyaltyService.createTrigger(triggerData, session.user.id);
    
    return NextResponse.json({
      success: true,
      data: { trigger }
    }, { status: 201 });
    
  } catch (error: any) {
    console.error('Error al crear trigger:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Error interno del servidor'
      },
      { status: 500 }
    );
  }
}
