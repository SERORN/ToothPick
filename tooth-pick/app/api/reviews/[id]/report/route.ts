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
    
    const { id: reviewId } = params;
    const body = await request.json();
    const { reason, reasonDetails } = body;
    
    if (!reviewId) {
      return NextResponse.json(
        { error: 'ID de reseña requerido' },
        { status: 400 }
      );
    }
    
    if (!reason) {
      return NextResponse.json(
        { error: 'Motivo del reporte requerido' },
        { status: 400 }
      );
    }
    
    const validReasons = ['spam', 'inappropriate', 'fake', 'offensive', 'irrelevant', 'other'];
    if (!validReasons.includes(reason)) {
      return NextResponse.json(
        { error: 'Motivo de reporte inválido' },
        { status: 400 }
      );
    }
    
    // Crear el reporte
    const report = await ReportService.createReport({
      reviewId,
      reporterId: session.user.id,
      reason,
      reasonDetails
    });
    
    return NextResponse.json({
      success: true,
      data: report,
      message: 'Reporte enviado exitosamente'
    }, { status: 201 });
    
  } catch (error) {
    console.error('Error creating report:', error);
    
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
