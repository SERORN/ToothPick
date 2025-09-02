// 🎯 FASE 32: Servicio Principal de Fidelización
// ✅ Lógica de negocio para triggers, eventos y recompensas de fidelidad

import { connectDB } from '@/lib/db';
import LoyaltyTrigger, { ILoyaltyTrigger } from '@/lib/models/LoyaltyTrigger';
import LoyaltyEvent, { ILoyaltyEvent } from '@/lib/models/LoyaltyEvent';
import UserSubscription from '@/lib/models/UserSubscription';
import UserProfile from '@/lib/models/UserProfile';

export interface ProcessEventParams {
  userId: string;
  organizationId: string;
  eventType: string;
  eventData: {
    sourceModule: 'subscription' | 'payment' | 'referral' | 'manual' | 'campaign';
    sourceId?: string;
    description: string;
    dynamicValue?: number;
    metadata?: { [key: string]: any };
  };
  originalEventDate?: Date;
  systemInfo?: {
    source: 'webhook' | 'cron' | 'api' | 'manual';
    requestId?: string;
  };
}

export interface TierThresholds {
  bronze: { min: 0; max: 999 };
  silver: { min: 1000; max: 4999 };
  gold: { min: 5000; max: 14999 };
  platinum: { min: 15000; max: Infinity };
}

export interface LoyaltySummary {
  currentTier: string;
  totalPoints: number;
  pointsToNextTier: number;
  nextTierThreshold: number;
  lifetimeValue: number;
  recentEvents: ILoyaltyEvent[];
  tierBenefits: {
    discountRate: number;
    hasPrioritySupport: boolean;
    hasEarlyAccess: boolean;
    specialFeatures: string[];
  };
  ranking: {
    position: number;
    totalUsers: number;
    percentile: number;
  };
}

export class LoyaltyService {
  
  // Thresholds para los tiers de fidelización
  static readonly TIER_THRESHOLDS: TierThresholds = {
    bronze: { min: 0, max: 999 },
    silver: { min: 1000, max: 4999 },
    gold: { min: 5000, max: 14999 },
    platinum: { min: 15000, max: Infinity }
  };
  
  // Procesar evento de fidelización automáticamente
  static async processEvent(params: ProcessEventParams): Promise<ILoyaltyEvent[]> {
    await connectDB();
    
    const startTime = Date.now();
    const processedEvents: ILoyaltyEvent[] = [];
    
    try {
      // Buscar triggers activos para este tipo de evento
      const triggers = await LoyaltyTrigger.findActiveByAction(params.eventType);
      
      if (triggers.length === 0) {
        console.log(`No hay triggers activos para el evento: ${params.eventType}`);
        return [];
      }
      
      // Obtener información del usuario y suscripción
      const [userProfile, userSubscription] = await Promise.all([
        UserProfile.findOne({ userId: params.userId }),
        UserSubscription.findOne({ 
          userId: params.userId, 
          organizationId: params.organizationId 
        })
      ]);
      
      if (!userProfile) {
        throw new Error(`Perfil de usuario no encontrado: ${params.userId}`);
      }
      
      const userRole = userProfile.role;
      const subscriptionTier = userSubscription?.planId ? 
        await this.getSubscriptionTier(userSubscription.planId) : undefined;
      
      // Procesar cada trigger aplicable
      for (const trigger of triggers) {
        try {
          // Verificar si el trigger puede activarse para este usuario
          if (!trigger.canActivateForUser(params.userId, userRole, subscriptionTier)) {
            continue;
          }
          
          // Verificar condiciones específicas
          if (!await this.evaluateConditions(trigger, params, userSubscription)) {
            continue;
          }
          
          // Verificar frecuencia y duplicados
          if (!await this.checkFrequencyLimits(trigger, params)) {
            continue;
          }
          
          // Calcular recompensa
          const currentTier = userSubscription?.loyalty?.tier || 'bronze';
          const pointsAwarded = trigger.calculateReward(currentTier, params.eventData.dynamicValue);
          const xpAwarded = trigger.rewards.xpPoints || Math.floor(pointsAwarded * 0.1);
          
          // Obtener estado actual del usuario
          const currentStats = await LoyaltyEvent.calculateUserTotal(params.userId);
          const totalPointsBefore = currentStats.totalPoints;
          const totalPointsAfter = totalPointsBefore + pointsAwarded;
          
          // Crear evento de fidelización
          const loyaltyEvent = new LoyaltyEvent({
            userId: params.userId,
            organizationId: params.organizationId,
            triggerId: trigger._id,
            eventType: params.eventType,
            eventData: params.eventData,
            rewards: {
              pointsAwarded,
              xpAwarded,
              tierBonusApplied: currentTier,
              bonusMultiplier: trigger.rewards.bonusMultiplier,
              calculationDetails: {
                basePoints: trigger.rewards.basePoints,
                tierBonus: trigger.rewards.tierBonuses?.[currentTier] || 0,
                multiplier: trigger.rewards.bonusMultiplier || 1,
                dynamicPoints: params.eventData.dynamicValue ? 
                  Math.floor(params.eventData.dynamicValue * 0.1) : 0
              }
            },
            userSnapshot: {
              currentTier,
              totalPointsBefore,
              totalPointsAfter,
              subscriptionTier
            },
            validation: {
              isValid: true,
              validatedAt: new Date(),
              validationMethod: 'automatic'
            },
            deduplication: {
              fingerprint: '', // Se generará automáticamente
              originalEventDate: params.originalEventDate || new Date()
            },
            processing: {
              processedAt: new Date(),
              processingDuration: Date.now() - startTime,
              systemInfo: params.systemInfo || { source: 'api' }
            }
          });
          
          await loyaltyEvent.save();
          
          // Actualizar estadísticas del trigger
          trigger.stats.totalActivations += 1;
          trigger.stats.totalPointsAwarded += pointsAwarded;
          trigger.stats.lastActivated = new Date();
          await trigger.save();
          
          // Actualizar puntos del usuario
          await this.updateUserLoyaltyPoints(params.userId, params.organizationId, pointsAwarded, xpAwarded);
          
          processedEvents.push(loyaltyEvent);
          
        } catch (error) {
          console.error(`Error procesando trigger ${trigger._id}:`, error);
          continue;
        }
      }
      
      return processedEvents;
      
    } catch (error) {
      console.error('Error en processEvent:', error);
      throw error;
    }
  }
  
