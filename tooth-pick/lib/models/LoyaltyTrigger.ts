// 🎯 FASE 32: Modelo de Triggers de Fidelización
// ✅ Definición de reglas automáticas para otorgar puntos de fidelidad

import mongoose, { Document, Schema } from 'mongoose';

export interface ILoyaltyTrigger extends Document {
  _id: string;
  name: string;
  description: { [key: string]: string }; // Multiidioma
  triggerType: 'subscription' | 'payment' | 'referral' | 'spending' | 'engagement' | 'milestone' | 'campaign';
  actionType: string; // RENEW_SUBSCRIPTION, PAY_ON_TIME, REFER_USER, etc.
  
  // Condiciones de activación
  conditions: {
    userRoles?: string[]; // Roles elegibles
    subscriptionTiers?: string[]; // Planes elegibles
    minimumAmount?: number; // Para triggers de gasto
    timeWindow?: number; // Ventana de tiempo en días
    requiresActiveSubscription?: boolean;
    customConditions?: { [key: string]: any };
  };
  
  // Recompensas
  rewards: {
    basePoints: number; // Puntos base a otorgar
    bonusMultiplier?: number; // Multiplicador para usuarios premium
    xpPoints?: number; // XP adicional para gamificación
    dynamicFormula?: string; // Fórmula para cálculo dinámico: "amount * 0.1"
    tierBonuses?: { // Bonificaciones por tier de fidelización
      bronze: number;
      silver: number;
      gold: number;
      platinum: number;
    };
  };
  
  // Control de frecuencia
  frequency: {
    type: 'once' | 'daily' | 'weekly' | 'monthly' | 'unlimited';
    maxActivations?: number; // Máximo por período
    cooldownPeriod?: number; // Período de enfriamiento en horas
  };
  
  // Configuración de validez
  validity: {
    startDate: Date;
    endDate?: Date;
    isActive: boolean;
    priority: number; // Para ordenar triggers
  };
  
  // Metadatos
  metadata: {
    category: string; // engagement, revenue, growth, retention
    difficulty: 'easy' | 'medium' | 'hard'; // Para UI
    estimatedCompletionTime?: string;
    requiredFeatures?: string[]; // Características de suscripción requeridas
    targetAudience: string[]; // clinic, distributor, admin, patient
  };
  
  // Estadísticas
  stats: {
    totalActivations: number;
    uniqueUsers: number;
    totalPointsAwarded: number;
    lastActivated?: Date;
    conversionRate?: number; // Para triggers de referencia
  };
  
  createdAt: Date;
  updatedAt: Date;
  createdBy: string; // Admin que creó el trigger
}

const LoyaltyTriggerSchema = new Schema<ILoyaltyTrigger>({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  
  description: {
    type: Map,
    of: String,
    required: true,
    default: {
      es: '',
      en: '',
      pt: ''
    }
  },
  
  triggerType: {
    type: String,
    required: true,
    enum: ['subscription', 'payment', 'referral', 'spending', 'engagement', 'milestone', 'campaign']
  },
  
  actionType: {
    type: String,
    required: true,
    trim: true,
    uppercase: true
  },
  
  conditions: {
    userRoles: [{
      type: String,
      enum: ['admin', 'provider', 'distributor', 'customer', 'dentist', 'patient']
    }],
    subscriptionTiers: [{
      type: String,
      enum: ['basic', 'plus', 'premium']
    }],
    minimumAmount: {
      type: Number,
      min: 0
    },
    timeWindow: {
      type: Number,
      min: 1,
      max: 365
    },
    requiresActiveSubscription: {
      type: Boolean,
      default: false
    },
    customConditions: {
      type: Map,
      of: Schema.Types.Mixed
    }
  },
  
  rewards: {
    basePoints: {
      type: Number,
      required: true,
      min: 0
    },
    bonusMultiplier: {
      type: Number,
      min: 1,
      max: 10,
      default: 1
    },
    xpPoints: {
      type: Number,
      min: 0,
      default: 0
    },
    dynamicFormula: {
      type: String,
      trim: true
    },
    tierBonuses: {
      bronze: { type: Number, default: 0 },
      silver: { type: Number, default: 0 },
      gold: { type: Number, default: 0 },
      platinum: { type: Number, default: 0 }
    }
  },
  
  frequency: {
    type: {
      type: String,
      required: true,
      enum: ['once', 'daily', 'weekly', 'monthly', 'unlimited'],
      default: 'unlimited'
    },
    maxActivations: {
      type: Number,
      min: 1
    },
    cooldownPeriod: {
      type: Number,
      min: 1,
      max: 8760 // Máximo 1 año en horas
    }
  },
  
  validity: {
    startDate: {
      type: Date,
      required: true,
      default: Date.now
    },
    endDate: {
      type: Date
    },
    isActive: {
      type: Boolean,
      required: true,
      default: true
    },
    priority: {
      type: Number,
      required: true,
      default: 100,
      min: 1,
      max: 1000
    }
  },
  
  metadata: {
    category: {
      type: String,
      required: true,
      enum: ['engagement', 'revenue', 'growth', 'retention'],
      default: 'engagement'
    },
    difficulty: {
      type: String,
      enum: ['easy', 'medium', 'hard'],
      default: 'easy'
    },
    estimatedCompletionTime: {
      type: String,
      trim: true
    },
    requiredFeatures: [{
      type: String
    }],
    targetAudience: [{
      type: String,
      enum: ['clinic', 'distributor', 'admin', 'patient'],
      required: true
    }]
  },
  
  stats: {
    totalActivations: {
      type: Number,
      default: 0,
      min: 0
    },
    uniqueUsers: {
      type: Number,
      default: 0,
      min: 0
    },
    totalPointsAwarded: {
      type: Number,
      default: 0,
      min: 0
    },
    lastActivated: {
      type: Date
    },
    conversionRate: {
      type: Number,
      min: 0,
      max: 100
    }
  },
  
  createdBy: {
    type: String,
    required: true
  }
}, {
  timestamps: true,
  collection: 'loyalty_triggers'
});

