import { NextRequest, NextResponse } from 'next/server';
import ReminderService from '@/lib/services/ReminderService';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Parámetros de fecha opcionales
    const fromParam = searchParams.get('from');
    const toParam = searchParams.get('to');
    
    const dateFrom = fromParam ? new Date(fromParam) : undefined;
    const dateTo = toParam ? new Date(toParam) : undefined;

    // Obtener estadísticas de recordatorios
    const stats = await ReminderService.getReminderStats(dateFrom, dateTo);

    return NextResponse.json({
      success: true,
      data: stats,
      period: {
        from: dateFrom?.toISOString(),
        to: dateTo?.toISOString()
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error obteniendo estadísticas de recordatorios:', error);
    
    return NextResponse.json(
      { 
        error: 'Error interno del servidor',
        details: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    );
  }
}
