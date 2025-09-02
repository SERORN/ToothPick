import dbConnect from '@/lib/db';
import UserGamification from '@/lib/models/UserGamification';
import GamificationEvent from '@/lib/models/GamificationEvent';
import UserEventLog from '@/lib/models/UserEventLog';
import Badge from '@/lib/models/Badge';

interface EventMetadata {
  orderId?: string;
  appointmentId?: string;
  trackId?: string;
  amount?: number;
  rating?: number;
  referralCode?: string;
  [key: string]: any;
}

interface AwardResult {
  success: boolean;
  pointsAwarded: number;
  badgesAwarded: string[];
  levelUp?: {
    newLevel: number;
    oldLevel: number;
  };
  streakUpdated?: {
    current: number;
    isRecord: boolean;
  };
  message: string;
}

class GamificationService {
  /**
   * Inicializar gamificación para un usuario nuevo
   */
  static async initializeUser(userId: string): Promise<any> {
    await dbConnect();
    
    try {
      const existingGamification = await UserGamification.findOne({ userId });
      if (existingGamification) {
        return existingGamification;
      }
      
      const newGamification = await UserGamification.create({
        userId,
        points: 0,
        badges: [],
        streak: {
          current: 0,
          longest: 0,
          lastActivityDate: new Date()
        },
        level: 1,
        experience: {
          current: 0,
          nextLevelRequired: 100
        },
        lastActivity: new Date(),
        statistics: {
          totalEvents: 0,
          eventsThisMonth: 0,
          favoriteActivity: '',
          joinedDate: new Date()
        },
        achievements: [],
        preferences: {
          showInLeaderboard: true,
          receiveBadgeNotifications: true,
          showProgressToOthers: true
        }
      });
      
      // Otorgar insignia de bienvenida
      await this.awardPoints(userId, 'user_registration', {
        source: 'automatic'
      });
      
      return newGamification;
    } catch (error) {
      console.error('Error inicializando gamificación:', error);
      throw error;
    }
  }

  /**
   * Otorgar puntos por un evento específico
   */
  static async awardPoints(
    userId: string, 
    eventType: string, 
    metadata: EventMetadata = {},
    source: 'automatic' | 'manual' | 'api' = 'automatic'
  ): Promise<AwardResult> {
    await dbConnect();
    
    try {
      // Buscar o crear gamificación del usuario
      let userGamification = await UserGamification.findOne({ userId });
      if (!userGamification) {
        userGamification = await this.initializeUser(userId);
      }
      
      // Buscar el evento de gamificación
      const gamificationEvent = await GamificationEvent.findOne({ 
        type: eventType, 
        isActive: true 
      });
      
      if (!gamificationEvent) {
        return {
          success: false,
          pointsAwarded: 0,
          badgesAwarded: [],
          message: `Evento no encontrado: ${eventType}`
        };
      }
      
      // Verificar si el usuario puede activar este evento
      const userRole = metadata.userRole || 'patient';
      const canTrigger = await gamificationEvent.canUserTrigger(userId, userRole, metadata);
      
      if (!canTrigger.canTrigger) {
        return {
          success: false,
          pointsAwarded: 0,
          badgesAwarded: [],
          message: `No se puede activar evento: ${canTrigger.reason}`
        };
      }
      
      // Calcular puntos (con multiplicadores estacionales)
      const pointsToAward = gamificationEvent.currentPoints;
      const oldLevel = userGamification.level;
      
      // Otorgar puntos
      await userGamification.addPoints(pointsToAward, eventType);
      
      // Actualizar racha si corresponde
      const streakUpdate = await userGamification.updateStreak();
      
      // Registrar el evento
      const eventLog = await UserEventLog.create({
        userId,
        eventType,
        pointsEarned: pointsToAward,
        badgeEarned: gamificationEvent.badgeAwarded,
        metadata,
        trackableRef: metadata.trackableRef,
        streakContribution: ['daily_login', 'appointment_attended', 'course_completed'].includes(eventType),
        multiplierApplied: gamificationEvent.seasonalEvent?.multiplier || 1,
        source,
        ipAddress: metadata.ipAddress,
        userAgent: metadata.userAgent
      });
      
      // Verificar y otorgar insignias
      const badgesAwarded = await this.checkAndAwardBadges(userId, userRole);
      
      // Otorgar insignia específica del evento si existe
      if (gamificationEvent.badgeAwarded && !userGamification.badges.includes(gamificationEvent.badgeAwarded)) {
        const badge = await Badge.findOne({ id: gamificationEvent.badgeAwarded });
        if (badge) {
          await badge.awardToUser(userId);
          badgesAwarded.push(gamificationEvent.badgeAwarded);
        }
      }
      
      // Actualizar el log con la insignia si se otorgó
      if (badgesAwarded.length > 0) {
        eventLog.badgeEarned = badgesAwarded[0];
        await eventLog.save();
      }
      
      const result: AwardResult = {
        success: true,
        pointsAwarded: pointsToAward,
        badgesAwarded,
        message: `¡Ganaste ${pointsToAward} puntos por ${gamificationEvent.name}!`
      };
      
      // Agregar información de subida de nivel
      if (userGamification.level > oldLevel) {
        result.levelUp = {
          newLevel: userGamification.level,
          oldLevel
        };
        result.message += ` ¡Subiste al nivel ${userGamification.level}!`;
      }
      
      // Agregar información de racha
      if (streakUpdate && streakUpdate.streak.current > 1) {
        result.streakUpdated = {
          current: streakUpdate.streak.current,
          isRecord: streakUpdate.streak.current === streakUpdate.streak.longest
        };
        result.message += ` ¡Racha de ${streakUpdate.streak.current} días!`;
      }
      
      return result;
    } catch (error) {
      console.error('Error otorgando puntos:', error);
      throw error;
    }
  }

