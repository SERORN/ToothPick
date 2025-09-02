import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import ReportService from '@/lib/services/ReportService';

export async function GET(request: NextRequest) {
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
    
    const { searchParams } = new URL(request.url);
    
    const filters = {
      status: (searchParams.get('status') as 'pending' | 'dismissed' | 'removed') || 'pending',
      reason: searchParams.get('reason') || undefined,
      dateFrom: searchParams.get('dateFrom') || undefined,
      dateTo: searchParams.get('dateTo') || undefined,
      page: searchParams.get('page') ? parseInt(searchParams.get('page')!) : 1,
      limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 20
    };
    
    // Validaciones
    const validStatuses = ['pending', 'dismissed', 'removed'];
    if (!validStatuses.includes(filters.status)) {
      return NextResponse.json(
        { error: 'Estado inválido' },
        { status: 400 }
      );
    }
    
    if (filters.limit > 100) {
      filters.limit = 100; // Máximo 100 por página
    }
    
    const result = await ReportService.getReports(filters);
    
    return NextResponse.json({
      success: true,
      data: result
    });
    
  } catch (error) {
    console.error('Error getting reports:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
