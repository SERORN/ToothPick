import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IReview extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  targetId: Types.ObjectId;
  targetType: 'product' | 'provider' | 'distributor';
  rating: number;
  title: string;
  comment: string;
  createdAt: Date;
  updatedAt: Date;
  flags: number;
  verifiedPurchase: boolean;
  isVisible: boolean;
  moderationStatus: 'pending' | 'approved' | 'rejected';
  moderationNotes?: string;
  helpfulVotes: number;
  unhelpfulVotes: number;
  
  // Virtual fields
  user?: any;
  target?: any;
  
  // Instance methods
  calculateHelpfulness(): number;
  isReported(): boolean;
  canBeModerated(): boolean;
}

const ReviewSchema = new Schema<IReview>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  targetId: {
    type: Schema.Types.ObjectId,
    required: true,
    index: true
  },
  targetType: {
    type: String,
    enum: ['product', 'provider', 'distributor'],
    required: true,
    index: true
  },
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5,
    validate: {
      validator: function(v: number) {
        return Number.isInteger(v) && v >= 1 && v <= 5;
      },
      message: 'La calificación debe ser un número entero entre 1 y 5'
    }
  },
  title: {
    type: String,
    required: true,
    trim: true,
    minlength: [3, 'El título debe tener al menos 3 caracteres'],
    maxlength: [100, 'El título no puede exceder 100 caracteres']
  },
  comment: {
    type: String,
    required: true,
    trim: true,
    minlength: [10, 'El comentario debe tener al menos 10 caracteres'],
    maxlength: [2000, 'El comentario no puede exceder 2000 caracteres']
  },
  flags: {
    type: Number,
    default: 0,
    min: 0
  },
  verifiedPurchase: {
    type: Boolean,
    default: false,
    index: true
  },
  isVisible: {
    type: Boolean,
    default: true,
    index: true
  },
  moderationStatus: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending',
    index: true
  },
  moderationNotes: {
    type: String,
    trim: true,
    maxlength: [500, 'Las notas de moderación no pueden exceder 500 caracteres']
  },
  helpfulVotes: {
    type: Number,
    default: 0,
    min: 0
  },
  unhelpfulVotes: {
    type: Number,
    default: 0,
    min: 0
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Índices compuestos para consultas eficientes
ReviewSchema.index({ targetId: 1, targetType: 1 });
ReviewSchema.index({ userId: 1, targetId: 1, targetType: 1 }, { unique: true });
ReviewSchema.index({ rating: 1, createdAt: -1 });
ReviewSchema.index({ verifiedPurchase: 1, isVisible: 1 });
ReviewSchema.index({ moderationStatus: 1, flags: -1 });

// Virtual para obtener información del usuario
ReviewSchema.virtual('user', {
  ref: 'User',
  localField: 'userId',
  foreignField: '_id',
  justOne: true
});

// Virtual para obtener información del objetivo (producto/proveedor/distribuidor)
ReviewSchema.virtual('target', {
  ref: function(this: IReview) {
    switch (this.targetType) {
      case 'product':
        return 'Product';
      case 'provider':
        return 'User'; // Asumiendo que proveedores son usuarios
      case 'distributor':
        return 'User'; // Asumiendo que distribuidores son usuarios
      default:
        return null;
    }
  },
  localField: 'targetId',
  foreignField: '_id',
  justOne: true
});

// Método para calcular utilidad de la reseña
ReviewSchema.methods.calculateHelpfulness = function(): number {
  const total = this.helpfulVotes + this.unhelpfulVotes;
  if (total === 0) return 0;
  return (this.helpfulVotes / total) * 100;
};

// Método para verificar si está reportada
ReviewSchema.methods.isReported = function(): boolean {
  return this.flags > 0;
};

// Método para verificar si puede ser moderada
ReviewSchema.methods.canBeModerated = function(): boolean {
  return this.flags >= 3 || this.moderationStatus === 'pending';
};

// Middleware pre-save para validaciones adicionales
ReviewSchema.pre('save', function(next) {
  // Auto-aprobar reseñas con compra verificada y sin reportes
  if (this.verifiedPurchase && this.flags === 0 && this.moderationStatus === 'pending') {
    this.moderationStatus = 'approved';
  }
  
  // Ocultar reseñas con muchos reportes
  if (this.flags >= 5) {
    this.isVisible = false;
    this.moderationStatus = 'pending';
  }
  
  next();
});

// Middleware pre-find para excluir reseñas no visibles por defecto
ReviewSchema.pre(/^find/, function(this: any) {
  if (!this.getOptions().includeHidden) {
    this.where({ isVisible: true });
  }
});

// Métodos estáticos
ReviewSchema.statics.getAverageRating = async function(targetId: Types.ObjectId, targetType: string) {
  const result = await this.aggregate([
    {
      $match: {
        targetId: targetId,
        targetType: targetType,
        isVisible: true,
        moderationStatus: 'approved'
      }
    },
    {
      $group: {
        _id: null,
        averageRating: { $avg: '$rating' },
        totalReviews: { $sum: 1 },
        ratingDistribution: {
          $push: '$rating'
        }
      }
    }
  ]);
  
  if (result.length === 0) {
    return {
      averageRating: 0,
      totalReviews: 0,
      ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
    };
  }
  
  const data = result[0];
  const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  
  data.ratingDistribution.forEach((rating: number) => {
    distribution[rating as keyof typeof distribution]++;
  });
  
  return {
    averageRating: Math.round(data.averageRating * 10) / 10,
    totalReviews: data.totalReviews,
    ratingDistribution: distribution
  };
};

ReviewSchema.statics.getUserReviewStats = async function(userId: Types.ObjectId) {
  const result = await this.aggregate([
    {
      $match: {
        userId: userId,
        isVisible: true
      }
    },
    {
      $group: {
        _id: null,
        totalReviews: { $sum: 1 },
        averageRatingGiven: { $avg: '$rating' },
        verifiedReviews: {
          $sum: { $cond: ['$verifiedPurchase', 1, 0] }
        },
        helpfulVotesReceived: { $sum: '$helpfulVotes' }
      }
    }
  ]);
  
  return result.length > 0 ? result[0] : {
    totalReviews: 0,
    averageRatingGiven: 0,
    verifiedReviews: 0,
    helpfulVotesReceived: 0
  };
};

ReviewSchema.statics.getRecentReviews = async function(
  targetId: Types.ObjectId, 
  targetType: string, 
  limit = 5
) {
  return this.find({
    targetId,
    targetType,
    isVisible: true,
    moderationStatus: 'approved'
  })
  .populate('userId', 'name avatar')
  .sort({ createdAt: -1 })
  .limit(limit)
  .lean();
};

const Review = mongoose.models.Review || mongoose.model<IReview>('Review', ReviewSchema);

export default Review;