  /**
   * Verificar y otorgar insignias automáticamente
   */
  static async checkAndAwardBadges(userId: string, userRole: string): Promise<string[]> {
    await dbConnect();
    
    try {
      const eligibleBadges = await (Badge as any).checkAllBadgesForUser(userId, userRole);
      const awardedBadges: string[] = [];
      
      for (const { badge } of eligibleBadges) {
        const result = await badge.awardToUser(userId);
        if (result.success) {
          awardedBadges.push(badge.id);
        }
      }
      
      return awardedBadges;
    } catch (error) {
      console.error('Error verificando insignias:', error);
      return [];
    }
  }

  /**
   * Calcular nivel basado en puntos
   */
  static calculateLevel(points: number): { level: number; experience: { current: number; nextLevelRequired: number } } {
    let level = 1;
    let totalRequired = 0;
    let nextLevelRequired = 100;
    
    while (points >= totalRequired + nextLevelRequired) {
      totalRequired += nextLevelRequired;
      level++;
      nextLevelRequired = Math.floor(100 * Math.pow(1.5, level - 1));
    }
    
    return {
      level,
      experience: {
        current: points - totalRequired,
        nextLevelRequired
      }
    };
  }

  /**
   * Obtener leaderboard
   */
  static async getLeaderboard(
    role?: string, 
    limit: number = 10,
    timeframe: 'all' | 'month' | 'week' = 'all'
  ): Promise<any[]> {
    await dbConnect();
    
    try {
      return await (UserGamification as any).getLeaderboard(role, limit, timeframe);
    } catch (error) {
      console.error('Error obteniendo leaderboard:', error);
      throw error;
    }
  }

  /**
   * Agregar puntos directamente a un usuario (método simplificado)
   */
  static async addPoints(userId: string, points: number): Promise<void> {
    await dbConnect();
    
    try {
      let userGamification = await UserGamification.findOne({ userId });
      
      if (!userGamification) {
        userGamification = await this.initializeUser(userId);
      }
      
      await userGamification.addPoints(points);
    } catch (error) {
      console.error('Error agregando puntos:', error);
      throw error;
    }
  }

  /**
   * Actualizar racha diaria de un usuario
   */
  static async updateDailyStreak(userId: string): Promise<void> {
    await dbConnect();
    
    try {
      let userGamification = await UserGamification.findOne({ userId });
      
      if (!userGamification) {
        userGamification = await this.initializeUser(userId);
      }
      
      await userGamification.updateStreak();
    } catch (error) {
      console.error('Error actualizando racha:', error);
      throw error;
    }
  }

