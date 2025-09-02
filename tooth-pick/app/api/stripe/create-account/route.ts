import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import dbConnect from '@/lib/db';
import User from '@/lib/models/User';
import { createStripeAccount } from '@/lib/stripe';

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== 'provider') {
      return NextResponse.json({ error: 'Acceso denegado - Solo proveedores' }, { status: 403 });
    }

    await dbConnect();

    // Verificar si el usuario ya tiene una cuenta Stripe
    const user = await User.findById(session.user.id);
    if (!user) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }

    if (user.stripeAccountId) {
      return NextResponse.json({ 
        error: 'Ya tienes una cuenta Stripe conectada',
        accountId: user.stripeAccountId 
      }, { status: 400 });
    }

    const { businessName, country = 'CL' } = await req.json();

    if (!businessName) {
      return NextResponse.json({ error: 'Nombre del negocio es requerido' }, { status: 400 });
    }

    // Crear cuenta Stripe Connect
    const stripeAccount = await createStripeAccount(
      user.email,
      businessName,
      country
    );

    // Actualizar usuario con ID de cuenta Stripe
    await User.findByIdAndUpdate(session.user.id, {
      stripeAccountId: stripeAccount.id,
      stripeOnboardingCompleted: false
    });

    return NextResponse.json({
      success: true,
      accountId: stripeAccount.id,
      message: 'Cuenta Stripe creada exitosamente'
    }, { status: 201 });

  } catch (error) {
    console.error('Error creating Stripe account:', error);
    return NextResponse.json({ 
      error: 'Error al crear cuenta Stripe',
      details: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 });
  }
}
