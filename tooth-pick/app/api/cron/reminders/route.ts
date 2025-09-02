import { NextRequest, NextResponse } from 'next/server';
import ReminderService from '@/lib/services/ReminderService';

export async function POST(request: NextRequest) {
  try {
    // Verificar que la solicitud viene de un cron job autorizado
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET || 'dev-secret';
    
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    console.log('🔔 Iniciando envío de recordatorios automatizados...');

    // Ejecutar el servicio de recordatorios
    const stats = await ReminderService.sendUpcomingAppointmentReminders();

    // También marcar citas pasadas como no necesarias
    const markedAsNotNeeded = await ReminderService.markPastAppointmentsAsNotNeeded();

    // Reintentar recordatorios fallidos
    const retryStats = await ReminderService.retryFailedReminders();

    console.log('✅ Recordatorios completados:', {
      ...stats,
      markedAsNotNeeded,
      retried: retryStats.retried
    });

    return NextResponse.json({
      success: true,
      message: 'Recordatorios procesados exitosamente',
      stats: {
        sent: stats.sent,
        failed: stats.failed,
        skipped: stats.skipped,
        markedAsNotNeeded,
        retried: retryStats.retried,
        retryFailed: retryStats.failed
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('💥 Error en el cron de recordatorios:', error);
    
    return NextResponse.json(
      { 
        error: 'Error interno del servidor',
        details: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    );
  }
}

// Endpoint GET para probar manualmente
export async function GET(request: NextRequest) {
  try {
    // Solo permitir en desarrollo
    if (process.env.NODE_ENV !== 'development') {
      return NextResponse.json(
        { error: 'Endpoint solo disponible en desarrollo' },
        { status: 403 }
      );
    }

    console.log('🧪 Ejecutando recordatorios en modo de prueba...');

    const stats = await ReminderService.sendUpcomingAppointmentReminders();

    return NextResponse.json({
      success: true,
      message: 'Recordatorios de prueba ejecutados',
      stats,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error en prueba de recordatorios:', error);
    
    return NextResponse.json(
      { 
        error: 'Error en prueba',
        details: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    );
  }
}
