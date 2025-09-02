import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    await dbConnect();
    
    const { searchParams } = new URL(request.url);
    const role = searchParams.get('role');
    const category = searchParams.get('category');
    const isActive = searchParams.get('isActive');

    const GamificationEvent = (await import('@/lib/models/GamificationEvent')).default;

    let filter: any = {};
    
    if (role) {
      filter.applicableRoles = role;
    }
    
    if (category) {
      filter.category = category;
    }
    
    if (isActive !== null) {
      filter.isActive = isActive === 'true';
    }

    const events = await GamificationEvent.find(filter)
      .sort({ category: 1, pointsBase: -1 })
      .lean();

    // Agregar estadísticas de uso si están disponibles
    const UserEventLog = (await import('@/lib/models/UserEventLog')).default;
    const eventsWithStats = await Promise.all(
      events.map(async (event) => {
        const usageCount = await UserEventLog.countDocuments({
          eventType: event.id,
          createdAt: {
            $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Últimos 30 días
          }
        });

        return {
          ...event,
          usageStats: {
            last30Days: usageCount
          }
        };
      })
    );

    return NextResponse.json({
      success: true,
      events: eventsWithStats,
      total: eventsWithStats.length,
      filters: {
        role: role || 'all',
        category: category || 'all',
        isActive: isActive || 'all'
      }
    });
  } catch (error) {
    console.error('Error en /api/gamification/events:', error);
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
      id,
      title,
      description,
      category,
      pointsBase,
      applicableRoles,
      isDaily = false,
      cooldownHours = 0,
      maxOccurrences = null,
      prerequisiteEvents = [],
      prerequisiteBadges = [],
      seasonalMultiplier = 1,
      isActive = true,
      badgeAwarded = null
    } = body;

    if (!id || !title || !category || !pointsBase || !applicableRoles?.length) {
      return NextResponse.json({
        success: false,
        message: 'Campos requeridos: id, title, category, pointsBase, applicableRoles'
      }, { status: 400 });
    }

    const GamificationEvent = (await import('@/lib/models/GamificationEvent')).default;

    // Verificar que el ID sea único
    const existingEvent = await GamificationEvent.findOne({ id });
    if (existingEvent) {
      return NextResponse.json({
        success: false,
        message: 'Ya existe un evento con este ID'
      }, { status: 400 });
    }

    // Verificar que las insignias prerequisito existan
    if (prerequisiteBadges.length > 0) {
      const Badge = (await import('@/lib/models/Badge')).default;
      const badges = await Badge.find({ id: { $in: prerequisiteBadges } });
      if (badges.length !== prerequisiteBadges.length) {
        return NextResponse.json({
          success: false,
          message: 'Una o más insignias prerequisito no existen'
        }, { status: 400 });
      }
    }

    // Verificar que los eventos prerequisito existan
    if (prerequisiteEvents.length > 0) {
      const events = await GamificationEvent.find({ id: { $in: prerequisiteEvents } });
      if (events.length !== prerequisiteEvents.length) {
        return NextResponse.json({
          success: false,
          message: 'Uno o más eventos prerequisito no existen'
        }, { status: 400 });
      }
    }

    const newEvent = await GamificationEvent.create({
      id,
      title,
      description,
      category,
      pointsBase,
      applicableRoles,
      isDaily,
      cooldownHours,
      maxOccurrences,
      prerequisiteEvents,
      prerequisiteBadges,
      seasonalMultiplier,
      isActive,
      badgeAwarded
    });

    return NextResponse.json({
      success: true,
      message: 'Evento creado exitosamente',
      event: newEvent
    });
  } catch (error) {
    console.error('Error creando evento:', error);
    return NextResponse.json({
      success: false,
      message: 'Error interno del servidor',
      error: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    await dbConnect();
    
    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json({
        success: false,
        message: 'ID del evento requerido'
      }, { status: 400 });
    }

    const GamificationEvent = (await import('@/lib/models/GamificationEvent')).default;

    const updatedEvent = await GamificationEvent.findOneAndUpdate(
      { id },
      { $set: updates },
      { new: true, runValidators: true }
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
  } catch (error) {
    console.error('Error actualizando evento:', error);
    return NextResponse.json({
      success: false,
      message: 'Error interno del servidor',
      error: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    await dbConnect();
    
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({
        success: false,
        message: 'ID del evento requerido'
      }, { status: 400 });
    }

    const GamificationEvent = (await import('@/lib/models/GamificationEvent')).default;

    // Verificar si el evento tiene actividad reciente antes de eliminarlo
    const UserEventLog = (await import('@/lib/models/UserEventLog')).default;
    const recentActivity = await UserEventLog.countDocuments({
      eventType: id,
      createdAt: {
        $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Últimos 7 días
      }
    });

    if (recentActivity > 0) {
      // En lugar de eliminar, desactivar el evento
      const deactivatedEvent = await GamificationEvent.findOneAndUpdate(
        { id },
        { $set: { isActive: false } },
        { new: true }
      );

      return NextResponse.json({
        success: true,
        message: 'Evento desactivado debido a actividad reciente',
        event: deactivatedEvent,
        recentActivity
      });
    }

    const deletedEvent = await GamificationEvent.findOneAndDelete({ id });

    if (!deletedEvent) {
      return NextResponse.json({
        success: false,
        message: 'Evento no encontrado'
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: 'Evento eliminado exitosamente'
    });
  } catch (error) {
    console.error('Error eliminando evento:', error);
    return NextResponse.json({
      success: false,
      message: 'Error interno del servidor',
      error: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 });
  }
}
