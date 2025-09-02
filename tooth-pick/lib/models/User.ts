import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
  _id: string;
  name: string;
  email: string;
  password: string;
  role: 'admin' | 'provider' | 'distributor' | 'customer' | 'dentist' | 'patient';
  isActive: boolean;
  
  // 🌐 CONFIGURACIÓN DE LOCALIZACIÓN E INTERNACIONALIZACIÓN
  preferredLanguage: 'es' | 'en' | 'pt' | 'de';
  preferredCurrency: 'MXN' | 'USD' | 'BRL' | 'ARS' | 'COP' | 'CLP' | 'EUR';
  timezone: string;
  dateFormat: string;
  numberFormat: {
    decimal: string;
    thousands: string;
  };
  
  // 🏪 CAMPOS PARA DISTRIBUIDORES
  stripeAccountId?: string;
  stripeOnboardingCompleted: boolean;
  businessName?: string;
  businessType?: string;
  taxId?: string;
  businessAddress?: {
    street: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
  bankAccount?: {
    accountNumber: string;
    routingNumber: string;
    accountHolderName: string;
  };
  commission: {
    b2bRate: number;
    b2cRate: number;
  };
  
  // 👨‍⚕️ CAMPOS PARA DENTISTAS
  specialization?: string[];
  licenseNumber?: string;
  experienceYears?: number;
  about?: string;
  education?: {
    degree: string;
    institution: string;
    year: number;
  }[];
  certifications?: {
    name: string;
    institution: string;
    year: number;
    expirationYear?: number;
  }[];
  availableHours?: {
    monday?: { start: string; end: string; };
    tuesday?: { start: string; end: string; };
    wednesday?: { start: string; end: string; };
    thursday?: { start: string; end: string; };
    friday?: { start: string; end: string; };
    saturday?: { start: string; end: string; };
    sunday?: { start: string; end: string; };
  };
  consultationFee?: number;
  acceptsInsurance?: boolean;
  languages?: string[];
  profileImage?: string;
  clinicAddress?: {
    name: string;
    street: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
    phone?: string;
  };
  
  // 🔒 AUTENTICACIÓN Y SEGURIDAD
  emailVerified: boolean;
  phoneVerified: boolean;
  twoFactorEnabled: boolean;
  lastLogin?: Date;
  resetPasswordToken?: string;
  resetPasswordExpires?: Date;
  emailVerificationToken?: string;
  emailVerificationExpires?: Date;
  
  // 🎯 GAMIFICACIÓN Y FIDELIZACIÓN
  loyaltyTier: 'bronze' | 'silver' | 'gold' | 'platinum';
  rewardPoints: number;
  totalSpent: number;
  referralCode: string;
  referredBy?: string;
  referralRewardsEarned: number;
  gameProfile?: {
    level: number;
    experience: number;
    badges: string[];
    achievements: string[];
    streaks: {
      login: number;
      purchase: number;
      review: number;
    };
  };
  
  // 📊 ANALYTICS Y COMPORTAMIENTO
  lastActiveAt?: Date;
  accountCreatedAt: Date;
  profileCompleteness: number;
  preferences?: {
    notifications: {
      email: boolean;
      sms: boolean;
      push: boolean;
      marketing: boolean;
    };
    privacy: {
      showProfile: boolean;
      allowMessages: boolean;
    };
  };
  
  // 🏆 SUSCRIPCIÓN Y PLAN
  subscriptionPlan: 'free' | 'basic' | 'premium' | 'enterprise';
  subscriptionStatus: 'active' | 'inactive' | 'canceled' | 'past_due';
  subscriptionStartDate?: Date;
  subscriptionEndDate?: Date;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  
  // 📱 METADATA
  metadata?: Record<string, any>;
  tags?: string[];
  notes?: string;
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}const UserSchema: Schema = new Schema<IUser>(
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
    },
    
    // 🚀 SISTEMA DE ONBOARDING GUIADO (FASE 34)
    onboardingStatus: {
      isCompleted: { type: Boolean, default: false },
      currentStep: { type: String, default: 'welcome' },
      completedSteps: [{ type: String }],
      startedAt: { type: Date, default: Date.now },
      completedAt: { type: Date },
      skippedSteps: [{ type: String }],
      lastActiveAt: { type: Date, default: Date.now },
      progressPercentage: { type: Number, default: 0, min: 0, max: 100 }
    },
    
    // 🔐 SISTEMA DE VERIFICACIÓN DE PROVEEDORES/DISTRIBUIDORES (FASE 35)
    verificationStatus: {
      isVerified: { type: Boolean, default: false },
      status: { 
        type: String, 
        enum: ['not_requested', 'pending', 'in_review', 'approved', 'rejected', 'documents_required'],
        default: 'not_requested'
      },
      requestId: { type: String, sparse: true },
      verifiedAt: { type: Date },
      verifiedBy: { type: String },
      rejectionCount: { type: Number, default: 0, min: 0 },
      canSell: { type: Boolean, default: false },
      canReceiveOrders: { type: Boolean, default: false },
      lastVerificationAttempt: { type: Date },
      verificationScore: { type: Number, min: 0, max: 100 }
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
