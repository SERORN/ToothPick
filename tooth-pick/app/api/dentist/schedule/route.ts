import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import dbConnect from '@/lib/db';
import User from '@/lib/models/User';
import ClinicAppointmentSlot from '@/lib/models/ClinicAppointmentSlot';

export async function GET(req: NextRequest) {
  await dbConnect();

  try {
    const session = await getServerSession();
    
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });
    }

    const user = await User.findOne({ email: session.user.email });
    if (!user || user.role !== 'dentist') {
      return NextResponse.json({ error: 'Acceso denegado.' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const status = searchParams.get('status');

    // Fechas por defecto: próximos 30 días
    const defaultStart = new Date();
    const defaultEnd = new Date();
    defaultEnd.setDate(defaultEnd.getDate() + 30);

    const queryStart = startDate ? new Date(startDate) : defaultStart;
    const queryEnd = endDate ? new Date(endDate) : defaultEnd;

    // Construir filtro
    const filter: any = {
      dentistId: user._id,
      date: { $gte: queryStart, $lte: queryEnd }
    };

    if (status) {
      filter.status = status;
    }

    // Obtener slots
    const slots = await ClinicAppointmentSlot.find(filter)
      .populate('patientId', 'name email phone')
      .populate('appointmentId')
      .sort({ date: 1, startTime: 1 })
      .lean();

    // Formatear para calendar view
    const formattedSlots = slots.map(slot => ({
      id: slot._id,
      date: slot.date,
      startTime: slot.startTime,
      endTime: slot.endTime,
      duration: slot.duration,
      service: slot.service,
      chair: slot.chair,
      status: slot.status,
      price: slot.price,
      notes: slot.notes,
      patient: slot.patientId ? {
        id: slot.patientId._id,
        name: slot.patientId.name,
        email: slot.patientId.email,
        phone: slot.patientId.phone
      } : null,
      appointment: slot.appointmentId || null,
      isRecurring: slot.isRecurring,
      recurringPattern: slot.recurringPattern
    }));

    // Estadísticas del período
    const stats = {
      totalSlots: slots.length,
      availableSlots: slots.filter(s => s.status === 'available').length,
      reservedSlots: slots.filter(s => s.status === 'reserved').length,
      blockedSlots: slots.filter(s => s.status === 'blocked').length
    };

    return NextResponse.json({
      slots: formattedSlots,
      stats,
      period: {
        startDate: queryStart,
        endDate: queryEnd
      }
    });

  } catch (error) {
    console.error('Error fetching dentist schedule:', error);
    return NextResponse.json({ 
      error: 'Error interno del servidor.' 
    }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  await dbConnect();

  try {
    const session = await getServerSession();
    
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });
    }

    const user = await User.findOne({ email: session.user.email });
    if (!user || user.role !== 'dentist') {
      return NextResponse.json({ error: 'Acceso denegado.' }, { status: 403 });
    }

    const {
      date,
      startTime,
      endTime,
      service,
      chair = 'Consultorio 1',
      price,
      notes,
      isRecurring = false,
      recurringPattern,
      recurringEndDate
    } = await req.json();

    // Validaciones
    if (!date || !startTime || !endTime || !service) {
      return NextResponse.json({ 
        error: 'Fecha, hora de inicio, hora de fin y servicio son requeridos.' 
      }, { status: 400 });
    }

    // Calcular duración
    const start = new Date(`1970-01-01T${startTime}:00`);
    const end = new Date(`1970-01-01T${endTime}:00`);
    const duration = (end.getTime() - start.getTime()) / (1000 * 60); // minutos

    if (duration <= 0) {
      return NextResponse.json({ 
        error: 'La hora de fin debe ser posterior a la hora de inicio.' 
      }, { status: 400 });
    }

    // Verificar conflictos
    const slotDate = new Date(date);
    const existingSlot = await ClinicAppointmentSlot.findOne({
      dentistId: user._id,
      date: slotDate,
      $or: [
        { 
          startTime: { $lte: startTime }, 
          endTime: { $gt: startTime } 
        },
        { 
          startTime: { $lt: endTime }, 
          endTime: { $gte: endTime } 
        },
        { 
          startTime: { $gte: startTime }, 
          endTime: { $lte: endTime } 
        }
      ]
    });

    if (existingSlot) {
      return NextResponse.json({ 
        error: 'Ya existe un slot en ese horario.' 
      }, { status: 400 });
    }

    // Crear slot(s)
    if (isRecurring && recurringPattern && recurringEndDate) {
      // Crear slots recurrentes
      const slots = await ClinicAppointmentSlot.createRecurringSlots(
        {
          dentistId: user._id,
          date: slotDate,
          startTime,
          endTime,
          duration,
          service,
          chair,
          price: price || user.consultationFee,
          notes
        },
        recurringPattern,
        new Date(recurringEndDate)
      );

      return NextResponse.json({
        message: `${slots.length} slots recurrentes creados exitosamente.`,
        slots: slots.map(slot => ({
          id: slot._id,
          date: slot.date,
          startTime: slot.startTime,
          endTime: slot.endTime,
          service: slot.service,
          status: slot.status
        }))
      }, { status: 201 });

    } else {
      // Crear slot único
      const newSlot = new ClinicAppointmentSlot({
        dentistId: user._id,
        date: slotDate,
        startTime,
        endTime,
        duration,
        service,
        chair,
        price: price || user.consultationFee,
        notes,
        status: 'available'
      });

      await newSlot.save();

      return NextResponse.json({
        message: 'Slot creado exitosamente.',
        slot: {
          id: newSlot._id,
          date: newSlot.date,
          startTime: newSlot.startTime,
          endTime: newSlot.endTime,
          service: newSlot.service,
          status: newSlot.status,
          price: newSlot.price
        }
      }, { status: 201 });
    }

  } catch (error) {
    console.error('Error creating appointment slot:', error);
    return NextResponse.json({ 
      error: 'Error interno del servidor.' 
    }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  await dbConnect();

  try {
    const session = await getServerSession();
    
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });
    }

    const user = await User.findOne({ email: session.user.email });
    if (!user || user.role !== 'dentist') {
      return NextResponse.json({ error: 'Acceso denegado.' }, { status: 403 });
    }

    const { slotId, action, ...updateData } = await req.json();

    if (!slotId || !action) {
      return NextResponse.json({ 
        error: 'ID del slot y acción son requeridos.' 
      }, { status: 400 });
    }

    const slot = await ClinicAppointmentSlot.findOne({
      _id: slotId,
      dentistId: user._id
    });

    if (!slot) {
      return NextResponse.json({ 
        error: 'Slot no encontrado.' 
      }, { status: 404 });
    }

    let updatedSlot;

    switch (action) {
      case 'block':
        // Bloquear slot
        updatedSlot = await ClinicAppointmentSlot.findByIdAndUpdate(
          slotId,
          { 
            status: 'blocked',
            notes: updateData.notes || 'Bloqueado por el dentista'
          },
          { new: true }
        );
        break;

      case 'unblock':
        // Desbloquear slot
        updatedSlot = await ClinicAppointmentSlot.findByIdAndUpdate(
          slotId,
          { 
            status: 'available',
            notes: updateData.notes || ''
          },
          { new: true }
        );
        break;

      case 'delete':
        // Eliminar slot (solo si está disponible o bloqueado)
        if (slot.status === 'reserved') {
          return NextResponse.json({ 
            error: 'No se puede eliminar un slot reservado.' 
          }, { status: 400 });
        }
        
        await ClinicAppointmentSlot.findByIdAndDelete(slotId);
        
        return NextResponse.json({
          message: 'Slot eliminado exitosamente.'
        });

      case 'update':
        // Actualizar información del slot
        const allowedUpdates = ['startTime', 'endTime', 'service', 'chair', 'price', 'notes'];
        const updates: any = {};
        
        allowedUpdates.forEach(field => {
          if (updateData[field] !== undefined) {
            updates[field] = updateData[field];
          }
        });

        // Recalcular duración si se actualizan las horas
        if (updates.startTime || updates.endTime) {
          const startTime = updates.startTime || slot.startTime;
          const endTime = updates.endTime || slot.endTime;
          
          const start = new Date(`1970-01-01T${startTime}:00`);
          const end = new Date(`1970-01-01T${endTime}:00`);
          updates.duration = (end.getTime() - start.getTime()) / (1000 * 60);
        }

        updatedSlot = await ClinicAppointmentSlot.findByIdAndUpdate(
          slotId,
          updates,
          { new: true }
        );
        break;

      default:
        return NextResponse.json({ 
          error: 'Acción no válida.' 
        }, { status: 400 });
    }

    return NextResponse.json({
      message: 'Slot actualizado exitosamente.',
      slot: updatedSlot
    });

  } catch (error) {
    console.error('Error updating appointment slot:', error);
    return NextResponse.json({ 
      error: 'Error interno del servidor.' 
    }, { status: 500 });
  }
}
