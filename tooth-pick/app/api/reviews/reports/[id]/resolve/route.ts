import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import ReportService from '@/lib/services/ReportService';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession();
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }
    
    // Verificar que sea admin (en un escenario real)
    // if (session.user.role !== 'admin') {
    //   return NextResponse.json(
    //     { error: 'Acceso denegado. Solo administradores.' },
    //     { status: 403 }
    //   );
    // }
    
    const { id: reportId } = params;
    const body = await request.json();
    const { action, adminNotes } = body;
    
    if (!reportId) {
      return NextResponse.json(
        { error: 'ID de reporte requerido' },
        { status: 400 }
      );
    }
    
    if (!action || !['dismiss', 'remove'].includes(action)) {
      return NextResponse.json(
        { error: 'Acción inválida. Debe ser "dismiss" o "remove"' },
        { status: 400 }
      );
    }
    
    const resolvedReport = await ReportService.resolveReport(
      reportId,
      session.user.id,
      action,
      adminNotes
    );
    
    return NextResponse.json({
      success: true,
      data: resolvedReport,
      message: `Reporte ${action === 'dismiss' ? 'descartado' : 'procesado'} exitosamente`
    });
    
  } catch (error) {
    console.error('Error resolving report:', error);
    
    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
