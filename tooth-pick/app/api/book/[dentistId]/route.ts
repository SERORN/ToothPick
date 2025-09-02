import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import mongoose from 'mongoose';
import dbConnect from '@/lib/db';
import User from '@/lib/models/User';
import ClinicAppointmentSlot from '@/lib/models/ClinicAppointmentSlot';
import Appointment from '@/lib/models/Appointment';
import LeaseApplication from '@/lib/models/LeaseApplication';

export async function POST(
  req: NextRequest,
  { params }: { params: { dentistId: string } }
) {
  await dbConnect();

  try {
    const session = await getServerSession();
    const dentistId = params.dentistId;

    const {
      slotId,
      treatmentType,
      estimatedCost,
      patientDetails, // Para usuarios no logueados
      reasonForVisit,
      symptoms,
      previousTreatments,
      requiresFinancing, // ToothPay
      emergencyContact
    } = await req.json();

    // Validaciones básicas
    if (!slotId || !treatmentType || !reasonForVisit) {
      return NextResponse.json({ 
        error: 'Slot, tipo de tratamiento y motivo de visita son requeridos.' 
      }, { status: 400 });
    }

    // Verificar que el dentista existe y está activo
    const dentist = await User.findOne({
      _id: dentistId,
      role: 'dentist',
      isActive: true,
      subscriptionStatus: { $in: ['active', 'trial'] }
    });

    if (!dentist) {
      return NextResponse.json({ 
        error: 'Dentista no encontrado o no disponible.' 
      }, { status: 404 });
    }

    // Verificar que el slot existe y está disponible
    const slot = await ClinicAppointmentSlot.findOne({
      _id: slotId,
      dentistId: dentistId,
      status: 'available',
      date: { $gte: new Date() } // Solo slots futuros
    });

    if (!slot) {
      return NextResponse.json({ 
        error: 'El horario seleccionado ya no está disponible.' 
      }, { status: 400 });
    }

    // Determinar información del paciente
    let patientId = null;
    let finalPatientDetails = null;

    if (session?.user) {
      // Usuario logueado
      const loggedUser = await User.findOne({ email: session.user.email });
      
      if (loggedUser && loggedUser.role === 'patient') {
        patientId = loggedUser._id;
        finalPatientDetails = {
          name: loggedUser.name,
          phone: loggedUser.phone || patientDetails?.phone || '',
          email: loggedUser.email,
          age: loggedUser.birthDate ? 
            new Date().getFullYear() - new Date(loggedUser.birthDate).getFullYear() : 
            patientDetails?.age,
          emergencyContact: emergencyContact || loggedUser.emergencyContact
        };
      } else {
        // Usuario logueado pero no es paciente, usar datos del formulario
        finalPatientDetails = patientDetails;
      }
    } else {
      // Usuario no logueado, crear paciente temporal o usar datos del formulario
      if (!patientDetails?.name || !patientDetails?.email || !patientDetails?.phone) {
        return NextResponse.json({ 
          error: 'Información de contacto del paciente es requerida.' 
        }, { status: 400 });
      }
      
      // Verificar si ya existe un paciente con ese email
      const existingPatient = await User.findOne({ 
        email: patientDetails.email,
        role: 'patient' 
      });
      
      if (existingPatient) {
        patientId = existingPatient._id;
        finalPatientDetails = {
          name: existingPatient.name,
          phone: patientDetails.phone,
          email: existingPatient.email,
          age: patientDetails.age,
          emergencyContact: emergencyContact
        };
      } else {
        finalPatientDetails = patientDetails;
      }
    }

    // Validar que el paciente no tenga otra cita en el mismo día
    if (patientId) {
      const sameDay = new Date(slot.date);
      sameDay.setHours(0, 0, 0, 0);
      const nextDay = new Date(sameDay);
      nextDay.setDate(nextDay.getDate() + 1);

      const existingAppointment = await Appointment.findOne({
        patientId: patientId,
        date: { $gte: sameDay, $lt: nextDay },
        status: { $in: ['pending', 'confirmed'] }
      });

      if (existingAppointment) {
        return NextResponse.json({ 
          error: 'Ya tienes una cita programada para este día.' 
        }, { status: 400 });
      }
    }

    // Determinar costo final y si requiere financiamiento
    const finalCost = estimatedCost || slot.price || dentist.consultationFee;
    const needsFinancing = requiresFinancing && finalCost >= 10000;

    // *** TRANSACCIÓN: Reservar slot y crear cita ***
    const session_db = await mongoose.startSession();
    session_db.startTransaction();

    try {
      // 1. Reservar el slot
      const reservedSlot = await ClinicAppointmentSlot.findByIdAndUpdate(
        slotId,
        { 
          status: 'reserved',
          patientId: patientId
        },
        { new: true, session: session_db }
      );

      if (!reservedSlot) {
        throw new Error('No se pudo reservar el slot');
      }

      // 2. Crear la cita
      const newAppointment = new Appointment({
        dentistId: dentistId,
        patientId: patientId,
        slotId: slotId,
        date: slot.date,
        startTime: slot.startTime,
        endTime: slot.endTime,
        service: treatmentType,
        duration: slot.duration,
        status: 'pending',
        patientDetails: finalPatientDetails,
        reasonForVisit,
        symptoms: symptoms || [],
        previousTreatments: previousTreatments || '',
        consultationFee: finalCost,
        estimatedTreatmentCost: finalCost,
        requiresFinancing: needsFinancing
      });

      await newAppointment.save({ session: session_db });

      // 3. Actualizar slot con ID de cita
      await ClinicAppointmentSlot.findByIdAndUpdate(
        slotId,
        { appointmentId: newAppointment._id },
        { session: session_db }
      );

      // 4. Crear solicitud de financiamiento si es necesario
      let leaseApplication = null;
      if (needsFinancing) {
        leaseApplication = new LeaseApplication({
          applicantId: patientId,
          type: 'clinic',
          amount: finalCost,
          term: 12, // 12 meses por defecto
          status: 'pending',
          appointmentId: newAppointment._id,
          dentistId: dentistId,
          notes: `Financiamiento para tratamiento: ${treatmentType}`
        });

        await leaseApplication.save({ session: session_db });

        // Actualizar cita con referencia a financiamiento
        newAppointment.leaseApplicationId = leaseApplication._id;
        await newAppointment.save({ session: session_db });
      }

      await session_db.commitTransaction();

      // TODO: Enviar notificaciones
      // - Email/SMS de confirmación al paciente
      // - Notificación al dentista sobre nueva cita
      // - Si hay ToothPay, notificar al equipo de finanzas

      const response = {
        appointment: {
          id: newAppointment._id,
          appointmentNumber: newAppointment.appointmentNumber,
          dentist: {
            name: dentist.name,
            clinicName: dentist.clinicName,
            clinicAddress: dentist.clinicAddress
          },
          date: newAppointment.date,
          time: `${newAppointment.startTime} - ${newAppointment.endTime}`,
          service: newAppointment.service,
          status: newAppointment.status,
          estimatedCost: finalCost
        },
        financing: leaseApplication ? {
          id: leaseApplication._id,
          amount: leaseApplication.amount,
          term: leaseApplication.term,
          status: leaseApplication.status
        } : null
      };

      return NextResponse.json({
        message: needsFinancing ? 
          'Cita reservada exitosamente. Tu solicitud de financiamiento está siendo procesada.' :
          'Cita reservada exitosamente. Recibirás una confirmación por email.',
        ...response
      }, { status: 201 });

    } catch (transactionError) {
      await session_db.abortTransaction();
      throw transactionError;
    } finally {
      session_db.endSession();
    }

  } catch (error) {
    console.error('Error booking appointment:', error);
    return NextResponse.json({ 
      error: 'Error interno del servidor al reservar la cita.' 
    }, { status: 500 });
  }
}

