import mongoose, { Schema, Document } from 'mongoose';

export interface IUserGamification extends Document {
  userId: mongoose.Types.ObjectId;
  points: number;
  badges: string[];
  streak: {
    current: number;
    longest: number;
    lastActivityDate: Date;
  };
  level: number;
  experience: {
    current: number;
    nextLevelRequired: number;
  };
  lastActivity: Date;
  statistics: {
    totalEvents: number;
    eventsThisMonth: number;
    favoriteActivity: string;
    joinedDate: Date;
  };
  achievements: Array<{
    badgeId: string;
    earnedAt: Date;
    eventType: string;
    metadata?: any;
  }>;
  preferences: {
    showInLeaderboard: boolean;
    receiveBadgeNotifications: boolean;
    showProgressToOthers: boolean;
  };
  createdAt: Date;
  updatedAt: Date;
}

const UserGamificationSchema: Schema = new Schema<IUserGamification>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true
    },
    points: {
      type: Number,
      default: 0,
      min: 0,
      index: true
    },
    badges: [{
      type: String,
      index: true
    }],
    streak: {
      current: {
        type: Number,
        default: 0,
        min: 0
      },
      longest: {
        type: Number,
        default: 0,
        min: 0
      },
      lastActivityDate: {
        type: Date,
        default: Date.now
      }
    },
    level: {
      type: Number,
      default: 1,
      min: 1,
      index: true
    },
    experience: {
      current: {
        type: Number,
        default: 0,
        min: 0
      },
      nextLevelRequired: {
        type: Number,
        default: 100
      }
    },
    lastActivity: {
      type: Date,
      default: Date.now,
      index: true
    },
    statistics: {
      totalEvents: {
        type: Number,
        default: 0,
        min: 0
      },
      eventsThisMonth: {
        type: Number,
        default: 0,
        min: 0
      },
      favoriteActivity: {
        type: String,
        default: ''
      },
      joinedDate: {
        type: Date,
        default: Date.now
      }
    },
    achievements: [{
      badgeId: {
        type: String,
        required: true
      },
      earnedAt: {
        type: Date,
        default: Date.now
      },
      eventType: {
        type: String,
        required: true
      },
      metadata: Schema.Types.Mixed
    }],
    preferences: {
      showInLeaderboard: {
        type: Boolean,
        default: true
      },
      receiveBadgeNotifications: {
        type: Boolean,
        default: true
      },
      showProgressToOthers: {
        type: Boolean,
        default: true
      }
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Índices compuestos para mejor rendimiento
UserGamificationSchema.index({ userId: 1, points: -1 });
UserGamificationSchema.index({ level: -1, points: -1 });
UserGamificationSchema.index({ 'streak.current': -1 });
UserGamificationSchema.index({ lastActivity: -1 });

// Virtual para calcular el progreso del nivel actual
UserGamificationSchema.virtual('levelProgress').get(function() {
  const totalRequired = this.experience.nextLevelRequired;
  const current = this.experience.current;
  return {
    percentage: Math.round((current / totalRequired) * 100),
    current,
    required: totalRequired,
    remaining: totalRequired - current
  };
});

// Virtual para determinar el título del nivel
UserGamificationSchema.virtual('levelTitle').get(function() {
  const titles = [
    'Novato', 'Aprendiz', 'Explorador', 'Competente', 'Experto',
    'Veterano', 'Maestro', 'Leyenda', 'Campeón', 'Gurú'
  ];
  
  const index = Math.min(this.level - 1, titles.length - 1);
  return titles[index] || 'Supremo';
});

// Virtual para verificar si la racha está activa
UserGamificationSchema.virtual('isStreakActive').get(function() {
  const today = new Date();
  const lastActivity = new Date(this.streak.lastActivityDate);
  const diffDays = Math.floor((today.getTime() - lastActivity.getTime()) / (1000 * 60 * 60 * 24));
  
  return diffDays <= 1; // Activa si la última actividad fue hoy o ayer
});

// Método para añadir puntos y recalcular nivel
UserGamificationSchema.methods.addPoints = function(points: number, eventType?: string) {
  this.points += points;
  this.experience.current += points;
  this.statistics.totalEvents += 1;
  this.statistics.eventsThisMonth += 1;
  this.lastActivity = new Date();
  
  // Actualizar actividad favorita
  if (eventType) {
    this.statistics.favoriteActivity = eventType;
  }
  
  // Verificar si sube de nivel
  while (this.experience.current >= this.experience.nextLevelRequired) {
    this.experience.current -= this.experience.nextLevelRequired;
    this.level += 1;
    
    // Aumentar requisitos del siguiente nivel (progresión exponencial)
    this.experience.nextLevelRequired = Math.floor(100 * Math.pow(1.5, this.level - 1));
  }
  
  return this.save();
};

// Método para añadir insignia
UserGamificationSchema.methods.awardBadge = function(badgeId: string, eventType: string, metadata?: any) {
  if (!this.badges.includes(badgeId)) {
    this.badges.push(badgeId);
    this.achievements.push({
      badgeId,
      earnedAt: new Date(),
      eventType,
      metadata
    });
    
    return this.save();
  }
  
  return Promise.resolve(this);
};

// Método para actualizar racha
UserGamificationSchema.methods.updateStreak = function() {
  const today = new Date();
  const lastActivity = new Date(this.streak.lastActivityDate);
  const diffDays = Math.floor((today.getTime() - lastActivity.getTime()) / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) {
    // Misma fecha, no cambiar racha
    return Promise.resolve(this);
  } else if (diffDays === 1) {
    // Día consecutivo, incrementar racha
    this.streak.current += 1;
    this.streak.longest = Math.max(this.streak.longest, this.streak.current);
  } else if (diffDays > 1) {
    // Se rompió la racha
    this.streak.current = 1;
  }
  
  this.streak.lastActivityDate = today;
  this.lastActivity = today;
  
  return this.save();
};

// Método para reiniciar estadísticas mensuales
UserGamificationSchema.methods.resetMonthlyStats = function() {
  this.statistics.eventsThisMonth = 0;
  return this.save();
};

// Método estático para obtener leaderboard
UserGamificationSchema.statics.getLeaderboard = async function(
  userRole?: string, 
  limit: number = 10,
  timeframe: 'all' | 'month' | 'week' = 'all'
) {
  const pipeline: any[] = [
    {
      $lookup: {
        from: 'users',
        localField: 'userId',
        foreignField: '_id',
        as: 'user'
      }
    },
    {
      $unwind: '$user'
    },
    {
      $match: {
        'preferences.showInLeaderboard': true,
        ...(userRole && { 'user.role': userRole })
      }
    }
  ];
  
  // Agregar filtro de tiempo si es necesario
  if (timeframe === 'month') {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    
    pipeline.push({
      $match: {
        lastActivity: { $gte: startOfMonth }
      }
    });
  } else if (timeframe === 'week') {
    const startOfWeek = new Date();
    startOfWeek.setDate(startOfWeek.getDate() - 7);
    
    pipeline.push({
      $match: {
        lastActivity: { $gte: startOfWeek }
      }
    });
  }
  
  pipeline.push(
    {
      $sort: { points: -1, level: -1 }
    },
    {
      $limit: limit
    },
    {
      $project: {
        userId: 1,
        points: 1,
        level: 1,
        badges: 1,
        'streak.current': 1,
        'user.name': 1,
        'user.email': 1,
        'user.role': 1,
        'user.avatar': 1,
        lastActivity: 1
      }
    }
  );
  
  return this.aggregate(pipeline);
};

// Método estático para obtener estadísticas globales
UserGamificationSchema.statics.getGlobalStats = async function() {
  const stats = await this.aggregate([
    {
      $group: {
        _id: null,
        totalUsers: { $sum: 1 },
        totalPoints: { $sum: '$points' },
        avgLevel: { $avg: '$level' },
        maxStreak: { $max: '$streak.longest' },
        totalBadges: { $sum: { $size: '$badges' } },
        activeUsersToday: {
          $sum: {
            $cond: {
              if: {
                $gte: ['$lastActivity', new Date(Date.now() - 24 * 60 * 60 * 1000)]
              },
              then: 1,
              else: 0
            }
          }
        }
      }
    }
  ]);
  
  return stats[0] || {
    totalUsers: 0,
    totalPoints: 0,
    avgLevel: 0,
    maxStreak: 0,
    totalBadges: 0,
    activeUsersToday: 0
  };
};

export default mongoose.models.UserGamification || 
  mongoose.model<IUserGamification>('UserGamification', UserGamificationSchema);
