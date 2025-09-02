// 🎯 FASE 31: Modelo de Plan de Suscripción
// ✅ Esquema para planes de suscripción multimoneda y multirol

import mongoose, { Schema, Document } from 'mongoose';

export interface ISubscriptionPlan extends Document {
  name: string;
  displayName: {
    [locale: string]: string; // Soporte i18n
  };
  description: {
    [locale: string]: string;
  };
  tier: 'basic' | 'plus' | 'premium';
  allowedRoles: ('clinic' | 'distributor' | 'clinic-admin' | 'distributor-admin')[];
  pricing: {
    monthly: {
      [currency: string]: number; // MXN, USD, BRL, etc.
    };
    annually: {
      [currency: string]: number;
    };
  };
  features: {
    maxUsers?: number;
    maxOrders?: number;
    maxProducts?: number;
    advancedAnalytics: boolean;
    prioritySupport: boolean;
    customBranding: boolean;
    apiAccess: boolean;
    cfdiInvoicing: boolean;
    rewardsMultiplier: number;
    storageGB: number;
    features: string[]; // Lista de funcionalidades específicas
  };
  trialDays: number;
  isActive: boolean;
  stripeProductId?: string;
  stripePriceIds: {
    [currency: string]: {
      monthly?: string;
      annually?: string;
    };
  };
  paypalProductId?: string;
  paypalPlanIds: {
    [currency: string]: {
      monthly?: string;
      annually?: string;
    };
  };
  createdAt: Date;
  updatedAt: Date;
}

const SubscriptionPlanSchema = new Schema<ISubscriptionPlan>({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  displayName: {
    type: Map,
    of: String,
    required: true,
    default: {
      es: '',
      en: '',
      pt: '',
      de: ''
    }
  },
  description: {
    type: Map,
    of: String,
    required: true,
    default: {
      es: '',
      en: '',
      pt: '',
      de: ''
    }
  },
  tier: {
    type: String,
    enum: ['basic', 'plus', 'premium'],
    required: true
  },
  allowedRoles: [{
    type: String,
    enum: ['clinic', 'distributor', 'clinic-admin', 'distributor-admin'],
    required: true
  }],
  pricing: {
    monthly: {
      type: Map,
      of: Number,
      required: true,
      default: {}
    },
    annually: {
      type: Map,
      of: Number,
      required: true,
      default: {}
    }
  },
  features: {
    maxUsers: {
      type: Number,
      default: null // null = unlimited
    },
    maxOrders: {
      type: Number,
      default: null
    },
    maxProducts: {
      type: Number,
      default: null
    },
    advancedAnalytics: {
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
    apiAccess: {
      type: Boolean,
      default: false
    },
    cfdiInvoicing: {
      type: Boolean,
      default: false
    },
    rewardsMultiplier: {
      type: Number,
      default: 1.0
    },
    storageGB: {
      type: Number,
      default: 5
    },
    features: [{
      type: String
    }]
  },
  trialDays: {
    type: Number,
    default: 14
  },
  isActive: {
    type: Boolean,
    default: true
  },
  stripeProductId: {
    type: String,
    sparse: true
  },
  stripePriceIds: {
    type: Map,
    of: {
      monthly: String,
      annually: String
    },
    default: {}
  },
  paypalProductId: {
    type: String,
    sparse: true
  },
  paypalPlanIds: {
    type: Map,
    of: {
      monthly: String,
      annually: String
    },
    default: {}
  }
}, {
  timestamps: true
});

// Índices para optimización
SubscriptionPlanSchema.index({ tier: 1, allowedRoles: 1 });
SubscriptionPlanSchema.index({ isActive: 1 });
SubscriptionPlanSchema.index({ 'pricing.monthly': 1 });

export default mongoose.models.SubscriptionPlan || mongoose.model<ISubscriptionPlan>('SubscriptionPlan', SubscriptionPlanSchema);
