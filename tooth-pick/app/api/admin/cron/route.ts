import { NextRequest, NextResponse } from 'next/server';
// import cronService from '@/lib/services/CronService';

export async function GET(request: NextRequest) {
  try {
    // Solo permitir en desarrollo o con autorización
    if (process.env.NODE_ENV !== 'development') {
      const authHeader = request.headers.get('authorization');
      const adminSecret = process.env.ADMIN_SECRET || 'dev-admin';
      
      if (authHeader !== `Bearer ${adminSecret}`) {
        return NextResponse.json(
          { error: 'No autorizado' },
          { status: 401 }
        );
      }
    }

    // TODO: Habilitar cuando node-cron esté instalado
    // const status = cronService.getTasksStatus();

    return NextResponse.json({
      success: true,
      message: 'Estado del servicio de cron',
      status: {
        // ...status,
        'daily-reminders': false,
        'retry-reminders': false
      },
      info: 'Cron service temporalmente deshabilitado - usar /api/cron/reminders'
    });

  } catch (error) {
    console.error('Error obteniendo estado de cron:', error);
    
    return NextResponse.json(
      { 
        error: 'Error interno del servidor',
        details: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { action, task } = await request.json();

    // Solo permitir en desarrollo o con autorización
    if (process.env.NODE_ENV !== 'development') {
      const authHeader = request.headers.get('authorization');
      const adminSecret = process.env.ADMIN_SECRET || 'dev-admin';
      
      if (authHeader !== `Bearer ${adminSecret}`) {
        return NextResponse.json(
          { error: 'No autorizado' },
          { status: 401 }
        );
      }
    }

    let result = false;
    let message = '';

    // TODO: Habilitar cuando node-cron esté instalado
    /*
    switch (action) {
      case 'start':
        if (task) {
          result = cronService.startTask(task);
          message = `Tarea ${task} ${result ? 'iniciada' : 'no encontrada'}`;
        } else {
          cronService.start();
          result = true;
          message = 'Todas las tareas iniciadas';
        }
        break;

      case 'stop':
        if (task) {
          result = cronService.stopTask(task);
          message = `Tarea ${task} ${result ? 'detenida' : 'no encontrada'}`;
        } else {
          cronService.stop();
          result = true;
          message = 'Todas las tareas detenidas';
        }
        break;

      case 'run':
        if (task === 'reminders') {
          const stats = await cronService.runRemindersNow();
          return NextResponse.json({
            success: true,
            message: 'Recordatorios ejecutados manualmente',
            stats
          });
        }
        break;

      default:
        return NextResponse.json(
          { error: 'Acción no válida' },
          { status: 400 }
        );
    }
    */

    return NextResponse.json({
      success: true,
      message: 'Cron service temporalmente deshabilitado',
      info: 'Usar /api/cron/reminders para ejecutar recordatorios',
      action,
      task
    });

  } catch (error) {
    console.error('Error controlando cron service:', error);
    
    return NextResponse.json(
      { 
        error: 'Error interno del servidor',
        details: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    );
  }
}
