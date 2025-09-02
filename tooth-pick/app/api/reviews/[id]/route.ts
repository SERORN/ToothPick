import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import ReviewService from '@/lib/services/ReviewService';

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession();
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }
    
    const { id } = params;
    
    if (!id) {
      return NextResponse.json(
        { error: 'ID de reseña requerido' },
        { status: 400 }
      );
    }
    
    // Eliminar la reseña (verifica que sea del usuario)
    await ReviewService.deleteReview(id, session.user.id);
    
    return NextResponse.json({
      success: true,
      message: 'Reseña eliminada exitosamente'
    });
    
  } catch (error) {
    console.error('Error deleting review:', error);
    
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

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    
    if (!id) {
      return NextResponse.json(
        { error: 'ID de reseña requerido' },
        { status: 400 }
      );
    }
    
    const review = await ReviewService.getReviewById(id);
    
    return NextResponse.json({
      success: true,
      data: review
    });
    
  } catch (error) {
    console.error('Error getting review:', error);
    
    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 404 }
      );
    }
    
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