// Índices para optimización
LoyaltyTriggerSchema.index({ triggerType: 1, actionType: 1 });
LoyaltyTriggerSchema.index({ 'validity.isActive': 1, 'validity.priority': -1 });
LoyaltyTriggerSchema.index({ 'metadata.category': 1, 'metadata.targetAudience': 1 });
LoyaltyTriggerSchema.index({ 'validity.startDate': 1, 'validity.endDate': 1 });

// Métodos virtuales
LoyaltyTriggerSchema.virtual('isCurrentlyActive').get(function() {
  const now = new Date();
  return this.validity.isActive && 
         this.validity.startDate <= now && 
         (!this.validity.endDate || this.validity.endDate >= now);
});

LoyaltyTriggerSchema.virtual('effectivenessScore').get(function() {
  if (this.stats.totalActivations === 0) return 0;
  return (this.stats.uniqueUsers / this.stats.totalActivations) * 100;
});

// Métodos de instancia
LoyaltyTriggerSchema.methods.calculateReward = function(
  userTier: string = 'bronze',
  dynamicValue?: number
): number {
  let points = this.rewards.basePoints;
  
  // Aplicar bono por tier
  if (this.rewards.tierBonuses && this.rewards.tierBonuses[userTier]) {
    points += this.rewards.tierBonuses[userTier];
  }
  
  // Aplicar multiplicador
  if (this.rewards.bonusMultiplier && this.rewards.bonusMultiplier > 1) {
    points *= this.rewards.bonusMultiplier;
  }
  
  // Aplicar fórmula dinámica si existe
  if (this.rewards.dynamicFormula && dynamicValue !== undefined) {
    try {
      // Fórmula simple: "amount * 0.1" donde amount es dynamicValue
      const formula = this.rewards.dynamicFormula.replace('amount', dynamicValue.toString());
      const dynamicPoints = eval(formula);
      points += Math.floor(dynamicPoints);
    } catch (error) {
      console.error('Error evaluando fórmula dinámica:', error);
    }
  }
  
  return Math.floor(points);
};

LoyaltyTriggerSchema.methods.canActivateForUser = function(
  userId: string,
  userRole: string,
  userSubscriptionTier?: string
): boolean {
  // Verificar si está activo
  if (!this.isCurrentlyActive) return false;
  
  // Verificar rol de usuario
  if (this.conditions.userRoles && this.conditions.userRoles.length > 0) {
    if (!this.conditions.userRoles.includes(userRole)) return false;
  }
  
  // Verificar tier de suscripción
  if (this.conditions.subscriptionTiers && this.conditions.subscriptionTiers.length > 0) {
    if (!userSubscriptionTier || !this.conditions.subscriptionTiers.includes(userSubscriptionTier)) {
      return false;
    }
  }
  
  return true;
};

// Métodos estáticos
LoyaltyTriggerSchema.statics.findActiveByAction = function(actionType: string) {
  return this.find({
    actionType: actionType.toUpperCase(),
    'validity.isActive': true,
    'validity.startDate': { $lte: new Date() },
    $or: [
      { 'validity.endDate': { $exists: false } },
      { 'validity.endDate': { $gte: new Date() } }
    ]
  }).sort({ 'validity.priority': -1 });
};

LoyaltyTriggerSchema.statics.findByCategory = function(category: string, isActive: boolean = true) {
  const query: any = { 'metadata.category': category };
  if (isActive) {
    query['validity.isActive'] = true;
  }
  return this.find(query).sort({ 'validity.priority': -1 });
};

// Middleware pre-save
LoyaltyTriggerSchema.pre('save', function(next) {
  // Validar fechas
  if (this.validity.endDate && this.validity.endDate <= this.validity.startDate) {
    next(new Error('La fecha de fin debe ser posterior a la fecha de inicio'));
    return;
  }
  
  // Normalizar actionType
  this.actionType = this.actionType.toUpperCase();
  
  next();
});

const LoyaltyTrigger = mongoose.models.LoyaltyTrigger || 
  mongoose.model<ILoyaltyTrigger>('LoyaltyTrigger', LoyaltyTriggerSchema);

export default LoyaltyTrigger;
