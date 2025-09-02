import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { MarketingService } from '@/lib/services/MarketingService';
import PromoHighlight from '@/lib/models/PromoHighlight';
import { checkSubscriptionAccess } from '@/lib/middleware/subscription';
import connectDB from '@/lib/db';

/**
 * GET /api/marketing/highlights
 * Obtiene promociones destacadas
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const location = searchParams.get('location') || 'dashboard';
    const clinicId = searchParams.get('clinicId');
    const userType = searchParams.get('userType') || 'all';
    const includeInactive = searchParams.get('includeInactive') === 'true';

    await connectDB();

    let promos;

    // Si se especifica una clínica (para vista de admin)
    if (clinicId) {
      const session = await getServerSession(authOptions);
      
      if (!session?.user?.id || session.user.id !== clinicId) {
        return NextResponse.json({
          error: 'No autorizado para esta clínica'
        }, { status: 403 });
      }

      // Verificar acceso por suscripción
      const hasAccess = await checkSubscriptionAccess(session.user.id, 'marketing');
      if (!hasAccess) {
        return NextResponse.json({
          error: 'Esta funcionalidad requiere plan Pro o Elite'
        }, { status: 403 });
      }

      promos = await PromoHighlight.getClinicPromos(clinicId, includeInactive);
    } else {
      // Vista pública para pacientes
      promos = await PromoHighlight.getActivePromos(location, undefined, userType);
    }

    return NextResponse.json({
      success: true,
      data: {
        promotions: promos,
        location,
        count: promos.length
      }
    });

  } catch (error: any) {
    console.error('Error fetching promo highlights:', error);
    
    return NextResponse.json({
      error: 'Error interno del servidor',
      details: error.message
    }, { status: 500 });
  }
}

/**
 * POST /api/marketing/highlights
 * Crea una nueva promoción destacada
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({
        error: 'No autorizado'
      }, { status: 401 });
    }

    // Verificar acceso por suscripción
    const hasAccess = await checkSubscriptionAccess(session.user.id, 'marketing');
    if (!hasAccess) {
      return NextResponse.json({
        error: 'Esta funcionalidad requiere plan Pro o Elite'
      }, { status: 403 });
    }

    const body = await request.json();
    
    // Validaciones básicas
    if (!body.title || !body.description || !body.imageUrl || !body.ctaLink) {
      return NextResponse.json({
        error: 'Datos requeridos: title, description, imageUrl, ctaLink'
      }, { status: 400 });
    }

    // Validar fecha de vencimiento
    const visibleUntil = new Date(body.visibleUntil);
    if (visibleUntil <= new Date()) {
      return NextResponse.json({
        error: 'La fecha de vencimiento debe ser futura'
      }, { status: 400 });
    }

    // Validar ubicaciones de display
    const validLocations = ['dashboard', 'booking', 'profile', 'catalog'];
    if (body.displayLocations && !body.displayLocations.every((loc: string) => validLocations.includes(loc))) {
      return NextResponse.json({
        error: 'Ubicaciones de display inválidas'
      }, { status: 400 });
    }

    // Crear promoción
    const promoData = {
      ...body,
      clinicId: session.user.id,
      visibleUntil
    };

    const promo = await MarketingService.createPromoHighlight(promoData);

    return NextResponse.json({
      success: true,
      message: 'Promoción creada exitosamente',
      data: {
        promoId: promo._id,
        title: promo.title,
        visibleUntil: promo.visibleUntil,
        displayLocations: promo.displayLocations,
        isActive: promo.isActive
      }
    }, { status: 201 });

  } catch (error: any) {
    console.error('Error creating promo highlight:', error);
    
    return NextResponse.json({
      error: 'Error interno del servidor',
      details: error.message
    }, { status: 500 });
  }
}
