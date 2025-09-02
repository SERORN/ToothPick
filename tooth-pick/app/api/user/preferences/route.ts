import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import User from '@/lib/models/User';

export async function GET(request: NextRequest) {
  try {
    // TODO: Get session and validate user
    const session = null;
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    await connectDB();

    const user = await User.findById(session.user.id);
    if (!user) {
      return NextResponse.json(
        { error: 'Usuario no encontrado' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      prefersReminderBy: user.prefersReminderBy || 'email',
      reminderHoursBefore: user.reminderHoursBefore || 24,
      acceptsMarketingMessages: user.acceptsMarketingMessages !== false
    });

  } catch (error) {
    console.error('Error fetching user preferences:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    // TODO: Get session and validate user
    const session = null;
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    const { prefersReminderBy, reminderHoursBefore, acceptsMarketingMessages } = await request.json();

    // Validar datos
    if (prefersReminderBy && !['email', 'sms', 'whatsapp'].includes(prefersReminderBy)) {
      return NextResponse.json(
        { error: 'Método de recordatorio inválido' },
        { status: 400 }
      );
    }

    if (reminderHoursBefore && (reminderHoursBefore < 1 || reminderHoursBefore > 168)) {
      return NextResponse.json(
        { error: 'Horas de anticipación inválidas (1-168 horas)' },
        { status: 400 }
      );
    }

    await connectDB();

    const updateData: any = {};
    if (prefersReminderBy !== undefined) updateData.prefersReminderBy = prefersReminderBy;
    if (reminderHoursBefore !== undefined) updateData.reminderHoursBefore = reminderHoursBefore;
    if (acceptsMarketingMessages !== undefined) updateData.acceptsMarketingMessages = acceptsMarketingMessages;

    const user = await User.findByIdAndUpdate(
      session.user.id,
      updateData,
      { new: true }
    );

    if (!user) {
      return NextResponse.json(
        { error: 'Usuario no encontrado' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      message: 'Preferencias actualizadas exitosamente',
      preferences: {
        prefersReminderBy: user.prefersReminderBy,
        reminderHoursBefore: user.reminderHoursBefore,
        acceptsMarketingMessages: user.acceptsMarketingMessages
      }
    });

  } catch (error) {
    console.error('Error updating user preferences:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
