import { NextRequest, NextResponse } from 'next/server';
import GamificationService from '@/lib/services/GamificationService';
import dbConnect from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    await dbConnect();
    
    const body = await request.json();
    const { userId, eventType, metadata = {}, source = 'api' } = body;

    if (!userId || !eventType) {
      return NextResponse.json({
        success: false,
        message: 'ID de usuario y tipo de evento requeridos'
      }, { status: 400 });
    }

    // Obtener información adicional del request
    const ipAddress = request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-real-ip') || 
                     'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    const enrichedMetadata = {
      ...metadata,
      ipAddress,
      userAgent,
      timestamp: new Date().toISOString()
    };

    const result = await GamificationService.awardPoints(
      userId, 
      eventType, 
      enrichedMetadata, 
      source
    );

    return NextResponse.json({
      success: result.success,
      ...result
    });
  } catch (error) {
    console.error('Error en /api/gamification/event:', error);
    return NextResponse.json({
      success: false,
      message: 'Error interno del servidor',
      error: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    await dbConnect();
    
    const { searchParams } = new URL(request.url);
    const role = searchParams.get('role');
    const category = searchParams.get('category');

    if (role) {
      const events = await GamificationService.getEventsForRole(role);
      return NextResponse.json({
        success: true,
        events
      });
    }

    if (category) {
      const GamificationEvent = (await import('@/lib/models/GamificationEvent')).default;
      const events = await (GamificationEvent as any).getEventsByCategory(category);
      return NextResponse.json({
        success: true,
        events
      });
    }

    // Devolver todos los eventos activos
    const GamificationEvent = (await import('@/lib/models/GamificationEvent')).default;
    const events = await GamificationEvent.find({ isActive: true })
      .sort({ category: 1, pointsAwarded: -1 });

    return NextResponse.json({
      success: true,
      events
    });
  } catch (error) {
    console.error('Error obteniendo eventos:', error);
    return NextResponse.json({
      success: false,
      message: 'Error interno del servidor',
      error: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 });
  }
}
