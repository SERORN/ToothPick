// 🎯 FASE 31: Modelo de Suscripción de Usuario
// ✅ Esquema para suscripciones activas de usuarios y organizaciones

import mongoose, { Schema, Document } from 'mongoose';

export interface IUserSubscription extends Document {
  userId: string;
  organizationId: string;
  planId: string;
  status: 'trialing' | 'active' | 'past_due' | 'canceled' | 'unpaid' | 'expired';
  billingCycle: 'monthly' | 'annually';
  currency: string;
  amount: number;
  
  // Fechas importantes
  startDate: Date;
  trialEnd?: Date;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  canceledAt?: Date;
  endedAt?: Date;
  
  // Integración con proveedores de pago
  stripeSubscriptionId?: string;
  stripeCustomerId?: string;
  paypalSubscriptionId?: string;
  paypalOrderId?: string;
  
  // Método de pago utilizado
  paymentMethod: {
    type: 'stripe' | 'paypal' | 'spei' | 'transfer';
    last4?: string; // Últimos 4 dígitos de tarjeta
    brand?: string; // Visa, MasterCard, etc.
    expiryMonth?: number;
    expiryYear?: number;
  };
  
  // Facturación (especialmente para México)
  invoicing: {
    requiresCFDI: boolean;
    fiscalData?: {
      rfc: string;
      businessName: string;
      address: {
        street: string;
        city: string;
        state: string;
        zipCode: string;
        country: string;
      };
      cfdiUse: string;
    };
    lastInvoiceDate?: Date;
    nextInvoiceDate?: Date;
    invoiceIds: string[]; // IDs de facturas generadas
  };
  
  // Descuentos y promociones
  discount?: {
    couponId: string;
    percentOff?: number;
    amountOff?: number;
    currency?: string;
    validUntil?: Date;
  };
  
  // Métricas y seguimiento
  metrics: {
    totalPaid: number;
    invoicesPaid: number;
    invoicesFailed: number;
    downgrades: number;
    upgrades: number;
    renewals: number;
    paymentsSucceeded: number;
    paymentsFailed: number;
    totalRevenue: number;
  };
  
  // Sistema de fidelización (FASE 32)
  loyalty: {
    tier: 'bronze' | 'silver' | 'gold' | 'platinum';
    totalLoyaltyPoints: number;
    lifetimeValue: number; // Valor total pagado históricamente
    loyaltyEvents: {
      renewalsOnTime: number;
      referralsSuccessful: number;
      upgradeCount: number;
      consecutiveRenewals: number;
      lastRenewalBonus?: Date;
    };
    tierProgress: {
      currentTierSince: Date;
      pointsToNextTier: number;
      nextTierThreshold: number;
      tierHistory: Array<{
        tier: string;
        achievedAt: Date;
        pointsAtTime: number;
      }>;
    };
    specialBenefits: {
      hasEarlyAccess: boolean;
      hasPrioritySupport: boolean;
      customDiscountRate?: number;
      dedicatedManager?: string;
    };
  };
  
  // Configuración de renovación
  renewalSettings: {
    autoRenew: boolean;
    cancelAtPeriodEnd: boolean;
    upgradeOnRenewal?: string; // planId para upgrade automático
  };
  
  // Metadatos adicionales
  metadata: {
    source?: string; // Dónde se originó la suscripción
    referralCode?: string;
    campaignId?: string;
    notes?: string;
  };
  
  createdAt: Date;
  updatedAt: Date;
}

