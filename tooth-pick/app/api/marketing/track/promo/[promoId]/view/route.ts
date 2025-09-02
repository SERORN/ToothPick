import { NextRequest, NextResponse } from 'next/server';
import PromoHighlight from '@/lib/models/PromoHighlight';
import connectDB from '@/lib/db';

interface RouteParams {
  params: {
    promoId: string;
  };
}

/**
 * POST /api/marketing/track/promo/[promoId]/view
 * Registra una vista de promoción
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    await connectDB();

    const promo = await PromoHighlight.findById(params.promoId);
    
    if (!promo) {
      return NextResponse.json({
        error: 'Promoción no encontrada'
      }, { status: 404 });
    }

    await promo.recordView();

    return NextResponse.json({
      success: true,
      message: 'Vista registrada'
    });

  } catch (error: any) {
    console.error('Error tracking promo view:', error);
    
    return NextResponse.json({
      error: 'Error registrando vista',
      details: error.message
    }, { status: 500 });
  }
}
