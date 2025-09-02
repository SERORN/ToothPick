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
      
      // Datos específicos de paciente
      birthDate,
      gender,
      
      // Información médica básica (opcional)
      medicalHistory,
      allergies,
      
      // Contacto de emergencia
      emergencyContact,
      
      // Dirección
      address
    } = await req.json();

    // Validaciones básicas
    if (!name || !email || !password) {
      return NextResponse.json({ 
        error: 'Nombre, email y contraseña son requeridos.' 
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

    // Validar fecha de nacimiento si se proporciona
    if (birthDate) {
      const birth = new Date(birthDate);
      const today = new Date();
      const age = today.getFullYear() - birth.getFullYear();
      
      if (age < 0 || age > 120) {
        return NextResponse.json({ 
          error: 'Fecha de nacimiento inválida.' 
        }, { status: 400 });
      }
    }

    // Encriptar contraseña
    const hashedPassword = await bcrypt.hash(password, 12);

    // Crear el paciente
    const newPatient = new User({
      name,
      email: email.toLowerCase(),
      password: hashedPassword,
      role: 'patient',
      phone,
      
      // Datos específicos de paciente
      birthDate: birthDate ? new Date(birthDate) : null,
      gender: gender || null,
      medicalHistory: medicalHistory || [],
      allergies: allergies || [],
      emergencyContact: emergencyContact || null,
      
      // Dirección
      address: address || null
    });

    await newPatient.save();

    // Respuesta exitosa (sin contraseña ni datos sensibles)
    const patientResponse = {
      id: newPatient._id,
      name: newPatient.name,
      email: newPatient.email,
      role: newPatient.role,
      phone: newPatient.phone,
      birthDate: newPatient.birthDate,
      gender: newPatient.gender,
      createdAt: newPatient.createdAt
    };

    return NextResponse.json({
      message: 'Paciente registrado exitosamente. ¡Bienvenido a ToothPick!',
      patient: patientResponse
    }, { status: 201 });

  } catch (error) {
    console.error('Error registering patient:', error);
    return NextResponse.json({ 
      error: 'Error interno del servidor.' 
    }, { status: 500 });
  }
}
