import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]/route';
import KnowledgeBaseService from '@/lib/services/KnowledgeBaseService';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Obtener parámetros de búsqueda
    const query = searchParams.get('q') || '';
    const role = searchParams.get('role') || '';
    const category = searchParams.get('category') || '';
    const tags = searchParams.get('tags')?.split(',').filter(Boolean) || [];
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const sortBy = searchParams.get('sortBy') as 'relevance' | 'popular' | 'recent' | 'helpful' || 'relevance';

    // Obtener sesión para filtrar por rol del usuario
    const session = await getServerSession(authOptions);
    const userRole = session?.user?.role || 'all';

    // Realizar búsqueda
    const result = await KnowledgeBaseService.searchArticles(query, {
      role: role || userRole,
      category,
      tags,
      page,
      limit,
      sortBy
    });

    return NextResponse.json(result);

  } catch (error) {
    console.error('Error buscando artículos:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    // Verificar autenticación y permisos de administrador
    if (!session?.user?.id || !['admin', 'support'].includes(session.user.role)) {
      return NextResponse.json(
        { error: 'No tienes permisos para crear artículos' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { title, content, role, category, tags, isFeatured, isPublished, excerpt, seoTitle, seoDescription } = body;

    // Validar campos requeridos
    if (!title || !content || !category) {
      return NextResponse.json(
        { error: 'Título, contenido y categoría son requeridos' },
        { status: 400 }
      );
    }

    // Crear artículo
    const article = await KnowledgeBaseService.createArticle({
      title,
      content,
      role: role || 'all',
      category,
      tags: tags || [],
      isFeatured: isFeatured || false,
      isPublished: isPublished || false,
      excerpt,
      seoTitle,
      seoDescription
    }, session.user.id);

    return NextResponse.json({
      message: 'Artículo creado exitosamente',
      article
    }, { status: 201 });

  } catch (error) {
    console.error('Error creando artículo:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
