// 💰 FASE 29: Modelo PaymentTransaction para MongoDB
// ✅ Sistema completo de transacciones de pago

import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IPaymentTransaction extends Document {
  _id: Types.ObjectId;
  orderId: Types.ObjectId;
  payerId: Types.ObjectId; // Usuario que paga
  payeeId: Types.ObjectId; // Organización que recibe
  paymentMethodId: Types.ObjectId;
  
  // Detalles del pago
  amount: {
    original: number;
    currency: string;
    converted: number;
    convertedCurrency: string;
    exchangeRate: number;
  };
  
  fees: {
    platform: number;
    payment: number;
    total: number;
    currency: string;
  };
  
  // Estado y seguimiento
  status: 'pending' | 'processing' | 'paid' | 'failed' | 'cancelled' | 'refunded' | 'partially_refunded';
  method: 'stripe' | 'paypal' | 'bank_transfer' | 'swift' | 'spei' | 'pix' | 'manual';
  
  // Links y referencias
  paymentLink?: string;
  referenceCode: string;
  externalId?: string; // ID en la pasarela externa
  
  // Metadatos de la transacción
  metadata: {
    userAgent?: string;
    ipAddress?: string;
    country?: string;
    paymentIntentId?: string; // Stripe
    paypalOrderId?: string; // PayPal
    bankReference?: string; // Transferencias
  };
  
  // Timestamps y eventos
  createdAt: Date;
  updatedAt: Date;
  processedAt?: Date;
  completedAt?: Date;
  failedAt?: Date;
  
  // Logs de eventos
  events: Array<{
    type: string;
    status: string;
    message: string;
    data?: any;
    timestamp: Date;
  }>;
  
  // Información de reembolso
  refunds: Array<{
    amount: number;
    reason: string;
    refundId: string;
    status: 'pending' | 'completed' | 'failed';
    processedAt?: Date;
    createdAt: Date;
  }>;
  
  // Retry logic
  retryCount: number;
  maxRetries: number;
  nextRetryAt?: Date;
  
  // Información adicional
  description?: string;
  notes?: string;
  tags?: string[];
}

const PaymentTransactionSchema = new Schema<IPaymentTransaction>({
  orderId: {
    type: Schema.Types.ObjectId,
    ref: 'Order',
    required: true,
    index: true
  },
  payerId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  payeeId: {
    type: Schema.Types.ObjectId,
    ref: 'Organization',
    required: true,
    index: true
  },
  paymentMethodId: {
    type: Schema.Types.ObjectId,
    ref: 'PaymentMethod',
    required: true
  },
  
  amount: {
    original: {
      type: Number,
      required: true,
      min: 0
    },
    currency: {
      type: String,
      required: true,
      uppercase: true,
      length: 3
    },
    converted: {
      type: Number,
      required: true,
      min: 0
    },
    convertedCurrency: {
      type: String,
      required: true,
      uppercase: true,
      length: 3
    },
    exchangeRate: {
      type: Number,
      required: true,
      min: 0
    }
  },
  
  fees: {
    platform: {
      type: Number,
      default: 0,
      min: 0
    },
    payment: {
      type: Number,
      default: 0,
      min: 0
    },
    total: {
      type: Number,
      default: 0,
      min: 0
    },
    currency: {
      type: String,
      required: true,
      uppercase: true
    }
  },
  
  status: {
    type: String,
    enum: ['pending', 'processing', 'paid', 'failed', 'cancelled', 'refunded', 'partially_refunded'],
    default: 'pending',
    index: true
  },
  
  method: {
    type: String,
    enum: ['stripe', 'paypal', 'bank_transfer', 'swift', 'spei', 'pix', 'manual'],
    required: true,
    index: true
  },
  
  paymentLink: {
    type: String,
    trim: true
  },
  
  referenceCode: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    index: true
  },
  
  externalId: {
    type: String,
    trim: true,
    index: true
  },
  
  metadata: {
    userAgent: { type: String, trim: true },
    ipAddress: { type: String, trim: true },
    country: { type: String, uppercase: true, length: 2 },
    paymentIntentId: { type: String, trim: true },
    paypalOrderId: { type: String, trim: true },
    bankReference: { type: String, trim: true }
  },
  
  processedAt: { type: Date },
  completedAt: { type: Date },
  failedAt: { type: Date },
  
  events: [{
    type: {
      type: String,
      required: true,
      enum: [
        'created', 'processing', 'payment_intent_created', 'payment_confirmed',
        'payment_failed', 'refund_initiated', 'refund_completed', 'cancelled'
      ]
    },
    status: { type: String, required: true },
    message: { type: String, required: true },
    data: { type: Schema.Types.Mixed },
    timestamp: { type: Date, default: Date.now }
  }],
  
  refunds: [{
    amount: { type: Number, required: true, min: 0 },
    reason: { type: String, required: true, trim: true },
    refundId: { type: String, required: true, trim: true },
    status: {
      type: String,
      enum: ['pending', 'completed', 'failed'],
      default: 'pending'
    },
    processedAt: { type: Date },
    createdAt: { type: Date, default: Date.now }
  }],
  
  retryCount: {
    type: Number,
    default: 0,
    min: 0
  },
  
  maxRetries: {
    type: Number,
    default: 3,
    min: 0,
    max: 10
  },
  
  nextRetryAt: { type: Date },
  
  description: {
    type: String,
    trim: true,
    maxlength: 500
  },
  
  notes: {
    type: String,
    trim: true,
    maxlength: 1000
  },
  
  tags: [{
    type: String,
    trim: true,
    lowercase: true
  }]
  
}, {
  timestamps: true,
  collection: 'payment_transactions'
});

