// 📊 FASE 39: API para recolección de eventos analíticos
// POST /api/analytics/log - Registrar eventos de analytics

import { NextRequest, NextResponse } from 'next/server';
import AnalyticsService, { LogEventData } from '@/lib/services/AnalyticsService';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';

export async function POST(request: NextRequest) {
  try {
    // Verificar autenticación
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { eventType, entityType, entityId, metadata, sessionId, deviceId } = body;

    // Validar campos requeridos
    if (!eventType) {
      return NextResponse.json(
        { error: 'Event type is required' },
        { status: 400 }
      );
    }

    // Preparar datos del evento
    const eventData: LogEventData = {
      eventType,
      userId: session.user.id,
      userRole: session.user.role as any,
      entityType,
      entityId,
      metadata: {
        ...metadata,
        ip: request.ip || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
        timestamp: new Date()
      },
      sessionId,
      deviceId
    };

    // Registrar evento
    const savedEvent = await AnalyticsService.logEvent(eventData);

    return NextResponse.json({
      success: true,
      eventId: savedEvent._id,
      message: 'Analytics event logged successfully'
    });

  } catch (error) {
    console.error('Error logging analytics event:', error);
    return NextResponse.json(
      { error: 'Failed to log analytics event' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    // Verificar autenticación
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { events } = body;

    // Validar que events sea un array
    if (!Array.isArray(events) || events.length === 0) {
      return NextResponse.json(
        { error: 'Events array is required' },
        { status: 400 }
      );
    }

    // Preparar eventos para inserción en lote
    const eventData: LogEventData[] = events.map(event => ({
      eventType: event.eventType,
      userId: session.user.id,
      userRole: session.user.role as any,
      entityType: event.entityType,
      entityId: event.entityId,
      metadata: {
        ...event.metadata,
        ip: request.ip || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
        timestamp: new Date()
      },
      sessionId: event.sessionId,
      deviceId: event.deviceId
    }));

    // Registrar eventos en lote
    const savedEvents = await AnalyticsService.logBulkEvents(eventData);

    return NextResponse.json({
      success: true,
      eventsCount: savedEvents.length,
      message: 'Analytics events logged successfully'
    });

  } catch (error) {
    console.error('Error logging bulk analytics events:', error);
    return NextResponse.json(
      { error: 'Failed to log bulk analytics events' },
      { status: 500 }
    );
  }
}
