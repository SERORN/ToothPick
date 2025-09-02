import mongoose, { Schema, Document } from 'mongoose';

export interface IClinicSubscription extends Document {
  clinicId: mongoose.Types.ObjectId;
  plan: 'Free' | 'Pro' | 'Elite';
  status: 'active' | 'inactive' | 'trial' | 'past_due' | 'canceled' | 'unpaid';
  
  // Fechas y ciclo de facturación
  startedAt: Date;
  expiresAt: Date;
  nextBillingDate: Date;
  trialEndsAt?: Date;
  
  // Integración con Stripe
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  stripePriceId?: string;
  stripeProductId?: string;
  
  // Configuración del plan
  pricing: {
    amount: number;           // Precio en centavos
    currency: string;         // MXN, USD, etc.
    interval: 'month' | 'year';
    intervalCount: number;    // Cada cuántos intervals se cobra
  };
  
  // Límites y características según el plan
  features: {
    maxAppointmentsPerMonth: number;
    commissionRate: number;           // % de comisión por cita
    priorityListing: boolean;         // Aparece primero en directorio
    advancedAnalytics: boolean;       // Acceso a estadísticas avanzadas
    marketplaceAccess: boolean;       // Acceso sin comisiones al marketplace
    customWebsite: boolean;           // Sitio web personalizado
    marketingAutomation: boolean;     // Campañas automatizadas
    prioritySupport: boolean;         // Soporte 24/7
    customBranding: boolean;          // Branding personalizado
    apiAccess: boolean;               // Acceso a API
    exportData: boolean;              // Exportar datos
  };
  
  // Uso y métricas
  usage: {
    appointmentsThisMonth: number;
    lastResetDate: Date;
    totalAppointments: number;
    totalRevenue: number;
  };
  
  // Historial de cambios
  history: Array<{
    action: 'created' | 'upgraded' | 'downgraded' | 'canceled' | 'renewed' | 'payment_failed';
    fromPlan?: string;
    toPlan?: string;
    timestamp: Date;
    reason?: string;
    amount?: number;
  }>;
  
  // Configuración adicional
  autoRenew: boolean;
  cancelAtPeriodEnd: boolean;
  cancelationReason?: string;
  canceledAt?: Date;
  
  createdAt: Date;
  updatedAt: Date;
}

