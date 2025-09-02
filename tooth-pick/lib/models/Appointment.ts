import mongoose, { Schema, Document } from 'mongoose';

export interface IAppointment extends Document {
  appointmentNumber: string;      // Número único de cita
  dentistId: mongoose.Types.ObjectId;
  patientId: mongoose.Types.ObjectId;
  slotId: mongoose.Types.ObjectId;
  
  // Información básica de la cita
  date: Date;
  startTime: string;
  endTime: string;
  service: string;
  duration: number;              // Duración en minutos
  
  // Estado y seguimiento
  status: 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled' | 'no_show';
  
  // Información del paciente (puede diferir del perfil si es urgencia)
  patientDetails: {
    name: string;
    phone: string;
    email: string;
    age?: number;
    emergencyContact?: {
      name: string;
      phone: string;
      relationship: string;
    };
  };
  
  // Información médica específica de la cita
  reasonForVisit: string;
  symptoms?: string[];
  previousTreatments?: string;
  
  // Costos y financiamiento
  consultationFee: number;
  estimatedTreatmentCost?: number;
  requiresFinancing?: boolean;    // Si necesita ToothPay
  leaseApplicationId?: mongoose.Types.ObjectId;
  
  // Seguimiento y comunicación
  reminderSent?: boolean;         // Si se envió recordatorio
  reminderSentAt?: Date;
  confirmationMethod?: 'email' | 'sms' | 'whatsapp';
  
  // Sistema de recordatorios automatizado
  reminderStatus: 'pending' | 'sent' | 'failed' | 'not_needed';
  reminderType: 'email' | 'sms' | 'whatsapp';
  reminderTimestamp?: Date;
  reminderAttempts: number;
  lastReminderError?: string;
  
  // Notas y resultados
  dentistNotes?: string;
  treatmentPlan?: string;
  prescriptions?: string[];
  followUpRequired?: boolean;
  followUpDate?: Date;
  
  // Archivos adjuntos
  attachments?: {
    type: 'image' | 'document' | 'xray';
    url: string;
    filename: string;
    uploadedAt: Date;
  }[];
  
  createdAt: Date;
  updatedAt: Date;
}

