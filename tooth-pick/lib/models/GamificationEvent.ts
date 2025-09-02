import mongoose, { Schema, Document } from 'mongoose';

export interface IGamificationEvent extends Document {
  type: string;
  name: string;
  description: string;
  pointsAwarded: number;
  badgeAwarded?: string;
  roleTarget: 'dentist' | 'distributor' | 'patient' | 'all';
  category: 'onboarding' | 'marketplace' | 'appointment' | 'social' | 'achievement' | 'streak' | 'referral' | 'learning';
  triggerConditions: {
    requirement: string;
    threshold?: number;
    metadata?: any;
  };
  isActive: boolean;
  isRepeatable: boolean;
  cooldownHours?: number;
  maxOccurrences?: number;
  seasonalEvent?: {
    startDate: Date;
    endDate: Date;
    multiplier?: number;
  };
  prerequisites?: string[];
  createdAt: Date;
  updatedAt: Date;
}

const GamificationEventSchema: Schema = new Schema<IGamificationEvent>(
  {
    type: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    name: {
      type: String,
      required: true
    },
    description: {
      type: String,
      required: true
    },
    pointsAwarded: {
      type: Number,
      required: true,
      min: 0
    },
    badgeAwarded: {
      type: String,
      index: true
    },
    roleTarget: {
      type: String,
      enum: ['dentist', 'distributor', 'patient', 'all'],
      default: 'all',
      index: true
    },
    category: {
      type: String,
      enum: ['onboarding', 'marketplace', 'appointment', 'social', 'achievement', 'streak', 'referral', 'learning'],
      required: true,
      index: true
    },
    triggerConditions: {
      requirement: {
        type: String,
        required: true
      },
      threshold: {
        type: Number
      },
      metadata: Schema.Types.Mixed
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true
    },
    isRepeatable: {
      type: Boolean,
      default: false
    },
    cooldownHours: {
      type: Number,
      min: 0
    },
    maxOccurrences: {
      type: Number,
      min: 1
    },
    seasonalEvent: {
      startDate: Date,
      endDate: Date,
      multiplier: {
        type: Number,
        default: 1,
        min: 0.1
      }
    },
    prerequisites: [{
      type: String
    }]
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Índices compuestos
GamificationEventSchema.index({ roleTarget: 1, category: 1, isActive: 1 });
GamificationEventSchema.index({ type: 1, isActive: 1 });

// Virtual para verificar si el evento está en temporada
GamificationEventSchema.virtual('isInSeason').get(function() {
  if (!this.seasonalEvent) return true;
  
  const now = new Date();
  return now >= this.seasonalEvent.startDate && now <= this.seasonalEvent.endDate;
});

// Virtual para obtener puntos actuales (considerando multiplicadores estacionales)
GamificationEventSchema.virtual('currentPoints').get(function() {
  let points = this.pointsAwarded;
  
  if (this.seasonalEvent && this.isInSeason) {
    points *= this.seasonalEvent.multiplier || 1;
  }
  
  return Math.round(points);
});

// Método para verificar si un usuario puede activar este evento
GamificationEventSchema.methods.canUserTrigger = async function(
  userId: string,
  userRole: string,
  metadata?: any
) {
  // Verificar rol objetivo
  if (this.roleTarget !== 'all' && this.roleTarget !== userRole) {
    return { canTrigger: false, reason: 'Role not eligible' };
  }
  
  // Verificar si está activo
  if (!this.isActive) {
    return { canTrigger: false, reason: 'Event not active' };
  }
  
  // Verificar temporada
  if (!this.isInSeason) {
    return { canTrigger: false, reason: 'Event not in season' };
  }
  
  // Verificar prerequisitos
  if (this.prerequisites && this.prerequisites.length > 0) {
    const UserGamification = mongoose.model('UserGamification');
    const userGamification = await UserGamification.findOne({ userId });
    
    if (!userGamification) {
      return { canTrigger: false, reason: 'User gamification not found' };
    }
    
    const hasAllPrerequisites = this.prerequisites.every(prereq => 
      userGamification.badges.includes(prereq)
    );
    
    if (!hasAllPrerequisites) {
      return { canTrigger: false, reason: 'Prerequisites not met' };
    }
  }
  
  // Verificar si no es repetible y ya fue obtenido
  if (!this.isRepeatable) {
    const UserEventLog = mongoose.model('UserEventLog');
    const existingEvent = await UserEventLog.findOne({
      userId,
      eventType: this.type
    });
    
    if (existingEvent) {
      return { canTrigger: false, reason: 'Event already completed' };
    }
  }
  
  // Verificar cooldown
  if (this.cooldownHours) {
    const UserEventLog = mongoose.model('UserEventLog');
    const recentEvent = await UserEventLog.findOne({
      userId,
      eventType: this.type,
      createdAt: {
        $gte: new Date(Date.now() - this.cooldownHours * 60 * 60 * 1000)
      }
    });
    
    if (recentEvent) {
      return { canTrigger: false, reason: 'Cooldown period active' };
    }
  }
  
  // Verificar máximo de ocurrencias
  if (this.maxOccurrences) {
    const UserEventLog = mongoose.model('UserEventLog');
    const eventCount = await UserEventLog.countDocuments({
      userId,
      eventType: this.type
    });
    
    if (eventCount >= this.maxOccurrences) {
      return { canTrigger: false, reason: 'Max occurrences reached' };
    }
  }
  
  return { canTrigger: true, reason: 'All conditions met' };
};

// Método estático para obtener eventos disponibles por rol
GamificationEventSchema.statics.getEventsForRole = async function(role: string) {
  return this.find({
    $or: [
      { roleTarget: 'all' },
      { roleTarget: role }
    ],
    isActive: true
  }).sort({ category: 1, pointsAwarded: -1 });
};

// Método estático para obtener eventos por categoría
GamificationEventSchema.statics.getEventsByCategory = async function(category: string) {
  return this.find({
    category,
    isActive: true
  }).sort({ pointsAwarded: -1 });
};

export default mongoose.models.GamificationEvent || 
  mongoose.model<IGamificationEvent>('GamificationEvent', GamificationEventSchema);