  /**
   * Verificar y otorgar todas las insignias aplicables para un usuario
   */
  static async checkAllBadgesForUser(userId: string): Promise<{
    newBadges: any[];
    totalPointsAwarded: number;
  }> {
    await dbConnect();
    
    try {
      const Badge = (await import('../models/Badge')).default;
      const badges = await Badge.find({ isActive: true });
      
      const newBadges = [];
      let totalPointsAwarded = 0;

      for (const badge of badges) {
        const result = await badge.awardToUser(userId);
        if (result.success && result.isNew) {
          newBadges.push(badge);
          totalPointsAwarded += result.pointsAwarded || 0;
        }
      }

      return {
        newBadges,
        totalPointsAwarded
      };
    } catch (error) {
      console.error('Error verificando insignias:', error);
      return {
        newBadges: [],
        totalPointsAwarded: 0
      };
    }
  }
  static async getUserProfile(userId: string): Promise<any> {
    await dbConnect();
    
    try {
      let userGamification = await UserGamification.findOne({ userId });
      
      if (!userGamification) {
        userGamification = await this.initializeUser(userId);
      }
      
      // Obtener historial reciente
      const recentEvents = await (UserEventLog as any).getUserHistory(userId, 10);
      
      // Obtener estadísticas del mes
      const monthlyStats = await (UserEventLog as any).getUserStats(userId, 'month');
      
      // Obtener posición en leaderboard
      const leaderboard = await this.getLeaderboard(undefined, 100);
      const userPosition = leaderboard.findIndex(entry => 
        entry.userId.toString() === userId
      ) + 1;
      
      return {
        ...userGamification.toObject(),
        recentEvents,
        monthlyStats,
        leaderboardPosition: userPosition || null,
        levelTitle: userGamification.levelTitle,
        levelProgress: userGamification.levelProgress,
        isStreakActive: userGamification.isStreakActive
      };
    } catch (error) {
      console.error('Error obteniendo perfil:', error);
      throw error;
    }
  }

  /**
   * Procesar un evento de gamificación
   */
  static async processEvent(
    userId: string, 
    eventType: string, 
    metadata: any = {}
  ): Promise<{
    success: boolean;
    pointsEarned: number;
    badgesEarned: any[];
    levelUp: boolean;
    streakUpdated: boolean;
    eventLog: any;
    reason?: string;
    details?: any;
  }> {
    await dbConnect();
    
    try {
      const GamificationEvent = (await import('../models/GamificationEvent')).default;
      const UserEventLog = (await import('../models/UserEventLog')).default;

      // Buscar el evento
      const event = await GamificationEvent.findOne({ id: eventType });
      if (!event) {
        return {
          success: false,
          reason: 'Tipo de evento no encontrado',
          pointsEarned: 0,
          badgesEarned: [],
          levelUp: false,
          streakUpdated: false,
          eventLog: null
        };
      }

      // Verificar elegibilidad
      const isEligible = await event.isUserEligible(userId);
      if (!isEligible) {
        return {
          success: false,
          reason: 'Usuario no elegible para este evento',
          pointsEarned: 0,
          badgesEarned: [],
          levelUp: false,
          streakUpdated: false,
          eventLog: null
        };
      }

      // Obtener perfil de gamificación del usuario
      const userGamification = await this.getUserProfile(userId);
      const initialLevel = userGamification.level;

      // Calcular puntos a otorgar
      let pointsToAward = event.pointsBase;
      
      // Aplicar multiplicadores estacionales
      if (event.seasonalMultiplier > 1) {
        pointsToAward *= event.seasonalMultiplier;
      }

      // Otorgar puntos usando el método existente
      const awardResult = await this.awardPoints(userId, eventType, metadata);

      // Verificar subida de nivel
      const updatedProfile = await this.getUserProfile(userId);
      const levelUp = updatedProfile.level > initialLevel;

      // Obtener nuevas insignias del resultado
      const badgesEarned = awardResult.badgesAwarded || [];

      // Verificar actualización de racha
      const streakUpdated = awardResult.streakUpdated?.current ? true : false;

      // Crear registro de evento (si no se creó ya en awardPoints)
      let eventLog;
      try {
        eventLog = await UserEventLog.create({
          userId,
          eventType,
          pointsEarned: pointsToAward,
          badgeEarned: badgesEarned.length > 0 ? badgesEarned[0] : undefined,
          streakUpdated,
          levelUp,
          metadata: {
            ...metadata,
            eventTitle: event.title,
            multiplierApplied: event.seasonalMultiplier > 1 ? event.seasonalMultiplier : 1,
            processedViaAPI: true
          },
          source: metadata.source || 'api'
        });
      } catch (error) {
        // Si ya existe un registro reciente, obtenerlo
        eventLog = await UserEventLog.findOne({
          userId,
          eventType,
          createdAt: { $gte: new Date(Date.now() - 60000) } // Últimos 60 segundos
        }).sort({ createdAt: -1 });
      }

      return {
        success: true,
        pointsEarned: awardResult.pointsAwarded || 0,
        badgesEarned,
        levelUp,
        streakUpdated,
        eventLog
      };
    } catch (error) {
      console.error('Error procesando evento:', error);
      return {
        success: false,
        reason: 'Error interno procesando evento',
        details: error instanceof Error ? error.message : 'Error desconocido',
        pointsEarned: 0,
        badgesEarned: [],
        levelUp: false,
        streakUpdated: false,
        eventLog: null
      };
    }
  }

