import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { MarketingService } from '@/lib/services/MarketingService';
import MarketingCampaign from '@/lib/models/MarketingCampaign';
import { checkSubscriptionAccess } from '@/lib/middleware/subscription';
import connectDB from '@/lib/db';

interface RouteParams {
  params: {
    campaignId: string;
  };
}

/**
 * GET /api/marketing/campaigns/[campaignId]
 * Obtiene una campaña específica
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
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

    await connectDB();

    const campaign = await MarketingCampaign.findOne({
      _id: params.campaignId,
      clinicId: session.user.id
    }).populate('targetPatients', 'name email phone');

    if (!campaign) {
      return NextResponse.json({
        error: 'Campaña no encontrada'
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: {
        campaign: campaign.getPerformanceStats(),
        details: campaign
      }
    });

  } catch (error: any) {
    console.error('Error fetching campaign:', error);
    
    return NextResponse.json({
      error: 'Error interno del servidor',
      details: error.message
    }, { status: 500 });
  }
}

/**
 * PUT /api/marketing/campaigns/[campaignId]
 * Actualiza una campaña (solo si está en estado pending)
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
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

    await connectDB();

    const campaign = await MarketingCampaign.findOne({
      _id: params.campaignId,
      clinicId: session.user.id
    });

    if (!campaign) {
      return NextResponse.json({
        error: 'Campaña no encontrada'
      }, { status: 404 });
    }

    if (campaign.status !== 'pending') {
      return NextResponse.json({
        error: 'Solo se pueden editar campañas pendientes'
      }, { status: 400 });
    }

    const body = await request.json();
    
    // Actualizar campos permitidos
    const allowedFields = ['title', 'description', 'content', 'scheduledAt', 'audience', 'customFilters'];
    const updates: any = {};
    
    allowedFields.forEach(field => {
      if (body[field] !== undefined) {
        updates[field] = body[field];
      }
    });

    // Validar fecha de programación si se actualiza
    if (updates.scheduledAt) {
      const scheduledAt = new Date(updates.scheduledAt);
      if (scheduledAt < new Date()) {
        return NextResponse.json({
          error: 'La fecha de programación debe ser futura'
        }, { status: 400 });
      }
    }

    // Si cambia la audiencia, recalcular pacientes objetivo
    if (updates.audience || updates.customFilters) {
      const targetPatients = await MarketingService.getTargetAudience(
        session.user.id,
        updates.audience || campaign.audience,
        updates.customFilters || campaign.customFilters
      );
      updates.targetPatients = targetPatients.map(p => p._id);
    }

    const updatedCampaign = await MarketingCampaign.findByIdAndUpdate(
      params.campaignId,
      { $set: { ...updates, updatedAt: new Date() } },
      { new: true }
    );

    return NextResponse.json({
      success: true,
      message: 'Campaña actualizada exitosamente',
      data: updatedCampaign
    });

  } catch (error: any) {
    console.error('Error updating campaign:', error);
    
    return NextResponse.json({
      error: 'Error interno del servidor',
      details: error.message
    }, { status: 500 });
  }
}

/**
 * DELETE /api/marketing/campaigns/[campaignId]
 * Cancela/elimina una campaña
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
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

    await connectDB();

    const campaign = await MarketingCampaign.findOne({
      _id: params.campaignId,
      clinicId: session.user.id
    });

    if (!campaign) {
      return NextResponse.json({
        error: 'Campaña no encontrada'
      }, { status: 404 });
    }

    // Solo se pueden eliminar campañas pendientes o fallidas
    if (!['pending', 'failed'].includes(campaign.status)) {
      return NextResponse.json({
        error: 'Solo se pueden eliminar campañas pendientes o fallidas'
      }, { status: 400 });
    }

    await MarketingCampaign.findByIdAndDelete(params.campaignId);

    return NextResponse.json({
      success: true,
      message: 'Campaña eliminada exitosamente'
    });

  } catch (error: any) {
    console.error('Error deleting campaign:', error);
    
    return NextResponse.json({
      error: 'Error interno del servidor',
      details: error.message
    }, { status: 500 });
  }
}

/**
 * POST /api/marketing/campaigns/[campaignId]/execute
 * Ejecuta una campaña manualmente
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
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

    await connectDB();

    const campaign = await MarketingCampaign.findOne({
      _id: params.campaignId,
      clinicId: session.user.id
    });

    if (!campaign) {
      return NextResponse.json({
        error: 'Campaña no encontrada'
      }, { status: 404 });
    }

    if (campaign.status !== 'pending') {
      return NextResponse.json({
        error: 'Solo se pueden ejecutar campañas pendientes'
      }, { status: 400 });
    }

    // Ejecutar campaña en background
    setTimeout(async () => {
      await MarketingService.executeCampaign(params.campaignId);
    }, 1000);

    return NextResponse.json({
      success: true,
      message: 'Campaña en proceso de ejecución',
      data: {
        campaignId: params.campaignId,
        estimatedReach: campaign.targetPatients?.length || 0
      }
    });

  } catch (error: any) {
    console.error('Error executing campaign:', error);
    
    return NextResponse.json({
      error: 'Error interno del servidor',
      details: error.message
    }, { status: 500 });
  }
}
