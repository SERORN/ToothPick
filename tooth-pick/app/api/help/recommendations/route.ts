import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]/route';
import KnowledgeBaseService from '@/lib/services/KnowledgeBaseService';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Obtener parámetros
    const ticketCategory = searchParams.get('ticketCategory') || '';
    const limit = parseInt(searchParams.get('limit') || '5');

    // Obtener sesión para filtrar por rol del usuario
    const session = await getServerSession(authOptions);
    const userRole = session?.user?.role || 'all';

    if (!ticketCategory) {
      return NextResponse.json(
        { error: 'ticketCategory es requerido' },
        { status: 400 }
      );
    }

    // Obtener recomendaciones basadas en la categoría del ticket
    const recommendations = await KnowledgeBaseService.getSuggestionsForTicket(
      ticketCategory,
      userRole,
      limit
    );

    return NextResponse.json({ recommendations });

  } catch (error) {
    console.error('Error obteniendo recomendaciones:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