  // Evaluar condiciones específicas del trigger
  private static async evaluateConditions(
    trigger: ILoyaltyTrigger,
    params: ProcessEventParams,
    userSubscription?: any
  ): Promise<boolean> {
    
    // Verificar suscripción activa si es requerida
    if (trigger.conditions.requiresActiveSubscription) {
      if (!userSubscription || !['trialing', 'active'].includes(userSubscription.status)) {
        return false;
      }
    }
    
    // Verificar monto mínimo para triggers de gasto
    if (trigger.conditions.minimumAmount && params.eventData.dynamicValue) {
      if (params.eventData.dynamicValue < trigger.conditions.minimumAmount) {
        return false;
      }
    }
    
    // Verificar ventana de tiempo
    if (trigger.conditions.timeWindow) {
      const eventDate = params.originalEventDate || new Date();
      const windowStart = new Date(eventDate.getTime() - (trigger.conditions.timeWindow * 24 * 60 * 60 * 1000));
      
      // Para eventos de renovación, verificar que no sea muy tarde
      if (trigger.actionType === 'RENEW_SUBSCRIPTION' && userSubscription) {
        const gracePeriod = new Date(userSubscription.currentPeriodEnd.getTime() + (3 * 24 * 60 * 60 * 1000));
        if (eventDate > gracePeriod) {
          return false;
        }
      }
    }
    
    // Evaluar condiciones personalizadas
    if (trigger.conditions.customConditions) {
      // Implementar lógica específica según el tipo de trigger
      switch (trigger.actionType) {
        case 'PAY_ON_TIME':
          // Verificar que el pago se hizo antes de la fecha límite
          if (userSubscription && params.originalEventDate) {
            const dueDate = new Date(userSubscription.currentPeriodEnd);
            return params.originalEventDate <= dueDate;
          }
          break;
          
        case 'REFER_USER':
          // Verificar que la referencia tenga una suscripción activa
          const referralData = params.eventData.metadata?.referralData;
          if (referralData && referralData.hasActiveSubscription !== true) {
            return false;
          }
          break;
      }
    }
    
    return true;
  }
  
  // Verificar límites de frecuencia
  private static async checkFrequencyLimits(
    trigger: ILoyaltyTrigger,
    params: ProcessEventParams
  ): Promise<boolean> {
    
    if (trigger.frequency.type === 'unlimited') {
      return true;
    }
    
    const now = new Date();
    let periodStart: Date;
    
    switch (trigger.frequency.type) {
      case 'once':
        // Verificar que nunca se haya activado para este usuario
        const existingEvent = await LoyaltyEvent.findOne({
          userId: params.userId,
          triggerId: trigger._id,
          'validation.isValid': true,
          'validation.reversalInfo.isReversed': { $ne: true }
        });
        return !existingEvent;
        
      case 'daily':
        periodStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
        
      case 'weekly':
        const dayOfWeek = now.getDay();
        periodStart = new Date(now.getTime() - (dayOfWeek * 24 * 60 * 60 * 1000));
        periodStart.setHours(0, 0, 0, 0);
        break;
        
      case 'monthly':
        periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
        
      default:
        return true;
    }
    
    const activationsInPeriod = await LoyaltyEvent.countDocuments({
      userId: params.userId,
      triggerId: trigger._id,
      createdAt: { $gte: periodStart },
      'validation.isValid': true,
      'validation.reversalInfo.isReversed': { $ne: true }
    });
    
    const maxActivations = trigger.frequency.maxActivations || 1;
    return activationsInPeriod < maxActivations;
  }
  
