import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import ClinicAppointmentSlot from '@/lib/models/ClinicAppointmentSlot';

export async function GET(request: NextRequest) {
  try {
    // TODO: Get session and validate dentist
    const session = null;
    
    if (!session?.user || session.user.role !== 'dentist') {
      return NextResponse.json(
        { error: 'Acceso denegado. Solo dentistas pueden acceder.' },
        { status: 403 }
      );
    }

    await connectDB();

    const dentistId = session.user.id;

    // Get all slots for this dentist
    const slots = await ClinicAppointmentSlot.find({ dentist: dentistId })
      .sort({ dayOfWeek: 1, startTime: 1 });

    return NextResponse.json({
      slots: slots.map((slot: any) => ({
        id: slot._id.toString(),
        startTime: slot.startTime,
        endTime: slot.endTime,
        dayOfWeek: slot.dayOfWeek,
        isAvailable: slot.isAvailable,
        service: slot.service,
        duration: slot.duration,
        price: slot.price
      }))
    });

  } catch (error) {
    console.error('Error fetching dentist slots:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
