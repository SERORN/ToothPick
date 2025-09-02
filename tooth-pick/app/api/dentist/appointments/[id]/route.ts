import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Appointment from '@/lib/models/Appointment';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // TODO: Get session and validate dentist
    const session = null;
    
    if (!session?.user || session.user.role !== 'dentist') {
      return NextResponse.json(
        { error: 'Acceso denegado. Solo dentistas pueden acceder.' },
        { status: 403 }
      );
    }

    const { action } = await request.json();
    const appointmentId = params.id;

    if (!['confirm', 'cancel', 'complete'].includes(action)) {
      return NextResponse.json(
        { error: 'Acción no válida' },
        { status: 400 }
      );
    }

    await connectDB();

    // Find and update appointment
    const appointment = await Appointment.findById(appointmentId);
    
    if (!appointment) {
      return NextResponse.json(
        { error: 'Cita no encontrada' },
        { status: 404 }
      );
    }

    // Verify dentist owns this appointment
    if (appointment.dentist.toString() !== session.user.id) {
      return NextResponse.json(
        { error: 'No tienes permiso para modificar esta cita' },
        { status: 403 }
      );
    }

    // Update appointment status based on action
    switch (action) {
      case 'confirm':
        if (appointment.status !== 'pending') {
          return NextResponse.json(
            { error: 'Solo se pueden confirmar citas pendientes' },
            { status: 400 }
          );
        }
        await appointment.confirm();
        break;
        
      case 'cancel':
        if (['completed', 'cancelled'].includes(appointment.status)) {
          return NextResponse.json(
            { error: 'Esta cita no se puede cancelar' },
            { status: 400 }
          );
        }
        await appointment.cancel('Cancelada por el dentista');
        break;
        
      case 'complete':
        if (appointment.status !== 'confirmed') {
          return NextResponse.json(
            { error: 'Solo se pueden completar citas confirmadas' },
            { status: 400 }
          );
        }
        await appointment.complete();
        break;
    }

    return NextResponse.json({
      message: 'Cita actualizada exitosamente',
      appointment: {
        id: appointment._id.toString(),
        status: appointment.status
      }
    });

  } catch (error) {
    console.error('Error updating appointment:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
