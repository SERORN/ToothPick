// 🔔 FASE 29: Webhooks para Stripe
// ✅ Procesamiento de eventos de Stripe

import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import PaymentTransactionModel from '@/lib/models/PaymentTransaction';
import PaymentService from '@/lib/services/PaymentService';
import { StripeBillingService } from '@/lib/services/StripeBillingService';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20',
});

const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET!;

/**
 * 📨 POST /api/webhooks/stripe
 * Procesar webhooks de Stripe
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get('stripe-signature');

    if (!signature) {
      console.error('No Stripe signature found');
      return NextResponse.json(
        { error: 'No signature provided' },
        { status: 400 }
      );
    }

    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(body, signature, endpointSecret);
    } catch (err) {
      console.error('Webhook signature verification failed:', err);
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 400 }
      );
    }

    console.log(`Received Stripe event: ${event.type}`);

    // Procesar según tipo de evento
    switch (event.type) {
      case 'payment_intent.succeeded':
        await handlePaymentIntentSucceeded(event.data.object as Stripe.PaymentIntent);
        break;

      case 'payment_intent.payment_failed':
        await handlePaymentIntentFailed(event.data.object as Stripe.PaymentIntent);
        break;

      case 'checkout.session.completed':
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.mode === 'subscription') {
          // Suscripción nueva
          await StripeBillingService.handleCheckoutCompleted(session);
        } else {
          // Pago único
          await handleCheckoutSessionCompleted(session);
        }
        break;

      case 'checkout.session.expired':
        await handleCheckoutSessionExpired(event.data.object as Stripe.Checkout.Session);
        break;

      case 'charge.dispute.created':
        await handleChargeDispute(event.data.object as Stripe.Dispute);
        break;

      case 'invoice.payment_succeeded':
        const successfulInvoice = event.data.object as Stripe.Invoice;
        if (successfulInvoice.subscription) {
          // Pago de suscripción
          await StripeBillingService.handleInvoicePaymentSucceeded(successfulInvoice);
        } else {
          // Pago único
          await handleInvoicePaymentSucceeded(successfulInvoice);
        }
        break;

      case 'invoice.payment_failed':
        const failedInvoice = event.data.object as Stripe.Invoice;
        if (failedInvoice.subscription) {
          // Pago de suscripción fallido
          await StripeBillingService.handleInvoicePaymentFailed(failedInvoice);
        } else {
          // Pago único fallido
          await handleInvoicePaymentFailed(failedInvoice);
        }
        break;

      // Nuevos eventos de suscripciones
      case 'customer.subscription.updated':
        await StripeBillingService.handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
        break;

      case 'customer.subscription.deleted':
        await StripeBillingService.handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;

      case 'customer.subscription.trial_will_end':
        console.log(`Trial ending for subscription: ${(event.data.object as Stripe.Subscription).id}`);
        // Aquí podrías enviar notificaciones de fin de trial
        break;

      case 'invoice.payment_action_required':
        console.log(`Payment action required for invoice: ${(event.data.object as Stripe.Invoice).id}`);
        // Aquí podrías enviar notificaciones de acción requerida
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });

  } catch (error) {
    console.error('Error processing Stripe webhook:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}

/**
 * ✅ Manejar pago exitoso
 */
async function handlePaymentIntentSucceeded(paymentIntent: Stripe.PaymentIntent) {
  try {
    const payment = await PaymentTransactionModel.findOne({
      externalId: paymentIntent.id
    });

    if (!payment) {
      console.error(`Payment not found for Stripe PaymentIntent: ${paymentIntent.id}`);
      return;
    }

    // Actualizar estado del pago
    payment.status = 'completed';
    payment.confirmedAt = new Date();
    payment.metadata = {
      ...payment.metadata,
      stripeChargeId: paymentIntent.latest_charge,
      stripePaymentMethod: paymentIntent.payment_method
    };

    // Agregar evento
    payment.events.push({
      type: 'payment_completed',
      status: 'completed',
      description: 'Pago completado exitosamente',
      timestamp: new Date(),
      externalData: {
        stripeEventId: paymentIntent.id,
        amount: paymentIntent.amount_received,
        currency: paymentIntent.currency
      }
    });

    await payment.save();

    // Notificar al sistema
    const paymentService = new PaymentService();
    await paymentService.notifyPaymentCompleted(payment._id.toString());

    console.log(`Payment completed: ${payment._id}`);

  } catch (error) {
    console.error('Error handling payment_intent.succeeded:', error);
  }
}

