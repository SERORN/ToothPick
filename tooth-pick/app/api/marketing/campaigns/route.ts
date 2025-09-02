import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { MarketingService } from '@/lib/services/MarketingService';
import MarketingCampaign from '@/lib/models/MarketingCampaign';
import { checkSubscriptionAccess } from '@/lib/middleware/subscription';
import connectDB from '@/lib/db';

/**
 * GET /api/marketing/campaigns
 * Obtiene las campañas de marketing de la clínica
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({
        error: 'No autorizado'
      }, { status: 401 });
    }

    // Verificar acceso por suscripción (Pro o Elite)
    const hasAccess = await checkSubscriptionAccess(session.user.id, 'marketing');
    if (!hasAccess) {
      return NextResponse.json({
        error: 'Esta funcionalidad requiere plan Pro o Elite'
      }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 50);

    await connectDB();

    // Obtener campañas de la clínica
    const campaigns = await MarketingCampaign.getClinicCampaigns(
      session.user.id,
      status || undefined,
      limit
    );

    // Obtener estadísticas generales
    const stats = await MarketingService.getClinicMarketingStats(session.user.id);

    return NextResponse.json({
      success: true,
      data: {
        campaigns,
        stats: stats?.campaigns || {},
        pagination: {
          page,
          limit,
          total: campaigns.length
        }
      }
    });

  } catch (error: any) {
    console.error('Error fetching marketing campaigns:', error);
    
    return NextResponse.json({
      error: 'Error interno del servidor',
      details: error.message
    }, { status: 500 });
  }
}

/**
 * POST /api/marketing/campaigns
 * Crea una nueva campaña de marketing
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
    if (!body.title || !body.description || !body.content?.body) {
      return NextResponse.json({
        error: 'Datos requeridos: title, description, content.body'
      }, { status: 400 });
    }

    if (!body.audience || !['all', 'active', 'inactive', 'custom'].includes(body.audience)) {
      return NextResponse.json({
        error: 'Audiencia inválida'
      }, { status: 400 });
    }

    if (!body.channel || !['email', 'notification', 'sms'].includes(body.channel)) {
      return NextResponse.json({
        error: 'Canal inválido'
      }, { status: 400 });
    }

    // Validar fecha de programación
    const scheduledAt = new Date(body.scheduledAt || Date.now());
    if (scheduledAt < new Date()) {
      return NextResponse.json({
        error: 'La fecha de programación debe ser futura'
      }, { status: 400 });
    }

    // Crear campaña
    const campaignData = {
      ...body,
      clinicId: session.user.id,
      scheduledAt
    };

    const campaign = await MarketingService.createCampaign(campaignData);

    // Si está programada para ahora, ejecutar inmediatamente
    if (scheduledAt <= new Date(Date.now() + 60000)) { // 1 minuto de tolerancia
      setTimeout(async () => {
        await MarketingService.executeCampaign(campaign._id.toString());
      }, 5000); // Ejecutar en 5 segundos
    }

    return NextResponse.json({
      success: true,
      message: 'Campaña creada exitosamente',
      data: {
        campaignId: campaign._id,
        title: campaign.title,
        estimatedReach: campaign.estimatedReach,
        scheduledAt: campaign.scheduledAt,
        status: campaign.status
      }
    }, { status: 201 });

  } catch (error: any) {
    console.error('Error creating marketing campaign:', error);
    
    return NextResponse.json({
      error: 'Error interno del servidor',
      details: error.message
    }, { status: 500 });
  }
}
