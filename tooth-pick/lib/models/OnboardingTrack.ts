import mongoose, { Schema, Document } from 'mongoose';

export interface IOnboardingStep {
  stepId: string;
  title: string;
  description: string;
  type: 'video' | 'task' | 'article' | 'quiz' | 'interactive';
  contentRef: string; // URL, ArticleSlug, task ID, quiz ID
  required: boolean;
  order: number;
  estimatedMinutes: number;
  validationCriteria?: {
    type: 'api_call' | 'manual' | 'quiz_score' | 'event_trigger';
    endpoint?: string;
    minScore?: number;
    eventName?: string;
  };
  prerequisites?: string[]; // stepIds que deben completarse antes
  rewards?: {
    points: number;
    badge?: string;
    unlockFeature?: string;
  };
}

export interface IOnboardingTrack extends Document {
  role: 'patient' | 'dentist' | 'distributor' | 'admin';
  title: string;
  description: string;
  icon: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  category: string;
  steps: IOnboardingStep[];
  totalMinutes: number;
  completionRewards: {
    points: number;
    certificate: string;
    unlockFeatures: string[];
    badge: string;
  };
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  createdBy: mongoose.Types.ObjectId;
}

const OnboardingStepSchema = new Schema<IOnboardingStep>({
  stepId: {
    type: String,
    required: true
  },
  title: {
    type: String,
    required: true,
    maxlength: 100
  },
  description: {
    type: String,
    required: true,
    maxlength: 500
  },
  type: {
    type: String,
    enum: ['video', 'task', 'article', 'quiz', 'interactive'],
    required: true
  },
  contentRef: {
    type: String,
    required: true
  },
  required: {
    type: Boolean,
    default: true
  },
  order: {
    type: Number,
    required: true,
    min: 1
  },
  estimatedMinutes: {
    type: Number,
    required: true,
    min: 1,
    max: 120
  },
  validationCriteria: {
    type: {
      type: String,
      enum: ['api_call', 'manual', 'quiz_score', 'event_trigger']
    },
    endpoint: String,
    minScore: {
      type: Number,
      min: 0,
      max: 100
    },
    eventName: String
  },
  prerequisites: [{
    type: String
  }],
  rewards: {
    points: {
      type: Number,
      default: 10,
      min: 0
    },
    badge: String,
    unlockFeature: String
  }
});

const OnboardingTrackSchema: Schema = new Schema<IOnboardingTrack>(
  {
    role: {
      type: String,
      enum: ['patient', 'dentist', 'distributor', 'admin'],
      required: true
    },
    title: {
      type: String,
      required: true,
      maxlength: 150
    },
    description: {
      type: String,
      required: true,
      maxlength: 1000
    },
    icon: {
      type: String,
      required: true
    },
    difficulty: {
      type: String,
      enum: ['beginner', 'intermediate', 'advanced'],
      default: 'beginner'
    },
    category: {
      type: String,
      required: true
    },
    steps: [OnboardingStepSchema],
    totalMinutes: {
      type: Number,
      default: 0
    },
    completionRewards: {
      points: {
        type: Number,
        default: 100,
        min: 0
      },
      certificate: {
        type: String,
        required: true
      },
      unlockFeatures: [{
        type: String
      }],
      badge: {
        type: String,
        required: true
      }
    },
    isActive: {
      type: Boolean,
      default: true
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Índices para optimización
OnboardingTrackSchema.index({ role: 1, isActive: 1 });
OnboardingTrackSchema.index({ category: 1, difficulty: 1 });
OnboardingTrackSchema.index({ 'steps.stepId': 1 });

// Virtual para calcular minutos totales
OnboardingTrackSchema.virtual('calculatedTotalMinutes').get(function() {
  return this.steps.reduce((total, step) => total + step.estimatedMinutes, 0);
});

// Middleware para actualizar totalMinutes antes de guardar
OnboardingTrackSchema.pre('save', function(next) {
  if (this.steps && this.steps.length > 0) {
    this.totalMinutes = this.steps.reduce((total, step) => total + step.estimatedMinutes, 0);
  }
  next();
});

// Método para obtener paso por ID
OnboardingTrackSchema.methods.getStep = function(stepId: string): IOnboardingStep | null {
  return this.steps.find((step: IOnboardingStep) => step.stepId === stepId) || null;
};

// Método para validar orden de pasos
OnboardingTrackSchema.methods.validateStepOrder = function(): boolean {
  const orders = this.steps.map((step: IOnboardingStep) => step.order);
  const sortedOrders = [...orders].sort((a, b) => a - b);
  return JSON.stringify(orders) === JSON.stringify(sortedOrders);
};

// Método estático para obtener tracks por rol
OnboardingTrackSchema.statics.getTracksByRole = async function(
  role: string,
  difficulty?: string,
  category?: string
) {
  const query: any = { role, isActive: true };
  
  if (difficulty) {
    query.difficulty = difficulty;
  }
  
  if (category) {
    query.category = category;
  }
  
  return this.find(query)
    .populate('createdBy', 'name email')
    .sort({ difficulty: 1, createdAt: -1 });
};

// Método estático para obtener estadísticas
OnboardingTrackSchema.statics.getTrackStats = async function() {
  const stats = await this.aggregate([
    { $match: { isActive: true } },
    {
      $group: {
        _id: '$role',
        totalTracks: { $sum: 1 },
        avgDuration: { $avg: '$totalMinutes' },
        difficulties: {
          $push: '$difficulty'
        }
      }
    }
  ]);
  
  return stats;
};

export default mongoose.models.OnboardingTrack || 
  mongoose.model<IOnboardingTrack>('OnboardingTrack', OnboardingTrackSchema);
