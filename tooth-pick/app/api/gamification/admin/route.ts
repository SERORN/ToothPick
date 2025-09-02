import { NextRequest, NextResponse } from 'next/server';
import GamificationService from '@/lib/services/GamificationService';
import dbConnect from '@/lib/db';

// Este endpoint requiere permisos de administrador
export async function GET(request: NextRequest) {
  try {
    await dbConnect();
    
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') || 'overview';

    switch (action) {
      case 'overview':
        const overview = await getGamificationOverview();
        return NextResponse.json({
          success: true,
          data: overview
        });
        
      case 'events':
        const GamificationEvent = (await import('@/lib/models/GamificationEvent')).default;
        const events = await GamificationEvent.find()
          .sort({ category: 1, pointsBase: -1 })
          .lean();
        
        return NextResponse.json({
          success: true,
          events
        });
        
      case 'badges':
        const Badge = (await import('@/lib/models/Badge')).default;
        const badges = await Badge.find()
          .sort({ category: 1, rarity: 1 })
          .lean();
        
        return NextResponse.json({
          success: true,
          badges
        });
        
      case 'users':
        const limit = parseInt(searchParams.get('limit') || '50');
        const offset = parseInt(searchParams.get('offset') || '0');
        const role = searchParams.get('role');
        
        const UserGamification = (await import('@/lib/models/UserGamification')).default;
        let filter = {};
        if (role) {
          filter = { 'user.role': role };
        }
        
        const users = await UserGamification.find(filter)
          .populate('userId', 'name email role')
          .sort({ totalPoints: -1 })
          .limit(limit)
          .skip(offset)
          .lean();
        
        return NextResponse.json({
          success: true,
          users,
          pagination: {
            limit,
            offset,
            total: await UserGamification.countDocuments(filter)
          }
        });
        
      default:
        return NextResponse.json({
          success: false,
          message: 'Acción no válida'
        }, { status: 400 });
    }
  } catch (error) {
    console.error('Error en GET /api/gamification/admin:', error);
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
    const { action } = body;

    switch (action) {
      case 'create_event':
        const eventData = body.eventData;
        if (!eventData) {
          return NextResponse.json({
            success: false,
            message: 'Datos del evento requeridos'
          }, { status: 400 });
        }
        
        const GamificationEvent = (await import('@/lib/models/GamificationEvent')).default;
        const newEvent = await GamificationEvent.create(eventData);
        
        return NextResponse.json({
          success: true,
          message: 'Evento creado exitosamente',
          event: newEvent
        });
        
      case 'create_badge':
        const badgeData = body.badgeData;
        if (!badgeData) {
          return NextResponse.json({
            success: false,
            message: 'Datos de la insignia requeridos'
          }, { status: 400 });
        }
        
        const Badge = (await import('@/lib/models/Badge')).default;
        const newBadge = await Badge.create(badgeData);
        
        return NextResponse.json({
          success: true,
          message: 'Insignia creada exitosamente',
          badge: newBadge
        });
        
      case 'award_points':
        const { userId, points, reason } = body;
        if (!userId || !points) {
          return NextResponse.json({
            success: false,
            message: 'ID de usuario y puntos requeridos'
          }, { status: 400 });
        }
        
        await GamificationService.addPoints(userId, points);
        
        // Registrar evento manual
        const UserEventLog = (await import('@/lib/models/UserEventLog')).default;
        await UserEventLog.create({
          userId,
          eventType: 'admin_points_award',
          pointsEarned: points,
          metadata: { 
            reason: reason || 'Puntos otorgados por administrador',
            manual: true 
          },
          source: 'admin'
        });
        
        return NextResponse.json({
          success: true,
          message: `${points} puntos otorgados exitosamente`
        });
        
      case 'reset_user':
        const { userId: userToReset } = body;
        if (!userToReset) {
          return NextResponse.json({
            success: false,
            message: 'ID de usuario requerido'
          }, { status: 400 });
        }
        
        const UserGamification = (await import('@/lib/models/UserGamification')).default;
        await UserGamification.findOneAndUpdate(
          { userId: userToReset },
          {
            $set: {
              totalPoints: 0,
              level: 1,
              badges: [],
              achievements: [],
              'streak.current': 0,
              'streak.longest': 0,
              'streak.lastActive': null,
              'preferences.showInLeaderboard': true,
              'preferences.enableNotifications': true
            }
          }
        );
        
        return NextResponse.json({
          success: true,
          message: 'Usuario reseteado exitosamente'
        });
        
      case 'bulk_award':
        const { userIds, eventType, metadata = {} } = body;
        if (!userIds || !Array.isArray(userIds) || !eventType) {
          return NextResponse.json({
            success: false,
            message: 'IDs de usuarios y tipo de evento requeridos'
          }, { status: 400 });
        }
        
        const events = userIds.map(userId => ({
          userId,
          eventType,
          metadata: { ...metadata, bulkAwarded: true }
        }));
        
        const batchResult = await GamificationService.processBatchEvents(events);
        
        return NextResponse.json({
          success: true,
          message: 'Otorgamiento masivo completado',
          processed: batchResult.processed,
          errors: batchResult.errors
        });
        
      case 'update_event':
        const { eventId, updates } = body;
        if (!eventId || !updates) {
          return NextResponse.json({
            success: false,
            message: 'ID de evento y actualizaciones requeridas'
          }, { status: 400 });
        }
        
        const GamificationEventModel = (await import('@/lib/models/GamificationEvent')).default;
        const updatedEvent = await GamificationEventModel.findOneAndUpdate(
          { id: eventId },
          { $set: updates },
          { new: true }
        );
        
        if (!updatedEvent) {
          return NextResponse.json({
            success: false,
            message: 'Evento no encontrado'
          }, { status: 404 });
        }
        
        return NextResponse.json({
          success: true,
          message: 'Evento actualizado exitosamente',
          event: updatedEvent
        });
        
      case 'update_badge':
        const { badgeId, badgeUpdates } = body;
        if (!badgeId || !badgeUpdates) {
          return NextResponse.json({
            success: false,
            message: 'ID de insignia y actualizaciones requeridas'
          }, { status: 400 });
        }
        
        const BadgeModel = (await import('@/lib/models/Badge')).default;
        const updatedBadge = await BadgeModel.findOneAndUpdate(
          { id: badgeId },
          { $set: badgeUpdates },
          { new: true }
        );
        
        if (!updatedBadge) {
          return NextResponse.json({
            success: false,
            message: 'Insignia no encontrada'
          }, { status: 404 });
        }
        
        return NextResponse.json({
          success: true,
          message: 'Insignia actualizada exitosamente',
          badge: updatedBadge
        });
        
      default:
        return NextResponse.json({
          success: false,
          message: 'Acción no válida'
        }, { status: 400 });
    }
  } catch (error) {
    console.error('Error en POST /api/gamification/admin:', error);
    return NextResponse.json({
      success: false,
      message: 'Error interno del servidor',
      error: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 });
  }
}