  /**
   * Obtener estadísticas globales
   */
  static async getGlobalStats(): Promise<any> {
    await dbConnect();
    
    try {
      const globalStats = await (UserGamification as any).getGlobalStats();
      
      // Obtener top badges
      const topBadges = await Badge.aggregate([
        {
          $match: { currentHolders: { $gt: 0 } }
        },
        {
          $sort: { currentHolders: -1 }
        },
        {
          $limit: 5
        },
        {
          $project: {
            id: 1,
            title: 1,
            iconEmoji: 1,
            currentHolders: 1,
            rarity: 1
          }
        }
      ]);
      
      // Obtener eventos más populares
      const popularEvents = await UserEventLog.aggregate([
        {
          $match: {
            createdAt: {
              $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Últimos 30 días
            }
          }
        },
        {
          $group: {
            _id: '$eventType',
            count: { $sum: 1 },
            totalPoints: { $sum: '$pointsEarned' }
          }
        },
        {
          $sort: { count: -1 }
        },
        {
          $limit: 5
        }
      ]);
      
      return {
        ...globalStats,
        topBadges,
        popularEvents
      };
    } catch (error) {
      console.error('Error obteniendo estadísticas globales:', error);
      throw error;
    }
  }

  /**
   * Rastrear racha de actividad
   */
  static async trackStreak(userId: string): Promise<any> {
    await dbConnect();
    
    try {
      const userGamification = await UserGamification.findOne({ userId });
      if (!userGamification) {
        throw new Error('Usuario no encontrado');
      }
      
      return await userGamification.updateStreak();
    } catch (error) {
      console.error('Error actualizando racha:', error);
      throw error;
    }
  }

  /**
   * Obtener eventos disponibles para un rol
   */
  static async getEventsForRole(role: string): Promise<any[]> {
    await dbConnect();
    
    try {
      return await (GamificationEvent as any).getEventsForRole(role);
    } catch (error) {
      console.error('Error obteniendo eventos por rol:', error);
      throw error;
    }
  }

  /**
   * Obtener todas las insignias disponibles
   */
  static async getAllBadges(role?: string, includeSecret = false): Promise<any[]> {
    await dbConnect();
    
    try {
      if (role) {
        return await (Badge as any).getBadgesForRole(role, includeSecret);
      } else {
        return await Badge.find({
          isVisible: true,
          ...(includeSecret ? {} : { isSecret: false })
        }).sort({ category: 1, rarity: 1, title: 1 });
      }
    } catch (error) {
      console.error('Error obteniendo insignias:', error);
      throw error;
    }
  }

  /**
   * Obtener reporte de actividad
   */
  static async getActivityReport(
    startDate: Date, 
    endDate: Date, 
    groupBy: 'day' | 'week' | 'month' = 'day'
  ): Promise<any[]> {
    await dbConnect();
    
    try {
      return await (UserEventLog as any).getActivityReport(startDate, endDate, groupBy);
    } catch (error) {
      console.error('Error obteniendo reporte de actividad:', error);
      throw error;
    }
  }

  /**
   * Procesar eventos en lote (para migraciones o actualizaciones masivas)
   */
  static async processBatchEvents(events: Array<{
    userId: string;
    eventType: string;
    metadata?: EventMetadata;
  }>): Promise<{ processed: number; errors: number }> {
    await dbConnect();
    
    let processed = 0;
    let errors = 0;
    
    for (const event of events) {
      try {
        await this.awardPoints(event.userId, event.eventType, event.metadata);
        processed++;
      } catch (error) {
        console.error(`Error procesando evento para ${event.userId}:`, error);
        errors++;
      }
    }
    
    return { processed, errors };
  }
}

export default GamificationService;
