import { NextRequest, NextResponse } from 'next/server';
import { SubscriptionPlanUtils, SUBSCRIPTION_PLANS } from '@/lib/config/subscription-plans';

/**
 * GET /api/subscription/plans
 * Obtiene todos los planes de suscripción disponibles
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const includeFeatures = searchParams.get('features') === 'true';
    const currentPlan = searchParams.get('current');
    
    const plans = SUBSCRIPTION_PLANS.map(plan => {
      const planData: any = {
        id: plan.id,
        name: plan.name,
        description: plan.description,
        price: plan.price,
        popular: plan.popular || false
      };
      
      if (includeFeatures) {
        planData.features = plan.features;
      }
      
      // Si se proporciona el plan actual, agregar información de comparación
      if (currentPlan) {
        planData.isUpgrade = SubscriptionPlanUtils.isUpgrade(currentPlan, plan.id);
        planData.isDowngrade = SubscriptionPlanUtils.isUpgrade(plan.id, currentPlan);
        planData.isCurrent = plan.id === currentPlan;
      }
      
      return planData;
    });
    
    return NextResponse.json({
      plans: plans
    });
    
  } catch (error) {
    console.error('Error getting subscription plans:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' }, 
      { status: 500 }
    );
  }
}

/**
 * GET /api/subscription/plans/[planId]
 * Obtiene detalles de un plan específico
 */
export async function planDetails(request: NextRequest, { params }: { params: { planId: string } }) {
  try {
    const { planId } = params;
    
    const plan = SubscriptionPlanUtils.getPlanById(planId);
    
    if (!plan) {
      return NextResponse.json({ error: 'Plan no encontrado' }, { status: 404 });
    }
    
    return NextResponse.json({
      plan: plan,
      features: plan.features,
      pricing: plan.price
    });
    
  } catch (error) {
    console.error('Error getting plan details:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' }, 
      { status: 500 }
    );
  }
}
