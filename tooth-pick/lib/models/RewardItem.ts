import mongoose, { Schema, Document } from 'mongoose';

export interface IRewardItem extends Document {
  title: string;
  description: string;
  imageUrl: string;
  cost: number; // puntos requeridos
  type: 'upgrade' | 'discount' | 'product' | 'service';
  category: string;
  available: boolean;
  quantity?: number; // null = ilimitado
  roles: string[]; // ['patient', 'dentist', 'distributor']
  metadata?: {
    discountPercentage?: number;
    validDays?: number;
    productSku?: string;
    upgradeType?: string;
    serviceDetails?: any;
  };
  featured: boolean; // destacado en tienda
  expiresAt?: Date; // opcional para recompensas temporales
  createdAt: Date;
  updatedAt: Date;
}

const RewardItemSchema: Schema = new Schema<IRewardItem>(
  {
    title: {
      type: String,
      required: true,
      trim: true
    },
    description: {
      type: String,
      required: true
    },
    imageUrl: {
      type: String,
      required: true
    },
    cost: {
      type: Number,
      required: true,
      min: 0
    },
    type: {
      type: String,
      enum: ['upgrade', 'discount', 'product', 'service'],
      required: true
    },
    category: {
      type: String,
      required: true,
      default: 'general'
    },
    available: {
      type: Boolean,
      default: true
    },
    quantity: {
      type: Number,
      min: 0,
      default: null // null = ilimitado
    },
    roles: [{
      type: String,
      enum: ['patient', 'dentist', 'distributor', 'all'],
      required: true
    }],
    metadata: {
      type: Schema.Types.Mixed,
      default: {}
    },
    featured: {
      type: Boolean,
      default: false
    },
    expiresAt: {
      type: Date
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Índices para mejor rendimiento
RewardItemSchema.index({ available: 1, type: 1 });
RewardItemSchema.index({ roles: 1, cost: 1 });
RewardItemSchema.index({ featured: 1, available: 1 });
RewardItemSchema.index({ expiresAt: 1 });

// Virtual para verificar si está disponible
RewardItemSchema.virtual('isAvailable').get(function() {
  if (!this.available) return false;
  if (this.expiresAt && this.expiresAt < new Date()) return false;
  if (this.quantity !== null && this.quantity <= 0) return false;
  return true;
});

// Método para verificar si un usuario puede canjear esta recompensa
RewardItemSchema.methods.canUserClaim = function(userRole: string, userPoints: number): { canClaim: boolean; reason?: string } {
  if (!this.isAvailable) {
    return { canClaim: false, reason: 'Recompensa no disponible' };
  }
  
  if (!this.roles.includes(userRole) && !this.roles.includes('all')) {
    return { canClaim: false, reason: 'No disponible para tu rol' };
  }
  
  if (userPoints < this.cost) {
    return { canClaim: false, reason: 'Puntos insuficientes' };
  }
  
  return { canClaim: true };
};

// Método estático para obtener recompensas por rol
RewardItemSchema.statics.getByRole = async function(role: string, options: {
  category?: string;
  maxCost?: number;
  featured?: boolean;
  limit?: number;
} = {}) {
  const query: any = {
    available: true,
    $and: [
      { $or: [{ roles: role }, { roles: 'all' }] },
      { $or: [{ expiresAt: { $exists: false } }, { expiresAt: { $gt: new Date() } }] }
    ]
  };
  
  if (options.category) {
    query.category = options.category;
  }
  
  if (options.maxCost !== undefined) {
    query.cost = { $lte: options.maxCost };
  }
  
  if (options.featured !== undefined) {
    query.featured = options.featured;
  }
  
  let queryBuilder = this.find(query).sort({ featured: -1, cost: 1 });
  
  if (options.limit) {
    queryBuilder = queryBuilder.limit(options.limit);
  }
  
  return queryBuilder;
};

// Método para reducir cantidad disponible
RewardItemSchema.methods.reduceQuantity = async function(amount: number = 1) {
  if (this.quantity !== null) {
    this.quantity = Math.max(0, this.quantity - amount);
    await this.save();
  }
};

export default mongoose.models.RewardItem || 
  mongoose.model<IRewardItem>('RewardItem', RewardItemSchema);