const AppointmentSchema: Schema = new Schema<IAppointment>(
  {
    appointmentNumber: {
      type: String,
      unique: true,
      required: true
    },
    dentistId: { 
      type: Schema.Types.ObjectId, 
      ref: 'User', 
      required: true,
      index: true
    },
    patientId: { 
      type: Schema.Types.ObjectId, 
      ref: 'User', 
      required: true,
      index: true
    },
    slotId: { 
      type: Schema.Types.ObjectId, 
      ref: 'ClinicAppointmentSlot', 
      required: true
    },
    
    // Información básica
    date: { 
      type: Date, 
      required: true,
      index: true
    },
    startTime: { 
      type: String, 
      required: true 
    },
    endTime: { 
      type: String, 
      required: true 
    },
    service: { 
      type: String, 
      required: true 
    },
    duration: { 
      type: Number, 
      required: true,
      min: 15
    },
    
    // Estado
    status: { 
      type: String, 
      enum: ['pending', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show'],
      default: 'pending',
      index: true
    },
    
    // Información del paciente
    patientDetails: {
      name: { type: String, required: true },
      phone: { type: String, required: true },
      email: { type: String, required: true },
      age: { type: Number, min: 0, max: 150 },
      emergencyContact: {
        name: { type: String },
        phone: { type: String },
        relationship: { type: String }
      }
    },
    
    // Información médica
    reasonForVisit: { 
      type: String, 
      required: true,
      maxlength: 500
    },
    symptoms: [{ type: String }],
    previousTreatments: { type: String, maxlength: 1000 },
    
    // Costos
    consultationFee: { 
      type: Number, 
      required: true, 
      min: 0 
    },
    estimatedTreatmentCost: { 
      type: Number, 
      min: 0 
    },
    requiresFinancing: { 
      type: Boolean, 
      default: false 
    },
    leaseApplicationId: { 
      type: Schema.Types.ObjectId, 
      ref: 'LeaseApplication',
      sparse: true
    },
    
    // Comunicación
    reminderSent: { 
      type: Boolean, 
      default: false 
    },
    reminderSentAt: { type: Date },
    confirmationMethod: { 
      type: String, 
      enum: ['email', 'sms', 'whatsapp'],
      default: 'email'
    },
    
    // Sistema de recordatorios automatizado
    reminderStatus: {
      type: String,
      enum: ['pending', 'sent', 'failed', 'not_needed'],
      default: 'pending',
      index: true
    },
    reminderType: {
      type: String,
      enum: ['email', 'sms', 'whatsapp'],
      default: 'email'
    },
    reminderTimestamp: { type: Date },
    reminderAttempts: {
      type: Number,
      default: 0,
      min: 0
    },
    lastReminderError: { type: String },
    
    // Notas médicas
    dentistNotes: { type: String, maxlength: 2000 },
    treatmentPlan: { type: String, maxlength: 2000 },
    prescriptions: [{ type: String }],
    followUpRequired: { type: Boolean, default: false },
    followUpDate: { type: Date },
    
    // Archivos
    attachments: [{
      type: { 
        type: String, 
        enum: ['image', 'document', 'xray'], 
        required: true 
      },
      url: { type: String, required: true },
      filename: { type: String, required: true },
      uploadedAt: { type: Date, default: Date.now }
    }]
  },
  { 
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Índices para optimizar consultas
AppointmentSchema.index({ dentistId: 1, date: 1, status: 1 });
AppointmentSchema.index({ patientId: 1, status: 1 });
AppointmentSchema.index({ appointmentNumber: 1 });
AppointmentSchema.index({ status: 1, date: 1 });

// Middleware para generar número de cita antes de guardar
AppointmentSchema.pre('save', async function(next) {
  if (!this.appointmentNumber) {
    this.appointmentNumber = await generateAppointmentNumber();
  }
  next();
});

// Virtual para estado legible
AppointmentSchema.virtual('statusText').get(function() {
  const statusTexts: Record<string, string> = {
    'pending': 'Pendiente',
    'confirmed': 'Confirmada',
    'in_progress': 'En Progreso',
    'completed': 'Completada',
    'cancelled': 'Cancelada',
    'no_show': 'No Asistió'
  };
  return statusTexts[this.status] || this.status;
});

// Virtual para formato de fecha y hora
AppointmentSchema.virtual('appointmentDateTime').get(function() {
  return {
    date: this.date.toLocaleDateString('es-MX'),
    time: `${this.startTime} - ${this.endTime}`,
    duration: `${this.duration} minutos`
  };
});

// Virtual para verificar si necesita recordatorio
AppointmentSchema.virtual('needsReminder').get(function() {
  if (this.reminderSent || this.status !== 'confirmed') return false;
  
  const appointmentTime = new Date(this.date);
  const [hours, minutes] = this.startTime.split(':').map(Number);
  appointmentTime.setHours(hours, minutes, 0, 0);
  
  const reminderTime = new Date(appointmentTime);
  reminderTime.setHours(reminderTime.getHours() - 24); // 24 horas antes
  
  return new Date() >= reminderTime;
});

// Método para confirmar cita
AppointmentSchema.methods.confirm = async function() {
  this.status = 'confirmed';
  return await this.save();
};

// Método para cancelar cita
AppointmentSchema.methods.cancel = async function(reason?: string) {
  this.status = 'cancelled';
  if (reason) {
    this.dentistNotes = (this.dentistNotes || '') + `\nCancelada: ${reason}`;
  }
  
  // Liberar el slot
  const ClinicAppointmentSlot = mongoose.model('ClinicAppointmentSlot');
  await ClinicAppointmentSlot.findByIdAndUpdate(this.slotId, {
    status: 'available',
    patientId: null,
    appointmentId: null
  });
  
  return await this.save();
};

// Método para marcar como completada
AppointmentSchema.methods.complete = async function(
  dentistNotes?: string,
  treatmentPlan?: string,
  followUpRequired: boolean = false
) {
  this.status = 'completed';
  if (dentistNotes) this.dentistNotes = dentistNotes;
  if (treatmentPlan) this.treatmentPlan = treatmentPlan;
  this.followUpRequired = followUpRequired;
  
  return await this.save();
};

// Método estático para obtener citas del día
AppointmentSchema.statics.getTodayAppointments = async function(dentistId: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  return await this.find({
    dentistId: dentistId,
    date: { $gte: today, $lt: tomorrow },
    status: { $in: ['confirmed', 'in_progress'] }
  })
  .populate('patientId', 'name email phone')
  .sort({ startTime: 1 });
};

// Método estático para obtener próximas citas que necesitan recordatorio
AppointmentSchema.statics.getAppointmentsNeedingReminder = async function() {
  const now = new Date();
  const in24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  
  return await this.find({
    status: 'confirmed',
    reminderSent: { $ne: true },
    date: { $gte: now, $lte: in24Hours }
  })
  .populate('dentistId', 'name clinicName phone')
  .populate('patientId', 'name email phone');
};

// Función auxiliar para generar número de cita
async function generateAppointmentNumber(): Promise<string> {
  const today = new Date();
  const year = today.getFullYear().toString().slice(-2);
  const month = (today.getMonth() + 1).toString().padStart(2, '0');
  const day = today.getDate().toString().padStart(2, '0');
  
  const datePrefix = `AP${year}${month}${day}`;
  
  // Buscar el último número del día
  const lastAppointment = await mongoose.model('Appointment')
    .findOne({ appointmentNumber: new RegExp(`^${datePrefix}`) })
    .sort({ appointmentNumber: -1 });
  
  let sequence = 1;
  if (lastAppointment) {
    const lastSequence = parseInt(lastAppointment.appointmentNumber.slice(-3));
    sequence = lastSequence + 1;
  }
  
  return `${datePrefix}${sequence.toString().padStart(3, '0')}`;
}

export default mongoose.models.Appointment || 
  mongoose.model<IAppointment>('Appointment', AppointmentSchema);
