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
    
    // Solo administradores pueden acceder
    if (session.user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Acceso denegado. Solo administradores.' },
        { status: 403 }
      );
    }
    
    // Obtener parámetros de consulta
    const { searchParams } = new URL(request.url);
    
    const filters = {
      status: searchParams.get('status') || 'pending',
      businessCategory: searchParams.get('businessCategory') || undefined,
      minScore: searchParams.get('minScore') ? parseInt(searchParams.get('minScore')!) : undefined,
      maxScore: searchParams.get('maxScore') ? parseInt(searchParams.get('maxScore')!) : undefined,
      sortBy: (searchParams.get('sortBy') as 'submittedAt' | 'verificationScore' | 'businessName') || 'submittedAt',
      sortOrder: (searchParams.get('sortOrder') as 'asc' | 'desc') || 'desc',
      page: searchParams.get('page') ? parseInt(searchParams.get('page')!) : 1,
      limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 20
    };
    
    // Validar parámetros
    const validStatuses = ['all', 'pending', 'in_review', 'approved', 'rejected', 'documents_required'];
    if (!validStatuses.includes(filters.status)) {
      return NextResponse.json(
        { error: 'Estado inválido' },
        { status: 400 }
      );
    }
    
    const validSortFields = ['submittedAt', 'verificationScore', 'businessName'];
    if (!validSortFields.includes(filters.sortBy)) {
      return NextResponse.json(
        { error: 'Campo de ordenamiento inválido' },
        { status: 400 }
      );
    }
    
    if (filters.limit > 100) {
      filters.limit = 100; // Máximo 100 por página
    }
    
    // Obtener solicitudes
    const result = await VerificationService.getPendingRequests(filters);
    
    return NextResponse.json({
      success: true,
      data: result
    });
    
  } catch (error) {
    console.error('Error getting pending verification requests:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
