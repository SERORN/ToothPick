// 💳 FASE 29: Modelo PaymentMethod para MongoDB
// ✅ Sistema de métodos de pago por organización

import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IPaymentMethod extends Document {
  _id: Types.ObjectId;
  organizationId: Types.ObjectId;
  type: 'stripe' | 'paypal' | 'bank_transfer' | 'swift' | 'spei' | 'pix' | 'manual';
  currency: 'MXN' | 'USD' | 'EUR' | 'BRL' | 'CAD' | 'GBP' | 'JPY';
  name: string;
  description?: string;
  accountData: {
    // Stripe
    stripeAccountId?: string;
    publishableKey?: string;
    
    // PayPal
    paypalClientId?: string;
    paypalClientSecret?: string;
    
    // Bank Transfer / SWIFT
    bankName?: string;
    bankCode?: string;
    accountNumber?: string;
    routingNumber?: string;
    swiftCode?: string;
    iban?: string;
    
    // SPEI (México)
    clabe?: string;
    
    // Pix (Brasil)
    pixKey?: string;
    pixKeyType?: 'email' | 'phone' | 'cpf' | 'random';
    
    // Manual
    instructions?: string;
  };
  fees: {
    percentage: number;
    fixed: number;
    currency: string;
  };
  limits: {
    minAmount: number;
    maxAmount: number;
    dailyLimit?: number;
    monthlyLimit?: number;
  };
  countries: string[]; // ISO country codes
  active: boolean;
  default: boolean;
  sandbox: boolean;
  createdAt: Date;
  updatedAt: Date;
  createdBy: Types.ObjectId;
  lastUsed?: Date;
}

const PaymentMethodSchema = new Schema<IPaymentMethod>({
  organizationId: {
    type: Schema.Types.ObjectId,
    ref: 'Organization',
    required: true,
    index: true
  },
  type: {
    type: String,
    enum: ['stripe', 'paypal', 'bank_transfer', 'swift', 'spei', 'pix', 'manual'],
    required: true
  },
  currency: {
    type: String,
    enum: ['MXN', 'USD', 'EUR', 'BRL', 'CAD', 'GBP', 'JPY'],
    required: true
  },
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  description: {
    type: String,
    trim: true,
    maxlength: 500
  },
  accountData: {
    // Stripe fields
    stripeAccountId: { type: String, trim: true },
    publishableKey: { type: String, trim: true },
    
    // PayPal fields
    paypalClientId: { type: String, trim: true },
    paypalClientSecret: { type: String, trim: true },
    
    // Bank transfer fields
    bankName: { type: String, trim: true },
    bankCode: { type: String, trim: true },
    accountNumber: { type: String, trim: true },
    routingNumber: { type: String, trim: true },
    swiftCode: { type: String, trim: true },
    iban: { type: String, trim: true },
    
    // SPEI fields
    clabe: { 
      type: String, 
      trim: true,
      validate: {
        validator: function(v: string) {
          return !v || /^\d{18}$/.test(v); // CLABE must be 18 digits
        },
        message: 'CLABE debe tener exactamente 18 dígitos'
      }
    },
    
    // Pix fields
    pixKey: { type: String, trim: true },
    pixKeyType: {
      type: String,
      enum: ['email', 'phone', 'cpf', 'random']
    },
    
    // Manual instructions
    instructions: { type: String, maxlength: 1000 }
  },
  fees: {
    percentage: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    },
    fixed: {
      type: Number,
      default: 0,
      min: 0
    },
    currency: {
      type: String,
      default: 'MXN'
    }
  },
  limits: {
    minAmount: {
      type: Number,
      default: 1,
      min: 0
    },
    maxAmount: {
      type: Number,
      default: 1000000,
      min: 1
    },
    dailyLimit: {
      type: Number,
      min: 0
    },
    monthlyLimit: {
      type: Number,
      min: 0
    }
  },
  countries: [{
    type: String,
    uppercase: true,
    length: 2 // ISO 3166-1 alpha-2 codes
  }],
  active: {
    type: Boolean,
    default: true,
    index: true
  },
  default: {
    type: Boolean,
    default: false
  },
  sandbox: {
    type: Boolean,
    default: false
  },
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  lastUsed: {
    type: Date
  }
}, {
  timestamps: true,
  collection: 'payment_methods'
});

