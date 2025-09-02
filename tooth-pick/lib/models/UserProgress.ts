import mongoose, { Schema, Document } from 'mongoose';

export interface IStepProgress {
  stepId: string;
  completedAt: Date;
  timeSpentMinutes: number;
  score?: number; // Para quizzes
  attempts: number;
  feedback?: string;
  validationData?: any; // Datos de validación específicos
}

export interface IUserProgress extends Document {
  userId: mongoose.Types.ObjectId;
  trackId: mongoose.Types.ObjectId;
  role: string;
  trackTitle: string;
  status: 'not_started' | 'in_progress' | 'completed' | 'paused';
  currentStepId?: string;
  completedSteps: IStepProgress[];
  totalSteps: number;
  completionPercentage: number;
  totalTimeSpentMinutes: number;
  totalPointsEarned: number;
  startedAt: Date;
  lastActivityAt: Date;
  completedAt?: Date;
  certificateIssued: boolean;
  unlockedFeatures: string[];
  badges: string[];
  createdAt: Date;
  updatedAt: Date;
}

const StepProgressSchema = new Schema<IStepProgress>({
  stepId: {
    type: String,
    required: true
  },
  completedAt: {
    type: Date,
    required: true,
    default: Date.now
  },
  timeSpentMinutes: {
    type: Number,
    required: true,
    min: 0
  },
  score: {
    type: Number,
    min: 0,
    max: 100
  },
  attempts: {
    type: Number,
    default: 1,
    min: 1
  },
  feedback: {
    type: String,
    maxlength: 1000
  },
  validationData: {
    type: Schema.Types.Mixed
  }
});

const UserProgressSchema: Schema = new Schema<IUserProgress>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    trackId: {
      type: Schema.Types.ObjectId,
      ref: 'OnboardingTrack',
      required: true
    },
    role: {
      type: String,
      enum: ['patient', 'dentist', 'distributor', 'admin'],
      required: true
    },
    trackTitle: {
      type: String,
      required: true
    },
    status: {
      type: String,
      enum: ['not_started', 'in_progress', 'completed', 'paused'],
      default: 'not_started'
    },
    currentStepId: {
      type: String
    },
    completedSteps: [StepProgressSchema],
    totalSteps: {
      type: Number,
      required: true,
      min: 1
    },
    completionPercentage: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    },
    totalTimeSpentMinutes: {
      type: Number,
      default: 0,
      min: 0
    },
    totalPointsEarned: {
      type: Number,
      default: 0,
      min: 0
    },
    startedAt: {
      type: Date,
      default: Date.now
    },
    lastActivityAt: {
      type: Date,
      default: Date.now
    },
    completedAt: {
      type: Date
    },
    certificateIssued: {
      type: Boolean,
      default: false
    },
    unlockedFeatures: [{
      type: String
    }],
    badges: [{
      type: String
    }]
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Índices para optimización
UserProgressSchema.index({ userId: 1, trackId: 1 }, { unique: true });
UserProgressSchema.index({ userId: 1, status: 1 });
UserProgressSchema.index({ role: 1, status: 1 });
UserProgressSchema.index({ lastActivityAt: -1 });

// Virtual para obtener el siguiente paso
UserProgressSchema.virtual('nextStep').get(function() {
  // Esta lógica se implementará en el servicio
  return null;
});

// Virtual para verificar si está completado
UserProgressSchema.virtual('isCompleted').get(function() {
  return this.status === 'completed' && this.completionPercentage === 100;
});

