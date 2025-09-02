// 🎯 FASE 32: Modelo de Eventos de Fidelización
// ✅ Registro histórico de activaciones de triggers de fidelidad

import mongoose, { Document, Schema } from 'mongoose';

export interface ILoyaltyEvent extends Document {
  _id: string;
  
  // Referencias
  userId: string;
  organizationId: string;
  triggerId: string; // Referencia al LoyaltyTrigger
  
  // Datos del evento
  eventType: string; // RENEW_SUBSCRIPTION, PAY_ON_TIME, etc.
  eventData: {
    sourceModule: 'subscription' | 'payment' | 'referral' | 'manual' | 'campaign';
    sourceId?: string; // ID del pago, suscripción, etc.
    description: string;
    dynamicValue?: number; // Valor para cálculos dinámicos
    metadata?: { [key: string]: any };
  };
  
  // Recompensas otorgadas
  rewards: {
    pointsAwarded: number;
    xpAwarded: number;
    tierBonusApplied?: string; // bronze, silver, gold, platinum
    bonusMultiplier?: number;
    calculationDetails?: {
      basePoints: number;
      tierBonus: number;
      multiplier: number;
      dynamicPoints: number;
    };
  };
  
  // Estado del usuario al momento del evento
  userSnapshot: {
    currentTier: string;
    totalPointsBefore: number;
    totalPointsAfter: number;
    levelBefore?: number;
    levelAfter?: number;
    subscriptionTier?: string;
  };
  
  // Control de validación
  validation: {
    isValid: boolean;
    validatedAt: Date;
    validationMethod: 'automatic' | 'manual' | 'webhook';
    validatedBy?: string; // Admin que validó manualmente
    reversalInfo?: {
      isReversed: boolean;
      reversedAt?: Date;
      reversedBy?: string;
      reason?: string;
    };
  };
  
  // Sistema de prevención de duplicados
  deduplication: {
    fingerprint: string; // Hash único para prevenir duplicados
    originalEventDate: Date; // Fecha del evento original que disparó el trigger
    processingDelay?: number; // Minutos entre evento original y procesamiento
  };
  
  // Contexto del procesamiento
  processing: {
    processedAt: Date;
    processingDuration?: number; // Milliseconds
    triggerVersion?: string; // Versión del trigger al momento de ejecución
    systemInfo?: {
      source: 'webhook' | 'cron' | 'api' | 'manual';
      serverInstance?: string;
      requestId?: string;
    };
  };
  
  createdAt: Date;
  updatedAt: Date;
}

