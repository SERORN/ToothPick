import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IReviewReport extends Document {
  _id: Types.ObjectId;
  reviewId: Types.ObjectId;
  reporterId: Types.ObjectId;
  reason: 'spam' | 'inappropriate' | 'fake' | 'offensive' | 'irrelevant' | 'other';
  reasonDetails?: string;
  status: 'pending' | 'dismissed' | 'removed';
  createdAt: Date;
  resolvedAt?: Date;
  resolvedBy?: Types.ObjectId;
  adminNotes?: string;
  
  // Virtual fields
  review?: any;
  reporter?: any;
  resolver?: any;
}

const ReviewReportSchema = new Schema<IReviewReport>({
  reviewId: {
    type: Schema.Types.ObjectId,
    ref: 'Review',
    required: true,
    index: true
  },
  reporterId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  reason: {
    type: String,
    enum: ['spam', 'inappropriate', 'fake', 'offensive', 'irrelevant', 'other'],
    required: true,
    index: true
  },
  reasonDetails: {
    type: String,
    trim: true,
    maxlength: [500, 'Los detalles del motivo no pueden exceder 500 caracteres']
  },
  status: {
    type: String,
    enum: ['pending', 'dismissed', 'removed'],
    default: 'pending',
    index: true
  },
  resolvedAt: {
    type: Date,
    index: true
  },
  resolvedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  adminNotes: {
    type: String,
    trim: true,
    maxlength: [1000, 'Las notas administrativas no pueden exceder 1000 caracteres']
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Índices compuestos para evitar reportes duplicados
ReviewReportSchema.index({ reviewId: 1, reporterId: 1 }, { unique: true });
ReviewReportSchema.index({ status: 1, createdAt: -1 });
ReviewReportSchema.index({ reason: 1, status: 1 });

// Virtual para obtener información de la reseña reportada
ReviewReportSchema.virtual('review', {
  ref: 'Review',
  localField: 'reviewId',
  foreignField: '_id',
  justOne: true
});

// Virtual para obtener información del reportador
ReviewReportSchema.virtual('reporter', {
  ref: 'User',
  localField: 'reporterId',
  foreignField: '_id',
  justOne: true
});

// Virtual para obtener información del resolvedor
ReviewReportSchema.virtual('resolver', {
  ref: 'User',
  localField: 'resolvedBy',
  foreignField: '_id',
  justOne: true
});

// Middleware pre-save para validaciones
ReviewReportSchema.pre('save', function(next) {
  // Si se marca como resuelto, establecer fecha
  if (this.status !== 'pending' && !this.resolvedAt) {
    this.resolvedAt = new Date();
  }
  
  // Validar que se proporcionen detalles cuando el motivo es 'other'
  if (this.reason === 'other' && !this.reasonDetails?.trim()) {
    return next(new Error('Se requieren detalles cuando el motivo es "otro"'));
  }
  
  next();
});

// Método estático para obtener estadísticas de reportes
ReviewReportSchema.statics.getReportStats = async function() {
  const result = await this.aggregate([
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 }
      }
    }
  ]);
  
  const stats = {
    pending: 0,
    dismissed: 0,
    removed: 0,
    total: 0
  };
  
  result.forEach(item => {
    stats[item._id as keyof typeof stats] = item.count;
    stats.total += item.count;
  });
  
  return stats;
};

// Método estático para obtener reportes por motivo
ReviewReportSchema.statics.getReportsByReason = async function() {
  const result = await this.aggregate([
    {
      $group: {
        _id: '$reason',
        count: { $sum: 1 },
        pendingCount: {
          $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] }
        }
      }
    },
    {
      $sort: { count: -1 }
    }
  ]);
  
  return result;
};

// Método estático para obtener reportes pendientes con detalles
ReviewReportSchema.statics.getPendingReports = async function(
  page = 1, 
  limit = 20, 
  filters: any = {}
) {
  const skip = (page - 1) * limit;
  
  const matchStage: any = { status: 'pending' };
  
  if (filters.reason) {
    matchStage.reason = filters.reason;
  }
  
  if (filters.dateFrom) {
    matchStage.createdAt = { $gte: new Date(filters.dateFrom) };
  }
  
  if (filters.dateTo) {
    matchStage.createdAt = { 
      ...matchStage.createdAt, 
      $lte: new Date(filters.dateTo) 
    };
  }
  
  const reports = await this.find(matchStage)
    .populate({
      path: 'review',
      populate: {
        path: 'userId',
        select: 'name email'
      }
    })
    .populate('reporterId', 'name email')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .lean();
  
  const total = await this.countDocuments(matchStage);
  
  return {
    reports,
    pagination: {
      current: page,
      pages: Math.ceil(total / limit),
      total,
      limit
    }
  };
};

// Método estático para resolver reporte
ReviewReportSchema.statics.resolveReport = async function(
  reportId: Types.ObjectId,
  adminId: Types.ObjectId,
  action: 'dismiss' | 'remove',
  adminNotes?: string
) {
  const report = await this.findById(reportId);
  
  if (!report) {
    throw new Error('Reporte no encontrado');
  }
  
  if (report.status !== 'pending') {
    throw new Error('El reporte ya ha sido resuelto');
  }
  
  // Actualizar el reporte
  report.status = action === 'dismiss' ? 'dismissed' : 'removed';
  report.resolvedBy = adminId;
  report.resolvedAt = new Date();
  report.adminNotes = adminNotes;
  
  await report.save();
  
  // Si se decide eliminar, actualizar la reseña
  if (action === 'remove') {
    const Review = mongoose.model('Review');
    await Review.findByIdAndUpdate(report.reviewId, {
      isVisible: false,
      moderationStatus: 'rejected',
      moderationNotes: `Eliminada por reporte: ${adminNotes || 'Sin notas adicionales'}`
    });
  }
  
  return report;
};

// Método para obtener reportes de un usuario específico
ReviewReportSchema.statics.getUserReports = async function(userId: Types.ObjectId) {
  return this.find({ reporterId: userId })
    .populate('review')
    .sort({ createdAt: -1 })
    .lean();
};

// Método para verificar si un usuario ya reportó una reseña
ReviewReportSchema.statics.hasUserReported = async function(
  reviewId: Types.ObjectId, 
  userId: Types.ObjectId
) {
  const report = await this.findOne({ reviewId, reporterId: userId });
  return !!report;
};

const ReviewReport = mongoose.models.ReviewReport || mongoose.model<IReviewReport>('ReviewReport', ReviewReportSchema);

export default ReviewReport;