const UserSubscriptionSchema = new Schema<IUserSubscription>({
  userId: {
    type: String,
    required: true,
    index: true
  },
  organizationId: {
    type: String,
    required: true,
    index: true
  },
  planId: {
    type: String,
    required: true,
    ref: 'SubscriptionPlan'
  },
  status: {
    type: String,
    enum: ['trialing', 'active', 'past_due', 'canceled', 'unpaid', 'expired'],
    required: true,
    default: 'trialing',
    index: true
  },
  billingCycle: {
    type: String,
    enum: ['monthly', 'annually'],
    required: true
  },
  currency: {
    type: String,
    required: true,
    enum: ['MXN', 'USD', 'BRL', 'ARS', 'CLP', 'COP', 'EUR']
  },
  amount: {
    type: Number,
    required: true
  },
  
  // Fechas
  startDate: {
    type: Date,
    required: true,
    default: Date.now
  },
  trialEnd: {
    type: Date
  },
  currentPeriodStart: {
    type: Date,
    required: true
  },
  currentPeriodEnd: {
    type: Date,
    required: true,
    index: true
  },
  canceledAt: {
    type: Date
  },
  endedAt: {
    type: Date
  },
  
  // Proveedores de pago
  stripeSubscriptionId: {
    type: String,
    sparse: true,
    unique: true
  },
  stripeCustomerId: {
    type: String,
    sparse: true
  },
  paypalSubscriptionId: {
    type: String,
    sparse: true,
    unique: true
  },
  paypalOrderId: {
    type: String,
    sparse: true
  },
  
  // Método de pago
  paymentMethod: {
    type: {
      type: String,
      enum: ['stripe', 'paypal', 'spei', 'transfer'],
      required: true
    },
    last4: String,
    brand: String,
    expiryMonth: Number,
    expiryYear: Number
  },
  
  // Facturación
  invoicing: {
    requiresCFDI: {
      type: Boolean,
      default: false
    },
    fiscalData: {
      rfc: String,
      businessName: String,
      address: {
        street: String,
        city: String,
        state: String,
        zipCode: String,
        country: String
      },
      cfdiUse: String
    },
    lastInvoiceDate: Date,
    nextInvoiceDate: Date,
    invoiceIds: [{
      type: String
    }]
  },
  
  // Descuentos
  discount: {
    couponId: String,
    percentOff: Number,
    amountOff: Number,
    currency: String,
    validUntil: Date
  },
  
  // Métricas
  metrics: {
    totalPaid: {
      type: Number,
      default: 0
    },
    invoicesPaid: {
      type: Number,
      default: 0
    },
    invoicesFailed: {
      type: Number,
      default: 0
    },
    downgrades: {
      type: Number,
      default: 0
    },
    upgrades: {
      type: Number,
      default: 0
    },
    renewals: {
      type: Number,
      default: 0
    },
    paymentsSucceeded: {
      type: Number,
      default: 0
    },
    paymentsFailed: {
      type: Number,
      default: 0
    },
    totalRevenue: {
      type: Number,
      default: 0
    }
  },
  
  // Sistema de fidelización (FASE 32)
  loyalty: {
    tier: {
      type: String,
      enum: ['bronze', 'silver', 'gold', 'platinum'],
      default: 'bronze'
    },
    totalLoyaltyPoints: {
      type: Number,
      default: 0,
      min: 0
    },
    lifetimeValue: {
      type: Number,
      default: 0,
      min: 0
    },
    loyaltyEvents: {
      renewalsOnTime: {
        type: Number,
        default: 0
      },
      referralsSuccessful: {
        type: Number,
        default: 0
      },
      upgradeCount: {
        type: Number,
        default: 0
      },
      consecutiveRenewals: {
        type: Number,
        default: 0
      },
      lastRenewalBonus: Date
    },
    tierProgress: {
      currentTierSince: {
        type: Date,
        default: Date.now
      },
      pointsToNextTier: {
        type: Number,
        default: 0
      },
      nextTierThreshold: {
        type: Number,
        default: 1000
      },
      tierHistory: [{
        tier: {
          type: String,
          enum: ['bronze', 'silver', 'gold', 'platinum']
        },
        achievedAt: {
          type: Date,
          default: Date.now
        },
        pointsAtTime: {
          type: Number,
          default: 0
        }
      }]
    },
    specialBenefits: {
      hasEarlyAccess: {
        type: Boolean,
        default: false
      },
      hasPrioritySupport: {
        type: Boolean,
        default: false
      },
      customDiscountRate: {
        type: Number,
        min: 0,
        max: 50
      },
      dedicatedManager: String
    }
  },
  
  // Configuración de renovación
  renewalSettings: {
    autoRenew: {
      type: Boolean,
      default: true
    },
    cancelAtPeriodEnd: {
      type: Boolean,
      default: false
    },
    upgradeOnRenewal: {
      type: String,
      ref: 'SubscriptionPlan'
    }
  },
  
  // Metadatos
  metadata: {
    source: String,
    referralCode: String,
    campaignId: String,
    notes: String
  }
}, {
  timestamps: true
});

// Índices compuestos para consultas eficientes
UserSubscriptionSchema.index({ userId: 1, organizationId: 1 });
UserSubscriptionSchema.index({ status: 1, currentPeriodEnd: 1 });
UserSubscriptionSchema.index({ currency: 1, status: 1 });
UserSubscriptionSchema.index({ planId: 1, status: 1 });

// Índice para expiración automática
UserSubscriptionSchema.index({ currentPeriodEnd: 1, status: 1 });

// Virtual para verificar si está en periodo de prueba
UserSubscriptionSchema.virtual('isTrialing').get(function() {
  return this.status === 'trialing' && this.trialEnd && this.trialEnd > new Date();
});

// Virtual para verificar si está activa
UserSubscriptionSchema.virtual('isActive').get(function() {
  return ['trialing', 'active'].includes(this.status) && this.currentPeriodEnd > new Date();
});

// Virtual para días restantes
UserSubscriptionSchema.virtual('daysRemaining').get(function() {
  const now = new Date();
  const end = this.trialEnd || this.currentPeriodEnd;
  const diffTime = end.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return Math.max(0, diffDays);
});

export default mongoose.models.UserSubscription || mongoose.model<IUserSubscription>('UserSubscription', UserSubscriptionSchema);