// 🔍 Índices para optimización
PaymentMethodSchema.index({ organizationId: 1, active: 1 });
PaymentMethodSchema.index({ organizationId: 1, type: 1 });
PaymentMethodSchema.index({ organizationId: 1, currency: 1 });
PaymentMethodSchema.index({ organizationId: 1, default: 1 });

// 🛡️ Validaciones personalizadas
PaymentMethodSchema.pre('save', function(next) {
  // Solo puede haber un método por defecto por organización/moneda
  if (this.default && this.isModified('default')) {
    PaymentMethod.updateMany(
      { 
        organizationId: this.organizationId,
        currency: this.currency,
        _id: { $ne: this._id }
      },
      { default: false }
    ).exec();
  }
  
  // Validar datos específicos por tipo
  if (this.type === 'stripe') {
    if (!this.accountData.stripeAccountId) {
      return next(new Error('Stripe Account ID es requerido para métodos Stripe'));
    }
  }
  
  if (this.type === 'paypal') {
    if (!this.accountData.paypalClientId) {
      return next(new Error('PayPal Client ID es requerido para métodos PayPal'));
    }
  }
  
  if (this.type === 'spei') {
    if (!this.accountData.clabe) {
      return next(new Error('CLABE es requerida para métodos SPEI'));
    }
  }
  
  if (this.type === 'pix') {
    if (!this.accountData.pixKey || !this.accountData.pixKeyType) {
      return next(new Error('Pix Key y Type son requeridos para métodos Pix'));
    }
  }
  
  next();
});

// 📊 Métodos estáticos
PaymentMethodSchema.statics.findByOrganization = function(orgId: string, currency?: string) {
  const query: any = { organizationId: orgId, active: true };
  if (currency) query.currency = currency;
  return this.find(query).sort({ default: -1, createdAt: -1 });
};

PaymentMethodSchema.statics.findDefault = function(orgId: string, currency: string) {
  return this.findOne({
    organizationId: orgId,
    currency,
    default: true,
    active: true
  });
};

PaymentMethodSchema.statics.getSupportedMethods = function(currency: string, country?: string) {
  const query: any = { currency, active: true };
  if (country) {
    query.countries = { $in: [country] };
  }
  return this.find(query).select('type name description fees limits');
};

// 🔧 Métodos de instancia
PaymentMethodSchema.methods.isCompatibleWith = function(amount: number, currency: string, country?: string) {
  // Verificar moneda
  if (this.currency !== currency) return false;
  
  // Verificar límites
  if (amount < this.limits.minAmount || amount > this.limits.maxAmount) return false;
  
  // Verificar país si se especifica
  if (country && this.countries.length > 0) {
    if (!this.countries.includes(country.toUpperCase())) return false;
  }
  
  return true;
};

PaymentMethodSchema.methods.calculateFees = function(amount: number) {
  const percentageFee = (amount * this.fees.percentage) / 100;
  const totalFee = percentageFee + this.fees.fixed;
  
  return {
    percentage: percentageFee,
    fixed: this.fees.fixed,
    total: totalFee,
    amountAfterFees: amount - totalFee,
    currency: this.fees.currency
  };
};

PaymentMethodSchema.methods.updateLastUsed = function() {
  this.lastUsed = new Date();
  return this.save();
};

// 🏷️ Virtuals
PaymentMethodSchema.virtual('isExpired').get(function() {
  // Implementar lógica de expiración si es necesario
  return false;
});

PaymentMethodSchema.virtual('displayName').get(function() {
  return `${this.name} (${this.currency})`;
});

const PaymentMethod = mongoose.models.PaymentMethod || mongoose.model<IPaymentMethod>('PaymentMethod', PaymentMethodSchema);

export default PaymentMethod;
