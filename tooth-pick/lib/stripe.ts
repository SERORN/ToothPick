import Stripe from 'stripe';

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY is not set in environment variables');
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-06-20',
  typescript: true,
});

/**
 * Crear cuenta Stripe Connect para un proveedor
 */
export async function createStripeAccount(
  email: string,
  businessName: string,
  country: string = 'CL'
): Promise<Stripe.Account> {
  try {
    const account = await stripe.accounts.create({
      type: 'express',
      country,
      email,
      business_profile: {
        name: businessName,
        product_description: 'Productos dentales y equipos médicos',
        mcc: '5047', // Medical, dental, ophthalmic, and hospital equipment and supplies
      },
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
    });

    return account;
  } catch (error) {
    console.error('Error creating Stripe account:', error);
    throw error;
  }
}

/**
 * Crear enlace de onboarding para completar configuración de cuenta
 */
export async function createOnboardingLink(
  accountId: string,
  refreshUrl: string,
  returnUrl: string
): Promise<Stripe.AccountLink> {
  try {
    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: refreshUrl,
      return_url: returnUrl,
      type: 'account_onboarding',
    });

    return accountLink;
  } catch (error) {
    console.error('Error creating onboarding link:', error);
    throw error;
  }
}

/**
 * Obtener información de cuenta Stripe
 */
export async function getStripeAccount(accountId: string): Promise<Stripe.Account> {
  try {
    const account = await stripe.accounts.retrieve(accountId);
    return account;
  } catch (error) {
    console.error('Error retrieving Stripe account:', error);
    throw error;
  }
}

/**
 * Verificar si una cuenta está completamente configurada
 */
export async function isAccountFullyOnboarded(accountId: string): Promise<boolean> {
  try {
    const account = await stripe.accounts.retrieve(accountId);
    return account.details_submitted && account.charges_enabled;
  } catch (error) {
    console.error('Error checking account status:', error);
    return false;
  }
}

/**
 * Crear PaymentIntent con split de pagos
 */
export async function createPaymentIntent(
  amount: number, // Monto total en centavos
  currency: string,
  stripeAccountId: string,
  platformFeeAmount: number, // Comisión de ToothPick en centavos
  orderId: string,
  buyerId: string,
  metadata?: Record<string, string>
): Promise<Stripe.PaymentIntent> {
  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency: currency.toLowerCase(),
      application_fee_amount: platformFeeAmount,
      transfer_data: {
        destination: stripeAccountId,
      },
      metadata: {
        orderId,
        buyerId,
        platformFee: platformFeeAmount.toString(),
        ...metadata,
      },
      automatic_payment_methods: {
        enabled: true,
      },
    });

    return paymentIntent;
  } catch (error) {
    console.error('Error creating payment intent:', error);
    throw error;
  }
}

/**
 * Crear Checkout Session con split de pagos
 */
export async function createCheckoutSession(
  amount: number,
  currency: string,
  stripeAccountId: string,
  platformFeeAmount: number,
  orderId: string,
  buyerId: string,
  successUrl: string,
  cancelUrl: string,
  lineItems: Stripe.Checkout.SessionCreateParams.LineItem[]
): Promise<Stripe.Checkout.Session> {
  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_intent_data: {
        application_fee_amount: platformFeeAmount,
        transfer_data: {
          destination: stripeAccountId,
        },
        metadata: {
          orderId,
          buyerId,
          platformFee: platformFeeAmount.toString(),
        },
      },
      line_items: lineItems,
      success_url: successUrl,
      cancel_url: cancelUrl,
      customer_email: undefined, // Se puede agregar email del cliente
      metadata: {
        orderId,
        buyerId,
      },
    });

    return session;
  } catch (error) {
    console.error('Error creating checkout session:', error);
    throw error;
  }
}

/**
 * Verificar webhook signature
 */
export function verifyWebhookSignature(
  body: string,
  signature: string,
  secret: string
): Stripe.Event {
  try {
    return stripe.webhooks.constructEvent(body, signature, secret);
  } catch (error) {
    console.error('Error verifying webhook signature:', error);
    throw error;
  }
}

/**
 * Obtener balance de una cuenta conectada
 */
export async function getAccountBalance(accountId: string): Promise<Stripe.Balance> {
  try {
    const balance = await stripe.balance.retrieve({
      stripeAccount: accountId,
    });
    return balance;
  } catch (error) {
    console.error('Error getting account balance:', error);
    throw error;
  }
}

/**
 * Crear dashboard link para que el proveedor gestione su cuenta
 */
export async function createDashboardLink(accountId: string): Promise<Stripe.LoginLink> {
  try {
    const link = await stripe.accounts.createLoginLink(accountId);
    return link;
  } catch (error) {
    console.error('Error creating dashboard link:', error);
    throw error;
  }
}

export default stripe;
