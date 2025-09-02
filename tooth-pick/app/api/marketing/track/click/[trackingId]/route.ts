import { NextRequest, NextResponse } from 'next/server';
import { MarketingService } from '@/lib/services/MarketingService';

/**
 * GET /api/marketing/track/click/[trackingId]
 * Tracking de clics en emails y redirección
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { trackingId: string } }
) {
  try {
    const { searchParams } = new URL(request.url);
    const redirectUrl = searchParams.get('redirect');

    // Registrar clic
    await MarketingService.trackClick(params.trackingId);

    // Redirigir al destino original
    if (redirectUrl) {
      return NextResponse.redirect(redirectUrl);
    } else {
      return NextResponse.json({
        success: true,
        message: 'Clic registrado exitosamente'
      });
    }

  } catch (error: any) {
    console.error('Error tracking click:', error);
    
    // Intentar redireccionar aunque haya error
    const { searchParams } = new URL(request.url);
    const redirectUrl = searchParams.get('redirect');
    
    if (redirectUrl) {
      return NextResponse.redirect(redirectUrl);
    }
    
    return NextResponse.json({
      error: 'Error registrando clic',
      details: error.message
    }, { status: 500 });
  }
}
