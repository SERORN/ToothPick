// 🎯 FASE 31: Servicio de Billing con Stripe
// ✅ Integración completa con Stripe para suscripciones SaaS

import Stripe from 'stripe';
import { connectDB } from '@/lib/db';
import UserSubscription from '@/lib/models/UserSubscription';
import SubscriptionPlan from '@/lib/models/SubscriptionPlan';
import SubscriptionLog from '@/lib/models/SubscriptionLog';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-04-10',
});

export interface CreateCheckoutParams {
  planId: string;
  userId: string;
  organizationId: string;
  billingCycle: 'monthly' | 'annually';
  currency: string;
  customerEmail: string;
  customerName: string;
  successUrl: string;
  cancelUrl: string;
  couponCode?: string;
  metadata?: Record<string, any>;
}

export interface CreateCustomerParams {
  email: string;
  name: string;
  organizationId: string;
  metadata?: Record<string, any>;
}

export class StripeBillingService {
  
  // Crear checkout session para nueva suscripción
  static async createCheckoutSession(params: CreateCheckoutParams): Promise<Stripe.Checkout.Session> {
    await connectDB();
    
    // Obtener plan
    const plan = await SubscriptionPlan.findById(params.planId);
    if (!plan || !plan.isActive) {
      throw new Error('Plan no encontrado o inactivo');
    }
    
    // Obtener precio de Stripe para el plan
    const stripePriceId = plan.stripe[params.billingCycle];
    if (!stripePriceId) {
      throw new Error(`Precio de Stripe no configurado para ${params.billingCycle}`);
    }
    
    // Crear o obtener customer
    const customer = await this.createOrGetCustomer({
      email: params.customerEmail,
      name: params.customerName,
      organizationId: params.organizationId,
      metadata: params.metadata
    });
    
    // Configurar parámetros de checkout
    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      customer: customer.id,
      payment_method_types: ['card'],
      mode: 'subscription',
      line_items: [
        {
          price: stripePriceId,
          quantity: 1,
        },
      ],
      success_url: params.successUrl,
      cancel_url: params.cancelUrl,
      metadata: {
        planId: params.planId,
        userId: params.userId,
        organizationId: params.organizationId,
        billingCycle: params.billingCycle,
        currency: params.currency,
        ...params.metadata
      },
      subscription_data: {
        metadata: {
          planId: params.planId,
          userId: params.userId,
          organizationId: params.organizationId
        },
        trial_period_days: plan.trialDays > 0 ? plan.trialDays : undefined
      },
      allow_promotion_codes: true,
      billing_address_collection: 'required',
      tax_id_collection: {
        enabled: true
      }
    };
    
    // Aplicar cupón si se proporciona
    if (params.couponCode) {
      const coupon = await this.validateCoupon(params.couponCode);
      if (coupon) {
        sessionParams.discounts = [{ coupon: coupon.id }];
      }
    }
    
