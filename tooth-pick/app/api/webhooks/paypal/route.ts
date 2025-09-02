// 🔔 FASE 29: Webhooks para PayPal
// ✅ Procesamiento de eventos de PayPal

import { NextRequest, NextResponse } from 'next/server';
import PaymentTransactionModel from '@/lib/models/PaymentTransaction';
import PaymentService from '@/lib/services/PaymentService';
import crypto from 'crypto';

/**
 * 📨 POST /api/webhooks/paypal
 * Procesar webhooks de PayPal
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const headers = request.headers;

    // Verificar webhook signature de PayPal
    if (!verifyPayPalWebhook(body, headers)) {
      console.error('PayPal webhook signature verification failed');
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 400 }
      );
    }

    const event = JSON.parse(body);
    console.log(`Received PayPal event: ${event.event_type}`);

    // Procesar según tipo de evento
    switch (event.event_type) {
      case 'PAYMENT.CAPTURE.COMPLETED':
        await handlePaymentCaptureCompleted(event);
        break;

      case 'PAYMENT.CAPTURE.DENIED':
        await handlePaymentCaptureDenied(event);
        break;

      case 'PAYMENT.CAPTURE.PENDING':
        await handlePaymentCapturePending(event);
        break;

      case 'CHECKOUT.ORDER.APPROVED':
        await handleCheckoutOrderApproved(event);
        break;

      case 'CHECKOUT.ORDER.COMPLETED':
        await handleCheckoutOrderCompleted(event);
        break;

      case 'PAYMENT.CAPTURE.REFUNDED':
        await handlePaymentCaptureRefunded(event);
        break;

      default:
        console.log(`Unhandled PayPal event type: ${event.event_type}`);
    }

    return NextResponse.json({ received: true });

  } catch (error) {
    console.error('Error processing PayPal webhook:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}

/**
 * 🔐 Verificar firma del webhook de PayPal
 */
function verifyPayPalWebhook(body: string, headers: Headers): boolean {
  try {
    // En producción, implementar verificación real de PayPal webhook
    // usando certificados y validación de firma
    const paypalSignature = headers.get('paypal-auth-algo');
    const paypalCertId = headers.get('paypal-cert-id');
    const paypalTransmissionId = headers.get('paypal-transmission-id');
    const paypalTransmissionTime = headers.get('paypal-transmission-time');

    // Por ahora, verificación mock
    if (!paypalSignature || !paypalCertId) {
      return false;
    }

    // En producción, usar SDK de PayPal para verificar
    return true;
  } catch (error) {
    console.error('Error verifying PayPal webhook:', error);
    return false;
  }
}

/**
 * ✅ Manejar captura de pago completada
 */
async function handlePaymentCaptureCompleted(event: any) {
  try {
    const resource = event.resource;
    const orderId = resource.supplementary_data?.related_ids?.order_id;

    if (!orderId) {
      console.error('No order ID found in PayPal capture event');
      return;
    }

    const payment = await PaymentTransactionModel.findOne({
      externalId: orderId
    });

    if (!payment) {
      console.error(`Payment not found for PayPal order: ${orderId}`);
      return;
    }

    // Actualizar estado del pago
    payment.status = 'completed';
    payment.confirmedAt = new Date();
    payment.metadata = {
      ...payment.metadata,
      paypalCaptureId: resource.id,
      paypalOrderId: orderId
    };

    // Agregar evento
    payment.events.push({
      type: 'payment_completed',
      status: 'completed',
      description: 'Pago capturado exitosamente en PayPal',
      timestamp: new Date(),
      externalData: {
        paypalEventId: event.id,
        captureId: resource.id,
        amount: resource.amount?.value,
        currency: resource.amount?.currency_code
      }
    });

    await payment.save();

    // Notificar al sistema
    const paymentService = new PaymentService();
    // await paymentService.notifyPaymentCompleted(payment._id.toString());

    console.log(`PayPal payment completed: ${payment._id}`);

  } catch (error) {
    console.error('Error handling PayPal payment capture completed:', error);
  }
}

/**
 * ❌ Manejar captura de pago denegada
 */
async function handlePaymentCaptureDenied(event: any) {
  try {
    const resource = event.resource;
    const orderId = resource.supplementary_data?.related_ids?.order_id;

    if (!orderId) {
      console.error('No order ID found in PayPal denied event');
      return;
    }

    const payment = await PaymentTransactionModel.findOne({
      externalId: orderId
    });

    if (!payment) {
      console.error(`Payment not found for PayPal order: ${orderId}`);
      return;
    }

    // Actualizar estado del pago
    payment.status = 'failed';
    
    // Agregar evento
    payment.events.push({
      type: 'payment_failed',
      status: 'failed',
      description: 'Pago denegado por PayPal',
      timestamp: new Date(),
      externalData: {
        paypalEventId: event.id,
        captureId: resource.id,
        reason: 'Payment denied by PayPal'
      }
    });

    await payment.save();

    console.log(`PayPal payment denied: ${payment._id}`);

  } catch (error) {
    console.error('Error handling PayPal payment capture denied:', error);
  }
}