// Obtener disponibilidad del dentista para la interfaz de reserva
export async function GET(
  req: NextRequest,
  { params }: { params: { dentistId: string } }
) {
  await dbConnect();

  try {
    const dentistId = params.dentistId;
    const { searchParams } = new URL(req.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    // Verificar que el dentista existe
    const dentist = await User.findOne({
      _id: dentistId,
      role: 'dentist',
      isActive: true,
      subscriptionStatus: { $in: ['active', 'trial'] }
    }).select('name clinicName clinicAddress specialties consultationFee profileImageUrl bio');

    if (!dentist) {
      return NextResponse.json({ 
        error: 'Dentista no encontrado.' 
      }, { status: 404 });
    }

    // Fechas por defecto: próximos 14 días
    const defaultStart = new Date();
    const defaultEnd = new Date();
    defaultEnd.setDate(defaultEnd.getDate() + 14);

    const queryStart = startDate ? new Date(startDate) : defaultStart;
    const queryEnd = endDate ? new Date(endDate) : defaultEnd;

    // Obtener slots disponibles
    const availableSlots = await ClinicAppointmentSlot.find({
      dentistId: dentistId,
      status: 'available',
      date: { $gte: queryStart, $lte: queryEnd }
    })
    .select('date startTime endTime service duration price')
    .sort({ date: 1, startTime: 1 })
    .lean();

    // Agrupar por fecha
    const slotsByDate: Record<string, any[]> = {};
    availableSlots.forEach(slot => {
      const dateKey = slot.date.toISOString().split('T')[0];
      if (!slotsByDate[dateKey]) {
        slotsByDate[dateKey] = [];
      }
      slotsByDate[dateKey].push({
        id: slot._id,
        startTime: slot.startTime,
        endTime: slot.endTime,
        service: slot.service,
        duration: slot.duration,
        price: slot.price || dentist.consultationFee
      });
    });

    // Catálogo básico de tratamientos
    const treatments = getTreatmentCatalog();

    return NextResponse.json({
      dentist: {
        id: dentist._id,
        name: dentist.name,
        clinicName: dentist.clinicName,
        clinicAddress: dentist.clinicAddress,
        specialties: dentist.specialties,
        consultationFee: dentist.consultationFee,
        profileImageUrl: dentist.profileImageUrl,
        bio: dentist.bio
      },
      availability: slotsByDate,
      treatments,
      period: {
        startDate: queryStart,
        endDate: queryEnd
      }
    });

  } catch (error) {
    console.error('Error fetching booking data:', error);
    return NextResponse.json({ 
      error: 'Error interno del servidor.' 
    }, { status: 500 });
  }
}

// Catálogo básico de tratamientos
function getTreatmentCatalog() {
  return [
    {
      id: 'consulta_general',
      name: 'Consulta General',
      description: 'Evaluación dental completa',
      estimatedPrice: 500,
      duration: 30,
      requiresFinancing: false
    },
    {
      id: 'limpieza_dental',
      name: 'Limpieza Dental',
      description: 'Profilaxis y limpieza profunda',
      estimatedPrice: 800,
      duration: 45,
      requiresFinancing: false
    },
    {
      id: 'blanqueamiento',
      name: 'Blanqueamiento Dental',
      description: 'Blanqueamiento profesional en consultorio',
      estimatedPrice: 3500,
      duration: 90,
      requiresFinancing: false
    },
    {
      id: 'ortodoncia_consulta',
      name: 'Consulta de Ortodoncia',
      description: 'Evaluación para brackets o alineadores',
      estimatedPrice: 800,
      duration: 45,
      requiresFinancing: false
    },
    {
      id: 'ortodoncia_tratamiento',
      name: 'Tratamiento de Ortodoncia',
      description: 'Brackets metálicos o estéticos',
      estimatedPrice: 25000,
      duration: 120,
      requiresFinancing: true
    },
    {
      id: 'implante_dental',
      name: 'Implante Dental',
      description: 'Implante titanio + corona',
      estimatedPrice: 18000,
      duration: 120,
      requiresFinancing: true
    },
    {
      id: 'endodoncia',
      name: 'Endodoncia',
      description: 'Tratamiento de conducto',
      estimatedPrice: 4500,
      duration: 90,
      requiresFinancing: false
    },
    {
      id: 'extraccion',
      name: 'Extracción',
      description: 'Extracción simple o quirúrgica',
      estimatedPrice: 1200,
      duration: 60,
      requiresFinancing: false
    },
    {
      id: 'carillas',
      name: 'Carillas Dentales',
      description: 'Carillas de porcelana (por pieza)',
      estimatedPrice: 8500,
      duration: 120,
      requiresFinancing: true
    },
    {
      id: 'protesis',
      name: 'Prótesis Dental',
      description: 'Prótesis parcial o total',
      estimatedPrice: 12000,
      duration: 90,
      requiresFinancing: true
    }
  ];
}