// 🔍 Índices compuestos para optimización
PaymentTransactionSchema.index({ payerId: 1, status: 1 });
PaymentTransactionSchema.index({ payeeId: 1, status: 1 });
PaymentTransactionSchema.index({ orderId: 1, status: 1 });
PaymentTransactionSchema.index({ method: 1, status: 1 });
PaymentTransactionSchema.index({ 'amount.currency': 1, status: 1 });
PaymentTransactionSchema.index({ createdAt: -1 });
PaymentTransactionSchema.index({ status: 1, nextRetryAt: 1 });

// 🛡️ Middleware pre-save
PaymentTransactionSchema.pre('save', function(next) {
  // Generar código de referencia único si no existe
  if (!this.referenceCode) {
    this.referenceCode = generateReferenceCode();
  }
  
  // Actualizar timestamps basados en estado
  const now = new Date();
  
  if (this.isModified('status')) {
    switch (this.status) {
      case 'processing':
        if (!this.processedAt) this.processedAt = now;
        break;
      case 'paid':
        if (!this.completedAt) this.completedAt = now;
        break;
      case 'failed':
        if (!this.failedAt) this.failedAt = now;
        break;
    }
  }
  
  // Calcular fee total
  this.fees.total = this.fees.platform + this.fees.payment;
  
  next();
});

// 📊 Métodos estáticos
PaymentTransactionSchema.statics.findByOrder = function(orderId: string) {
  return this.find({ orderId }).populate('paymentMethodId').sort({ createdAt: -1 });
};

PaymentTransactionSchema.statics.findByUser = function(userId: string, status?: string) {
  const query: any = { payerId: userId };
  if (status) query.status = status;
  return this.find(query).populate('paymentMethodId').sort({ createdAt: -1 });
};

PaymentTransactionSchema.statics.findByOrganization = function(orgId: string, status?: string) {
  const query: any = { payeeId: orgId };
  if (status) query.status = status;
  return this.find(query).populate('paymentMethodId payerId').sort({ createdAt: -1 });
};

PaymentTransactionSchema.statics.findByReference = function(referenceCode: string) {
  return this.findOne({ referenceCode: referenceCode.toUpperCase() }).populate('paymentMethodId');
};

PaymentTransactionSchema.statics.findPendingRetries = function() {
  return this.find({
    status: 'failed',
    retryCount: { $lt: this.maxRetries },
    nextRetryAt: { $lte: new Date() }
  });
};

PaymentTransactionSchema.statics.getStatsByOrganization = function(orgId: string, startDate?: Date, endDate?: Date) {
  const matchStage: any = { payeeId: mongoose.Types.ObjectId(orgId) };
  
  if (startDate || endDate) {
    matchStage.createdAt = {};
    if (startDate) matchStage.createdAt.$gte = startDate;
    if (endDate) matchStage.createdAt.$lte = endDate;
  }
  
  return this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        totalAmount: { $sum: '$amount.converted' },
        totalFees: { $sum: '$fees.total' }
      }
    }
  ]);
};

// 🔧 Métodos de instancia
PaymentTransactionSchema.methods.addEvent = function(type: string, status: string, message: string, data?: any) {
  this.events.push({
    type,
    status,
    message,
    data,
    timestamp: new Date()
  });
  return this.save();
};

PaymentTransactionSchema.methods.canRetry = function() {
  return this.status === 'failed' && 
         this.retryCount < this.maxRetries && 
         (!this.nextRetryAt || this.nextRetryAt <= new Date());
};

PaymentTransactionSchema.methods.scheduleRetry = function(delayMinutes: number = 30) {
  this.nextRetryAt = new Date(Date.now() + delayMinutes * 60 * 1000);
  this.retryCount += 1;
  return this.save();
};

PaymentTransactionSchema.methods.addRefund = function(amount: number, reason: string, refundId: string) {
  this.refunds.push({
    amount,
    reason,
    refundId,
    status: 'pending',
    createdAt: new Date()
  });
  
  // Actualizar estado principal si es reembolso total
  const totalRefunded = this.refunds.reduce((sum, refund) => sum + refund.amount, 0);
  if (totalRefunded >= this.amount.converted) {
    this.status = 'refunded';
  } else if (totalRefunded > 0) {
    this.status = 'partially_refunded';
  }
  
  return this.save();
};

PaymentTransactionSchema.methods.getTotalRefunded = function() {
  return this.refunds
    .filter(refund => refund.status === 'completed')
    .reduce((sum, refund) => sum + refund.amount, 0);
};

PaymentTransactionSchema.methods.getRemainingAmount = function() {
  return this.amount.converted - this.getTotalRefunded();
};

// 🏷️ Virtuals
PaymentTransactionSchema.virtual('isRefundable').get(function() {
  return ['paid', 'partially_refunded'].includes(this.status) && this.getRemainingAmount() > 0;
});

PaymentTransactionSchema.virtual('netAmount').get(function() {
  return this.amount.converted - this.fees.total;
});

PaymentTransactionSchema.virtual('displayStatus').get(function() {
  const statusMap: Record<string, string> = {
    pending: 'Pendiente',
    processing: 'Procesando',
    paid: 'Pagado',
    failed: 'Fallido',
    cancelled: 'Cancelado',
    refunded: 'Reembolsado',
    partially_refunded: 'Parcialmente Reembolsado'
  };
  return statusMap[this.status] || this.status;
});

// 🔧 Función auxiliar para generar código de referencia
function generateReferenceCode(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substr(2, 4).toUpperCase();
  return `PAY-${timestamp}-${random}`;
}

const PaymentTransaction = mongoose.models.PaymentTransaction || 
  mongoose.model<IPaymentTransaction>('PaymentTransaction', PaymentTransactionSchema);

export default PaymentTransaction;