  // Actualizar puntos de fidelidad del usuario
  private static async updateUserLoyaltyPoints(
    userId: string,
    organizationId: string,
    pointsToAdd: number,
    xpToAdd: number
  ): Promise<void> {
    
    // Actualizar suscripción si existe
    const subscription = await UserSubscription.findOne({ userId, organizationId });
    if (subscription) {
      subscription.loyalty.totalLoyaltyPoints += pointsToAdd;
      
      // Verificar si cambia de tier
      const newTier = this.calculateTier(subscription.loyalty.totalLoyaltyPoints);
      const oldTier = subscription.loyalty.tier;
      
      if (newTier !== oldTier) {
        // Actualizar tier y historial
        subscription.loyalty.tier = newTier;
        subscription.loyalty.tierProgress.currentTierSince = new Date();
        subscription.loyalty.tierProgress.tierHistory.push({
          tier: newTier,
          achievedAt: new Date(),
          pointsAtTime: subscription.loyalty.totalLoyaltyPoints
        });
        
        // Aplicar beneficios del nuevo tier
        await this.applyTierBenefits(subscription, newTier);
      }
      
      // Actualizar progreso hacia el siguiente tier
      const nextTierThreshold = this.getNextTierThreshold(subscription.loyalty.totalLoyaltyPoints);
      subscription.loyalty.tierProgress.nextTierThreshold = nextTierThreshold;
      subscription.loyalty.tierProgress.pointsToNextTier = Math.max(0, nextTierThreshold - subscription.loyalty.totalLoyaltyPoints);
      
      await subscription.save();
    }
    
    // Actualizar perfil de usuario si tiene gamificación
    const userProfile = await UserProfile.findOne({ userId });
    if (userProfile && userProfile.gamification) {
      userProfile.gamification.experience += xpToAdd;
      userProfile.gamification.totalPoints += pointsToAdd;
      await userProfile.save();
    }
  }
  
  // Calcular tier basado en puntos totales
  static calculateTier(totalPoints: number): 'bronze' | 'silver' | 'gold' | 'platinum' {
    if (totalPoints >= this.TIER_THRESHOLDS.platinum.min) return 'platinum';
    if (totalPoints >= this.TIER_THRESHOLDS.gold.min) return 'gold';
    if (totalPoints >= this.TIER_THRESHOLDS.silver.min) return 'silver';
    return 'bronze';
  }
  
  // Obtener threshold del siguiente tier
  static getNextTierThreshold(currentPoints: number): number {
    if (currentPoints < this.TIER_THRESHOLDS.silver.min) return this.TIER_THRESHOLDS.silver.min;
    if (currentPoints < this.TIER_THRESHOLDS.gold.min) return this.TIER_THRESHOLDS.gold.min;
    if (currentPoints < this.TIER_THRESHOLDS.platinum.min) return this.TIER_THRESHOLDS.platinum.min;
    return this.TIER_THRESHOLDS.platinum.min; // Ya está en el tier máximo
  }
  
  // Aplicar beneficios del tier
  private static async applyTierBenefits(subscription: any, tier: string): Promise<void> {
    switch (tier) {
      case 'silver':
        subscription.loyalty.specialBenefits.customDiscountRate = 5;
        break;
      case 'gold':
        subscription.loyalty.specialBenefits.customDiscountRate = 10;
        subscription.loyalty.specialBenefits.hasPrioritySupport = true;
        break;
      case 'platinum':
        subscription.loyalty.specialBenefits.customDiscountRate = 15;
        subscription.loyalty.specialBenefits.hasPrioritySupport = true;
        subscription.loyalty.specialBenefits.hasEarlyAccess = true;
        break;
    }
  }
  
