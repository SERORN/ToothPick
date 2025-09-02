import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import VerificationService from '@/lib/services/VerificationService';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }
    
    // Solo administradores pueden ver estadísticas
    if (session.user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Acceso denegado. Solo administradores.' },
        { status: 403 }
      );
    }
    
    // Obtener parámetros de consulta
    const { searchParams } = new URL(request.url);
    
    const filters: {
      startDate?: Date;
      endDate?: Date;
      adminUserId?: string;
    } = {};
    
    if (searchParams.get('startDate')) {
      filters.startDate = new Date(searchParams.get('startDate')!);
    }
    
    if (searchParams.get('endDate')) {
      filters.endDate = new Date(searchParams.get('endDate')!);
    }
    
    if (searchParams.get('adminUserId')) {
      filters.adminUserId = searchParams.get('adminUserId')!;
    }
    
    // Obtener estadísticas
    const stats = await VerificationService.getVerificationStats(filters);
    
    return NextResponse.json({
      success: true,
      data: stats
    });
    
  } catch (error) {
    console.error('Error getting verification stats:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
