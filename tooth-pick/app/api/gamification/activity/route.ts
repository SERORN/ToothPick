import { NextRequest, NextResponse } from 'next/server';
import GamificationService from '@/lib/services/GamificationService';
import dbConnect from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    await dbConnect();
    
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const timeframe = searchParams.get('timeframe') as 'week' | 'month' | 'year' | 'all' || 'month';
    const eventType = searchParams.get('eventType');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    if (!userId) {
      return NextResponse.json({
        success: false,
        message: 'ID de usuario requerido'
      }, { status: 400 });
    }

    const UserEventLog = (await import('@/lib/models/UserEventLog')).default;

    // Construir filtros
    let dateFilter = {};
    const now = new Date();
    
    switch (timeframe) {
      case 'week':
        dateFilter = { 
          createdAt: { 
            $gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) 
          } 
        };
        break;
      case 'month':
        dateFilter = { 
          createdAt: { 
            $gte: new Date(now.getFullYear(), now.getMonth(), 1) 
          } 
        };
        break;
      case 'year':
        dateFilter = { 
          createdAt: { 
            $gte: new Date(now.getFullYear(), 0, 1) 
          } 
        };
        break;
      case 'all':
      default:
        dateFilter = {};
        break;
    }

    let eventFilter = {};
    if (eventType) {
      eventFilter = { eventType };
    }

    const filter = {
      userId,
      ...dateFilter,
      ...eventFilter
    };

    // Obtener actividades con paginación
    const activities = await UserEventLog.find(filter)
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(offset)
      .lean();

    // Obtener estadísticas de actividad
    const stats = await (UserEventLog as any).getUserStats(userId, timeframe);

    // Obtener total de registros para paginación
    const totalCount = await UserEventLog.countDocuments(filter);

    // Formatear actividades para respuesta
    const formattedActivities = activities.map(activity => ({
      id: activity._id,
      eventType: activity.eventType,
      pointsEarned: activity.pointsEarned,
      badgeEarned: activity.badgeEarned,
      streakUpdated: activity.streakUpdated,
      levelUp: activity.levelUp,
      metadata: activity.metadata,
      source: activity.source,
      createdAt: activity.createdAt,
      referenceId: activity.referenceId,
      referenceType: activity.referenceType
    }));

    return NextResponse.json({
      success: true,
      activities: formattedActivities,
      stats,
      pagination: {
        currentPage: Math.floor(offset / limit) + 1,
        itemsPerPage: limit,
        totalItems: totalCount,
        totalPages: Math.ceil(totalCount / limit),
        hasNext: offset + limit < totalCount,
        hasPrev: offset > 0
      },
      filters: {
        userId,
        timeframe,
        eventType: eventType || 'all',
        limit,
        offset
      }
    });
  } catch (error) {
    console.error('Error en /api/gamification/activity:', error);
    return NextResponse.json({
      success: false,
      message: 'Error interno del servidor',
      error: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await dbConnect();
    
    const body = await request.json();
    const { 
      userId, 
      eventType, 
      metadata = {}, 
      source = 'manual',
      referenceId,
      referenceType
    } = body;

    if (!userId || !eventType) {
      return NextResponse.json({
        success: false,
        message: 'ID de usuario y tipo de evento requeridos'
      }, { status: 400 });
    }

    // Procesar evento a través del servicio de gamificación
    const result = await GamificationService.processEvent(
      userId, 
      eventType, 
      {
        ...metadata,
        manualEntry: true,
        source,
        referenceId,
        referenceType
      }
    );

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: 'Evento registrado exitosamente',
        pointsEarned: result.pointsEarned,
        badgesEarned: result.badgesEarned || [],
        levelUp: result.levelUp || false,
        streakUpdated: result.streakUpdated || false,
        eventLog: result.eventLog
      });
    } else {
      return NextResponse.json({
        success: false,
        message: result.reason || 'No se pudo procesar el evento',
        details: result.details
      }, { status: 400 });
    }
  } catch (error) {
    console.error('Error registrando actividad:', error);
    return NextResponse.json({
      success: false,
      message: 'Error interno del servidor',
      error: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 });
  }
}
