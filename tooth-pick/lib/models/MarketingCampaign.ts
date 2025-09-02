import mongoose, { Schema, Document } from 'mongoose';

export interface IMarketingCampaign extends Document {
  title: string;
  description: string;
  audience: 'all' | 'active' | 'inactive' | 'custom';
  customFilters?: Record<string, any>;
  scheduledAt: Date;
  status: 'pending' | 'sent' | 'failed' | 'sending';
  clinicId: mongoose.Types.ObjectId;
  channel: 'email' | 'notification' | 'sms';
  content: {
    subject?: string;
    body: string;
    ctaText?: string;
    ctaLink?: string;
    imageUrl?: string;
  };
  metrics: {
    totalSent: number;
    totalOpened: number;
    totalClicked: number;
    totalBounced: number;
    openRate: number;
    clickRate: number;
  };
  targetPatients: mongoose.Types.ObjectId[];
  sentAt?: Date;
  errorMessage?: string;
  createdAt: Date;
  updatedAt: Date;
}

const MarketingCampaignSchema: Schema = new Schema<IMarketingCampaign>(
  {
    title: {
      type: String,
      required: true,
      maxlength: 200
    },
    description: {
      type: String,
      required: true,
      maxlength: 500
    },
    audience: {
      type: String,
      enum: ['all', 'active', 'inactive', 'custom'],
      default: 'all',
      required: true
    },
    customFilters: {
      type: Schema.Types.Mixed,
      default: {}
    },
    scheduledAt: {
      type: Date,
      required: true,
      default: Date.now
    },
    status: {
      type: String,
      enum: ['pending', 'sent', 'failed', 'sending'],
      default: 'pending'
    },
    clinicId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    channel: {
      type: String,
      enum: ['email', 'notification', 'sms'],
      default: 'email',
      required: true
    },
    content: {
      subject: {
        type: String,
        maxlength: 150
      },
      body: {
        type: String,
        required: true,
        maxlength: 2000
      },
      ctaText: {
        type: String,
        maxlength: 50
      },
      ctaLink: {
        type: String,
        maxlength: 500
      },
      imageUrl: {
        type: String,
        maxlength: 500
      }
    },
    metrics: {
      totalSent: {
        type: Number,
        default: 0
      },
      totalOpened: {
        type: Number,
        default: 0
      },
      totalClicked: {
        type: Number,
        default: 0
      },
      totalBounced: {
        type: Number,
        default: 0
      },
      openRate: {
        type: Number,
        default: 0
      },
      clickRate: {
        type: Number,
        default: 0
      }
    },
    targetPatients: [{
      type: Schema.Types.ObjectId,
      ref: 'User'
    }],
    sentAt: {
      type: Date
    },
    errorMessage: {
      type: String
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Índices para rendimiento
MarketingCampaignSchema.index({ clinicId: 1, status: 1 });
MarketingCampaignSchema.index({ scheduledAt: 1, status: 1 });
MarketingCampaignSchema.index({ createdAt: -1 });

// Virtual para calcular el alcance estimado
MarketingCampaignSchema.virtual('estimatedReach').get(function() {
  return this.targetPatients?.length || 0;
});

// Método para actualizar métricas
MarketingCampaignSchema.methods.updateMetrics = function() {
  if (this.metrics.totalSent > 0) {
    this.metrics.openRate = Number(((this.metrics.totalOpened / this.metrics.totalSent) * 100).toFixed(2));
    this.metrics.clickRate = Number(((this.metrics.totalClicked / this.metrics.totalSent) * 100).toFixed(2));
  }
};

// Método para obtener estadísticas de rendimiento
MarketingCampaignSchema.methods.getPerformanceStats = function() {
  return {
    campaignId: this._id,
    title: this.title,
    status: this.status,
    channel: this.channel,
    sentAt: this.sentAt,
    metrics: this.metrics,
    estimatedReach: this.estimatedReach,
    audience: this.audience
  };
};

// Método estático para obtener campañas de una clínica
MarketingCampaignSchema.statics.getClinicCampaigns = async function(
  clinicId: string,
  status?: string,
  limit: number = 10
) {
  const query: any = { clinicId };
  if (status) {
    query.status = status;
  }

  return this.find(query)
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate('targetPatients', 'name email phone')
    .select('-content.body'); // Excluir body para listados
};

// Método estático para obtener estadísticas generales de una clínica
MarketingCampaignSchema.statics.getClinicStats = async function(clinicId: string) {
  const stats = await this.aggregate([
    { $match: { clinicId: new mongoose.Types.ObjectId(clinicId) } },
    {
      $group: {
        _id: null,
        totalCampaigns: { $sum: 1 },
        sentCampaigns: {
          $sum: { $cond: [{ $eq: ['$status', 'sent'] }, 1, 0] }
        },
        totalSent: { $sum: '$metrics.totalSent' },
        totalOpened: { $sum: '$metrics.totalOpened' },
        totalClicked: { $sum: '$metrics.totalClicked' },
        avgOpenRate: { $avg: '$metrics.openRate' },
        avgClickRate: { $avg: '$metrics.clickRate' }
      }
    }
  ]);

  return stats[0] || {
    totalCampaigns: 0,
    sentCampaigns: 0,
    totalSent: 0,
    totalOpened: 0,
    totalClicked: 0,
    avgOpenRate: 0,
    avgClickRate: 0
  };
};

export default mongoose.models.MarketingCampaign || 
  mongoose.model<IMarketingCampaign>('MarketingCampaign', MarketingCampaignSchema);
