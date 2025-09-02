import mongoose, { Schema, Document } from 'mongoose';

export interface IClinicPlan extends Document {
  name: string;                    // 'basic', 'pro', 'premium'
  displayName: string;             // 'Plan Básico', 'Plan Pro', 'Plan Premium'
  description: string;
  price: number;                   // Precio mensual en MXN
  currency: string;
  stripePriceId: string;          // ID del precio en Stripe
  
  // Características y límites
  features: {
    maxAppointmentsPerMonth: number;
    maxPatients: number;
    appointmentReminders: boolean;
    advancedReporting: boolean;
    marketplaceAccess: boolean;
    prioritySupport: boolean;
    customBranding: boolean;
    multiLocation: boolean;
    apiAccess: boolean;
  };
  
  // Configuración
  isActive: boolean;
  sortOrder: number;              // Para ordenar en la UI
  
  // Trial y promociones
  freeTrialDays: number;
  promotionalDiscount?: {
    percentage: number;
    validUntil: Date;
    code?: string;
  };
  
  createdAt: Date;
  updatedAt: Date;
}

const ClinicPlanSchema: Schema = new Schema<IClinicPlan>(
  {
    name: { 
      type: String, 
      required: true, 
      unique: true,
      enum: ['basic', 'pro', 'premium']
    },
    displayName: { 
      type: String, 
      required: true 
    },
    description: { 
      type: String, 
      required: true,
      maxlength: 500
    },
    price: { 
      type: Number, 
      required: true, 
      min: 0 
    },
    currency: { 
      type: String, 
      default: 'MXN' 
    },
    stripePriceId: { 
      type: String, 
      required: true,
      unique: true
    },
    
    // Características
    features: {
      maxAppointmentsPerMonth: { 
        type: Number, 
        required: true, 
        min: 1 
      },
      maxPatients: { 
        type: Number, 
        required: true, 
        min: 1 
      },
      appointmentReminders: { 
        type: Boolean, 
        default: false 
      },
      advancedReporting: { 
        type: Boolean, 
        default: false 
      },
      marketplaceAccess: { 
        type: Boolean, 
        default: false 
      },
      prioritySupport: { 
        type: Boolean, 
        default: false 
      },
      customBranding: { 
        type: Boolean, 
        default: false 
      },
      multiLocation: { 
        type: Boolean, 
        default: false 
      },
      apiAccess: { 
        type: Boolean, 
        default: false 
      }
    },
    
    isActive: { 
      type: Boolean, 
      default: true 
    },
    sortOrder: { 
      type: Number, 
      default: 0 
    },
    freeTrialDays: { 
      type: Number, 
      default: 14 
    },
    
    promotionalDiscount: {
      percentage: { 
        type: Number, 
        min: 0, 
        max: 100 
      },
      validUntil: { type: Date },
      code: { type: String }
    }
  },
  { 
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Índices
ClinicPlanSchema.index({ isActive: 1, sortOrder: 1 });
ClinicPlanSchema.index({ name: 1 });

// Virtual para precio con descuento
ClinicPlanSchema.virtual('discountedPrice').get(function() {
  if (!this.promotionalDiscount || 
      !this.promotionalDiscount.validUntil || 
      this.promotionalDiscount.validUntil < new Date()) {
    return this.price;
  }
  
  const discount = (this.price * this.promotionalDiscount.percentage) / 100;
  return Math.round(this.price - discount);
});

// Virtual para verificar si tiene descuento activo
ClinicPlanSchema.virtual('hasActiveDiscount').get(function() {
  return this.promotionalDiscount && 
         this.promotionalDiscount.validUntil && 
         this.promotionalDiscount.validUntil >= new Date();
});

// Virtual para lista de características formateadas
ClinicPlanSchema.virtual('featureList').get(function() {
  const features = [];
  
  if (this.features.maxAppointmentsPerMonth === -1) {
    features.push('Citas ilimitadas');
  } else {
    features.push(`Hasta ${this.features.maxAppointmentsPerMonth} citas/mes`);
  }
  
  if (this.features.maxPatients === -1) {
    features.push('Pacientes ilimitados');
  } else {
    features.push(`Hasta ${this.features.maxPatients} pacientes`);
  }
  
  if (this.features.appointmentReminders) {
    features.push('Recordatorios automáticos');
  }
  
  if (this.features.advancedReporting) {
    features.push('Reportes avanzados');
  }
  
  if (this.features.marketplaceAccess) {
    features.push('Acceso al marketplace');
  }
  
  if (this.features.prioritySupport) {
    features.push('Soporte prioritario');
  }
  
  if (this.features.customBranding) {
    features.push('Marca personalizada');
  }
  
  if (this.features.multiLocation) {
    features.push('Múltiples ubicaciones');
  }
  
  if (this.features.apiAccess) {
    features.push('Acceso a API');
  }
  
  return features;
});

// Método estático para obtener planes activos
ClinicPlanSchema.statics.getActivePlans = async function() {
  return await this.find({ isActive: true })
    .sort({ sortOrder: 1, price: 1 });
};

// Método estático para verificar límites del plan
ClinicPlanSchema.statics.checkPlanLimits = async function(
  planName: string,
  currentUsage: {
    appointmentsThisMonth: number;
    totalPatients: number;
  }
) {
  const plan = await this.findOne({ name: planName, isActive: true });
  
  if (!plan) {
    throw new Error('Plan no encontrado');
  }
  
  const limits = {
    appointmentsExceeded: false,
    patientsExceeded: false,
    appointmentsRemaining: 0,
    patientsRemaining: 0
  };
  
  // Verificar límite de citas
  if (plan.features.maxAppointmentsPerMonth !== -1) {
    limits.appointmentsRemaining = plan.features.maxAppointmentsPerMonth - currentUsage.appointmentsThisMonth;
    limits.appointmentsExceeded = limits.appointmentsRemaining < 0;
  } else {
    limits.appointmentsRemaining = -1; // Ilimitado
  }
  
  // Verificar límite de pacientes
  if (plan.features.maxPatients !== -1) {
    limits.patientsRemaining = plan.features.maxPatients - currentUsage.totalPatients;
    limits.patientsExceeded = limits.patientsRemaining < 0;
  } else {
    limits.patientsRemaining = -1; // Ilimitado
  }
  
  return { plan, limits };
};

// Método para aplicar código promocional
ClinicPlanSchema.methods.applyPromotionalCode = function(code: string) {
  if (!this.promotionalDiscount || 
      !this.promotionalDiscount.code || 
      this.promotionalDiscount.code !== code ||
      !this.promotionalDiscount.validUntil ||
      this.promotionalDiscount.validUntil < new Date()) {
    return false;
  }
  
  return true;
};

export default mongoose.models.ClinicPlan || 
  mongoose.model<IClinicPlan>('ClinicPlan', ClinicPlanSchema);
