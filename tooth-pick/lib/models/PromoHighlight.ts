import mongoose, { Schema, Document } from 'mongoose';

export interface IPromoHighlight extends Document {
  title: string;
  imageUrl: string;
  description: string;
  ctaText: string;
  ctaLink: string;
  visibleUntil: Date;
  clinicId: mongoose.Types.ObjectId;
  isActive: boolean;
  priority: number; // Para ordenar múltiples promos
  targetAudience: 'all' | 'new_patients' | 'existing_patients';
  displayLocations: ('dashboard' | 'booking' | 'profile' | 'catalog')[];
  metrics: {
    views: number;
    clicks: number;
    conversions: number;
    ctr: number; // Click Through Rate
  };
  styling: {
    backgroundColor?: string;
    textColor?: string;
    buttonColor?: string;
    position?: 'top' | 'bottom' | 'sidebar';
  };
  createdAt: Date;
  updatedAt: Date;
}

const PromoHighlightSchema: Schema = new Schema<IPromoHighlight>(
  {
    title: {
      type: String,
      required: true,
      maxlength: 100
    },
    imageUrl: {
      type: String,
      required: true,
      maxlength: 500
    },
    description: {
      type: String,
      required: true,
      maxlength: 300
    },
    ctaText: {
      type: String,
      required: true,
      maxlength: 30,
      default: 'Ver más'
    },
    ctaLink: {
      type: String,
      required: true,
      maxlength: 500
    },
    visibleUntil: {
      type: Date,
      required: true
    },
    clinicId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    isActive: {
      type: Boolean,
      default: true
    },
    priority: {
      type: Number,
      default: 1,
      min: 1,
      max: 10
    },
    targetAudience: {
      type: String,
      enum: ['all', 'new_patients', 'existing_patients'],
      default: 'all'
    },
    displayLocations: [{
      type: String,
      enum: ['dashboard', 'booking', 'profile', 'catalog'],
      default: ['dashboard']
    }],
    metrics: {
      views: {
        type: Number,
        default: 0
      },
      clicks: {
        type: Number,
        default: 0
      },
      conversions: {
        type: Number,
        default: 0
      },
      ctr: {
        type: Number,
        default: 0
      }
    },
    styling: {
      backgroundColor: {
        type: String,
        default: '#f0f9ff'
      },
      textColor: {
        type: String,
        default: '#1f2937'
      },
      buttonColor: {
        type: String,
        default: '#3b82f6'
      },
      position: {
        type: String,
        enum: ['top', 'bottom', 'sidebar'],
        default: 'top'
      }
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Índices para rendimiento
PromoHighlightSchema.index({ clinicId: 1, isActive: 1 });
PromoHighlightSchema.index({ visibleUntil: 1, isActive: 1 });
PromoHighlightSchema.index({ priority: -1, createdAt: -1 });

// Virtual para verificar si la promoción está activa y vigente
PromoHighlightSchema.virtual('isCurrentlyActive').get(function() {
  return this.isActive && new Date() <= new Date(this.visibleUntil);
});

// Método para registrar una vista
PromoHighlightSchema.methods.recordView = async function() {
  this.metrics.views += 1;
  this.updateCTR();
  await this.save();
};

// Método para registrar un clic
PromoHighlightSchema.methods.recordClick = async function() {
  this.metrics.clicks += 1;
  this.updateCTR();
  await this.save();
};

// Método para registrar una conversión
PromoHighlightSchema.methods.recordConversion = async function() {
  this.metrics.conversions += 1;
  await this.save();
};

// Método para actualizar CTR
PromoHighlightSchema.methods.updateCTR = function() {
  if (this.metrics.views > 0) {
    this.metrics.ctr = Number(((this.metrics.clicks / this.metrics.views) * 100).toFixed(2));
  }
};

// Método para obtener estadísticas de rendimiento
PromoHighlightSchema.methods.getPerformanceStats = function() {
  return {
    promoId: this._id,
    title: this.title,
    isActive: this.isCurrentlyActive,
    metrics: this.metrics,
    daysRemaining: Math.ceil((new Date(this.visibleUntil).getTime() - Date.now()) / (1000 * 60 * 60 * 24)),
    displayLocations: this.displayLocations
  };
};

// Método estático para obtener promociones activas por ubicación
PromoHighlightSchema.statics.getActivePromos = async function(
  location: string,
  clinicId?: string,
  userType?: string
) {
  const now = new Date();
  const query: any = {
    isActive: true,
    visibleUntil: { $gte: now },
    displayLocations: location
  };

  if (clinicId) {
    query.clinicId = clinicId;
  }

  if (userType && userType !== 'all') {
    query.$or = [
      { targetAudience: 'all' },
      { targetAudience: userType }
    ];
  }

  return this.find(query)
    .sort({ priority: -1, createdAt: -1 })
    .populate('clinicId', 'name logoUrl')
    .limit(5); // Máximo 5 promociones por ubicación
};

// Método estático para obtener promociones de una clínica
PromoHighlightSchema.statics.getClinicPromos = async function(
  clinicId: string,
  includeInactive: boolean = false
) {
  const query: any = { clinicId };
  
  if (!includeInactive) {
    query.isActive = true;
    query.visibleUntil = { $gte: new Date() };
  }

  return this.find(query)
    .sort({ priority: -1, createdAt: -1 });
};

// Método estático para obtener estadísticas de promociones de una clínica
PromoHighlightSchema.statics.getClinicPromoStats = async function(clinicId: string) {
  const stats = await this.aggregate([
    { $match: { clinicId: new mongoose.Types.ObjectId(clinicId) } },
    {
      $group: {
        _id: null,
        totalPromos: { $sum: 1 },
        activePromos: {
          $sum: {
            $cond: [
              {
                $and: [
                  { $eq: ['$isActive', true] },
                  { $gte: ['$visibleUntil', new Date()] }
                ]
              },
              1,
              0
            ]
          }
        },
        totalViews: { $sum: '$metrics.views' },
        totalClicks: { $sum: '$metrics.clicks' },
        totalConversions: { $sum: '$metrics.conversions' },
        avgCTR: { $avg: '$metrics.ctr' }
      }
    }
  ]);

  return stats[0] || {
    totalPromos: 0,
    activePromos: 0,
    totalViews: 0,
    totalClicks: 0,
    totalConversions: 0,
    avgCTR: 0
  };
};

// Middleware para limpiar promociones expiradas
PromoHighlightSchema.pre('find', function() {
  // Auto-desactivar promociones expiradas
  this.updateMany(
    {
      visibleUntil: { $lt: new Date() },
      isActive: true
    },
    {
      $set: { isActive: false }
    }
  );
});

export default mongoose.models.PromoHighlight || 
  mongoose.model<IPromoHighlight>('PromoHighlight', PromoHighlightSchema);
