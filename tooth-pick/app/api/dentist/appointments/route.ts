import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]/route';
import connectDB from '@/lib/db';
import User from '@/lib/models/User';
import Appointment from '@/lib/models/Appointment';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user || session.user.role !== 'dentist') {
      return NextResponse.json(
        { error: 'Acceso denegado. Solo dentistas pueden acceder.' },
        { status: 403 }
      );
    }

    await connectDB();

    // Obtener el dentista
    const dentist = await User.findById(session.user.id);
    if (!dentist) {
      return NextResponse.json(
        { error: 'Dentista no encontrado' },
        { status: 404 }
      );
    }

    // Obtener citas del dentista
    const appointments = await Appointment.find({ dentist: dentist._id })
      .populate('patient', 'name email phone age')
      .populate('dentist', 'name clinicName')
      .sort({ date: 1 });

    return NextResponse.json({ 
      appointments: appointments.map((apt: any) => ({
        id: apt._id.toString(),
        appointmentNumber: apt.appointmentNumber,
        patient: {
          name: apt.patient.name,
          email: apt.patient.email,
          phone: apt.patient.phone,
          age: apt.patient.age
        },
        date: apt.date.toISOString(),
        time: apt.time,
        service: apt.service,
        estimatedCost: apt.estimatedCost,
        status: apt.status,
        reasonForVisit: apt.reasonForVisit,
        symptoms: apt.symptoms,
        notes: apt.notes,
        financing: apt.leaseApplicationId ? {
          amount: apt.estimatedCost,
          status: 'pending' // TODO: Get actual status from lease application
        } : undefined
      }))
    });

  } catch (error) {
    console.error('Error fetching dentist appointments:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
