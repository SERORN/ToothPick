import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../auth/[...nextauth]/route';
import KnowledgeBaseService from '@/lib/services/KnowledgeBaseService';

export async function POST(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    // No requerir autenticación para marcar como útil (feedback anónimo)
    const slug = params.slug;
    const body = await request.json();
    const { isHelpful } = body;

    if (typeof isHelpful !== 'boolean') {
      return NextResponse.json(
        { error: 'isHelpful debe ser un valor booleano' },
        { status: 400 }
      );
    }

    // Obtener artículo para obtener su ID
    const article = await KnowledgeBaseService.getArticleBySlug(slug);
    
    if (!article) {
      return NextResponse.json(
        { error: 'Artículo no encontrado' },
        { status: 404 }
      );
    }

    // Marcar como útil/no útil
    const feedback = await KnowledgeBaseService.markArticleHelpful(
      article._id,
      isHelpful
    );

    return NextResponse.json({
      message: 'Feedback registrado exitosamente',
      feedback
    });

  } catch (error) {
    console.error('Error registrando feedback:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