async function getGamificationOverview() {
  const UserGamification = (await import('@/lib/models/UserGamification')).default;
  const UserEventLog = (await import('@/lib/models/UserEventLog')).default;
  const Badge = (await import('@/lib/models/Badge')).default;
  const GamificationEvent = (await import('@/lib/models/GamificationEvent')).default;

  const [
    totalUsers,
    totalEvents,
    totalBadges,
    recentActivity,
    topUsers,
    popularEvents
  ] = await Promise.all([
    UserGamification.countDocuments(),
    GamificationEvent.countDocuments(),
    Badge.countDocuments(),
    UserEventLog.find()
      .sort({ createdAt: -1 })
      .limit(20)
      .populate('userId', 'name email')
      .lean(),
    UserGamification.find()
      .populate('userId', 'name email role')
      .sort({ totalPoints: -1 })
      .limit(10)
      .lean(),
    UserEventLog.aggregate([
      {
        $match: {
          createdAt: {
            $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Últimos 7 días
          }
        }
      },
      {
        $group: {
          _id: '$eventType',
          count: { $sum: 1 },
          totalPoints: { $sum: '$pointsEarned' }
        }
      },
      {
        $sort: { count: -1 }
      },
      {
        $limit: 10
      }
    ])
  ]);

  return {
    overview: {
      totalUsers,
      totalEvents,
      totalBadges,
      totalActivity: await UserEventLog.countDocuments()
    },
    recentActivity: recentActivity.slice(0, 10),
    topUsers,
    popularEvents
  };
}
