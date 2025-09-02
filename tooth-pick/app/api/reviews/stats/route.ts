import { NextRequest, NextResponse } from 'next/server';
import ReviewService from '@/lib/services/ReviewService';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const targetId = searchParams.get('targetId');
    const targetType = searchParams.get('targetType');
    
    if (!targetId || !targetType) {
      return NextResponse.json(
        { error: 'targetId y targetType son requeridos' },
        { status: 400 }
      );
    }
    
    if (!['product', 'provider', 'distributor'].includes(targetType)) {
      return NextResponse.json(
        { error: 'targetType inválido' },
        { status: 400 }
      );
    }
    
    const stats = await ReviewService.getReviewStats(targetId, targetType);
    
    return NextResponse.json({
      success: true,
      data: stats
    });
    
  } catch (error) {
    console.error('Error getting review stats:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
