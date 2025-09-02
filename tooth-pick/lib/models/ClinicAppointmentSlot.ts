import mongoose, { Schema, Document } from 'mongoose';

export interface IClinicAppointmentSlot extends Document {
  dentistId: mongoose.Types.ObjectId;
  date: Date;                    // Fecha del slot
  startTime: string;             // Hora inicio "09:00"
  endTime: string;               // Hora fin "10:00"
  duration: number;              // Duración en minutos
  service: string;               // Tipo de servicio
  chair: string;                 // Sillón/consultorio
  status: 'available' | 'reserved' | 'blocked' | 'cancelled';
  patientId?: mongoose.Types.ObjectId;
  appointmentId?: mongoose.Types.ObjectId;
  price?: number;                // Precio específico del servicio
  notes?: string;                // Notas del dentista
  isRecurring?: boolean;         // Si es un slot recurrente
  recurringPattern?: 'daily' | 'weekly' | 'monthly';
  recurringEndDate?: Date;       // Hasta cuándo se repite
  createdAt: Date;
  updatedAt: Date;
}

const ClinicAppointmentSlotSchema: Schema = new Schema<IClinicAppointmentSlot>(
  {
    dentistId: { 
      type: Schema.Types.ObjectId, 
      ref: 'User', 
      required: true,
      index: true
    },
    date: { 
      type: Date, 
      required: true,
      index: true
    },
    startTime: { 
      type: String, 
      required: true,
      match: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/ // Format HH:MM
    },
    endTime: { 
      type: String, 
      required: true,
      match: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/
    },
    duration: { 
      type: Number, 
      required: true,
      min: 15, // Mínimo 15 minutos
      max: 480 // Máximo 8 horas
    },
    service: { 
      type: String, 
      required: true,
      enum: [
        'consulta_general',
        'limpieza_dental',
        'blanqueamiento',
        'extraccion',
        'endodoncia',
        'ortodoncia_consulta',
        'cirugia_oral',
        'protesis',
        'implante',
        'urgencia',
        'otro'
      ]
    },
    chair: { 
      type: String, 
      required: true,
      default: 'Consultorio 1'
    },
    status: { 
      type: String, 
      enum: ['available', 'reserved', 'blocked', 'cancelled'],
      default: 'available',
      index: true
    },
    patientId: { 
      type: Schema.Types.ObjectId, 
      ref: 'User',
      sparse: true
    },
    appointmentId: { 
      type: Schema.Types.ObjectId, 
      ref: 'Appointment',
      sparse: true
    },
    price: { 
      type: Number, 
      min: 0 
    },
    notes: { 
      type: String, 
      maxlength: 500 
    },
    isRecurring: { 
      type: Boolean, 
      default: false 
    },
    recurringPattern: { 
      type: String, 
      enum: ['daily', 'weekly', 'monthly']
    },
    recurringEndDate: { 
      type: Date 
    }
  },
  { 
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Índices compuestos para mejor rendimiento
ClinicAppointmentSlotSchema.index({ dentistId: 1, date: 1, status: 1 });
ClinicAppointmentSlotSchema.index({ date: 1, startTime: 1 });
ClinicAppointmentSlotSchema.index({ patientId: 1, status: 1 });

// Virtual para generar descripción del servicio
ClinicAppointmentSlotSchema.virtual('serviceDescription').get(function() {
  const serviceNames: Record<string, string> = {
    'consulta_general': 'Consulta General',
    'limpieza_dental': 'Limpieza Dental',
    'blanqueamiento': 'Blanqueamiento',
    'extraccion': 'Extracción',
    'endodoncia': 'Endodoncia',
    'ortodoncia_consulta': 'Consulta de Ortodoncia',
    'cirugia_oral': 'Cirugía Oral',
    'protesis': 'Prótesis',
    'implante': 'Implante',
    'urgencia': 'Urgencia',
    'otro': 'Otro'
  };
  return serviceNames[this.service] || this.service;
});

// Virtual para formato de hora completo
ClinicAppointmentSlotSchema.virtual('timeRange').get(function() {
  return `${this.startTime} - ${this.endTime}`;
});

// Virtual para verificar si está disponible
ClinicAppointmentSlotSchema.virtual('isAvailable').get(function() {
  return this.status === 'available' && this.date >= new Date();
});

// Método para verificar conflictos de horario
ClinicAppointmentSlotSchema.methods.hasConflict = async function(
  dentistId: string, 
  date: Date, 
  startTime: string, 
  endTime: string
) {
  const conflictingSlots = await this.constructor.find({
    dentistId: dentistId,
    date: date,
    status: { $in: ['available', 'reserved'] },
    $or: [
      // Nuevo slot comienza durante slot existente
      { 
        startTime: { $lte: startTime }, 
        endTime: { $gt: startTime } 
      },
      // Nuevo slot termina durante slot existente
      { 
        startTime: { $lt: endTime }, 
        endTime: { $gte: endTime } 
      },
      // Nuevo slot envuelve completamente slot existente
      { 
        startTime: { $gte: startTime }, 
        endTime: { $lte: endTime } 
      }
    ]
  });
  
  return conflictingSlots.length > 0;
};

// Método estático para crear slots recurrentes
ClinicAppointmentSlotSchema.statics.createRecurringSlots = async function(
  slotData: any,
  pattern: 'daily' | 'weekly' | 'monthly',
  endDate: Date
) {
  const slots = [];
  const currentDate = new Date(slotData.date);
  
  while (currentDate <= endDate) {
    // Verificar que no sea domingo (asumiendo que no trabajan domingos)
    if (currentDate.getDay() !== 0) {
      const slot = {
        ...slotData,
        date: new Date(currentDate),
        isRecurring: true,
        recurringPattern: pattern,
        recurringEndDate: endDate
      };
      slots.push(slot);
    }
    
    // Incrementar fecha según patrón
    switch (pattern) {
      case 'daily':
        currentDate.setDate(currentDate.getDate() + 1);
        break;
      case 'weekly':
        currentDate.setDate(currentDate.getDate() + 7);
        break;
      case 'monthly':
        currentDate.setMonth(currentDate.getMonth() + 1);
        break;
    }
  }
  
  return await this.insertMany(slots);
};

// Método estático para obtener disponibilidad de un dentista
ClinicAppointmentSlotSchema.statics.getDentistAvailability = async function(
  dentistId: string,
  startDate: Date,
  endDate: Date
) {
  return await this.find({
    dentistId: dentistId,
    date: { $gte: startDate, $lte: endDate },
    status: 'available'
  })
  .sort({ date: 1, startTime: 1 })
  .populate('dentistId', 'name clinicName consultationFee');
};

// Método estático para reservar slot
ClinicAppointmentSlotSchema.statics.reserveSlot = async function(
  slotId: string,
  patientId: string,
  appointmentId?: string
) {
  const slot = await this.findById(slotId);
  
  if (!slot) {
    throw new Error('Slot no encontrado');
  }
  
  if (slot.status !== 'available') {
    throw new Error('Slot no disponible');
  }
  
  return await this.findByIdAndUpdate(
    slotId,
    {
      status: 'reserved',
      patientId: patientId,
      appointmentId: appointmentId
    },
    { new: true }
  );
};

export default mongoose.models.ClinicAppointmentSlot || 
  mongoose.model<IClinicAppointmentSlot>('ClinicAppointmentSlot', ClinicAppointmentSlotSchema);