const LoyaltyEventSchema = new Schema<ILoyaltyEvent>({
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
  
  triggerId: {
    type: String,
    required: true,
    ref: 'LoyaltyTrigger'
  },
  
  eventType: {
    type: String,
    required: true,
    uppercase: true,
    trim: true
  },
  
  eventData: {
    sourceModule: {
      type: String,
      required: true,
      enum: ['subscription', 'payment', 'referral', 'manual', 'campaign']
    },
    sourceId: {
      type: String,
      index: true
    },
    description: {
      type: String,
      required: true,
      maxlength: 500
    },
    dynamicValue: {
      type: Number,
      min: 0
    },
    metadata: {
      type: Map,
      of: Schema.Types.Mixed
    }
  },
  
  rewards: {
    pointsAwarded: {
      type: Number,
      required: true,
      min: 0
    },
    xpAwarded: {
      type: Number,
      required: true,
      min: 0,
      default: 0
    },
    tierBonusApplied: {
      type: String,
      enum: ['bronze', 'silver', 'gold', 'platinum']
    },
    bonusMultiplier: {
      type: Number,
      min: 1,
      max: 10
    },
    calculationDetails: {
      basePoints: { type: Number, min: 0 },
      tierBonus: { type: Number, min: 0, default: 0 },
      multiplier: { type: Number, min: 1, default: 1 },
      dynamicPoints: { type: Number, min: 0, default: 0 }
    }
  },
  
  userSnapshot: {
    currentTier: {
      type: String,
      required: true,
      enum: ['bronze', 'silver', 'gold', 'platinum'],
      default: 'bronze'
    },
    totalPointsBefore: {
      type: Number,
      required: true,
      min: 0
    },
    totalPointsAfter: {
      type: Number,
      required: true,
      min: 0
    },
    levelBefore: {
      type: Number,
      min: 1
    },
    levelAfter: {
      type: Number,
      min: 1
    },
    subscriptionTier: {
      type: String,
      enum: ['basic', 'plus', 'premium']
    }
  },
  
  validation: {
    isValid: {
      type: Boolean,
      required: true,
      default: true
    },
    validatedAt: {
      type: Date,
      required: true,
      default: Date.now
    },
    validationMethod: {
      type: String,
      required: true,
      enum: ['automatic', 'manual', 'webhook'],
      default: 'automatic'
    },
    validatedBy: {
      type: String
    },
    reversalInfo: {
      isReversed: {
        type: Boolean,
        default: false
      },
      reversedAt: {
        type: Date
      },
      reversedBy: {
        type: String
      },
      reason: {
        type: String,
        maxlength: 200
      }
    }
  },
  
  deduplication: {
    fingerprint: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    originalEventDate: {
      type: Date,
      required: true
    },
    processingDelay: {
      type: Number,
      min: 0
    }
  },
  
  processing: {
    processedAt: {
      type: Date,
      required: true,
      default: Date.now
    },
    processingDuration: {
      type: Number,
      min: 0
    },
    triggerVersion: {
      type: String
    },
    systemInfo: {
      source: {
        type: String,
        enum: ['webhook', 'cron', 'api', 'manual'],
        default: 'api'
      },
      serverInstance: {
        type: String
      },
      requestId: {
        type: String
      }
    }
  }
}, {
  timestamps: true,
  collection: 'loyalty_events'
});

// Índices compuestos para optimización
LoyaltyEventSchema.index({ userId: 1, createdAt: -1 });
LoyaltyEventSchema.index({ organizationId: 1, createdAt: -1 });
LoyaltyEventSchema.index({ triggerId: 1, createdAt: -1 });
LoyaltyEventSchema.index({ eventType: 1, 'eventData.sourceModule': 1 });
LoyaltyEventSchema.index({ 'validation.isValid': 1, 'validation.reversalInfo.isReversed': 1 });
LoyaltyEventSchema.index({ 'deduplication.fingerprint': 1 }, { unique: true });
LoyaltyEventSchema.index({ 'eventData.sourceId': 1 }, { sparse: true });

// Índice TTL para eventos antiguos (opcional - mantener 2 años)
LoyaltyEventSchema.index({ createdAt: 1 }, { expireAfterSeconds: 63072000 }); // 2 años

// Métodos virtuales
LoyaltyEventSchema.virtual('isEffective').get(function() {
  return this.validation.isValid && !this.validation.reversalInfo?.isReversed;
});

LoyaltyEventSchema.virtual('netPointsContribution').get(function() {
  if (!this.isEffective) return 0;
  return this.rewards.pointsAwarded;
});

LoyaltyEventSchema.virtual('processingTime').get(function() {
  const delay = this.deduplication.processingDelay || 0;
  const processingDuration = this.processing.processingDuration || 0;
  return delay * 60 * 1000 + processingDuration; // En milliseconds
});

// Métodos de instancia
LoyaltyEventSchema.methods.reverse = async function(
  reversedBy: string,
  reason: string
): Promise<void> {
  this.validation.reversalInfo = {
    isReversed: true,
    reversedAt: new Date(),
    reversedBy,
    reason
  };
  
  this.validation.isValid = false;
  await this.save();
};

LoyaltyEventSchema.methods.generateFingerprint = function(): string {
  const data = [
    this.userId,
    this.triggerId,
    this.eventType,
    this.eventData.sourceId || '',
    this.deduplication.originalEventDate.toISOString()
  ].join('|');
  
  // Crear hash simple (en producción usar crypto)
  return Buffer.from(data).toString('base64');
};

