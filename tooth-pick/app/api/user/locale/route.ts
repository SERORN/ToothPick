import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import User from '@/lib/models/User';

// 🌐 GET: Obtener preferencias de localización del usuario
export async function GET(request: NextRequest) {
  try {
    // TODO: Get session and validate user
    const session = null;
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Usuario no autenticado' },
        { status: 401 }
      );
    }

    await connectDB();
    
    const user = await User.findById(session.user.id).select(
      'preferredLanguage preferredCurrency timezone dateFormat numberFormat'
    );

    if (!user) {
      return NextResponse.json(
        { error: 'Usuario no encontrado' },
        { status: 404 }
      );
    }

    const preferences = {
      preferredLanguage: user.preferredLanguage || 'es',
      preferredCurrency: user.preferredCurrency || 'MXN',
      timezone: user.timezone || 'America/Mexico_City',
      dateFormat: user.dateFormat || 'DD/MM/YYYY',
      numberFormat: user.numberFormat || {
        decimal: ',',
        thousands: '.'
      }
    };

    return NextResponse.json({
      success: true,
      preferences
    });

  } catch (error) {
    console.error('Error al obtener preferencias:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// 🌐 PUT: Actualizar preferencias de localización del usuario
export async function PUT(request: NextRequest) {
  try {
    // TODO: Get session and validate user
    const session = null;
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Usuario no autenticado' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const {
      preferredLanguage,
      preferredCurrency,
      timezone,
      dateFormat,
      numberFormat
    } = body;

    // Validaciones
    const validLanguages = ['es', 'en', 'pt', 'de'];
    const validCurrencies = ['MXN', 'USD', 'BRL', 'ARS', 'COP', 'CLP', 'EUR'];

    if (preferredLanguage && !validLanguages.includes(preferredLanguage)) {
      return NextResponse.json(
        { error: 'Idioma no válido' },
        { status: 400 }
      );
    }

    if (preferredCurrency && !validCurrencies.includes(preferredCurrency)) {
      return NextResponse.json(
        { error: 'Moneda no válida' },
        { status: 400 }
      );
    }

    await connectDB();

    const updateData: any = {};
    
    if (preferredLanguage) updateData.preferredLanguage = preferredLanguage;
    if (preferredCurrency) updateData.preferredCurrency = preferredCurrency;
    if (timezone) updateData.timezone = timezone;
    if (dateFormat) updateData.dateFormat = dateFormat;
    if (numberFormat) updateData.numberFormat = numberFormat;

    const updatedUser = await User.findByIdAndUpdate(
      session.user.id,
      updateData,
      { new: true, select: 'preferredLanguage preferredCurrency timezone dateFormat numberFormat' }
    );

    if (!updatedUser) {
      return NextResponse.json(
        { error: 'Usuario no encontrado' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Preferencias actualizadas exitosamente',
      preferences: {
        preferredLanguage: updatedUser.preferredLanguage,
        preferredCurrency: updatedUser.preferredCurrency,
        timezone: updatedUser.timezone,
        dateFormat: updatedUser.dateFormat,
        numberFormat: updatedUser.numberFormat
      }
    });

  } catch (error) {
    console.error('Error al actualizar preferencias:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// 🌐 PATCH: Actualizar preferencia específica
export async function PATCH(request: NextRequest) {
  try {
    // TODO: Get session and validate user
    const session = null;
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Usuario no autenticado' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { field, value } = body;

    const allowedFields = [
      'preferredLanguage', 
      'preferredCurrency', 
      'timezone', 
      'dateFormat'
    ];

    if (!field || !allowedFields.includes(field)) {
      return NextResponse.json(
        { error: 'Campo no válido' },
        { status: 400 }
      );
    }

    // Validaciones específicas
    if (field === 'preferredLanguage') {
      const validLanguages = ['es', 'en', 'pt', 'de'];
      if (!validLanguages.includes(value)) {
        return NextResponse.json(
          { error: 'Idioma no válido' },
          { status: 400 }
        );
      }
    }

    if (field === 'preferredCurrency') {
      const validCurrencies = ['MXN', 'USD', 'BRL', 'ARS', 'COP', 'CLP', 'EUR'];
      if (!validCurrencies.includes(value)) {
        return NextResponse.json(
          { error: 'Moneda no válida' },
          { status: 400 }
        );
      }
    }

    await connectDB();

    const updateData: any = {};
    updateData[field] = value;

    const updatedUser = await User.findByIdAndUpdate(
      session.user.id,
      updateData,
      { new: true, select: field }
    );

    if (!updatedUser) {
      return NextResponse.json(
        { error: 'Usuario no encontrado' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `${field} actualizado exitosamente`,
      [field]: updatedUser[field]
    });

  } catch (error) {
    console.error('Error al actualizar preferencia:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
