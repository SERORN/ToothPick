// 🎯 FASE 31: API - Gestión de Suscripciones
// ✅ Endpoints para crear, obtener estado y gestionar suscripciones

import { NextRequest, NextResponse } from 'next/server';
import { SubscriptionService } from '@/lib/services/SubscriptionService';
import { StripeBillingService } from '@/lib/services/StripeBillingService';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

// Obtener estado de suscripción actual
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }
    
    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get('organizationId');
    
    if (!organizationId) {
      return NextResponse.json(
        { error: 'ID de organización requerido' },
        { status: 400 }
      );
    }
    
    const subscriptionStatus = await SubscriptionService.getSubscriptionStatus(
      session.user.id,
      organizationId
    );
    
    return NextResponse.json({
      success: true,
      data: subscriptionStatus
    });
    
  } catch (error: any) {
    console.error('Error al obtener estado de suscripción:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Error interno del servidor',
        details: error.message 
      },
      { status: 500 }
    );
  }
}

// Crear nueva suscripción
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }
    
    const body = await request.json();
    const {
      planId,
      organizationId,
      billingCycle,
      currency,
      paymentMethod = 'stripe',
      requiresCFDI = false,
      fiscalData,
      couponCode,
      successUrl,
      cancelUrl
    } = body;
    
    // Validaciones
    if (!planId || !organizationId || !billingCycle || !currency) {
      return NextResponse.json(
        { error: 'Faltan campos requeridos' },
        { status: 400 }
      );
    }
    
    if (!['monthly', 'annually'].includes(billingCycle)) {
      return NextResponse.json(
        { error: 'Ciclo de facturación inválido' },
        { status: 400 }
      );
    }
    
    if (paymentMethod === 'stripe') {
      // Crear checkout session de Stripe
      if (!successUrl || !cancelUrl) {
        return NextResponse.json(
          { error: 'URLs de éxito y cancelación requeridas para Stripe' },
          { status: 400 }
        );
      }
      
      const checkoutSession = await StripeBillingService.createCheckoutSession({
        planId,
        userId: session.user.id,
        organizationId,
        billingCycle,
        currency,
        customerEmail: session.user.email!,
        customerName: session.user.name || 'Usuario',
        successUrl,
        cancelUrl,
        couponCode,
        metadata: {
          source: 'web_checkout',
          userAgent: request.headers.get('user-agent') || 'unknown'
        }
      });
      
      return NextResponse.json({
        success: true,
        data: {
          checkoutUrl: checkoutSession.url,
          sessionId: checkoutSession.id
        }
      });
      
    } else {
      // Crear suscripción directa (para otros métodos de pago)
      const subscription = await SubscriptionService.createSubscription({
        userId: session.user.id,
        organizationId,
        planId,
        billingCycle,
        currency,
        paymentMethod,
        requiresCFDI,
        fiscalData,
        couponCode,
        source: 'web_direct'
      });
      
      return NextResponse.json({
        success: true,
        data: {
          subscription: {
            id: subscription._id,
            status: subscription.status,
            planId: subscription.planId,
            amount: subscription.amount,
            currency: subscription.currency,
            trialEnd: subscription.trialEnd,
            currentPeriodEnd: subscription.currentPeriodEnd
          }
        }
      });
    }
    
  } catch (error: any) {
    console.error('Error al crear suscripción:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Error interno del servidor'
      },
      { status: 500 }
    );
  }
}
