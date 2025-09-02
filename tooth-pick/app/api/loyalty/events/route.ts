// 🎯 FASE 32: API - Eventos de Fidelización
// ✅ Endpoints para historial y procesamiento de eventos de fidelidad

import { NextRequest, NextResponse } from 'next/server';
import { LoyaltyService } from '@/lib/services/LoyaltyService';
import LoyaltyEvent from '@/lib/models/LoyaltyEvent';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

// Obtener historial de eventos del usuario
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
    const userId = searchParams.get('userId') || session.user.id;
    const limit = parseInt(searchParams.get('limit') || '20');
    const startDate = searchParams.get('startDate') ? new Date(searchParams.get('startDate')!) : undefined;
    const endDate = searchParams.get('endDate') ? new Date(searchParams.get('endDate')!) : undefined;
    const eventTypes = searchParams.get('eventTypes')?.split(',');
    
    // Solo admin puede ver eventos de otros usuarios
    if (userId !== session.user.id && session.user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Acceso denegado' },
        { status: 403 }
      );
    }
    
    const events = await LoyaltyEvent.findUserEvents(userId, {
      limit: Math.min(limit, 100), // Máximo 100 eventos
      startDate,
      endDate,
      eventTypes,
      validOnly: true
    });
    
    const userTotal = await LoyaltyEvent.calculateUserTotal(userId);
    
    return NextResponse.json({
      success: true,
      data: {
        events,
        summary: userTotal,
        pagination: {
          limit,
          count: events.length
        }
      }
    });
    
  } catch (error: any) {
    console.error('Error al obtener eventos:', error);
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

// Procesar evento manualmente (solo admin)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Acceso denegado - Solo administradores' },
        { status: 403 }
      );
    }
    
    const eventData = await request.json();
    
    // Validaciones
    if (!eventData.userId || !eventData.organizationId || !eventData.eventType) {
      return NextResponse.json(
        { error: 'Campos requeridos: userId, organizationId, eventType' },
        { status: 400 }
      );
    }
    
    const processedEvents = await LoyaltyService.processEvent({
      userId: eventData.userId,
      organizationId: eventData.organizationId,
      eventType: eventData.eventType,
      eventData: {
        sourceModule: 'manual',
        description: eventData.description || 'Evento procesado manualmente',
        dynamicValue: eventData.dynamicValue,
        metadata: {
          processedBy: session.user.id,
          processedAt: new Date().toISOString(),
          ...eventData.metadata
        }
      },
      systemInfo: {
        source: 'manual',
        requestId: crypto.randomUUID()
      }
    });
    
    return NextResponse.json({
      success: true,
      data: {
        processedEvents,
        count: processedEvents.length
      }
    }, { status: 201 });
    
  } catch (error: any) {
    console.error('Error al procesar evento:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Error interno del servidor'
      },
      { status: 500 }
    );
  }
}
