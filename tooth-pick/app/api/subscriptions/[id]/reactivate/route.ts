// 🎯 FASE 31: API - Reactivar Suscripción
// ✅ Endpoint para reactivar suscripciones canceladas

import { NextRequest, NextResponse } from 'next/server';
import { SubscriptionService } from '@/lib/services/SubscriptionService';
import { StripeBillingService } from '@/lib/services/StripeBillingService';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }
    
    const subscriptionId = params.id;
    
    const reactivatedSubscription = await SubscriptionService.reactivateSubscription(subscriptionId);
    
    // Si tiene Stripe, reactivar también en Stripe
    if (reactivatedSubscription.paymentMethod?.type === 'stripe' && 
        (reactivatedSubscription.paymentMethod as any).stripeSubscriptionId) {
      await StripeBillingService.reactivateStripeSubscription(
        (reactivatedSubscription.paymentMethod as any).stripeSubscriptionId
      );
    }
    
    return NextResponse.json({
      success: true,
      data: {
        subscription: {
          id: reactivatedSubscription._id,
          status: reactivatedSubscription.status,
          planId: reactivatedSubscription.planId,
          currentPeriodEnd: reactivatedSubscription.currentPeriodEnd
        }
      }
    });
    
  } catch (error: any) {
    console.error('Error al reactivar suscripción:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Error interno del servidor'
      },
      { status: 500 }
    );
  }
}
