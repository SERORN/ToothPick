import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import dbConnect from '@/lib/db';
import User from '@/lib/models/User';
import { verifyWebhookSignature } from '@/lib/stripe';
import Stripe from 'stripe';

export async function POST(req: Request) {
  try {
    const body = await req.text();
    const headersList = await headers();
    const signature = headersList.get('stripe-signature');

    if (!signature) {
      return NextResponse.json({ error: 'Firma de webhook faltante' }, { status: 400 });
    }

    // Verificar la firma del webhook
    const event = verifyWebhookSignature(body, signature, process.env.STRIPE_WEBHOOK_SECRET!);

    await dbConnect();

    // Manejar diferentes tipos de eventos
    switch (event.type) {
      case 'account.updated':
        await handleAccountUpdated(event.data.object as Stripe.Account);
        break;
        
      case 'account.application.deauthorized':
        await handleAccountDeauthorized(event.data.object as any);
        break;
        
      default:
        console.log(`Evento no manejado: ${event.type}`);
    }

    return NextResponse.json({ received: true }, { status: 200 });

  } catch (error) {
    console.error('Error processing webhook:', error);
    return NextResponse.json({ 
      error: 'Error procesando webhook',
      details: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 400 });
  }
}

async function handleAccountUpdated(account: Stripe.Account) {
  try {
    // Verificar si la cuenta completó el onboarding
    const onboardingCompleted = account.details_submitted && 
                              account.charges_enabled && 
                              account.payouts_enabled;

    // Actualizar usuario en la base de datos
    const user = await User.findOneAndUpdate(
      { stripeAccountId: account.id },
      { 
        stripeOnboardingCompleted: onboardingCompleted,
        $set: {
          'stripeAccountDetails.chargesEnabled': account.charges_enabled,
          'stripeAccountDetails.payoutsEnabled': account.payouts_enabled,
          'stripeAccountDetails.detailsSubmitted': account.details_submitted
        }
      },
      { new: true, upsert: false }
    );

    if (user) {
      console.log(`Usuario ${user.email} - Onboarding ${onboardingCompleted ? 'completado' : 'pendiente'}`);
    } else {
      console.warn(`No se encontró usuario para cuenta Stripe: ${account.id}`);
    }
  } catch (error) {
    console.error('Error actualizando cuenta:', error);
    throw error;
  }
}

async function handleAccountDeauthorized(data: any) {
  try {
    const accountId = data.account;
    
    // Deshabilitar cuenta en nuestra base de datos
    const user = await User.findOneAndUpdate(
      { stripeAccountId: accountId },
      { 
        stripeOnboardingCompleted: false,
        stripeAccountId: null,
        $unset: { stripeAccountDetails: 1 }
      }
    );

    if (user) {
      console.log(`Cuenta Stripe desautorizada para usuario: ${user.email}`);
    }
  } catch (error) {
    console.error('Error desautorizando cuenta:', error);
    throw error;
  }
}
