import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import dbConnect from '@/lib/db';
import User from '@/lib/models/User';
import { createOnboardingLink } from '@/lib/stripe';

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== 'provider') {
      return NextResponse.json({ error: 'Acceso denegado - Solo proveedores' }, { status: 403 });
    }

    await dbConnect();

    const user = await User.findById(session.user.id);
    if (!user) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }

    if (!user.stripeAccountId) {
      return NextResponse.json({ 
        error: 'Primero debes crear una cuenta Stripe' 
      }, { status: 400 });
    }

    if (user.stripeOnboardingCompleted) {
      return NextResponse.json({ 
        error: 'El onboarding ya está completado' 
      }, { status: 400 });
    }

    const { returnUrl, refreshUrl } = await req.json();

    // URLs por defecto si no se proporcionan
    const defaultReturnUrl = `${process.env.NEXTAUTH_URL}/provider/dashboard`;
    const defaultRefreshUrl = `${process.env.NEXTAUTH_URL}/provider/dashboard`;

    // Generar link de onboarding
    const onboardingLink = await createOnboardingLink(
      user.stripeAccountId,
      returnUrl || defaultReturnUrl,
      refreshUrl || defaultRefreshUrl
    );

    return NextResponse.json({
      success: true,
      onboardingUrl: onboardingLink.url,
      expiresAt: onboardingLink.expires_at,
      message: 'Link de onboarding generado exitosamente'
    }, { status: 200 });

  } catch (error) {
    console.error('Error creating onboarding link:', error);
    return NextResponse.json({ 
      error: 'Error al generar link de onboarding',
      details: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== 'provider') {
      return NextResponse.json({ error: 'Acceso denegado - Solo proveedores' }, { status: 403 });
    }

    await dbConnect();

    const user = await User.findById(session.user.id);
    if (!user) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }

    return NextResponse.json({
      hasStripeAccount: !!user.stripeAccountId,
      onboardingCompleted: user.stripeOnboardingCompleted,
      stripeAccountId: user.stripeAccountId
    }, { status: 200 });

  } catch (error) {
    console.error('Error getting Stripe status:', error);
    return NextResponse.json({ 
      error: 'Error al obtener estado de Stripe'
    }, { status: 500 });
  }
}
