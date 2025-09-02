import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
  name: string;
  email: string;
  password: string;
  role: 'admin' | 'provider' | 'distributor' | 'customer' | 'dentist' | 'patient';
  isActive: boolean;
  
  // 🌐 CONFIGURACIÓN DE LOCALIZACIÓN E INTERNACIONALIZACIÓN
  preferredLanguage?: 'es' | 'en' | 'pt' | 'de';
  preferredCurrency?: 'MXN' | 'USD' | 'BRL' | 'ARS' | 'COP' | 'CLP' | 'EUR';
  timezone?: string;
  dateFormat?: string;
  numberFormat?: {
    decimal: string;
    thousands: string;
  };
  
  // 🏪 CAMPOS PARA DISTRIBUIDORES
  stripeAccountId?: string;
  stripeOnboardingCompleted?: boolean;
  
  // 🧑‍⚕️ CAMPOS PARA CLIENTES FINALES B2C
  phone?: string;
  address?: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  
  // 🎁 PROGRAMA DE RECOMPENSAS (virtual)
  rewardPoints?: number;
  
  // 👥 SISTEMA DE REFERIDOS
  referralCode?: string;        // Código único para invitar a otros
  referredBy?: string;          // Código del usuario que lo refirió
  referralRewardClaimed?: boolean; // Si ya recibió recompensa por referido
  
  // 🦷 CAMPOS ESPECÍFICOS PARA DENTISTAS
  dentalLicense?: string;       // Cédula profesional
  specialties?: string[];       // Especialidades: ['ortodoncista', 'endodoncista']
  clinicName?: string;          // Nombre de la clínica
  clinicAddress?: string;       // Dirección de la clínica
  consultationFee?: number;     // Precio de consulta base
  yearsExperience?: number;     // Años de experiencia
  bio?: string;                 // Descripción profesional
  profileImageUrl?: string;     // Foto de perfil
  workingHours?: {              // Horario de trabajo
    [key: string]: {            // 'monday', 'tuesday', etc.
      start: string;            // '09:00'
      end: string;              // '18:00'
      enabled: boolean;
    };
  };
  subscriptionPlan?: 'basic' | 'pro' | 'premium'; // Plan SaaS
  subscriptionStatus?: 'active' | 'inactive' | 'trial';
  stripeSubscriptionId?: string;
  freeTrialUsed?: boolean;
  
  // 🧑‍⚕️ CAMPOS ESPECÍFICOS PARA PACIENTES
  birthDate?: Date;             // Fecha de nacimiento
  gender?: 'male' | 'female' | 'other';
  emergencyContact?: {
    name: string;
    phone: string;
    relationship: string;
  };
  medicalHistory?: string[];    // Historial médico relevante
  allergies?: string[];         // Alergias conocidas
  
  // 🔔 PREFERENCIAS DE RECORDATORIOS
  prefersReminderBy: 'email' | 'sms' | 'whatsapp';
  reminderHoursBefore: number;  // Horas antes de la cita para recordatorio
  acceptsMarketingMessages: boolean;
  
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema: Schema = new Schema<IUser>(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: {
      type: String,
      enum: ['admin', 'provider', 'distributor', 'customer', 'dentist', 'patient'],
      required: true,
    },
    isActive: { type: Boolean, default: true },
    
    // 🌐 CONFIGURACIÓN DE LOCALIZACIÓN E INTERNACIONALIZACIÓN
    preferredLanguage: {
      type: String,
      enum: ['es', 'en', 'pt', 'de'],
      default: 'es'
    },
    preferredCurrency: {
      type: String,
      enum: ['MXN', 'USD', 'BRL', 'ARS', 'COP', 'CLP', 'EUR'],
      default: 'MXN'
    },
    timezone: {
      type: String,
      default: 'America/Mexico_City'
    },
    dateFormat: {
      type: String,
      default: 'DD/MM/YYYY'
    },
    numberFormat: {
      decimal: { type: String, default: ',' },
      thousands: { type: String, default: '.' }
    },
    
    // 🏪 CAMPOS PARA DISTRIBUIDORES
    stripeAccountId: { type: String, sparse: true },
    stripeOnboardingCompleted: { type: Boolean, default: false },
    
    // 🧑‍⚕️ CAMPOS PARA CLIENTES FINALES B2C
    phone: { type: String, sparse: true },
    address: {
      street: { type: String },
      city: { type: String },
      state: { type: String },
      zipCode: { type: String },
      country: { type: String, default: 'México' }
    },
    
    // 👥 SISTEMA DE REFERIDOS
    referralCode: { 
      type: String, 
      unique: true, 
      sparse: true,
      index: true
    },
    referredBy: { 
      type: String,
      sparse: true,
      index: true
    },
    referralRewardClaimed: { 
      type: Boolean, 
      default: false 
    },
    
    // 🦷 CAMPOS ESPECÍFICOS PARA DENTISTAS
    dentalLicense: { type: String, sparse: true },
    specialties: [{ type: String }],
    clinicName: { type: String, sparse: true },
    clinicAddress: { type: String, sparse: true },
    consultationFee: { type: Number, min: 0 },
    yearsExperience: { type: Number, min: 0 },
    bio: { type: String, maxlength: 1000 },
    profileImageUrl: { type: String },
    workingHours: {
      monday: { start: String, end: String, enabled: { type: Boolean, default: false } },
      tuesday: { start: String, end: String, enabled: { type: Boolean, default: false } },
      wednesday: { start: String, end: String, enabled: { type: Boolean, default: false } },
      thursday: { start: String, end: String, enabled: { type: Boolean, default: false } },
      friday: { start: String, end: String, enabled: { type: Boolean, default: false } },
      saturday: { start: String, end: String, enabled: { type: Boolean, default: false } },
      sunday: { start: String, end: String, enabled: { type: Boolean, default: false } }
    },
    subscriptionPlan: { 
      type: String, 
      enum: ['basic', 'pro', 'premium'], 
      default: 'basic' 
    },
    subscriptionStatus: { 
      type: String, 
      enum: ['active', 'inactive', 'trial'], 
      default: 'trial' 
    },
    stripeSubscriptionId: { type: String, sparse: true },
    freeTrialUsed: { type: Boolean, default: false },
    
    // 🧑‍⚕️ CAMPOS ESPECÍFICOS PARA PACIENTES
    birthDate: { type: Date },
    gender: { 
      type: String, 
      enum: ['male', 'female', 'other'] 
    },
    emergencyContact: {
      name: { type: String },
      phone: { type: String },
      relationship: { type: String }
    },
    medicalHistory: [{ type: String }],
    allergies: [{ type: String }],
    
    // 🔔 PREFERENCIAS DE RECORDATORIOS
    prefersReminderBy: {
      type: String,
      enum: ['email', 'sms', 'whatsapp'],
      default: 'email'
    },
    reminderHoursBefore: {
      type: Number,
      default: 24,
      min: 1,
      max: 168 // Máximo 7 días
    },
    acceptsMarketingMessages: {
      type: Boolean,
      default: true
    }
  },
  { timestamps: true }
);

