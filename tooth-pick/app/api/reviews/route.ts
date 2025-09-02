import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import ReviewService from '@/lib/services/ReviewService';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }
    
    const body = await request.json();
    const { targetId, targetType, rating, title, comment, verifiedPurchase } = body;
    
    // Validaciones básicas
    if (!targetId || !targetType || !rating || !title || !comment) {
      return NextResponse.json(
        { error: 'Faltan campos requeridos' },
        { status: 400 }
      );
    }
    
    if (!['product', 'provider', 'distributor'].includes(targetType)) {
      return NextResponse.json(
        { error: 'Tipo de objetivo inválido' },
        { status: 400 }
      );
    }
    
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      return NextResponse.json(
        { error: 'La calificación debe ser un número entero entre 1 y 5' },
        { status: 400 }
      );
    }
    
    // Verificar si el usuario ya calificó este objetivo
    const hasReviewed = await ReviewService.hasUserReviewed(
      session.user.id,
      targetId,
      targetType
    );
    
    if (hasReviewed) {
      return NextResponse.json(
        { error: 'Ya has calificado este elemento' },
        { status: 409 }
      );
    }
    
    // Crear la reseña
    const review = await ReviewService.createReview({
      userId: session.user.id,
      targetId,
      targetType,
      rating,
      title,
      comment,
      verifiedPurchase
    });
    
    return NextResponse.json({
      success: true,
      data: review
    }, { status: 201 });
    
  } catch (error) {
    console.error('Error creating review:', error);
    
    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    const filters = {
      targetId: searchParams.get('targetId') || undefined,
      targetType: searchParams.get('targetType') || undefined,
      rating: searchParams.get('rating') ? parseInt(searchParams.get('rating')!) : undefined,
      verifiedPurchase: searchParams.get('verifiedPurchase') === 'true' ? true : 
                       searchParams.get('verifiedPurchase') === 'false' ? false : undefined,
      sortBy: (searchParams.get('sortBy') as 'newest' | 'oldest' | 'rating_high' | 'rating_low' | 'helpful') || 'newest',
      page: searchParams.get('page') ? parseInt(searchParams.get('page')!) : 1,
      limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 10
    };
    
    // Validaciones
    if (filters.rating && (filters.rating < 1 || filters.rating > 5)) {
      return NextResponse.json(
        { error: 'La calificación debe estar entre 1 y 5' },
        { status: 400 }
      );
    }
    
    if (filters.targetType && !['product', 'provider', 'distributor'].includes(filters.targetType)) {
      return NextResponse.json(
        { error: 'Tipo de objetivo inválido' },
        { status: 400 }
      );
    }
    
    if (filters.limit > 50) {
      filters.limit = 50; // Máximo 50 por página
    }
    
    // Obtener reseñas
    const result = await ReviewService.getReviews(filters);
    
    return NextResponse.json({
      success: true,
      data: result
    });
    
  } catch (error) {
    console.error('Error getting reviews:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
