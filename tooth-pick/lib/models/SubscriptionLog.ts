// 🎯 FASE 31: Modelo de Log de Suscripciones
// ✅ Esquema para auditoría y tracking de eventos de suscripción

import mongoose, { Schema, Document } from 'mongoose';

export interface ISubscriptionLog extends Document {
  subscriptionId: string;
  userId: string;
  organizationId: string;
  event: 'created' | 'activated' | 'canceled' | 'reactivated' | 'upgraded' | 'downgraded' | 
         'renewed' | 'payment_succeeded' | 'payment_failed' | 'trial_started' | 'trial_ended' |
         'invoice_created' | 'invoice_paid' | 'invoice_failed' | 'expired' | 'suspended';
  
  // Datos del evento
  eventData: {
    fromPlan?: string;
    toPlan?: string;
    amount?: number;
    currency?: string;
    paymentMethod?: string;
    invoiceId?: string;
    failureReason?: string;
    changeReason?: string;
    metadata?: Record<string, any>;
  };
  
  // Información del sistema en el momento del evento
  systemData: {
    userAgent?: string;
    ipAddress?: string;
    source: 'user' | 'system' | 'webhook' | 'admin' | 'api';
    adminUserId?: string; // Si fue iniciado por un admin
    apiKey?: string; // Si fue vía API
  };
  
  // Datos financieros al momento del evento
  financialSnapshot: {
    totalPaid?: number;
    outstandingBalance?: number;
    nextChargeDate?: Date;
    lastPaymentDate?: Date;
  };
  
  // Resultado del evento
  result: {
    success: boolean;
    errorCode?: string;
    errorMessage?: string;
    externalTransactionId?: string; // ID de Stripe, PayPal, etc.
    retryCount?: number;
  };
  
  createdAt: Date;
}

const SubscriptionLogSchema = new Schema<ISubscriptionLog>({
  subscriptionId: {
    type: String,
    required: true,
    index: true,
    ref: 'UserSubscription'
  },
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
  event: {
    type: String,
    enum: [
      'created', 'activated', 'canceled', 'reactivated', 'upgraded', 'downgraded',
      'renewed', 'payment_succeeded', 'payment_failed', 'trial_started', 'trial_ended',
      'invoice_created', 'invoice_paid', 'invoice_failed', 'expired', 'suspended'
    ],
    required: true,
    index: true
  },
  
  eventData: {
    fromPlan: String,
    toPlan: String,
    amount: Number,
    currency: String,
    paymentMethod: String,
    invoiceId: String,
    failureReason: String,
    changeReason: String,
    metadata: Schema.Types.Mixed
  },
  
  systemData: {
    userAgent: String,
    ipAddress: String,
    source: {
      type: String,
      enum: ['user', 'system', 'webhook', 'admin', 'api'],
      required: true
    },
    adminUserId: String,
    apiKey: String
  },
  
  financialSnapshot: {
    totalPaid: Number,
    outstandingBalance: Number,
    nextChargeDate: Date,
    lastPaymentDate: Date
  },
  
  result: {
    success: {
      type: Boolean,
      required: true
    },
    errorCode: String,
    errorMessage: String,
    externalTransactionId: String,
    retryCount: {
      type: Number,
      default: 0
    }
  }
}, {
  timestamps: { createdAt: true, updatedAt: false } // Solo createdAt, no updatedAt
});

// Índices para consultas de auditoría
SubscriptionLogSchema.index({ subscriptionId: 1, createdAt: -1 });
SubscriptionLogSchema.index({ userId: 1, event: 1, createdAt: -1 });
SubscriptionLogSchema.index({ organizationId: 1, event: 1, createdAt: -1 });
SubscriptionLogSchema.index({ event: 1, createdAt: -1 });
SubscriptionLogSchema.index({ 'result.success': 1, event: 1 });

// Índice TTL para limpiar logs antiguos (opcional, mantener 2 años)
SubscriptionLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 63072000 }); // 2 años

// Método estático para crear log
SubscriptionLogSchema.statics.createLog = function(logData: Partial<ISubscriptionLog>) {
  return this.create({
    ...logData,
    createdAt: new Date()
  });
};

// Método estático para obtener historial de una suscripción
SubscriptionLogSchema.statics.getSubscriptionHistory = function(
  subscriptionId: string, 
  limit: number = 50
) {
  return this.find({ subscriptionId })
    .sort({ createdAt: -1 })
    .limit(limit);
};

// Método estático para obtener eventos de pago fallidos
SubscriptionLogSchema.statics.getFailedPayments = function(
  organizationId?: string,
  fromDate?: Date,
  toDate?: Date
) {
  const query: any = {
    event: 'payment_failed',
    'result.success': false
  };
  
  if (organizationId) {
    query.organizationId = organizationId;
  }
  
  if (fromDate || toDate) {
    query.createdAt = {};
    if (fromDate) query.createdAt.$gte = fromDate;
    if (toDate) query.createdAt.$lte = toDate;
  }
  
  return this.find(query).sort({ createdAt: -1 });
};

export default mongoose.models.SubscriptionLog || mongoose.model<ISubscriptionLog>('SubscriptionLog', SubscriptionLogSchema);