// 🎁 VIRTUAL: Puntos de recompensa totales
UserSchema.virtual('rewardPoints', {
  ref: 'RewardPoint',
  localField: '_id',
  foreignField: 'userId',
  justOne: false,
  transform: function(points: any[]) {
    if (!points || points.length === 0) return 0;
    return points.reduce((total, point) => total + point.points, 0);
  }
});

// Asegurar que los virtuals se incluyan en JSON
UserSchema.set('toJSON', { virtuals: true });
UserSchema.set('toObject', { virtuals: true });

// 👥 MÉTODO ESTÁTICO: Generar código de referido único
UserSchema.statics.generateReferralCode = async function(userId: string): Promise<string> {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  let isUnique = false;
  
  while (!isUnique) {
    code = '';
    for (let i = 0; i < 8; i++) {
      code += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    
    // Verificar que el código no exista
    const existingUser = await this.findOne({ referralCode: code });
    if (!existingUser) {
      isUnique = true;
    }
  }
  
  // Actualizar el usuario con el código generado
  await this.findByIdAndUpdate(userId, { referralCode: code });
  return code;
};

// 👥 MÉTODO ESTÁTICO: Obtener usuario por código de referido
UserSchema.statics.findByReferralCode = async function(code: string) {
  return await this.findOne({ referralCode: code.toUpperCase() });
};

export default mongoose.models.User || mongoose.model<IUser>('User', UserSchema);
