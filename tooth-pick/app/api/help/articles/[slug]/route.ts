import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../auth/[...nextauth]/route';
import KnowledgeBaseService from '@/lib/services/KnowledgeBaseService';

export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const slug = params.slug;
    
    // Obtener sesión para verificar permisos de rol
    const session = await getServerSession(authOptions);
    const userRole = session?.user?.role || 'all';

    // Obtener artículo
    const article = await KnowledgeBaseService.getArticleBySlug(slug, userRole);

    if (!article) {
      return NextResponse.json(
        { error: 'Artículo no encontrado' },
        { status: 404 }
      );
    }

    return NextResponse.json({ article });

  } catch (error) {
    console.error('Error obteniendo artículo:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    // Verificar autenticación y permisos de administrador
    if (!session?.user?.id || !['admin', 'support'].includes(session.user.role)) {
      return NextResponse.json(
        { error: 'No tienes permisos para editar artículos' },
        { status: 403 }
      );
    }

    const slug = params.slug;
    const body = await request.json();

    // Primero obtener el artículo actual para obtener su ID
    const currentArticle = await KnowledgeBaseService.getArticleBySlug(slug, 'admin');
    
    if (!currentArticle) {
      return NextResponse.json(
        { error: 'Artículo no encontrado' },
        { status: 404 }
      );
    }

    // Actualizar artículo
    const updatedArticle = await KnowledgeBaseService.updateArticle(
      currentArticle._id,
      body
    );

    return NextResponse.json({
      message: 'Artículo actualizado exitosamente',
      article: updatedArticle
    });

  } catch (error) {
    console.error('Error actualizando artículo:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    // Verificar autenticación y permisos de administrador
    if (!session?.user?.id || session.user.role !== 'admin') {
      return NextResponse.json(
        { error: 'No tienes permisos para eliminar artículos' },
        { status: 403 }
      );
    }

    const slug = params.slug;

    // Primero obtener el artículo para obtener su ID
    const article = await KnowledgeBaseService.getArticleBySlug(slug, 'admin');
    
    if (!article) {
      return NextResponse.json(
        { error: 'Artículo no encontrado' },
        { status: 404 }
      );
    }

    // Eliminar artículo
    await KnowledgeBaseService.deleteArticle(article._id);

    return NextResponse.json({
      message: 'Artículo eliminado exitosamente'
    });

  } catch (error) {
    console.error('Error eliminando artículo:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