// Método para marcar paso como completado
UserProgressSchema.methods.completeStep = function(
  stepId: string,
  timeSpentMinutes: number,
  score?: number,
  feedback?: string,
  validationData?: any
) {
  // Verificar si el paso ya está completado
  const existingStep = this.completedSteps.find(
    (step: IStepProgress) => step.stepId === stepId
  );

  if (existingStep) {
    // Actualizar intento existente
    existingStep.attempts += 1;
    existingStep.timeSpentMinutes += timeSpentMinutes;
    existingStep.completedAt = new Date();
    if (score !== undefined) existingStep.score = Math.max(existingStep.score || 0, score);
    if (feedback) existingStep.feedback = feedback;
    if (validationData) existingStep.validationData = validationData;
  } else {
    // Agregar nuevo paso completado
    this.completedSteps.push({
      stepId,
      completedAt: new Date(),
      timeSpentMinutes,
      score,
      attempts: 1,
      feedback,
      validationData
    });
  }

  // Actualizar estadísticas generales
  this.totalTimeSpentMinutes = this.completedSteps.reduce(
    (total: number, step: IStepProgress) => total + step.timeSpentMinutes, 0
  );

  this.completionPercentage = Math.round(
    (this.completedSteps.length / this.totalSteps) * 100
  );

  this.lastActivityAt = new Date();

  // Actualizar estado
  if (this.completionPercentage === 100) {
    this.status = 'completed';
    this.completedAt = new Date();
  } else if (this.status === 'not_started') {
    this.status = 'in_progress';
  }

  return this.save();
};

// Método para verificar si un paso está completado
UserProgressSchema.methods.isStepCompleted = function(stepId: string): boolean {
  return this.completedSteps.some((step: IStepProgress) => step.stepId === stepId);
};

// Método para obtener progreso de un paso específico
UserProgressSchema.methods.getStepProgress = function(stepId: string): IStepProgress | null {
  return this.completedSteps.find((step: IStepProgress) => step.stepId === stepId) || null;
};

// Método para pausar progreso
UserProgressSchema.methods.pauseProgress = function() {
  this.status = 'paused';
  this.lastActivityAt = new Date();
  return this.save();
};

// Método para reanudar progreso
UserProgressSchema.methods.resumeProgress = function() {
  if (this.status === 'paused') {
    this.status = 'in_progress';
    this.lastActivityAt = new Date();
    return this.save();
  }
};

// Método estático para obtener progreso de usuario
UserProgressSchema.statics.getUserProgress = async function(
  userId: string,
  trackId?: string
) {
  const query: any = { userId };
  if (trackId) {
    query.trackId = trackId;
  }

  return this.find(query)
    .populate('trackId', 'title description icon difficulty category')
    .sort({ lastActivityAt: -1 });
};

// Método estático para obtener estadísticas de usuario
UserProgressSchema.statics.getUserStats = async function(userId: string) {
  const result = await this.aggregate([
    { $match: { userId: new mongoose.Types.ObjectId(userId) } },
    {
      $group: {
        _id: '$userId',
        totalTracks: { $sum: 1 },
        completedTracks: {
          $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
        },
        totalTimeSpent: { $sum: '$totalTimeSpentMinutes' },
        totalPoints: { $sum: '$totalPointsEarned' },
        totalBadges: { $sum: { $size: '$badges' } },
        avgCompletion: { $avg: '$completionPercentage' }
      }
    }
  ]);

  return result[0] || {
    totalTracks: 0,
    completedTracks: 0,
    totalTimeSpent: 0,
    totalPoints: 0,
    totalBadges: 0,
    avgCompletion: 0
  };
};

// Método estático para obtener leaderboard
UserProgressSchema.statics.getLeaderboard = async function(
  role?: string,
  limit: number = 10
) {
  const matchStage: any = {};
  if (role) {
    matchStage.role = role;
  }

  return this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: '$userId',
        totalPoints: { $sum: '$totalPointsEarned' },
        completedTracks: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
        totalBadges: { $sum: { $size: '$badges' } },
        avgCompletion: { $avg: '$completionPercentage' }
      }
    },
    { $sort: { totalPoints: -1, completedTracks: -1 } },
    { $limit: limit },
    {
      $lookup: {
        from: 'users',
        localField: '_id',
        foreignField: '_id',
        as: 'user'
      }
    },
    { $unwind: '$user' },
    {
      $project: {
        userId: '$_id',
        name: '$user.name',
        email: '$user.email',
        role: '$user.role',
        totalPoints: 1,
        completedTracks: 1,
        totalBadges: 1,
        avgCompletion: { $round: ['$avgCompletion', 1] }
      }
    }
  ]);
};

export default mongoose.models.UserProgress || 
  mongoose.model<IUserProgress>('UserProgress', UserProgressSchema);
