import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import User from '@/lib/models/User';
import ClinicAppointmentSlot from '@/lib/models/ClinicAppointmentSlot';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  await dbConnect();

  try {
    const dentistId = params.id;

    // Buscar dentista
    const dentist = await User.findOne({
      _id: dentistId,
      role: 'dentist',
      isActive: true,
      subscriptionStatus: { $in: ['active', 'trial'] }
    })
    .select('name email clinicName clinicAddress specialties consultationFee yearsExperience bio profileImageUrl workingHours createdAt')
    .lean();

    if (!dentist) {
      return NextResponse.json({ 
        error: 'Dentista no encontrado o no disponible.' 
      }, { status: 404 });
    }

    // Obtener disponibilidad para los próximos 30 días
    const today = new Date();
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    const availableSlots = await ClinicAppointmentSlot.find({
      dentistId: dentistId,
      date: { $gte: today, $lte: thirtyDaysFromNow },
      status: 'available'
    })
    .select('date startTime endTime service duration price')
    .sort({ date: 1, startTime: 1 })
    .lean();

    // Agrupar slots por fecha
    const availabilityByDate: Record<string, any[]> = {};
    availableSlots.forEach(slot => {
      const dateKey = slot.date.toISOString().split('T')[0];
      if (!availabilityByDate[dateKey]) {
        availabilityByDate[dateKey] = [];
      }
      availabilityByDate[dateKey].push({
        id: slot._id,
        startTime: slot.startTime,
        endTime: slot.endTime,
        service: slot.service,
        duration: slot.duration,
        price: slot.price || dentist.consultationFee
      });
    });

    // Obtener estadísticas del dentista
    const stats = await getDentistStats(dentistId);

    // TODO: Obtener reseñas cuando se implemente el sistema
    // const reviews = await getRecentReviews(dentistId);

    // Preparar información de contacto (sin datos privados)
    const publicProfile = {
      id: dentist._id,
      name: dentist.name,
      clinicName: dentist.clinicName,
      clinicAddress: dentist.clinicAddress,
      specialties: dentist.specialties,
      consultationFee: dentist.consultationFee,
      yearsExperience: dentist.yearsExperience,
      bio: dentist.bio,
      profileImageUrl: dentist.profileImageUrl,
      
      // Horarios de trabajo (formato público)
      workingHours: formatWorkingHours(dentist.workingHours),
      
      // Disponibilidad
      availability: availabilityByDate,
      nextAvailableDate: getNextAvailableDate(availableSlots),
      
      // Estadísticas
      stats,
      
      // TODO: Agregar cuando se implemente
      // averageRating: reviews.averageRating,
      // totalReviews: reviews.total,
      // recentReviews: reviews.recent,
      
      joinedDate: dentist.createdAt
    };

    return NextResponse.json({
      dentist: publicProfile
    });

  } catch (error) {
    console.error('Error fetching dentist profile:', error);
    return NextResponse.json({ 
      error: 'Error interno del servidor.' 
    }, { status: 500 });
  }
}

// Función auxiliar para obtener estadísticas del dentista
async function getDentistStats(dentistId: string) {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const [
    totalSlotsAvailable,
    slotsThisWeek,
    totalPatientsServed
  ] = await Promise.all([
    // Total de slots disponibles
    ClinicAppointmentSlot.countDocuments({
      dentistId: dentistId,
      date: { $gte: new Date() },
      status: 'available'
    }),
    
    // Slots disponibles esta semana
    ClinicAppointmentSlot.countDocuments({
      dentistId: dentistId,
      date: { 
        $gte: new Date(),
        $lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      },
      status: 'available'
    }),
    
    // Total de pacientes atendidos (aproximado por citas completadas)
    ClinicAppointmentSlot.countDocuments({
      dentistId: dentistId,
      status: 'reserved' // Asumiendo que reserved = completado
    })
  ]);

  return {
    totalSlotsAvailable,
    slotsThisWeek,
    totalPatientsServed,
    isNewDentist: totalPatientsServed === 0
  };
}

// Función auxiliar para formatear horarios de trabajo
function formatWorkingHours(workingHours: any) {
  if (!workingHours) return null;

  const daysOfWeek = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  const dayLabels: Record<string, string> = {
    monday: 'Lunes',
    tuesday: 'Martes',
    wednesday: 'Miércoles',
    thursday: 'Jueves',
    friday: 'Viernes',
    saturday: 'Sábado',
    sunday: 'Domingo'
  };

  const formattedHours: any[] = [];
  
  daysOfWeek.forEach(day => {
    const daySchedule = workingHours[day];
    if (daySchedule && daySchedule.enabled) {
      formattedHours.push({
        day: dayLabels[day],
        dayKey: day,
        start: daySchedule.start,
        end: daySchedule.end,
        enabled: true
      });
    } else {
      formattedHours.push({
        day: dayLabels[day],
        dayKey: day,
        start: null,
        end: null,
        enabled: false
      });
    }
  });

  return formattedHours;
}

// Función auxiliar para obtener próxima fecha disponible
function getNextAvailableDate(slots: any[]) {
  if (slots.length === 0) return null;

  const nextSlot = slots[0]; // Ya están ordenados por fecha
  return {
    date: nextSlot.date,
    time: nextSlot.startTime,
    service: nextSlot.service
  };
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  // Esta función permitiría actualizar información pública del dentista
  // Por ahora retornamos método no permitido
  return NextResponse.json({ 
    error: 'Actualización de perfil no disponible en esta ruta.' 
  }, { status: 405 });
}
