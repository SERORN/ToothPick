// 💳 FASE 29: Servicio de Stripe para Pagos Internacionales
// ✅ Integración completa con Stripe API

import Stripe from 'stripe';

export interface StripeAccountData {
  stripeAccountId: string;
  publishableKey: string;
}

export interface StripePaymentResult {
  success: boolean;
  paymentLink?: string;
  externalId?: string;
  error?: string;
}

export class StripeService {
  private stripe: Stripe;

  constructor() {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error('STRIPE_SECRET_KEY no está configurado');
    }

    this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2024-06-20',
      typescript: true
    });
  }

  /**
   * 🚀 Crear Payment Intent en Stripe
   */
  async createPaymentIntent(
    amount: number,
    currency: string,
    referenceCode: string,
    accountData: StripeAccountData
  ): Promise<StripePaymentResult> {
    try {
      // Convertir monto a centavos (Stripe requiere enteros)
      const amountInCents = Math.round(amount * 100);

      const paymentIntent = await this.stripe.paymentIntents.create({
        amount: amountInCents,
        currency: currency.toLowerCase(),
        metadata: {
          referenceCode,
          source: 'toothpick'
        },
        description: `Pago ToothPick - ${referenceCode}`,
        automatic_payment_methods: {
          enabled: true,
        },
        // Si es cuenta conectada
        ...(accountData.stripeAccountId && {
          transfer_data: {
            destination: accountData.stripeAccountId,
          },
        }),
      });

      // Crear Checkout Session para UI fácil
      const checkoutSession = await this.stripe.checkout.sessions.create({
        mode: 'payment',
        payment_intent_data: {
          metadata: {
            referenceCode,
            source: 'toothpick'
          }
        },
        line_items: [
          {
            price_data: {
              currency: currency.toLowerCase(),
              product_data: {
                name: `Pago ToothPick - ${referenceCode}`,
                description: 'Pago de servicios dentales'
              },
              unit_amount: amountInCents,
            },
            quantity: 1,
          },
        ],
        success_url: `${process.env.NEXTAUTH_URL}/payments/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${process.env.NEXTAUTH_URL}/payments/cancelled?session_id={CHECKOUT_SESSION_ID}`,
        metadata: {
          referenceCode,
          paymentIntentId: paymentIntent.id
        },
        expires_at: Math.floor(Date.now() / 1000) + (30 * 60), // 30 minutos
        customer_email: undefined, // Se puede agregar si tienes el email
      });

      return {
        success: true,
        paymentLink: checkoutSession.url || undefined,
        externalId: paymentIntent.id
      };

    } catch (error) {
      console.error('Error creando Payment Intent en Stripe:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido en Stripe'
      };
    }
  }

  /**
   * ✅ Verificar estado de pago en Stripe
   */
  async verifyPayment(paymentIntentId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const paymentIntent = await this.stripe.paymentIntents.retrieve(paymentIntentId);

      return {
        success: paymentIntent.status === 'succeeded',
        error: paymentIntent.status === 'succeeded' ? undefined : `Estado: ${paymentIntent.status}`
      };

    } catch (error) {
      console.error('Error verificando pago en Stripe:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error verificando pago'
      };
    }
  }

  /**
   * 💸 Crear reembolso en Stripe
   */
  async createRefund(
    paymentIntentId: string,
    amount: number,
    reason: string
  ): Promise<{ success: boolean; refundId?: string; error?: string }> {
    try {
      const amountInCents = Math.round(amount * 100);

      const refund = await this.stripe.refunds.create({
        payment_intent: paymentIntentId,
        amount: amountInCents,
        reason: 'requested_by_customer',
        metadata: {
          reason,
          source: 'toothpick'
        }
      });

      return {
        success: true,
        refundId: refund.id
      };

    } catch (error) {
      console.error('Error creando reembolso en Stripe:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error procesando reembolso'
      };
    }
  }

  /**
   * 📊 Obtener detalles de una transacción
   */
  async getPaymentDetails(paymentIntentId: string): Promise<Stripe.PaymentIntent | null> {
    try {
      return await this.stripe.paymentIntents.retrieve(paymentIntentId);
    } catch (error) {
      console.error('Error obteniendo detalles de Stripe:', error);
      return null;
    }
  }

  /**
   * 🔗 Crear cuenta conectada (para organizaciones)
   */
  async createConnectedAccount(
    organizationData: {
      email: string;
      businessName: string;
      country: string;
      businessType: 'company' | 'individual';
    }
  ): Promise<{ success: boolean; accountId?: string; onboardingUrl?: string; error?: string }> {
    try {
      const account = await this.stripe.accounts.create({
        type: 'express',
        country: organizationData.country,
        email: organizationData.email,
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
        business_type: organizationData.businessType,
        company: organizationData.businessType === 'company' ? {
          name: organizationData.businessName,
        } : undefined,
        individual: organizationData.businessType === 'individual' ? {
          email: organizationData.email,
        } : undefined,
      });

      // Crear link de onboarding
      const accountLink = await this.stripe.accountLinks.create({
        account: account.id,
        refresh_url: `${process.env.NEXTAUTH_URL}/payments/setup/refresh`,
        return_url: `${process.env.NEXTAUTH_URL}/payments/setup/complete`,
        type: 'account_onboarding',
      });

      return {
        success: true,
        accountId: account.id,
        onboardingUrl: accountLink.url
      };

    } catch (error) {
      console.error('Error creando cuenta conectada:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error creando cuenta'
      };
    }
  }

  /**
   * 📋 Obtener estado de cuenta conectada
   */
  async getAccountStatus(accountId: string): Promise<{
    isActive: boolean;
    chargesEnabled: boolean;
    payoutsEnabled: boolean;
    requirements: string[];
  }> {
    try {
      const account = await this.stripe.accounts.retrieve(accountId);

      return {
        isActive: account.charges_enabled && account.payouts_enabled,
        chargesEnabled: account.charges_enabled,
        payoutsEnabled: account.payouts_enabled,
        requirements: account.requirements?.currently_due || []
      };

    } catch (error) {
      console.error('Error obteniendo estado de cuenta:', error);
      return {
        isActive: false,
        chargesEnabled: false,
        payoutsEnabled: false,
        requirements: ['Error al verificar cuenta']
      };
    }
  }

  /**
   * 🔄 Procesar webhook de Stripe
   */
  async processWebhook(
    payload: string,
    signature: string
  ): Promise<{ success: boolean; event?: Stripe.Event; error?: string }> {
    try {
      if (!process.env.STRIPE_WEBHOOK_SECRET) {
        throw new Error('STRIPE_WEBHOOK_SECRET no está configurado');
      }

      const event = this.stripe.webhooks.constructEvent(
        payload,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET
      );

      return {
        success: true,
        event
      };

    } catch (error) {
      console.error('Error procesando webhook de Stripe:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error en webhook'
      };
    }
  }

  /**
   * 📊 Obtener estadísticas de pagos
   */
  async getPaymentStats(accountId?: string, startDate?: Date, endDate?: Date) {
    try {
      const params: Stripe.BalanceTransactionListParams = {
        limit: 100,
        ...(startDate && { 'created[gte]': Math.floor(startDate.getTime() / 1000) }),
        ...(endDate && { 'created[lte]': Math.floor(endDate.getTime() / 1000) }),
      };

      const transactions = await this.stripe.balanceTransactions.list(
        params,
        accountId ? { stripeAccount: accountId } : undefined
      );

      const stats = transactions.data.reduce((acc, transaction) => {
        const currency = transaction.currency.toUpperCase();
        
        if (!acc[currency]) {
          acc[currency] = {
            totalAmount: 0,
            totalFees: 0,
            count: 0
          };
        }

        acc[currency].totalAmount += transaction.amount / 100;
        acc[currency].totalFees += transaction.fee / 100;
        acc[currency].count += 1;

        return acc;
      }, {} as Record<string, { totalAmount: number; totalFees: number; count: number }>);

      return stats;

    } catch (error) {
      console.error('Error obteniendo estadísticas:', error);
      return {};
    }
  }

  /**
   * 🔍 Buscar transacciones
   */
  async searchTransactions(referenceCode: string): Promise<Stripe.PaymentIntent[]> {
    try {
      const paymentIntents = await this.stripe.paymentIntents.search({
        query: `metadata['referenceCode']:'${referenceCode}'`,
        limit: 10
      });

      return paymentIntents.data;

    } catch (error) {
      console.error('Error buscando transacciones:', error);
      return [];
    }
  }

  /**
   * 🌍 Obtener métodos de pago disponibles por país
   */
  getAvailablePaymentMethods(country: string): string[] {
    const methodsByCountry: Record<string, string[]> = {
      'US': ['card', 'apple_pay', 'google_pay', 'link'],
      'MX': ['card', 'oxxo', 'apple_pay', 'google_pay'],
      'BR': ['card', 'boleto', 'apple_pay', 'google_pay'],
      'AR': ['card', 'apple_pay', 'google_pay'],
      'CO': ['card', 'apple_pay', 'google_pay'],
      'PE': ['card', 'apple_pay', 'google_pay'],
      'CL': ['card', 'apple_pay', 'google_pay'],
      'UY': ['card', 'apple_pay', 'google_pay'],
      'CA': ['card', 'apple_pay', 'google_pay', 'link'],
      'GB': ['card', 'apple_pay', 'google_pay', 'link'],
      'DE': ['card', 'apple_pay', 'google_pay', 'sepa_debit'],
      'FR': ['card', 'apple_pay', 'google_pay', 'sepa_debit'],
      'ES': ['card', 'apple_pay', 'google_pay', 'sepa_debit'],
      'IT': ['card', 'apple_pay', 'google_pay', 'sepa_debit'],
      'NL': ['card', 'apple_pay', 'google_pay', 'ideal'],
    };

    return methodsByCountry[country] || ['card'];
  }

  /**
   * 💱 Obtener tipos de cambio
   */
  async getExchangeRates(baseCurrency: string = 'USD'): Promise<Record<string, number>> {
    try {
      // Stripe no provee tipos de cambio directamente, usar servicio externo
      // Por ahora retornamos rates estáticos como ejemplo
      const staticRates: Record<string, Record<string, number>> = {
        'USD': {
          'MXN': 17.5,
          'EUR': 0.85,
          'GBP': 0.73,
          'CAD': 1.25,
          'BRL': 5.2,
          'JPY': 110
        },
        'MXN': {
          'USD': 0.057,
          'EUR': 0.048,
          'GBP': 0.042
        }
      };

      return staticRates[baseCurrency] || {};

    } catch (error) {
      console.error('Error obteniendo tipos de cambio:', error);
      return {};
    }
  }
}

export default StripeService;