/**
 * ❌ Manejar pago fallido
 */
async function handlePaymentIntentFailed(paymentIntent: Stripe.PaymentIntent) {
  try {
    const payment = await PaymentTransactionModel.findOne({
      externalId: paymentIntent.id
    });

    if (!payment) {
      console.error(`Payment not found for Stripe PaymentIntent: ${paymentIntent.id}`);
      return;
    }

    // Actualizar estado del pago
    payment.status = 'failed';
    
    // Agregar evento
    payment.events.push({
      type: 'payment_failed',
      status: 'failed',
      description: paymentIntent.last_payment_error?.message || 'Pago falló',
      timestamp: new Date(),
      externalData: {
        stripeEventId: paymentIntent.id,
        errorCode: paymentIntent.last_payment_error?.code,
        errorType: paymentIntent.last_payment_error?.type
      }
    });

    await payment.save();

    console.log(`Payment failed: ${payment._id}`);

  } catch (error) {
    console.error('Error handling payment_intent.payment_failed:', error);
  }
}

/**
 * 🛒 Manejar sesión de checkout completada
 */
async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
  try {
    const payment = await PaymentTransactionModel.findOne({
      externalId: session.payment_intent as string
    });

    if (!payment) {
      console.error(`Payment not found for Checkout Session: ${session.id}`);
      return;
    }

    // Agregar información de la sesión
    payment.metadata = {
      ...payment.metadata,
      stripeSessionId: session.id,
      customerEmail: session.customer_details?.email
    };

    payment.events.push({
      type: 'checkout_completed',
      status: 'processing',
      description: 'Checkout completado',
      timestamp: new Date(),
      externalData: {
        sessionId: session.id,
        customerEmail: session.customer_details?.email
      }
    });

    await payment.save();

    console.log(`Checkout completed: ${payment._id}`);

  } catch (error) {
    console.error('Error handling checkout.session.completed:', error);
  }
}

/**
 * ⏰ Manejar sesión de checkout expirada
 */
async function handleCheckoutSessionExpired(session: Stripe.Checkout.Session) {
  try {
    const payment = await PaymentTransactionModel.findOne({
      externalId: session.payment_intent as string
    });

    if (!payment) {
      console.error(`Payment not found for expired Checkout Session: ${session.id}`);
      return;
    }

    payment.status = 'expired';
    
    payment.events.push({
      type: 'checkout_expired',
      status: 'expired',
      description: 'Sesión de checkout expirada',
      timestamp: new Date(),
      externalData: {
        sessionId: session.id
      }
    });

    await payment.save();

    console.log(`Checkout expired: ${payment._id}`);

  } catch (error) {
    console.error('Error handling checkout.session.expired:', error);
  }
}

/**
 * ⚖️ Manejar disputa de cargo
 */
async function handleChargeDispute(dispute: Stripe.Dispute) {
  try {
    const payment = await PaymentTransactionModel.findOne({
      'metadata.stripeChargeId': dispute.charge
    });

    if (!payment) {
      console.error(`Payment not found for disputed charge: ${dispute.charge}`);
      return;
    }

    payment.events.push({
      type: 'payment_disputed',
      status: 'disputed',
      description: `Disputa creada: ${dispute.reason}`,
      timestamp: new Date(),
      externalData: {
        disputeId: dispute.id,
        reason: dispute.reason,
        amount: dispute.amount,
        currency: dispute.currency
      }
    });

    await payment.save();

    console.log(`Payment disputed: ${payment._id}, Dispute: ${dispute.id}`);

  } catch (error) {
    console.error('Error handling charge.dispute.created:', error);
  }
}

/**
 * 🧾 Manejar factura pagada exitosamente
 */
async function handleInvoicePaymentSucceeded(invoice: Stripe.Invoice) {
  try {
    console.log(`Invoice payment succeeded: ${invoice.id}`);
    // Implementar lógica para manejar pagos de facturas recurrentes
  } catch (error) {
    console.error('Error handling invoice.payment_succeeded:', error);
  }
}

/**
 * 🧾❌ Manejar factura con pago fallido
 */
async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  try {
    console.log(`Invoice payment failed: ${invoice.id}`);
    // Implementar lógica para manejar fallos en pagos recurrentes
  } catch (error) {
    console.error('Error handling invoice.payment_failed:', error);
  }
}
