import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]/route';
import KnowledgeBaseService from '@/lib/services/KnowledgeBaseService';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Obtener parámetros
    const query = searchParams.get('q') || '';
    const limit = parseInt(searchParams.get('limit') || '5');

    // Obtener sesión para filtrar por rol del usuario
    const session = await getServerSession(authOptions);
    const userRole = session?.user?.role || 'all';

    if (!query || query.length < 2) {
      return NextResponse.json({ suggestions: [] });
    }

    // Realizar búsqueda rápida
    const suggestions = await KnowledgeBaseService.quickSearch(query, userRole, limit);

    return NextResponse.json({ suggestions });

  } catch (error) {
    console.error('Error obteniendo sugerencias:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