// Métodos estáticos
LoyaltyEventSchema.statics.findUserEvents = function(
  userId: string,
  options: {
    limit?: number;
    startDate?: Date;
    endDate?: Date;
    eventTypes?: string[];
    validOnly?: boolean;
  } = {}
) {
  const query: any = { userId };
  
  if (options.validOnly !== false) {
    query['validation.isValid'] = true;
    query['validation.reversalInfo.isReversed'] = { $ne: true };
  }
  
  if (options.startDate || options.endDate) {
    query.createdAt = {};
    if (options.startDate) query.createdAt.$gte = options.startDate;
    if (options.endDate) query.createdAt.$lte = options.endDate;
  }
  
  if (options.eventTypes && options.eventTypes.length > 0) {
    query.eventType = { $in: options.eventTypes };
  }
  
  return this.find(query)
    .sort({ createdAt: -1 })
    .limit(options.limit || 50)
    .populate('triggerId');
};

LoyaltyEventSchema.statics.calculateUserTotal = async function(
  userId: string,
  validOnly: boolean = true
): Promise<{ totalPoints: number, totalXP: number, eventCount: number }> {
  const matchStage: any = { userId };
  
  if (validOnly) {
    matchStage['validation.isValid'] = true;
    matchStage['validation.reversalInfo.isReversed'] = { $ne: true };
  }
  
  const result = await this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: null,
        totalPoints: { $sum: '$rewards.pointsAwarded' },
        totalXP: { $sum: '$rewards.xpAwarded' },
        eventCount: { $sum: 1 }
      }
    }
  ]);
  
  return result[0] || { totalPoints: 0, totalXP: 0, eventCount: 0 };
};

LoyaltyEventSchema.statics.findDuplicates = function(fingerprint: string) {
  return this.find({ 'deduplication.fingerprint': fingerprint });
};

LoyaltyEventSchema.statics.getEventStats = async function(
  organizationId?: string,
  dateRange?: { start: Date; end: Date }
) {
  const matchStage: any = {
    'validation.isValid': true,
    'validation.reversalInfo.isReversed': { $ne: true }
  };
  
  if (organizationId) {
    matchStage.organizationId = organizationId;
  }
  
  if (dateRange) {
    matchStage.createdAt = {
      $gte: dateRange.start,
      $lte: dateRange.end
    };
  }
  
  return await this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: {
          eventType: '$eventType',
          sourceModule: '$eventData.sourceModule'
        },
        count: { $sum: 1 },
        totalPoints: { $sum: '$rewards.pointsAwarded' },
        uniqueUsers: { $addToSet: '$userId' },
        avgPoints: { $avg: '$rewards.pointsAwarded' }
      }
    },
    {
      $project: {
        eventType: '$_id.eventType',
        sourceModule: '$_id.sourceModule',
        count: 1,
        totalPoints: 1,
        uniqueUserCount: { $size: '$uniqueUsers' },
        avgPoints: { $round: ['$avgPoints', 2] }
      }
    },
    { $sort: { count: -1 } }
  ]);
};

// Middleware pre-save
LoyaltyEventSchema.pre('save', function(next) {
  // Generar fingerprint si no existe
  if (!this.deduplication.fingerprint) {
    this.deduplication.fingerprint = this.generateFingerprint();
  }
  
  // Calcular delay de procesamiento
  if (!this.deduplication.processingDelay) {
    const now = new Date();
    const eventTime = this.deduplication.originalEventDate;
    this.deduplication.processingDelay = Math.floor((now.getTime() - eventTime.getTime()) / 60000);
  }
  
  // Validar que totalPointsAfter >= totalPointsBefore
  if (this.userSnapshot.totalPointsAfter < this.userSnapshot.totalPointsBefore) {
    next(new Error('Los puntos totales después no pueden ser menores que antes'));
    return;
  }
  
  next();
});

const LoyaltyEvent = mongoose.models.LoyaltyEvent || 
  mongoose.model<ILoyaltyEvent>('LoyaltyEvent', LoyaltyEventSchema);

export default LoyaltyEvent;
