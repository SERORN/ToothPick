// 🎯 FASE 31: API - Gestión de Suscripción Individual
// ✅ Endpoints para actualizar, cancelar y reactivar suscripciones

import { NextRequest, NextResponse } from 'next/server';
import { SubscriptionService } from '@/lib/services/SubscriptionService';
import { StripeBillingService } from '@/lib/services/StripeBillingService';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

// Actualizar suscripción (upgrade/downgrade)
export async function PUT(
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
    const body = await request.json();
    const { newPlanId, immediate = false, reason } = body;
    
    if (!newPlanId) {
      return NextResponse.json(
        { error: 'ID del nuevo plan requerido' },
        { status: 400 }
      );
    }
    
    const updatedSubscription = await SubscriptionService.upgradeSubscription({
      subscriptionId,
      newPlanId,
      immediate,
      reason
    });
    
    return NextResponse.json({
      success: true,
      data: {
        subscription: {
          id: updatedSubscription._id,
          status: updatedSubscription.status,
          planId: updatedSubscription.planId,
          amount: updatedSubscription.amount,
          currency: updatedSubscription.currency,
          currentPeriodEnd: updatedSubscription.currentPeriodEnd
        }
      }
    });
    
  } catch (error: any) {
    console.error('Error al actualizar suscripción:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Error interno del servidor'
      },
      { status: 500 }
    );
  }
}

// Cancelar suscripción
export async function DELETE(
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
    const { searchParams } = new URL(request.url);
    const immediate = searchParams.get('immediate') === 'true';
    const reason = searchParams.get('reason');
    
    const canceledSubscription = await SubscriptionService.cancelSubscription(
      subscriptionId,
      immediate,
      reason || undefined
    );
    
    // Si tiene Stripe, cancelar también en Stripe
    if (canceledSubscription.paymentMethod?.type === 'stripe' && 
        (canceledSubscription.paymentMethod as any).stripeSubscriptionId) {
      await StripeBillingService.cancelStripeSubscription(
        (canceledSubscription.paymentMethod as any).stripeSubscriptionId,
        immediate
      );
    }
    
    return NextResponse.json({
      success: true,
      data: {
        subscription: {
          id: canceledSubscription._id,
          status: canceledSubscription.status,
          canceledAt: canceledSubscription.canceledAt,
          endedAt: canceledSubscription.endedAt
        }
      }
    });
    
  } catch (error: any) {
    console.error('Error al cancelar suscripción:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Error interno del servidor'
      },
      { status: 500 }
    );
  }
}
