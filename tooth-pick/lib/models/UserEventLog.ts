import mongoose, { Schema, Document } from 'mongoose';

export interface IUserEventLog extends Document {
  userId: mongoose.Types.ObjectId;
  eventType: string;
  pointsEarned: number;
  badgeEarned?: string;
  metadata: any;
  trackableRef?: {
    model: string;
    id: mongoose.Types.ObjectId;
  };
  streakContribution: boolean;
  multiplierApplied?: number;
  source: 'automatic' | 'manual' | 'api';
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
  updatedAt: Date;
}

const UserEventLogSchema: Schema = new Schema<IUserEventLog>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    eventType: {
      type: String,
      required: true,
      index: true
    },
    pointsEarned: {
      type: Number,
      required: true,
      min: 0
    },
    badgeEarned: {
      type: String
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {}
    },
    trackableRef: {
      model: {
        type: String,
        enum: ['Order', 'Appointment', 'OnboardingTrack', 'UserProgress', 'Invoice', 'Campaign', 'Review']
      },
      id: {
        type: Schema.Types.ObjectId
      }
    },
    streakContribution: {
      type: Boolean,
      default: false
    },
    multiplierApplied: {
      type: Number,
      default: 1,
      min: 0
    },
    source: {
      type: String,
      enum: ['automatic', 'manual', 'api'],
      default: 'automatic'
    },
    ipAddress: {
      type: String
    },
    userAgent: {
      type: String
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Índices compuestos para consultas eficientes
UserEventLogSchema.index({ userId: 1, createdAt: -1 });
UserEventLogSchema.index({ eventType: 1, createdAt: -1 });
UserEventLogSchema.index({ userId: 1, eventType: 1, createdAt: -1 });
UserEventLogSchema.index({ 'trackableRef.model': 1, 'trackableRef.id': 1 });

// Virtual para obtener información del evento
UserEventLogSchema.virtual('eventInfo', {
  ref: 'GamificationEvent',
  localField: 'eventType',
  foreignField: 'type',
  justOne: true
});

// Método estático para obtener historial de usuario
UserEventLogSchema.statics.getUserHistory = async function(
  userId: string,
  limit: number = 20,
  offset: number = 0,
  eventType?: string
) {
  const query: any = { userId };
  
  if (eventType) {
    query.eventType = eventType;
  }
  
  return this.find(query)
    .populate('eventInfo', 'name description category')
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip(offset);
};

// Método estático para obtener estadísticas de usuario
UserEventLogSchema.statics.getUserStats = async function(
  userId: string,
  timeframe: 'day' | 'week' | 'month' | 'year' | 'all' = 'all'
) {
  let dateFilter = {};
  
  const now = new Date();
  
  switch (timeframe) {
    case 'day':
      dateFilter = {
        createdAt: {
          $gte: new Date(now.getFullYear(), now.getMonth(), now.getDate())
        }
      };
      break;
    case 'week':
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - 7);
      dateFilter = { createdAt: { $gte: weekStart } };
      break;
    case 'month':
      dateFilter = {
        createdAt: {
          $gte: new Date(now.getFullYear(), now.getMonth(), 1)
        }
      };
      break;
    case 'year':
      dateFilter = {
        createdAt: {
          $gte: new Date(now.getFullYear(), 0, 1)
        }
      };
      break;
  }
  
  const stats = await this.aggregate([
    {
      $match: {
        userId: new mongoose.Types.ObjectId(userId),
        ...dateFilter
      }
    },
    {
      $group: {
        _id: null,
        totalEvents: { $sum: 1 },
        totalPoints: { $sum: '$pointsEarned' },
        badgesEarned: {
          $sum: {
            $cond: {
              if: { $ne: ['$badgeEarned', null] },
              then: 1,
              else: 0
            }
          }
        },
        eventsByType: {
          $push: {
            eventType: '$eventType',
            points: '$pointsEarned',
            date: '$createdAt'
          }
        },
        streakDays: {
          $sum: {
            $cond: {
              if: '$streakContribution',
              then: 1,
              else: 0
            }
          }
        }
      }
    },
    {
      $addFields: {
        avgPointsPerEvent: {
          $cond: {
            if: { $gt: ['$totalEvents', 0] },
            then: { $divide: ['$totalPoints', '$totalEvents'] },
            else: 0
          }
        }
      }
    }
  ]);
  
  return stats[0] || {
    totalEvents: 0,
    totalPoints: 0,
    badgesEarned: 0,
    eventsByType: [],
    streakDays: 0,
    avgPointsPerEvent: 0
  };
};

// Método estático para obtener eventos por referencia
UserEventLogSchema.statics.getEventsByReference = async function(
  model: string,
  id: string
) {
  return this.find({
    'trackableRef.model': model,
    'trackableRef.id': new mongoose.Types.ObjectId(id)
  })
  .populate('userId', 'name email role')
  .sort({ createdAt: -1 });
};

// Método estático para generar reporte de actividad
UserEventLogSchema.statics.getActivityReport = async function(
  startDate: Date,
  endDate: Date,
  groupBy: 'day' | 'week' | 'month' = 'day'
) {
  let groupByFormat;
  
  switch (groupBy) {
    case 'day':
      groupByFormat = {
        year: { $year: '$createdAt' },
        month: { $month: '$createdAt' },
        day: { $dayOfMonth: '$createdAt' }
      };
      break;
    case 'week':
      groupByFormat = {
        year: { $year: '$createdAt' },
        week: { $week: '$createdAt' }
      };
      break;
    case 'month':
      groupByFormat = {
        year: { $year: '$createdAt' },
        month: { $month: '$createdAt' }
      };
      break;
  }
  
  return this.aggregate([
    {
      $match: {
        createdAt: {
          $gte: startDate,
          $lte: endDate
        }
      }
    },
    {
      $group: {
        _id: groupByFormat,
        totalEvents: { $sum: 1 },
        totalPoints: { $sum: '$pointsEarned' },
        uniqueUsers: { $addToSet: '$userId' },
        eventTypes: { $addToSet: '$eventType' },
        badgesAwarded: {
          $sum: {
            $cond: {
              if: { $ne: ['$badgeEarned', null] },
              then: 1,
              else: 0
            }
          }
        }
      }
    },
    {
      $addFields: {
        uniqueUserCount: { $size: '$uniqueUsers' },
        eventTypeCount: { $size: '$eventTypes' }
      }
    },
    {
      $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1, '_id.week': 1 }
    }
  ]);
};

export default mongoose.models.UserEventLog || 
  mongoose.model<IUserEventLog>('UserEventLog', UserEventLogSchema);
