import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import User from '@/lib/models/User';
import Appointment from '@/lib/models/Appointment';

export async function GET(request: NextRequest) {
  try {
    // Extract dentist ID from session or request
    const session = null; // TODO: Get session
    
    if (!session?.user || session.user.role !== 'dentist') {
      return NextResponse.json(
        { error: 'Acceso denegado. Solo dentistas pueden acceder.' },
        { status: 403 }
      );
    }

    await connectDB();

    const dentistId = session.user.id;
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfToday = new Date(startOfToday.getTime() + 24 * 60 * 60 * 1000);
    const startOfWeek = new Date(startOfToday.getTime() - startOfToday.getDay() * 24 * 60 * 60 * 1000);
    const endOfWeek = new Date(startOfWeek.getTime() + 7 * 24 * 60 * 60 * 1000);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    // Aggregate statistics
    const [
      todayAppointments,
      weekAppointments,
      monthRevenue,
      totalPatients,
      pendingFinancing
    ] = await Promise.all([
      // Today's appointments
      Appointment.countDocuments({
        dentist: dentistId,
        date: { $gte: startOfToday, $lt: endOfToday },
        status: { $ne: 'cancelled' }
      }),

      // This week's appointments
      Appointment.countDocuments({
        dentist: dentistId,
        date: { $gte: startOfWeek, $lt: endOfWeek },
        status: { $ne: 'cancelled' }
      }),

      // This month's revenue
      Appointment.aggregate([
        {
          $match: {
            dentist: dentistId,
            date: { $gte: startOfMonth, $lt: endOfMonth },
            status: 'completed'
          }
        },
        {
          $group: {
            _id: null,
            total: { $sum: '$estimatedCost' }
          }
        }
      ]).then(result => result[0]?.total || 0),

      // Total unique patients
      Appointment.distinct('patient', { dentist: dentistId }).then(patients => patients.length),

      // Pending financing applications
      Appointment.countDocuments({
        dentist: dentistId,
        leaseApplicationId: { $exists: true, $ne: null }
      })
    ]);

    return NextResponse.json({
      todayAppointments,
      weekAppointments,
      monthRevenue,
      totalPatients,
      pendingFinancing,
      averageRating: 4.8 // TODO: Calculate from reviews
    });

  } catch (error) {
    console.error('Error fetching dentist stats:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