  // Obtener resumen completo de fidelización para un usuario
  static async getUserLoyaltySummary(userId: string, organizationId: string): Promise<LoyaltySummary | null> {
    await connectDB();
    
    const [subscription, recentEvents, userStats] = await Promise.all([
      UserSubscription.findOne({ userId, organizationId }),
      LoyaltyEvent.findUserEvents(userId, { limit: 10, validOnly: true }),
      LoyaltyEvent.calculateUserTotal(userId)
    ]);
    
    if (!subscription) {
      return null;
    }
    
    const currentTier = subscription.loyalty.tier;
    const totalPoints = userStats.totalPoints;
    const nextTierThreshold = this.getNextTierThreshold(totalPoints);
    const pointsToNextTier = Math.max(0, nextTierThreshold - totalPoints);
    
    // Calcular ranking
    const ranking = await this.getUserRanking(userId, organizationId);
    
    // Obtener beneficios del tier actual
    const tierBenefits = this.getTierBenefits(currentTier);
    
    return {
      currentTier,
      totalPoints,
      pointsToNextTier,
      nextTierThreshold,
      lifetimeValue: subscription.loyalty.lifetimeValue,
      recentEvents: recentEvents.slice(0, 5), // Solo los 5 más recientes
      tierBenefits,
      ranking
    };
  }
  
  // Obtener ranking del usuario
  private static async getUserRanking(userId: string, organizationId: string): Promise<{position: number, totalUsers: number, percentile: number}> {
    // Obtener todos los usuarios ordenados por puntos
    const allUsers = await UserSubscription.find({
      organizationId,
      'loyalty.totalLoyaltyPoints': { $gt: 0 }
    }).sort({ 'loyalty.totalLoyaltyPoints': -1 });
    
    const userIndex = allUsers.findIndex(user => user.userId === userId);
    const position = userIndex + 1;
    const totalUsers = allUsers.length;
    const percentile = totalUsers > 0 ? Math.round(((totalUsers - position) / totalUsers) * 100) : 0;
    
    return { position, totalUsers, percentile };
  }
  
  // Obtener beneficios por tier
  private static getTierBenefits(tier: string) {
    const benefits = {
      bronze: {
        discountRate: 0,
        hasPrioritySupport: false,
        hasEarlyAccess: false,
        specialFeatures: ['Soporte estándar', 'Acceso a promociones básicas']
      },
      silver: {
        discountRate: 5,
        hasPrioritySupport: false,
        hasEarlyAccess: false,
        specialFeatures: ['5% descuento en renovaciones', 'Acceso a webinars exclusivos']
      },
      gold: {
        discountRate: 10,
        hasPrioritySupport: true,
        hasEarlyAccess: false,
        specialFeatures: ['10% descuento en renovaciones', 'Soporte prioritario', 'Beta tester de nuevas características']
      },
      platinum: {
        discountRate: 15,
        hasPrioritySupport: true,
        hasEarlyAccess: true,
        specialFeatures: ['15% descuento en renovaciones', 'Soporte VIP 24/7', 'Acceso anticipado a todas las funciones', 'Consultoría gratuita mensual']
      }
    };
    
    return benefits[tier] || benefits.bronze;
  }
  
  // Helpers
  private static async getSubscriptionTier(planId: string): Promise<string | undefined> {
    const SubscriptionPlan = (await import('@/lib/models/SubscriptionPlan')).default;
    const plan = await SubscriptionPlan.findById(planId);
    return plan?.tier;
  }
  
  // Crear trigger de fidelización (solo admin)
  static async createTrigger(triggerData: Partial<ILoyaltyTrigger>, createdBy: string): Promise<ILoyaltyTrigger> {
    await connectDB();
    
    const trigger = new LoyaltyTrigger({
      ...triggerData,
      createdBy,
      stats: {
        totalActivations: 0,
        uniqueUsers: 0,
        totalPointsAwarded: 0
      }
    });
    
    return await trigger.save();
  }
  
  // Obtener triggers activos
  static async getActiveTriggers(category?: string): Promise<ILoyaltyTrigger[]> {
    await connectDB();
    
    if (category) {
      return await LoyaltyTrigger.findByCategory(category, true);
    }
    
    return await LoyaltyTrigger.find({
      'validity.isActive': true,
      'validity.startDate': { $lte: new Date() },
      $or: [
        { 'validity.endDate': { $exists: false } },
        { 'validity.endDate': { $gte: new Date() } }
      ]
    }).sort({ 'validity.priority': -1 });
  }
  
  // Estadísticas de fidelización
  static async getLoyaltyStats(organizationId?: string): Promise<any> {
    await connectDB();
    
    const eventStats = await LoyaltyEvent.getEventStats(organizationId);
    
    const tierDistribution = await UserSubscription.aggregate([
      ...(organizationId ? [{ $match: { organizationId } }] : []),
      {
        $group: {
          _id: '$loyalty.tier',
          count: { $sum: 1 },
          avgPoints: { $avg: '$loyalty.totalLoyaltyPoints' },
          totalLifetimeValue: { $sum: '$loyalty.lifetimeValue' }
        }
      }
    ]);
    
    return {
      eventStats,
      tierDistribution,
      generatedAt: new Date()
    };
  }
}
