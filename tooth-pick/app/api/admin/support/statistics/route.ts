import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../auth/[...nextauth]/route';
import SupportTicketService from '@/lib/services/SupportTicketService';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Verificar permisos de administrador o soporte
    if (session.user.role !== 'admin' && session.user.role !== 'support') {
      return NextResponse.json(
        { error: 'No tienes permisos para acceder a las estadísticas' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    
    const filters = {
      startDate: searchParams.get('startDate') || undefined,
      endDate: searchParams.get('endDate') || undefined,
      userRole: searchParams.get('userRole') || undefined,
      category: searchParams.get('category') || undefined,
      agentId: searchParams.get('agentId') || undefined
    };

    const statistics = await SupportTicketService.getSupportStatistics(filters);

    return NextResponse.json(statistics);

  } catch (error) {
    console.error('Error obteniendo estadísticas de soporte:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