    return await stripe.checkout.sessions.create(sessionParams);
  }
  
  // Crear o obtener customer de Stripe
  static async createOrGetCustomer(params: CreateCustomerParams): Promise<Stripe.Customer> {
    // Buscar customer existente por email
    const existingCustomers = await stripe.customers.list({
      email: params.email,
      limit: 1
    });
    
    if (existingCustomers.data.length > 0) {
      const customer = existingCustomers.data[0];
      
      // Actualizar metadata si es necesario
      return await stripe.customers.update(customer.id, {
        metadata: {
          organizationId: params.organizationId,
          ...params.metadata
        }
      });
    }
    
    // Crear nuevo customer
    return await stripe.customers.create({
      email: params.email,
      name: params.name,
      metadata: {
        organizationId: params.organizationId,
        ...params.metadata
      }
    });
  }
  
  // Validar cupón de descuento
  static async validateCoupon(couponCode: string): Promise<Stripe.Coupon | null> {
    try {
      const coupon = await stripe.coupons.retrieve(couponCode);
      
      if (!coupon.valid) {
        return null;
      }
      
      // Verificar fechas de validez
      const now = Math.floor(Date.now() / 1000);
      if (coupon.redeem_by && coupon.redeem_by < now) {
        return null;
      }
      
      return coupon;
    } catch (error) {
      return null;
    }
  }
  
  // Manejar webhook de checkout completado
  static async handleCheckoutCompleted(session: Stripe.Checkout.Session) {
    await connectDB();
    
    if (!session.metadata) {
      throw new Error('Metadata no encontrada en la sesión');
    }
    
    const { planId, userId, organizationId, billingCycle, currency } = session.metadata;
    
    // Obtener suscripción de Stripe
    const stripeSubscription = await stripe.subscriptions.retrieve(session.subscription as string);
    
    // Crear suscripción en nuestra base de datos
    const subscription = new UserSubscription({
      userId,
      organizationId,
      planId,
      status: stripeSubscription.status === 'trialing' ? 'trialing' : 'active',
      billingCycle: billingCycle as 'monthly' | 'annually',
      currency: currency,
      amount: stripeSubscription.items.data[0].price.unit_amount! / 100, // Convertir de centavos
      startDate: new Date(stripeSubscription.start_date * 1000),
      currentPeriodStart: new Date(stripeSubscription.current_period_start * 1000),
      currentPeriodEnd: new Date(stripeSubscription.current_period_end * 1000),
      trialEnd: stripeSubscription.trial_end ? new Date(stripeSubscription.trial_end * 1000) : undefined,
      paymentMethod: {
        type: 'stripe',
        stripeCustomerId: session.customer as string,
        stripeSubscriptionId: stripeSubscription.id,
        stripePriceId: stripeSubscription.items.data[0].price.id
      },
      invoicing: {
        requiresCFDI: false, // Se actualizará según preferencias del usuario
        nextInvoiceDate: new Date(stripeSubscription.current_period_end * 1000)
      }
    });
    
    await subscription.save();
    
    // Crear log del evento
    await SubscriptionLog.createLog({
      subscriptionId: subscription._id.toString(),
      userId,
      organizationId,
      event: 'payment_completed',
      eventData: {
        amount: subscription.amount,
        currency: subscription.currency,
        paymentMethod: 'stripe',
        stripeSessionId: session.id,
        stripeSubscriptionId: stripeSubscription.id
      },
      systemData: {
        source: 'stripe_webhook'
      },
      result: {
        success: true
      }
    });
    
    return subscription;
  }
  
  // Manejar webhook de pago de factura
  static async handleInvoicePaymentSucceeded(invoice: Stripe.Invoice) {
    await connectDB();
    
    if (!invoice.subscription) {
      return; // No es una factura de suscripción
    }
    
    // Buscar suscripción por Stripe ID
    const subscription = await UserSubscription.findOne({
      'paymentMethod.stripeSubscriptionId': invoice.subscription
    });
    
    if (!subscription) {
      console.warn(`Suscripción no encontrada para Stripe ID: ${invoice.subscription}`);
      return;
    }
    
    // Actualizar estado de suscripción
    if (subscription.status === 'past_due') {
      subscription.status = 'active';
    }
    
    // Actualizar métricas de pagos
    subscription.metrics.paymentsSucceeded += 1;
    subscription.metrics.totalRevenue += invoice.amount_paid / 100;
    
    await subscription.save();
    
    // Crear log del evento
    await SubscriptionLog.createLog({
      subscriptionId: subscription._id.toString(),
      userId: subscription.userId,
      organizationId: subscription.organizationId,
      event: 'payment_succeeded',
      eventData: {
        amount: invoice.amount_paid / 100,
        currency: invoice.currency.toUpperCase(),
        invoiceId: invoice.id
      },
      systemData: {
        source: 'stripe_webhook'
      },
      result: {
        success: true
      }
    });
  }
  
  // Manejar webhook de pago fallido
  static async handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
    await connectDB();
    
    if (!invoice.subscription) {
      return;
    }
    
    const subscription = await UserSubscription.findOne({
      'paymentMethod.stripeSubscriptionId': invoice.subscription
    });
    
    if (!subscription) {
      return;
    }
    
    // Actualizar estado
    subscription.status = 'past_due';
    subscription.metrics.paymentsFailed += 1;
    
    await subscription.save();
    
    // Crear log del evento
    await SubscriptionLog.createLog({
      subscriptionId: subscription._id.toString(),
      userId: subscription.userId,
      organizationId: subscription.organizationId,
      event: 'payment_failed',
      eventData: {
        amount: invoice.amount_due / 100,
        currency: invoice.currency.toUpperCase(),
        invoiceId: invoice.id,
        failureCode: invoice.last_finalization_error?.code,
        failureMessage: invoice.last_finalization_error?.message
      },
      systemData: {
        source: 'stripe_webhook'
      },
      result: {
        success: false,
        error: invoice.last_finalization_error?.message
      }
    });
  }
  
  // Manejar webhook de suscripción actualizada
  static async handleSubscriptionUpdated(stripeSubscription: Stripe.Subscription) {
    await connectDB();
    
    const subscription = await UserSubscription.findOne({
      'paymentMethod.stripeSubscriptionId': stripeSubscription.id
    });
    
    if (!subscription) {
      return;
    }
    
    // Actualizar datos de la suscripción
    subscription.status = this.mapStripeStatus(stripeSubscription.status);
    subscription.currentPeriodStart = new Date(stripeSubscription.current_period_start * 1000);
    subscription.currentPeriodEnd = new Date(stripeSubscription.current_period_end * 1000);
    subscription.trialEnd = stripeSubscription.trial_end ? new Date(stripeSubscription.trial_end * 1000) : undefined;
    
    // Verificar si cambió el plan
    const currentPriceId = stripeSubscription.items.data[0].price.id;
    if (subscription.paymentMethod.stripePriceId !== currentPriceId) {
      // Buscar el nuevo plan
      const newPlan = await SubscriptionPlan.findOne({
        $or: [
          { 'stripe.monthly': currentPriceId },
          { 'stripe.annually': currentPriceId }
        ]
      });
      
      if (newPlan) {
        const oldPlanId = subscription.planId;
        subscription.planId = newPlan._id.toString();
        subscription.paymentMethod.stripePriceId = currentPriceId;
        subscription.amount = stripeSubscription.items.data[0].price.unit_amount! / 100;
        
        // Crear log del cambio de plan
        await SubscriptionLog.createLog({
          subscriptionId: subscription._id.toString(),
          userId: subscription.userId,
          organizationId: subscription.organizationId,
          event: 'plan_changed',
          eventData: {
            fromPlan: oldPlanId,
            toPlan: newPlan._id.toString(),
            amount: subscription.amount,
            currency: subscription.currency
          },
          systemData: {
            source: 'stripe_webhook'
          },
          result: {
            success: true
          }
        });
      }
    }
    
    await subscription.save();
  }
  
  // Manejar webhook de suscripción cancelada
  static async handleSubscriptionDeleted(stripeSubscription: Stripe.Subscription) {
    await connectDB();
    
    const subscription = await UserSubscription.findOne({
      'paymentMethod.stripeSubscriptionId': stripeSubscription.id
    });
    
    if (!subscription) {
      return;
    }
    
    subscription.status = 'canceled';
    subscription.endedAt = new Date();
    subscription.canceledAt = subscription.canceledAt || new Date();
    
    await subscription.save();
    
    // Crear log del evento
    await SubscriptionLog.createLog({
      subscriptionId: subscription._id.toString(),
      userId: subscription.userId,
      organizationId: subscription.organizationId,
      event: 'canceled',
      eventData: {
        changeReason: 'stripe_cancellation'
      },
      systemData: {
        source: 'stripe_webhook'
      },
      result: {
        success: true
      }
    });
  }
  
  // Cancelar suscripción en Stripe
  static async cancelStripeSubscription(stripeSubscriptionId: string, immediately: boolean = false) {
    if (immediately) {
      return await stripe.subscriptions.cancel(stripeSubscriptionId);
    } else {
      return await stripe.subscriptions.update(stripeSubscriptionId, {
        cancel_at_period_end: true
      });
    }
  }
  
  // Reactivar suscripción en Stripe
  static async reactivateStripeSubscription(stripeSubscriptionId: string) {
    return await stripe.subscriptions.update(stripeSubscriptionId, {
      cancel_at_period_end: false
    });
  }
  
  // Actualizar método de pago
  static async updatePaymentMethod(stripeSubscriptionId: string, paymentMethodId: string) {
    return await stripe.subscriptions.update(stripeSubscriptionId, {
      default_payment_method: paymentMethodId
    });
  }
  
  // Crear portal de cliente para gestión de suscripción
  static async createCustomerPortalSession(customerId: string, returnUrl: string) {
    return await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl
    });
  }
  
  // Obtener próximas facturas
  static async getUpcomingInvoice(stripeSubscriptionId: string) {
    return await stripe.invoices.retrieveUpcoming({
      subscription: stripeSubscriptionId
    });
  }
  
  // Mapear estado de Stripe a nuestro sistema
  static mapStripeStatus(stripeStatus: Stripe.Subscription.Status): string {
    switch (stripeStatus) {
      case 'trialing':
        return 'trialing';
      case 'active':
        return 'active';
      case 'past_due':
        return 'past_due';
      case 'canceled':
      case 'incomplete_expired':
        return 'canceled';
      case 'unpaid':
        return 'past_due';
      default:
        return 'inactive';
    }
  }
  
  // Crear producto y precios en Stripe (para setup inicial)
  static async createStripeProduct(plan: any) {
    // Crear producto
    const product = await stripe.products.create({
      name: plan.name.en,
      description: plan.description.en,
      metadata: {
        planId: plan._id.toString(),
        tier: plan.tier
      }
    });
    
    // Crear precio mensual
    const monthlyPrice = await stripe.prices.create({
      product: product.id,
      unit_amount: Math.round(plan.pricing.monthly.get('USD') * 100),
      currency: 'usd',
      recurring: {
        interval: 'month'
      },
      metadata: {
        planId: plan._id.toString(),
        billingCycle: 'monthly'
      }
    });
    
    // Crear precio anual
    const annualPrice = await stripe.prices.create({
      product: product.id,
      unit_amount: Math.round(plan.pricing.annually.get('USD') * 100),
      currency: 'usd',
      recurring: {
        interval: 'year'
      },
      metadata: {
        planId: plan._id.toString(),
        billingCycle: 'annually'
      }
    });
    
    return {
      productId: product.id,
      monthlyPriceId: monthlyPrice.id,
      annualPriceId: annualPrice.id
    };
  }
}