const ClinicSubscriptionSchema: Schema = new Schema<IClinicSubscription>(
  {
    clinicId: { 
      type: Schema.Types.ObjectId, 
      ref: 'User', 
      required: true,
      unique: true,
      index: true
    },
    
    plan: { 
      type: String, 
      enum: ['Free', 'Pro', 'Elite'], 
      default: 'Free',
      index: true
    },
    
    status: { 
      type: String, 
      enum: ['active', 'inactive', 'trial', 'past_due', 'canceled', 'unpaid'], 
      default: 'trial',
      index: true
    },
    
    // Fechas
    startedAt: { 
      type: Date, 
      default: Date.now 
    },
    expiresAt: { 
      type: Date, 
      required: true 
    },
    nextBillingDate: { 
      type: Date 
    },
    trialEndsAt: { 
      type: Date 
    },
    
    // Facturación CFDI
    billing: {
      invoices: [{ 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Invoice' 
      }],
      lastInvoiceDate: Date,
      lastInvoiceAmount: Number,
      autoInvoicing: { 
        type: Boolean, 
        default: false 
      },
      fiscalData: {
        rfc: String,
        nombreFiscal: String,
        email: String,
        cpFiscal: String,
        regimenFiscal: { 
          type: String, 
          default: '612' 
        },
        usoCfdi: { 
          type: String, 
          default: 'G03' 
        }
      }
    },
    
    // Stripe
    stripeCustomerId: { 
      type: String, 
      sparse: true 
    },
    stripeSubscriptionId: { 
      type: String, 
      sparse: true 
    },
    stripePriceId: { 
      type: String 
    },
    stripeProductId: { 
      type: String 
    },
    
    // Pricing
    pricing: {
      amount: { type: Number, required: true, min: 0 },
      currency: { type: String, default: 'MXN' },
      interval: { type: String, enum: ['month', 'year'], default: 'month' },
      intervalCount: { type: Number, default: 1, min: 1 }
    },
    
    // Features
    features: {
      maxAppointmentsPerMonth: { type: Number, default: 20 },
      commissionRate: { type: Number, default: 8.5, min: 0, max: 100 },
      priorityListing: { type: Boolean, default: false },
      advancedAnalytics: { type: Boolean, default: false },
      marketplaceAccess: { type: Boolean, default: false },
      customWebsite: { type: Boolean, default: false },
      marketingAutomation: { type: Boolean, default: false },
      prioritySupport: { type: Boolean, default: false },
      customBranding: { type: Boolean, default: false },
      apiAccess: { type: Boolean, default: false },
      exportData: { type: Boolean, default: false }
    },
    
    // Usage tracking
    usage: {
      appointmentsThisMonth: { type: Number, default: 0 },
      lastResetDate: { type: Date, default: Date.now },
      totalAppointments: { type: Number, default: 0 },
      totalRevenue: { type: Number, default: 0 }
    },
    
    // History
    history: [{
      action: { 
        type: String, 
        enum: ['created', 'upgraded', 'downgraded', 'canceled', 'renewed', 'payment_failed'],
        required: true 
      },
      fromPlan: { type: String },
      toPlan: { type: String },
      timestamp: { type: Date, default: Date.now },
      reason: { type: String },
      amount: { type: Number }
    }],
    
    // Settings
    autoRenew: { type: Boolean, default: true },
    cancelAtPeriodEnd: { type: Boolean, default: false },
    cancelationReason: { type: String },
    canceledAt: { type: Date }
  },
  { 
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Índices adicionales
ClinicSubscriptionSchema.index({ status: 1, expiresAt: 1 });
ClinicSubscriptionSchema.index({ stripeCustomerId: 1 });
ClinicSubscriptionSchema.index({ stripeSubscriptionId: 1 });
ClinicSubscriptionSchema.index({ plan: 1, status: 1 });

// Virtual para verificar si está en trial
ClinicSubscriptionSchema.virtual('isOnTrial').get(function() {
  return this.status === 'trial' && this.trialEndsAt && new Date() < this.trialEndsAt;
});

// Virtual para días restantes del trial
ClinicSubscriptionSchema.virtual('trialDaysRemaining').get(function() {
  if (!this.isOnTrial || !this.trialEndsAt) return 0;
  const diffTime = this.trialEndsAt.getTime() - new Date().getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

// Virtual para verificar si puede crear más citas
ClinicSubscriptionSchema.virtual('canCreateAppointment').get(function() {
  if (this.plan === 'Free') {
    return this.usage.appointmentsThisMonth < this.features.maxAppointmentsPerMonth;
  }
  return true; // Pro y Elite tienen citas ilimitadas
});

// Virtual para días hasta el próximo cobro
ClinicSubscriptionSchema.virtual('daysUntilNextBilling').get(function() {
  if (!this.nextBillingDate) return null;
  const diffTime = this.nextBillingDate.getTime() - new Date().getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

// Método para incrementar el uso de citas
ClinicSubscriptionSchema.methods.incrementAppointmentUsage = async function(): Promise<void> {
  // Verificar si necesitamos resetear el contador mensual
  const now = new Date();
  const lastReset = this.usage.lastResetDate;
  const shouldReset = now.getMonth() !== lastReset.getMonth() || 
                     now.getFullYear() !== lastReset.getFullYear();
  
  if (shouldReset) {
    this.usage.appointmentsThisMonth = 0;
    this.usage.lastResetDate = now;
  }
  
  this.usage.appointmentsThisMonth += 1;
  this.usage.totalAppointments += 1;
  
  await this.save();
};

// Método para verificar límites
ClinicSubscriptionSchema.methods.checkLimits = function(): {
  canCreateAppointment: boolean;
  appointmentsUsed: number;
  appointmentsLimit: number;
  needsUpgrade: boolean;
} {
  const isUnlimited = this.plan !== 'Free';
  const used = this.usage.appointmentsThisMonth;
  const limit = this.features.maxAppointmentsPerMonth;
  
  return {
    canCreateAppointment: isUnlimited || used < limit,
    appointmentsUsed: used,
    appointmentsLimit: isUnlimited ? -1 : limit,
    needsUpgrade: !isUnlimited && used >= limit
  };
};

// Método para actualizar plan
ClinicSubscriptionSchema.methods.updatePlan = async function(
  newPlan: 'Free' | 'Pro' | 'Elite',
  reason?: string
): Promise<void> {
  const oldPlan = this.plan;
  
  // Actualizar features según el nuevo plan
  const planFeatures = getPlanFeatures(newPlan);
  this.features = { ...this.features, ...planFeatures };
  this.plan = newPlan;
  
  // Agregar al historial
  this.history.push({
    action: oldPlan === 'Free' ? 'upgraded' : 'downgraded',
    fromPlan: oldPlan,
    toPlan: newPlan,
    timestamp: new Date(),
    reason: reason || 'Plan change',
    amount: planFeatures.amount
  });
  
  await this.save();
};

// Método para cancelar suscripción
ClinicSubscriptionSchema.methods.cancelSubscription = async function(
  reason?: string,
  immediately = false
): Promise<void> {
  this.cancelationReason = reason;
  this.canceledAt = new Date();
  
  if (immediately) {
    this.status = 'canceled';
    this.expiresAt = new Date();
  } else {
    this.cancelAtPeriodEnd = true;
  }
  
  this.history.push({
    action: 'canceled',
    timestamp: new Date(),
    reason: reason || 'User cancelation'
  });
  
  await this.save();
};

// Método estático para obtener características de un plan
function getPlanFeatures(plan: 'Free' | 'Pro' | 'Elite') {
  const planConfigs = {
    Free: {
      amount: 0,
      maxAppointmentsPerMonth: 20,
      commissionRate: 8.5,
      priorityListing: false,
      advancedAnalytics: false,
      marketplaceAccess: false,
      customWebsite: false,
      marketingAutomation: false,
      prioritySupport: false,
      customBranding: false,
      apiAccess: false,
      exportData: false
    },
    Pro: {
      amount: 49900, // $499.00 MXN en centavos
      maxAppointmentsPerMonth: -1, // Ilimitado
      commissionRate: 0,
      priorityListing: true,
      advancedAnalytics: true,
      marketplaceAccess: true,
      customWebsite: false,
      marketingAutomation: false,
      prioritySupport: false,
      customBranding: true,
      apiAccess: true,
      exportData: true
    },
    Elite: {
      amount: 99900, // $999.00 MXN en centavos
      maxAppointmentsPerMonth: -1, // Ilimitado
      commissionRate: 0,
      priorityListing: true,
      advancedAnalytics: true,
      marketplaceAccess: true,
      customWebsite: true,
      marketingAutomation: true,
      prioritySupport: true,
      customBranding: true,
      apiAccess: true,
      exportData: true
    }
  };
  
  return planConfigs[plan];
}

// Método estático para crear suscripción de trial
ClinicSubscriptionSchema.statics.createTrialSubscription = async function(
  clinicId: mongoose.Types.ObjectId
) {
  const trialDays = 30;
  const now = new Date();
  const trialEnd = new Date(now.getTime() + trialDays * 24 * 60 * 60 * 1000);
  
  const subscription = new this({
    clinicId,
    plan: 'Pro', // Trial con características Pro
    status: 'trial',
    startedAt: now,
    expiresAt: trialEnd,
    trialEndsAt: trialEnd,
    pricing: {
      amount: 49900,
      currency: 'MXN',
      interval: 'month',
      intervalCount: 1
    },
    features: getPlanFeatures('Pro'),
    history: [{
      action: 'created',
      toPlan: 'Pro',
      timestamp: now,
      reason: '30-day trial'
    }]
  });
  
  return await subscription.save();
};

export default mongoose.models.ClinicSubscription || 
  mongoose.model<IClinicSubscription>('ClinicSubscription', ClinicSubscriptionSchema);
