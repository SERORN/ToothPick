import { NextRequest, NextResponse } from 'next/server';
import KnowledgeBaseService from '@/lib/services/KnowledgeBaseService';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'categories';

    switch (type) {
      case 'categories':
        const categories = await KnowledgeBaseService.getCategories();
        return NextResponse.json({ categories });

      case 'tags':
        const limit = parseInt(searchParams.get('limit') || '20');
        const tags = await KnowledgeBaseService.getPopularTags(limit);
        return NextResponse.json({ tags });

      case 'statistics':
        const statistics = await KnowledgeBaseService.getStatistics();
        return NextResponse.json({ statistics });

      default:
        return NextResponse.json(
          { error: 'Tipo no válido. Use: categories, tags, statistics' },
          { status: 400 }
        );
    }

  } catch (error) {
    console.error('Error obteniendo metadata:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
