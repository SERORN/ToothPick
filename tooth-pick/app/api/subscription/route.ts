import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import ClinicSubscription from '@/lib/models/ClinicSubscription';
import { SubscriptionPlanUtils, PlanId } from '@/lib/config/subscription-plans';

// TODO: Reemplazar con autenticación real
const getSessionUserId = (request: NextRequest): string | null => {
  // Simular usuario para desarrollo
  // En producción, esto vendría de next-auth o JWT
  return 'demo-user-id';
};

/**
 * GET /api/subscription
 * Obtiene la suscripción actual del usuario
 */
export async function GET(request: NextRequest) {
  try {
    const userId = getSessionUserId(request);
    
    if (!userId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }
    
    await connectDB();
    
    let subscription = await ClinicSubscription.findOne({ 
      clinicId: userId 
    });
    
    // Si no existe suscripción, crear una gratuita
    if (!subscription) {
      const freePlan = SubscriptionPlanUtils.getPlanById('Free');
      
      subscription = new ClinicSubscription({
        clinicId: userId,
        plan: 'Free',
        status: 'active',
        startedAt: new Date(),
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 año
        pricing: {
          amount: freePlan?.price.monthly || 0,
          currency: 'MXN',
          interval: 'month',
          intervalCount: 1
        },
        features: freePlan?.features,
        history: [{
          action: 'created',
          toPlan: 'Free',
          timestamp: new Date(),
          reason: 'Auto-created free subscription'
        }]
      });
      
      await subscription.save();
    }
    
    // Obtener información detallada del plan
    const planDetails = SubscriptionPlanUtils.getPlanById(subscription.plan);
    const limits = subscription.checkLimits();
    
    return NextResponse.json({
      subscription: {
        id: subscription._id,
        plan: subscription.plan,
        status: subscription.status,
        startedAt: subscription.startedAt,
        expiresAt: subscription.expiresAt,
        trialEndsAt: subscription.trialEndsAt,
        pricing: subscription.pricing,
        features: subscription.features,
        usage: subscription.usage,
        limits: limits,
        planDetails: planDetails
      }
    });
    
  } catch (error) {
    console.error('Error getting subscription:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' }, 
      { status: 500 }
    );
  }
}

/**
 * POST /api/subscription
 * Actualiza el plan de suscripción
 */
export async function POST(request: NextRequest) {
  try {
    const userId = getSessionUserId(request);
    
    if (!userId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }
    
    const { action, planId, metadata } = await request.json();
    
    if (!action) {
      return NextResponse.json({ error: 'Acción requerida' }, { status: 400 });
    }
    
    await connectDB();
    
    let subscription = await ClinicSubscription.findOne({ 
      clinicId: userId 
    });
    
    if (!subscription) {
      return NextResponse.json({ error: 'Suscripción no encontrada' }, { status: 404 });
    }
    
    switch (action) {
      case 'upgrade':
        return await handleUpgrade(subscription, planId, metadata);
      
      case 'downgrade':
        return await handleDowngrade(subscription, planId, metadata);
      
      case 'cancel':
        return await handleCancellation(subscription, metadata);
      
      case 'reactivate':
        return await handleReactivation(subscription, metadata);
      
      default:
        return NextResponse.json({ error: 'Acción no válida' }, { status: 400 });
    }
    
  } catch (error) {
    console.error('Error updating subscription:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' }, 
      { status: 500 }
    );
  }
}

/**
 * Maneja upgrade de plan
 */
async function handleUpgrade(subscription: any, newPlanId: PlanId, metadata: any) {
  const newPlan = SubscriptionPlanUtils.getPlanById(newPlanId);
  
  if (!newPlan) {
    return NextResponse.json({ error: 'Plan no válido' }, { status: 400 });
  }
  
  // Verificar que sea realmente un upgrade
  if (!SubscriptionPlanUtils.isUpgrade(subscription.plan, newPlanId)) {
    return NextResponse.json({ error: 'No es un upgrade válido' }, { status: 400 });
  }
  
  // Calcular fechas
  const now = new Date();
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  
  // Actualizar suscripción
  const oldPlan = subscription.plan;
  subscription.plan = newPlanId;
  subscription.status = 'active';
  subscription.expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 días
  subscription.pricing = {
    amount: newPlan.price.monthly,
    currency: 'MXN',
    interval: 'month',
    intervalCount: 1
  };
  subscription.features = newPlan.features;
  
  // Agregar al historial
  subscription.history.push({
    action: 'upgraded',
    fromPlan: oldPlan,
    toPlan: newPlanId,
    timestamp: now,
    reason: metadata?.reason || 'User upgrade',
    metadata: metadata
  });
  
  await subscription.save();
  
  return NextResponse.json({
    success: true,
    message: `Plan actualizado a ${newPlan.name}`,
    subscription: subscription
  });
}

/**
 * Maneja downgrade de plan
 */
async function handleDowngrade(subscription: any, newPlanId: PlanId, metadata: any) {
  const newPlan = SubscriptionPlanUtils.getPlanById(newPlanId);
  
  if (!newPlan) {
    return NextResponse.json({ error: 'Plan no válido' }, { status: 400 });
  }
  
  // El downgrade se programa para el final del período de facturación
  const oldPlan = subscription.plan;
  subscription.scheduledDowngrade = {
    toPlan: newPlanId,
    effectiveDate: subscription.expiresAt,
    reason: metadata?.reason || 'User downgrade'
  };
  
  // Agregar al historial
  subscription.history.push({
    action: 'downgrade_scheduled',
    fromPlan: oldPlan,
    toPlan: newPlanId,
    timestamp: new Date(),
    reason: metadata?.reason || 'User downgrade scheduled',
    metadata: metadata
  });
  
  await subscription.save();
  
  return NextResponse.json({
    success: true,
    message: `Downgrade programado para ${subscription.expiresAt.toLocaleDateString()}`,
    subscription: subscription
  });
}

/**
 * Maneja cancelación de suscripción
 */
async function handleCancellation(subscription: any, metadata: any) {
  const oldStatus = subscription.status;
  
  // Programar cancelación al final del período
  subscription.status = 'canceling';
  subscription.canceledAt = new Date();
  subscription.cancelReason = metadata?.reason || 'User cancellation';
  
  // Agregar al historial
  subscription.history.push({
    action: 'canceled',
    fromPlan: subscription.plan,
    timestamp: new Date(),
    reason: metadata?.reason || 'User cancellation',
    metadata: metadata
  });
  
  await subscription.save();
  
  return NextResponse.json({
    success: true,
    message: 'Suscripción cancelada. Tendrás acceso hasta el final del período',
    subscription: subscription
  });
}

/**
 * Maneja reactivación de suscripción
 */
async function handleReactivation(subscription: any, metadata: any) {
  if (subscription.status !== 'canceling') {
    return NextResponse.json({ error: 'La suscripción no está cancelada' }, { status: 400 });
  }
  
  // Reactivar suscripción
  subscription.status = 'active';
  subscription.canceledAt = null;
  subscription.cancelReason = null;
  
  // Agregar al historial
  subscription.history.push({
    action: 'reactivated',
    toPlan: subscription.plan,
    timestamp: new Date(),
    reason: metadata?.reason || 'User reactivation',
    metadata: metadata
  });
  
  await subscription.save();
  
  return NextResponse.json({
    success: true,
    message: 'Suscripción reactivada exitosamente',
    subscription: subscription
  });
}
