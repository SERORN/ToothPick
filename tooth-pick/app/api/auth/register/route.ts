import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import dbConnect from '@/lib/db';
import User from '@/lib/models/User';
import { RewardService } from '@/lib/services/RewardService';

export async function POST(req: NextRequest) {
  await dbConnect();

  try {
    const { name, email, password, role, referralCode } = await req.json();

    if (!name || !email || !password || !role) {
      return NextResponse.json({ error: 'Todos los campos son obligatorios.' }, { status: 400 });
    }

    const userExists = await User.findOne({ email });

    if (userExists) {
      return NextResponse.json({ error: 'El usuario ya existe.' }, { status: 409 });
    }

    // Validar código de referido si se proporciona
    let referrer = null;
    if (referralCode) {
      referrer = await User.findByReferralCode(referralCode);
      if (!referrer) {
        return NextResponse.json({ 
          error: 'Código de referido inválido.' 
        }, { status: 400 });
      }
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const newUser = await User.create({
      name,
      email,
      password: hashedPassword,
      role,
      referredBy: referrer?._id,
    });

    // Crear relación de referido si aplica
    if (referrer) {
      try {
        await RewardService.createReferral(referrer._id.toString(), newUser._id.toString());
      } catch (referralError) {
        console.error('Error creando referido:', referralError);
        // No fallar el registro por error de referido
      }
    }

    return NextResponse.json({ 
      message: 'Usuario registrado con éxito.', 
      user: newUser,
      referralBonus: referrer ? 'Referido procesado correctamente' : null
    }, { status: 201 });
  } catch (error) {
    console.error('Error en registro:', error);
    return NextResponse.json({ error: 'Error interno del servidor.' }, { status: 500 });
  }
}
