import mongoose, { Schema, Document } from 'mongoose';

export interface IRewardClaim extends Document {
  userId: string;
  rewardId: string;
  rewardSnapshot: {
    title: string;
    description: string;
    cost: number;
    type: string;
    imageUrl: string;
  };
  status: 'pending' | 'approved' | 'rejected' | 'delivered' | 'cancelled';
  claimedAt: Date;
  processedAt?: Date;
  deliveredAt?: Date;
  trackingCode?: string;
  adminNotes?: string;
  userNotes?: string;
  pointsDeducted: number;
  metadata?: {
    shippingAddress?: any;
    contactInfo?: any;
    preferences?: any;
    processingDetails?: any;
  };
  createdAt: Date;
  updatedAt: Date;
}

const RewardClaimSchema: Schema = new Schema<IRewardClaim>(
  {
    userId: {
      type: String,
      required: true,
      index: true
    },
    rewardId: {
      type: Schema.Types.ObjectId,
      ref: 'RewardItem',
      required: true
    },
    rewardSnapshot: {
      title: { type: String, required: true },
      description: { type: String, required: true },
      cost: { type: Number, required: true },
      type: { type: String, required: true },
      imageUrl: { type: String, required: true }
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'delivered', 'cancelled'],
      default: 'pending',
      index: true
    },
    claimedAt: {
      type: Date,
      default: Date.now
    },
    processedAt: {
      type: Date
    },
    deliveredAt: {
      type: Date
    },
    trackingCode: {
      type: String,
      sparse: true,
      unique: true
    },
    adminNotes: {
      type: String
    },
    userNotes: {
      type: String
    },
    pointsDeducted: {
      type: Number,
      required: true,
      min: 0
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {}
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Índices para consultas eficientes
RewardClaimSchema.index({ userId: 1, status: 1 });
RewardClaimSchema.index({ status: 1, claimedAt: -1 });
RewardClaimSchema.index({ rewardId: 1, status: 1 });
RewardClaimSchema.index({ trackingCode: 1 });

// Virtual para poblar la recompensa
RewardClaimSchema.virtual('reward', {
  ref: 'RewardItem',
  localField: 'rewardId',
  foreignField: '_id',
  justOne: true
});

// Virtual para calcular días desde el claim
RewardClaimSchema.virtual('daysSinceClaim').get(function() {
  const now = new Date();
  const claimed = new Date(this.claimedAt);
  const diffTime = Math.abs(now.getTime() - claimed.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

// Virtual para estado legible
RewardClaimSchema.virtual('statusDisplay').get(function() {
  const statusMap = {
    pending: 'Pendiente',
    approved: 'Aprobado',
    rejected: 'Rechazado',
    delivered: 'Entregado',
    cancelled: 'Cancelado'
  };
  return statusMap[this.status] || this.status;
});

// Método para aprobar claim
RewardClaimSchema.methods.approve = async function(adminNotes?: string, trackingCode?: string) {
  this.status = 'approved';
  this.processedAt = new Date();
  if (adminNotes) this.adminNotes = adminNotes;
  if (trackingCode) this.trackingCode = trackingCode;
  return this.save();
};

// Método para rechazar claim
RewardClaimSchema.methods.reject = async function(reason: string) {
  this.status = 'rejected';
  this.processedAt = new Date();
  this.adminNotes = reason;
  return this.save();
};

// Método para marcar como entregado
RewardClaimSchema.methods.markDelivered = async function(deliveryNotes?: string) {
  this.status = 'delivered';
  this.deliveredAt = new Date();
  if (deliveryNotes) this.adminNotes = deliveryNotes;
  return this.save();
};

// Método para generar código de tracking
RewardClaimSchema.methods.generateTrackingCode = function(): string {
  const prefix = this.rewardSnapshot.type.toUpperCase().slice(0, 3);
  const timestamp = Date.now().toString().slice(-6);
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}-${timestamp}-${random}`;
};

// Método estático para obtener claims por usuario
RewardClaimSchema.statics.getByUser = async function(userId: string, options: {
  status?: string;
  limit?: number;
  populate?: boolean;
} = {}) {
  let query = this.find({ userId });
  
  if (options.status) {
    query = query.where('status', options.status);
  }
  
  query = query.sort({ claimedAt: -1 });
  
  if (options.limit) {
    query = query.limit(options.limit);
  }
  
  if (options.populate) {
    query = query.populate('reward');
  }
  
  return query;
};

// Método estático para obtener estadísticas de claims
RewardClaimSchema.statics.getStats = async function() {
  const stats = await this.aggregate([
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        totalPoints: { $sum: '$pointsDeducted' }
      }
    }
  ]);
  
  const totalClaims = await this.countDocuments();
  const avgProcessingTime = await this.aggregate([
    {
      $match: {
        status: { $in: ['approved', 'delivered'] },
        processedAt: { $exists: true }
      }
    },
    {
      $group: {
        _id: null,
        avgTime: {
          $avg: {
            $subtract: ['$processedAt', '$claimedAt']
          }
        }
      }
    }
  ]);
  
  return {
    byStatus: stats,
    totalClaims,
    avgProcessingTimeHours: avgProcessingTime[0]?.avgTime ? 
      avgProcessingTime[0].avgTime / (1000 * 60 * 60) : 0
  };
};

export default mongoose.models.RewardClaim || 
  mongoose.model<IRewardClaim>('RewardClaim', RewardClaimSchema);
