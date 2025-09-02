import mongoose, { Schema, Document } from 'mongoose';

export interface IVerificationRequest extends Document {
  userId: string;
  companyType: 'persona_fisica' | 'persona_moral';
  businessName: string;
  legalName: string;
  rfc: string;
  phone: string;
  email: string;
  address: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  
  // 📄 DOCUMENTOS
  documents: {
    ine: {
      frontUrl: string;
      backUrl: string;
      uploadedAt: Date;
    };
    rfc: {
      fileUrl: string;
      uploadedAt: Date;
    };
    constitutiveAct?: {
      fileUrl: string;
      uploadedAt: Date;
    };
    addressProof: {
      fileUrl: string;
      uploadedAt: Date;
    };
    additionalDocs?: Array<{
      name: string;
      fileUrl: string;
      uploadedAt: Date;
    }>;
  };
  
  // 🔍 ESTADO DE VERIFICACIÓN
  status: 'pending' | 'in_review' | 'approved' | 'rejected' | 'documents_required';
  submittedAt: Date;
  reviewedAt?: Date;
  reviewedBy?: string; // ID del admin que revisó
  
  // 📝 COMENTARIOS Y JUSTIFICACIÓN
  businessJustification?: string;
  adminNotes?: string;
  rejectionReason?: string;
  
  // 🔒 METADATA DE SEGURIDAD
  ipAddress: string;
  userAgent: string;
  verificationScore?: number; // Score automático (0-100)
  
  // 📊 INFORMACIÓN ADICIONAL
  previousRejections: number;
  isResubmission: boolean;
  originalRequestId?: string;
  
  // 🎯 CATEGORÍA DE NEGOCIO
  businessCategory: 'dental_supplies' | 'equipment' | 'technology' | 'services' | 'other';
  yearsInBusiness?: number;
  estimatedMonthlyVolume?: string;
  
  createdAt: Date;
  updatedAt: Date;
}

const VerificationRequestSchema: Schema = new Schema<IVerificationRequest>(
  {
    userId: {
      type: String,
      required: true,
      index: true
    },
    companyType: {
      type: String,
      enum: ['persona_fisica', 'persona_moral'],
      required: true
    },
    businessName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200
    },
    legalName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200
    },
    rfc: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
      minlength: 12,
      maxlength: 13,
      match: /^[A-ZÑ&]{3,4}[0-9]{2}(0[1-9]|1[0-2])(0[1-9]|[12][0-9]|3[01])[A-Z0-9]{2}[0-9A]$/
    },
    phone: {
      type: String,
      required: true,
      trim: true
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true
    },
    address: {
      street: { type: String, required: true, trim: true },
      city: { type: String, required: true, trim: true },
      state: { type: String, required: true, trim: true },
      zipCode: { type: String, required: true, trim: true },
      country: { type: String, required: true, default: 'México' }
    },
    
    // 📄 DOCUMENTOS
    documents: {
      ine: {
        frontUrl: { type: String, required: true },
        backUrl: { type: String, required: true },
        uploadedAt: { type: Date, default: Date.now }
      },
      rfc: {
        fileUrl: { type: String, required: true },
        uploadedAt: { type: Date, default: Date.now }
      },
      constitutiveAct: {
        fileUrl: { type: String },
        uploadedAt: { type: Date }
      },
      addressProof: {
        fileUrl: { type: String, required: true },
        uploadedAt: { type: Date, default: Date.now }
      },
      additionalDocs: [{
        name: { type: String, required: true },
        fileUrl: { type: String, required: true },
        uploadedAt: { type: Date, default: Date.now }
      }]
    },
    
    // 🔍 ESTADO DE VERIFICACIÓN
    status: {
      type: String,
      enum: ['pending', 'in_review', 'approved', 'rejected', 'documents_required'],
      default: 'pending',
      index: true
    },
    submittedAt: {
      type: Date,
      default: Date.now,
      index: true
    },
    reviewedAt: {
      type: Date
    },
    reviewedBy: {
      type: String,
      index: true
    },
    
    // 📝 COMENTARIOS Y JUSTIFICACIÓN
    businessJustification: {
      type: String,
      maxlength: 1000
    },
    adminNotes: {
      type: String,
      maxlength: 1000
    },
    rejectionReason: {
      type: String,
      maxlength: 500
    },
    
    // 🔒 METADATA DE SEGURIDAD
    ipAddress: {
      type: String,
      required: true
    },
    userAgent: {
      type: String,
      required: true
    },
    verificationScore: {
      type: Number,
      min: 0,
      max: 100
    },
    
    // 📊 INFORMACIÓN ADICIONAL
    previousRejections: {
      type: Number,
      default: 0,
      min: 0
    },
    isResubmission: {
      type: Boolean,
      default: false
    },
    originalRequestId: {
      type: String,
      index: true
    },
    
    // 🎯 CATEGORÍA DE NEGOCIO
    businessCategory: {
      type: String,
      enum: ['dental_supplies', 'equipment', 'technology', 'services', 'other'],
      required: true
    },
    yearsInBusiness: {
      type: Number,
      min: 0,
      max: 100
    },
    estimatedMonthlyVolume: {
      type: String,
      enum: ['0-10k', '10k-50k', '50k-100k', '100k-500k', '500k+']
    }
  },
  { 
    timestamps: true,
    collection: 'verification_requests'
  }
);