/**
 * ⏳ Manejar captura de pago pendiente
 */
async function handlePaymentCapturePending(event: any) {
  try {
    const resource = event.resource;
    const orderId = resource.supplementary_data?.related_ids?.order_id;

    if (!orderId) {
      console.error('No order ID found in PayPal pending event');
      return;
    }

    const payment = await PaymentTransactionModel.findOne({
      externalId: orderId
    });

    if (!payment) {
      console.error(`Payment not found for PayPal order: ${orderId}`);
      return;
    }

    // Agregar evento
    payment.events.push({
      type: 'payment_pending',
      status: 'processing',
      description: 'Pago pendiente de revisión en PayPal',
      timestamp: new Date(),
      externalData: {
        paypalEventId: event.id,
        captureId: resource.id,
        reason: resource.status_details?.reason
      }
    });

    await payment.save();

    console.log(`PayPal payment pending: ${payment._id}`);

  } catch (error) {
    console.error('Error handling PayPal payment capture pending:', error);
  }
}

/**
 * 👍 Manejar orden aprobada
 */
async function handleCheckoutOrderApproved(event: any) {
  try {
    const resource = event.resource;
    const orderId = resource.id;

    const payment = await PaymentTransactionModel.findOne({
      externalId: orderId
    });

    if (!payment) {
      console.error(`Payment not found for PayPal order: ${orderId}`);
      return;
    }

    // Agregar evento
    payment.events.push({
      type: 'order_approved',
      status: 'processing',
      description: 'Orden aprobada en PayPal',
      timestamp: new Date(),
      externalData: {
        paypalEventId: event.id,
        orderId: resource.id,
        intent: resource.intent
      }
    });

    await payment.save();

    console.log(`PayPal order approved: ${payment._id}`);

  } catch (error) {
    console.error('Error handling PayPal checkout order approved:', error);
  }
}

/**
 * ✅ Manejar orden completada
 */
async function handleCheckoutOrderCompleted(event: any) {
  try {
    const resource = event.resource;
    const orderId = resource.id;

    const payment = await PaymentTransactionModel.findOne({
      externalId: orderId
    });

    if (!payment) {
      console.error(`Payment not found for PayPal order: ${orderId}`);
      return;
    }

    // Agregar evento
    payment.events.push({
      type: 'order_completed',
      status: 'processing',
      description: 'Orden completada en PayPal',
      timestamp: new Date(),
      externalData: {
        paypalEventId: event.id,
        orderId: resource.id,
        status: resource.status
      }
    });

    await payment.save();

    console.log(`PayPal order completed: ${payment._id}`);

  } catch (error) {
    console.error('Error handling PayPal checkout order completed:', error);
  }
}

/**
 * 💸 Manejar reembolso de captura
 */
async function handlePaymentCaptureRefunded(event: any) {
  try {
    const resource = event.resource;
    const captureId = resource.id;

    // Buscar el pago por capture ID
    const payment = await PaymentTransactionModel.findOne({
      'metadata.paypalCaptureId': captureId
    });

    if (!payment) {
      console.error(`Payment not found for PayPal capture: ${captureId}`);
      return;
    }

    // Agregar el reembolso
    const refund = {
      id: resource.id,
      amount: parseFloat(resource.amount?.value || '0'),
      currency: resource.amount?.currency_code || 'USD',
      reason: 'PayPal refund',
      status: 'completed',
      processedAt: new Date(),
      externalId: resource.id,
      metadata: {
        paypalEventId: event.id,
        refundReason: resource.reason_code
      }
    };

    if (!payment.refunds) {
      payment.refunds = [];
    }
    payment.refunds.push(refund);

    // Agregar evento
    payment.events.push({
      type: 'payment_refunded',
      status: 'refunded',
      description: `Reembolso procesado: ${resource.amount?.value} ${resource.amount?.currency_code}`,
      timestamp: new Date(),
      externalData: {
        paypalEventId: event.id,
        refundId: resource.id,
        amount: resource.amount?.value,
        currency: resource.amount?.currency_code
      }
    });

    await payment.save();

    console.log(`PayPal payment refunded: ${payment._id}`);

  } catch (error) {
    console.error('Error handling PayPal payment capture refunded:', error);
  }
}
