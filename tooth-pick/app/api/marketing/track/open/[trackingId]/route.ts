import { NextRequest, NextResponse } from 'next/server';
import { MarketingService } from '@/lib/services/MarketingService';
import PromoHighlight from '@/lib/models/PromoHighlight';

/**
 * GET /api/marketing/track/open/[trackingId]
 * Tracking de apertura de emails
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { trackingId: string } }
) {
  try {
    // Registrar apertura
    await MarketingService.trackEmailOpen(params.trackingId);

    // Devolver pixel de tracking transparente
    const pixel = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
      'base64'
    );

    return new Response(pixel, {
      status: 200,
      headers: {
        'Content-Type': 'image/png',
        'Content-Length': pixel.length.toString(),
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });

  } catch (error) {
    console.error('Error tracking email open:', error);
    
    // Devolver pixel vacío aunque haya error
    const pixel = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
      'base64'
    );

    return new Response(pixel, {
      status: 200,
      headers: {
        'Content-Type': 'image/png',
        'Content-Length': pixel.length.toString()
      }
    });
  }
}