// 🔍 ÍNDICES COMPUESTOS
VerificationRequestSchema.index({ userId: 1, status: 1 });
VerificationRequestSchema.index({ status: 1, submittedAt: -1 });
VerificationRequestSchema.index({ reviewedBy: 1, reviewedAt: -1 });
VerificationRequestSchema.index({ rfc: 1 }, { unique: false }); // Permitir múltiples intentos del mismo RFC

// 🏷️ VIRTUAL: Tiempo transcurrido desde envío
VerificationRequestSchema.virtual('daysSinceSubmission').get(function(this: IVerificationRequest) {
  if (!this.submittedAt) return 0;
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - (this.submittedAt as Date).getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

// 🏷️ VIRTUAL: Estado para mostrar al usuario
VerificationRequestSchema.virtual('displayStatus').get(function(this: IVerificationRequest) {
  const statusMap: Record<string, string> = {
    'pending': 'Pendiente de revisión',
    'in_review': 'En revisión',
    'approved': 'Aprobado',
    'rejected': 'Rechazado',
    'documents_required': 'Documentos adicionales requeridos'
  };
  return statusMap[this.status as string] || this.status;
});

// 🔒 MÉTODO: Verificar si puede ser reenviado
VerificationRequestSchema.methods.canResubmit = function(): boolean {
  return this.status === 'rejected' && this.previousRejections < 3;
};

// 🔒 MÉTODO: Calcular score automático
VerificationRequestSchema.methods.calculateVerificationScore = function(): number {
  let score = 0;
  
  // Documentos completos (+40 puntos)
  if (this.documents?.ine?.frontUrl && this.documents?.ine?.backUrl) score += 10;
  if (this.documents?.rfc?.fileUrl) score += 10;
  if (this.documents?.addressProof?.fileUrl) score += 10;
  if (this.companyType === 'persona_moral' && this.documents?.constitutiveAct?.fileUrl) score += 10;
  
  // RFC válido (+20 puntos)
  if (this.rfc && /^[A-ZÑ&]{3,4}[0-9]{2}(0[1-9]|1[0-2])(0[1-9]|[12][0-9]|3[01])[A-Z0-9]{2}[0-9A]$/.test(this.rfc)) {
    score += 20;
  }
  
  // Información comercial completa (+20 puntos)
  if (this.businessJustification && this.businessJustification.length > 50) score += 10;
  if (this.yearsInBusiness && this.yearsInBusiness > 0) score += 5;
  if (this.estimatedMonthlyVolume) score += 5;
  
  // Sin rechazos previos (+20 puntos)
  if (this.previousRejections === 0) score += 20;
  else if (this.previousRejections === 1) score += 10;
  else if (this.previousRejections === 2) score += 5;
  
  return Math.min(score, 100);
};

// 📊 MÉTODO ESTÁTICO: Estadísticas de verificación
VerificationRequestSchema.statics.getVerificationStats = async function() {
  const stats = await this.aggregate([
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        avgDays: {
          $avg: {
            $divide: [
              { $subtract: ['$$NOW', '$submittedAt'] },
              1000 * 60 * 60 * 24
            ]
          }
        }
      }
    }
  ]);
  
  const totalRequests = await this.countDocuments();
  const approvalRate = await this.countDocuments({ status: 'approved' }) / totalRequests * 100;
  
  return {
    byStatus: stats,
    totalRequests,
    approvalRate: Math.round(approvalRate * 100) / 100
  };
};

// Asegurar que los virtuals se incluyan en JSON
VerificationRequestSchema.set('toJSON', { virtuals: true });
VerificationRequestSchema.set('toObject', { virtuals: true });

export default mongoose.models.VerificationRequest || mongoose.model<IVerificationRequest>('VerificationRequest', VerificationRequestSchema);
