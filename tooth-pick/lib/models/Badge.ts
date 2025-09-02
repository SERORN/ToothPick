import mongoose, { Schema, Document } from 'mongoose';

export interface IBadge extends Document {
  id: string;
  title: string;
  description: string;
  iconUrl: string;
  iconEmoji: string;
  category: 'onboarding' | 'marketplace' | 'appointment' | 'social' | 'achievement' | 'streak' | 'referral' | 'learning' | 'special';
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
  criteria: {
    type: 'event_count' | 'points_threshold' | 'streak_length' | 'level_reached' | 'specific_action' | 'time_based' | 'combo';
    requirement: any;
    description: string;
  };
  roleRequirement?: 'dentist' | 'distributor' | 'patient' | 'all';
  isVisible: boolean;
  isSecret: boolean;
  pointsReward: number;
  unlockFeatures?: string[];
  prerequisites?: string[];
  expiresAt?: Date;
  maxHolders?: number;
  currentHolders: number;
  createdAt: Date;
  updatedAt: Date;
}

const BadgeSchema: Schema = new Schema<IBadge>(
  {
    id: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    title: {
      type: String,
      required: true
    },
    description: {
      type: String,
      required: true
    },
    iconUrl: {
      type: String,
      required: true
    },
    iconEmoji: {
      type: String,
      required: true
    },
    category: {
      type: String,
      enum: ['onboarding', 'marketplace', 'appointment', 'social', 'achievement', 'streak', 'referral', 'learning', 'special'],
      required: true,
      index: true
    },
    rarity: {
      type: String,
      enum: ['common', 'uncommon', 'rare', 'epic', 'legendary'],
      default: 'common',
      index: true
    },
    criteria: {
      type: {
        type: String,
        enum: ['event_count', 'points_threshold', 'streak_length', 'level_reached', 'specific_action', 'time_based', 'combo'],
        required: true
      },
      requirement: {
        type: Schema.Types.Mixed,
        required: true
      },
      description: {
        type: String,
        required: true
      }
    },
    roleRequirement: {
      type: String,
      enum: ['dentist', 'distributor', 'patient', 'all'],
      default: 'all'
    },
    isVisible: {
      type: Boolean,
      default: true
    },
    isSecret: {
      type: Boolean,
      default: false
    },
    pointsReward: {
      type: Number,
      default: 0,
      min: 0
    },
    unlockFeatures: [{
      type: String
    }],
    prerequisites: [{
      type: String
    }],
    expiresAt: {
      type: Date
    },
    maxHolders: {
      type: Number,
      min: 1
    },
    currentHolders: {
      type: Number,
      default: 0,
      min: 0
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Índices para consultas eficientes
BadgeSchema.index({ category: 1, rarity: 1 });
BadgeSchema.index({ roleRequirement: 1, isVisible: 1 });
BadgeSchema.index({ isSecret: 1, isVisible: 1 });

// Virtual para verificar si la insignia está disponible
BadgeSchema.virtual('isAvailable').get(function() {
  const now = new Date();
  
  // Verificar expiración
  if (this.expiresAt && now > this.expiresAt) {
    return false;
  }
  
  // Verificar límite de portadores
  if (this.maxHolders && this.currentHolders >= this.maxHolders) {
    return false;
  }
  
  return true;
});

// Virtual para obtener el color según la rareza
BadgeSchema.virtual('rarityColor').get(function() {
  const colors = {
    common: '#6B7280',
    uncommon: '#10B981',
    rare: '#3B82F6',
    epic: '#8B5CF6',
    legendary: '#F59E0B'
  };
  
  return colors[this.rarity] || colors.common;
});

// Virtual para obtener el brillo según la rareza
BadgeSchema.virtual('rarityGlow').get(function() {
  const glows = {
    common: 'none',
    uncommon: '0 0 10px rgba(16, 185, 129, 0.3)',
    rare: '0 0 15px rgba(59, 130, 246, 0.4)',
    epic: '0 0 20px rgba(139, 92, 246, 0.5)',
    legendary: '0 0 25px rgba(245, 158, 11, 0.6)'
  };
  
  return glows[this.rarity] || glows.common;
});

// Método para verificar si un usuario cumple los criterios
BadgeSchema.methods.checkCriteria = async function(userId: string, userRole: string) {
  // Verificar rol requerido
  if (this.roleRequirement !== 'all' && this.roleRequirement !== userRole) {
    return { eligible: false, reason: 'Role requirement not met' };
  }
  
  // Verificar disponibilidad
  if (!this.isAvailable) {
    return { eligible: false, reason: 'Badge not available' };
  }
  
  // Verificar prerequisitos
  if (this.prerequisites && this.prerequisites.length > 0) {
    const UserGamification = mongoose.model('UserGamification');
    const userGamification = await UserGamification.findOne({ userId });
    
    if (!userGamification) {
      return { eligible: false, reason: 'User gamification not found' };
    }
    
    const hasAllPrerequisites = this.prerequisites.every(prereq => 
      userGamification.badges.includes(prereq)
    );
    
    if (!hasAllPrerequisites) {
      return { eligible: false, reason: 'Prerequisites not met' };
    }
  }
  
  // Verificar criterios específicos
  const UserGamification = mongoose.model('UserGamification');
  const UserEventLog = mongoose.model('UserEventLog');
  const userGamification = await UserGamification.findOne({ userId });
  
  if (!userGamification) {
    return { eligible: false, reason: 'User gamification not found' };
  }
  
  switch (this.criteria.type) {
    case 'points_threshold':
      return {
        eligible: userGamification.points >= this.criteria.requirement,
        current: userGamification.points,
        required: this.criteria.requirement
      };
      
    case 'level_reached':
      return {
        eligible: userGamification.level >= this.criteria.requirement,
        current: userGamification.level,
        required: this.criteria.requirement
      };
      
    case 'streak_length':
      return {
        eligible: userGamification.streak.longest >= this.criteria.requirement,
        current: userGamification.streak.longest,
        required: this.criteria.requirement
      };
      
    case 'event_count':
      const eventCount = await UserEventLog.countDocuments({
        userId,
        eventType: this.criteria.requirement.eventType
      });
      return {
        eligible: eventCount >= this.criteria.requirement.count,
        current: eventCount,
        required: this.criteria.requirement.count
      };
      
    case 'specific_action':
      const actionExists = await UserEventLog.findOne({
        userId,
        eventType: this.criteria.requirement.action,
        ...(this.criteria.requirement.metadata && { 
          metadata: { $elemMatch: this.criteria.requirement.metadata }
        })
      });
      return {
        eligible: !!actionExists,
        reason: actionExists ? 'Action completed' : 'Action not completed'
      };
      
    case 'time_based':
      const timeThreshold = new Date();
      timeThreshold.setDate(timeThreshold.getDate() - this.criteria.requirement.days);
      
      const recentEvents = await UserEventLog.countDocuments({
        userId,
        createdAt: { $gte: timeThreshold },
        ...(this.criteria.requirement.eventType && { 
          eventType: this.criteria.requirement.eventType 
        })
      });
      
      return {
        eligible: recentEvents >= (this.criteria.requirement.minEvents || 1),
        current: recentEvents,
        required: this.criteria.requirement.minEvents || 1
      };
      
    case 'combo':
      const comboRequirements = this.criteria.requirement;
      const results = await Promise.all(
        comboRequirements.map(async (req: any) => {
          switch (req.type) {
            case 'points':
              return userGamification.points >= req.value;
            case 'level':
              return userGamification.level >= req.value;
            case 'events':
              const count = await UserEventLog.countDocuments({
                userId,
                eventType: req.eventType
              });
              return count >= req.value;
            default:
              return false;
          }
        })
      );
      
      return {
        eligible: results.every(r => r),
        reason: results.every(r => r) ? 'All combo requirements met' : 'Some combo requirements not met'
      };
      
    default:
      return { eligible: false, reason: 'Unknown criteria type' };
  }
};

// Método para otorgar la insignia a un usuario
BadgeSchema.methods.awardToUser = async function(userId: string) {
  const UserGamification = mongoose.model('UserGamification');
  
  try {
    const userGamification = await UserGamification.findOne({ userId });
    if (!userGamification) {
      throw new Error('User gamification not found');
    }
    
    // Verificar si ya tiene la insignia
    if (userGamification.badges.includes(this.id)) {
      return { success: false, reason: 'Badge already owned' };
    }
    
    // Otorgar la insignia
    await userGamification.awardBadge(this.id, 'badge_earned');
    
    // Incrementar contador de portadores
    this.currentHolders += 1;
    await this.save();
    
    // Otorgar puntos adicionales si corresponde
    if (this.pointsReward > 0) {
      await userGamification.addPoints(this.pointsReward, 'badge_bonus');
    }
    
    return { 
      success: true, 
      badge: this,
      pointsAwarded: this.pointsReward 
    };
  } catch (error) {
    return { 
      success: false, 
      reason: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
};

// Método estático para obtener insignias disponibles por rol
BadgeSchema.statics.getBadgesForRole = async function(role: string, includeSecret = false) {
  const query: any = {
    $or: [
      { roleRequirement: 'all' },
      { roleRequirement: role }
    ],
    isVisible: true
  };
  
  if (!includeSecret) {
    query.isSecret = false;
  }
  
  return this.find(query).sort({ rarity: 1, category: 1, title: 1 });
};

// Método estático para obtener insignias por categoría
BadgeSchema.statics.getBadgesByCategory = async function(category: string) {
  return this.find({
    category,
    isVisible: true
  }).sort({ rarity: 1, title: 1 });
};

// Método estático para verificar múltiples insignias para un usuario
BadgeSchema.statics.checkAllBadgesForUser = async function(userId: string, userRole: string) {
  const availableBadges = await this.getBadgesForRole(userRole, true);
  const UserGamification = mongoose.model('UserGamification');
  const userGamification = await UserGamification.findOne({ userId });
  
  if (!userGamification) {
    return [];
  }
  
  const eligibleBadges = [];
  
  for (const badge of availableBadges) {
    // Saltar si ya tiene la insignia
    if (userGamification.badges.includes(badge.id)) {
      continue;
    }
    
    const result = await badge.checkCriteria(userId, userRole);
    if (result.eligible) {
      eligibleBadges.push({
        badge,
        result
      });
    }
  }
  
  return eligibleBadges;
};

export default mongoose.models.Badge || 
  mongoose.model<IBadge>('Badge', BadgeSchema);
