import mongoose, { Schema, Document } from 'mongoose';

export interface IVerificationLog extends Document {
  verificationRequestId: string;
  userId: string;
  adminUserId?: string;
  
  // 📋 ACCIÓN REALIZADA
  action: 'submitted' | 'reviewed' | 'approved' | 'rejected' | 'documents_requested' | 'resubmitted' | 'escalated';
  
  // 📝 DETALLES DE LA ACCIÓN
  details: {
    previousStatus?: string;
    newStatus: string;
    reason?: string;
    notes?: string;
    documentsRequested?: string[];
    changedFields?: string[];
  };
  
  // 🔒 METADATA
  ipAddress: string;
  userAgent: string;
  timestamp: Date;
  
  // 📊 DATOS CONTEXTUALES
  context: {
    verificationScore?: number;
    reviewDuration?: number; // minutos
    escalationLevel?: number; // 1-3
    riskFlags?: string[];
  };
  
  // 📎 ARCHIVOS ADJUNTOS (si aplica)
  attachments?: Array<{
    filename: string;
    fileUrl: string;
    fileType: string;
    uploadedAt: Date;
  }>;
}

const VerificationLogSchema: Schema = new Schema<IVerificationLog>(
  {
    verificationRequestId: {
      type: String,
      required: true,
      index: true
    },
    userId: {
      type: String,
      required: true,
      index: true
    },
    adminUserId: {
      type: String,
      index: true
    },
    
    // 📋 ACCIÓN REALIZADA
    action: {
      type: String,
      enum: ['submitted', 'reviewed', 'approved', 'rejected', 'documents_requested', 'resubmitted', 'escalated'],
      required: true,
      index: true
    },
    
    // 📝 DETALLES DE LA ACCIÓN
    details: {
      previousStatus: {
        type: String,
        enum: ['pending', 'in_review', 'approved', 'rejected', 'documents_required']
      },
      newStatus: {
        type: String,
        enum: ['pending', 'in_review', 'approved', 'rejected', 'documents_required'],
        required: true
      },
      reason: {
        type: String,
        maxlength: 500
      },
      notes: {
        type: String,
        maxlength: 1000
      },
      documentsRequested: [{
        type: String
      }],
      changedFields: [{
        type: String
      }]
    },
    
    // 🔒 METADATA
    ipAddress: {
      type: String,
      required: true
    },
    userAgent: {
      type: String,
      required: true
    },
    timestamp: {
      type: Date,
      default: Date.now,
      index: true
    },
    
    // 📊 DATOS CONTEXTUALES
    context: {
      verificationScore: {
        type: Number,
        min: 0,
        max: 100
      },
      reviewDuration: {
        type: Number,
        min: 0
      },
      escalationLevel: {
        type: Number,
        min: 1,
        max: 3
      },
      riskFlags: [{
        type: String
      }]
    },
    
    // 📎 ARCHIVOS ADJUNTOS
    attachments: [{
      filename: {
        type: String,
        required: true
      },
      fileUrl: {
        type: String,
        required: true
      },
      fileType: {
        type: String,
        required: true
      },
      uploadedAt: {
        type: Date,
        default: Date.now
      }
    }]
  },
  { 
    timestamps: true,
    collection: 'verification_logs'
  }
);

// 🔍 ÍNDICES COMPUESTOS
VerificationLogSchema.index({ verificationRequestId: 1, timestamp: -1 });
VerificationLogSchema.index({ userId: 1, action: 1, timestamp: -1 });
VerificationLogSchema.index({ adminUserId: 1, timestamp: -1 });
VerificationLogSchema.index({ action: 1, timestamp: -1 });

// 🏷️ VIRTUAL: Duración legible
VerificationLogSchema.virtual('readableDuration').get(function(this: IVerificationLog) {
  if (!this.context?.reviewDuration) return 'N/A';
  const minutes = this.context.reviewDuration;
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return `${hours}h ${remainingMinutes}m`;
});

// 🏷️ VIRTUAL: Descripción de la acción
VerificationLogSchema.virtual('actionDescription').get(function(this: IVerificationLog) {
  const actionMap: Record<string, string> = {
    'submitted': 'Solicitud enviada',
    'reviewed': 'Solicitud revisada',
    'approved': 'Solicitud aprobada',
    'rejected': 'Solicitud rechazada',
    'documents_requested': 'Documentos adicionales solicitados',
    'resubmitted': 'Solicitud reenviada',
    'escalated': 'Solicitud escalada'
  };
  return actionMap[this.action as string] || this.action;
});

// 📊 MÉTODO ESTÁTICO: Obtener actividad reciente de un admin
VerificationLogSchema.statics.getAdminActivity = async function(adminUserId: string, days: number = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  
  return await this.find({
    adminUserId,
    timestamp: { $gte: startDate }
  }).sort({ timestamp: -1 });
};

// 📊 MÉTODO ESTÁTICO: Estadísticas de revisión
VerificationLogSchema.statics.getReviewStats = async function(startDate?: Date, endDate?: Date) {
  const matchStage: any = {
    action: { $in: ['approved', 'rejected'] }
  };
  
  if (startDate || endDate) {
    matchStage.timestamp = {};
    if (startDate) matchStage.timestamp.$gte = startDate;
    if (endDate) matchStage.timestamp.$lte = endDate;
  }
  
  const stats = await this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: {
          action: '$action',
          admin: '$adminUserId'
        },
        count: { $sum: 1 },
        avgDuration: { $avg: '$context.reviewDuration' }
      }
    },
    {
      $group: {
        _id: '$_id.admin',
        actions: {
          $push: {
            action: '$_id.action',
            count: '$count',
            avgDuration: '$avgDuration'
          }
        },
        totalReviews: { $sum: '$count' }
      }
    }
  ]);
  
  return stats;
};

// 📊 MÉTODO ESTÁTICO: Historial completo de una solicitud
VerificationLogSchema.statics.getRequestHistory = async function(verificationRequestId: string) {
  return await this.find({ verificationRequestId })
    .sort({ timestamp: 1 })
    .populate('adminUserId', 'name email')
    .populate('userId', 'name email');
};

// Asegurar que los virtuals se incluyan en JSON
VerificationLogSchema.set('toJSON', { virtuals: true });
VerificationLogSchema.set('toObject', { virtuals: true });

export default mongoose.models.VerificationLog || mongoose.model<IVerificationLog>('VerificationLog', VerificationLogSchema);
