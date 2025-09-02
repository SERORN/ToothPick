import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import User from '@/lib/models/User';

export async function POST(req: NextRequest) {
  await dbConnect();

  try {
    const { referralCode } = await req.json();

    if (!referralCode) {
      return NextResponse.json({ 
        error: 'Código de referido requerido.' 
      }, { status: 400 });
    }

    const referrer = await User.findByReferralCode(referralCode);

    if (!referrer) {
      return NextResponse.json({ 
        valid: false,
        error: 'Código de referido inválido.' 
      }, { status: 400 });
    }

    return NextResponse.json({
      valid: true,
      referrerName: referrer.name,
      message: `Serás referido por ${referrer.name}. ¡Ambos ganarán 20 puntos!`
    });
  } catch (error) {
    console.error('Error validando código de referido:', error);
    return NextResponse.json({ 
      error: 'Error interno del servidor.' 
    }, { status: 500 });
  }
}
