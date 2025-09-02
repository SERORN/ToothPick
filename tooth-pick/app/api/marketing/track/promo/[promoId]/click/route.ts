import { NextRequest, NextResponse } from 'next/server';
import PromoHighlight from '@/lib/models/PromoHighlight';
import connectDB from '@/lib/db';

interface RouteParams {
  params: {
    promoId: string;
  };
}

/**
 * POST /api/marketing/track/promo/[promoId]/click
 * Registra un clic en promoción
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

    await promo.recordClick();

    return NextResponse.json({
      success: true,
      message: 'Clic registrado',
      data: {
        ctaLink: promo.ctaLink
      }
    });

  } catch (error: any) {
    console.error('Error tracking promo click:', error);
    
    return NextResponse.json({
      error: 'Error registrando clic',
      details: error.message
    }, { status: 500 });
  }
}

/**
 * GET /api/marketing/track/promo/[promoId]/click
 * Tracking de clic con redirección automática
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    await connectDB();

    const promo = await PromoHighlight.findById(params.promoId);
    
    if (!promo) {
      return NextResponse.redirect('/');
    }

    // Registrar clic
    await promo.recordClick();

    // Redirigir al enlace de la promoción
    return NextResponse.redirect(promo.ctaLink);

  } catch (error: any) {
    console.error('Error tracking promo click and redirect:', error);
    
    // Redirigir a home en caso de error
    return NextResponse.redirect('/');
  }
}
