import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import dbConnect from '@/lib/db';
import User from '@/lib/models/User';

export async function POST(req: NextRequest) {
  await dbConnect();

  try {
    const {
      // Datos básicos
      name,
      email,
      password,
      phone,
      
      // Datos específicos de dentista
      dentalLicense,
      specialties,
      clinicName,
      clinicAddress,
      consultationFee,
      yearsExperience,
      bio,
      
      // Horarios de trabajo (opcional en registro)
      workingHours,
      
      // Código de referido (opcional)
      referralCode
    } = await req.json();

    // Validaciones básicas
    if (!name || !email || !password) {
      return NextResponse.json({ 
        error: 'Nombre, email y contraseña son requeridos.' 
      }, { status: 400 });
    }

    if (!dentalLicense || !clinicName) {
      return NextResponse.json({ 
        error: 'Cédula profesional y nombre de clínica son requeridos.' 
      }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ 
        error: 'La contraseña debe tener al menos 6 caracteres.' 
      }, { status: 400 });
    }

    // Verificar que el email no esté registrado
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return NextResponse.json({ 
        error: 'Este email ya está registrado.' 
      }, { status: 400 });
    }

    // Verificar que la cédula no esté registrada
    const existingLicense = await User.findOne({ dentalLicense });
    if (existingLicense) {
      return NextResponse.json({ 
        error: 'Esta cédula profesional ya está registrada.' 
      }, { status: 400 });
    }

    // Verificar código de referido si se proporciona
    let referredByUser = null;
    if (referralCode) {
      referredByUser = await User.findByReferralCode(referralCode);
      if (!referredByUser) {
        return NextResponse.json({ 
          error: 'Código de referido inválido.' 
        }, { status: 400 });
      }
    }

    // Encriptar contraseña
    const hashedPassword = await bcrypt.hash(password, 12);

    // Preparar horarios por defecto si no se proporcionan
    const defaultWorkingHours = workingHours || {
      monday: { start: '09:00', end: '18:00', enabled: true },
      tuesday: { start: '09:00', end: '18:00', enabled: true },
      wednesday: { start: '09:00', end: '18:00', enabled: true },
      thursday: { start: '09:00', end: '18:00', enabled: true },
      friday: { start: '09:00', end: '18:00', enabled: true },
      saturday: { start: '09:00', end: '14:00', enabled: false },
      sunday: { start: '09:00', end: '14:00', enabled: false }
    };

    // Crear el dentista
    const newDentist = new User({
      name,
      email: email.toLowerCase(),
      password: hashedPassword,
      role: 'dentist',
      phone,
      
      // Datos específicos de dentista
      dentalLicense,
      specialties: specialties || [],
      clinicName,
      clinicAddress,
      consultationFee: consultationFee || 500, // Default 500 MXN
      yearsExperience: yearsExperience || 0,
      bio: bio || '',
      workingHours: defaultWorkingHours,
      
      // Suscripción inicial (trial gratuito)
      subscriptionPlan: 'basic',
      subscriptionStatus: 'trial',
      freeTrialUsed: false,
      
      // Referido
      referredBy: referralCode || null,
      referralRewardClaimed: false
    });

    await newDentist.save();

    // Generar código de referido para el nuevo dentista
    const generatedReferralCode = await User.generateReferralCode(newDentist._id);

    // Si fue referido, otorgar beneficios
    if (referredByUser && referredByUser.role === 'dentist') {
      // TODO: Implementar lógica de recompensa por referido
      // Por ejemplo: 1 mes gratis de suscripción para ambos
      console.log(`Dentista ${newDentist.name} fue referido por ${referredByUser.name}`);
    }

    // Respuesta exitosa (sin contraseña)
    const dentistResponse = {
      id: newDentist._id,
      name: newDentist.name,
      email: newDentist.email,
      role: newDentist.role,
      dentalLicense: newDentist.dentalLicense,
      clinicName: newDentist.clinicName,
      specialties: newDentist.specialties,
      subscriptionPlan: newDentist.subscriptionPlan,
      subscriptionStatus: newDentist.subscriptionStatus,
      referralCode: generatedReferralCode,
      createdAt: newDentist.createdAt
    };

    return NextResponse.json({
      message: 'Dentista registrado exitosamente. ¡Bienvenido a ToothPick!',
      dentist: dentistResponse
    }, { status: 201 });

  } catch (error) {
    console.error('Error registering dentist:', error);
    return NextResponse.json({ 
      error: 'Error interno del servidor.' 
    }, { status: 500 });
  }
}
