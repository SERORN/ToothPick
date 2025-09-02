// 📊 ANALYTICS SERVICE - Consolidado y limpio
// ✅ Sistema completo de business intelligence y recolección de datos
// i18n: Migrado - Comentarios y descripciones listos para extracción

import mongoose from 'mongoose';
import dbConnect from '../db';
import AnalyticsLog, { EventType, UserRole, EntityType, IAnalyticsLog } from '../models/AnalyticsLog';

// t('analytics.interfaces')
export interface LogEventData {
  eventType: EventType;
  userId: string;
  userRole: UserRole;
  entityType?: EntityType;
  entityId?: string;
  metadata?: Record<string, any>;
  sessionId?: string;
  deviceId?: string;
}

export interface MetricsFilters {
  userRole?: UserRole;
  eventTypes?: EventType[];
  entityType?: EntityType;
  entityId?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  page?: number;
}

export interface DashboardMetrics {
  overview: {
    totalEvents: number;
    uniqueUsers: number;
    growth: number;
    period: string;
  };
  business: {
    revenue: number;
    orders: number;
    averageOrderValue: number;
    conversionRate: number;
  };
  engagement: {
    pageViews: number;
    sessionDuration: number;
    bounceRate: number;
    returnVisitors: number;
  };
  activity: {
    newRegistrations: number;
    productsCreated: number;
    supportTickets: number;
    verificationsCompleted: number;
  };
  charts: {
    timeSeriesData: any[];
    topEvents: any[];
    userActivity: any[];
    revenueByPeriod: any[];
  };
}

// Clase consolidada sin duplicados
class AnalyticsService {
  
  // ===============================
  // 📊 RECOLECCIÓN DE EVENTOS
  // ===============================

  /**
   * t('analytics.logEvent')
   * Registra un evento en el sistema de analytics
   */
  async logEvent(data: LogEventData): Promise<IAnalyticsLog | null> {
    try {
      await dbConnect();
      
      const log = new AnalyticsLog({
        eventType: data.eventType,
        userId: new mongoose.Types.ObjectId(data.userId),
        userRole: data.userRole,
        entityType: data.entityType,
        entityId: data.entityId ? new mongoose.Types.ObjectId(data.entityId) : undefined,
        metadata: data.metadata || {},
        sessionId: data.sessionId,
        deviceId: data.deviceId,
        timestamp: new Date()
      });

      const savedLog = await log.save();
      console.log(`[AnalyticsService] Event logged: ${data.eventType} for user ${data.userId}`);
      return savedLog;
    } catch (error) {
      console.error('[AnalyticsService.logEvent] Error:', error);
      return null;
    }
  }

  /**
   * t('analytics.getMetrics')
   * Obtiene métricas filtradas
   */
  async getMetrics(filters: MetricsFilters): Promise<IAnalyticsLog[]> {
    try {
      await dbConnect();
      
      const query: any = {};
      
      if (filters.userRole) query.userRole = filters.userRole;
      if (filters.eventTypes?.length) query.eventType = { $in: filters.eventTypes };
      if (filters.entityType) query.entityType = filters.entityType;
      if (filters.entityId) query.entityId = new mongoose.Types.ObjectId(filters.entityId);
      if (filters.startDate || filters.endDate) {
        query.timestamp = {};
        if (filters.startDate) query.timestamp.$gte = filters.startDate;
        if (filters.endDate) query.timestamp.$lte = filters.endDate;
      }

      const skip = ((filters.page || 1) - 1) * (filters.limit || 100);
      
      return await AnalyticsLog.find(query)
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(filters.limit || 100)
        .lean();
    } catch (error) {
      console.error('[AnalyticsService.getMetrics] Error:', error);
      return [];
    }
  }

  /**
   * t('analytics.getDashboardMetrics')
   * Obtiene métricas para dashboard
   */
  async getDashboardMetrics(filters: MetricsFilters): Promise<DashboardMetrics> {
    try {
      await dbConnect();
      
      const endDate = filters.endDate || new Date();
      const startDate = filters.startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 días

      // Métricas básicas
      const totalEvents = await AnalyticsLog.countDocuments({
        timestamp: { $gte: startDate, $lte: endDate }
      });

      const uniqueUsers = await AnalyticsLog.distinct('userId', {
        timestamp: { $gte: startDate, $lte: endDate }
      });

      // Eventos por tipo
      const topEvents = await AnalyticsLog.aggregate([
        { $match: { timestamp: { $gte: startDate, $lte: endDate } } },
        { $group: { _id: '$eventType', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 }
      ]);

      return {
        overview: {
          totalEvents,
          uniqueUsers: uniqueUsers.length,
          growth: 0, // TODO: calcular crecimiento
          period: `${startDate.toISOString().split('T')[0]} - ${endDate.toISOString().split('T')[0]}`
        },
        business: {
          revenue: 0, // TODO: integrar con payment events
          orders: 0,
          averageOrderValue: 0,
          conversionRate: 0
        },
        engagement: {
          pageViews: 0, // TODO: contar page_viewed events
          sessionDuration: 0,
          bounceRate: 0,
          returnVisitors: 0
        },
        activity: {
          newRegistrations: 0, // TODO: contar user_register events
          productsCreated: 0,
          supportTickets: 0,
          verificationsCompleted: 0
        },
        charts: {
          timeSeriesData: [],
          topEvents,
          userActivity: [],
          revenueByPeriod: []
        }
      };
    } catch (error) {
      console.error('[AnalyticsService.getDashboardMetrics] Error:', error);
      throw error;
    }
  }

  /**
   * t('analytics.exportData')
   * Exporta datos de analytics
   */
  async exportData(filters: MetricsFilters, format: 'csv' | 'json' = 'json'): Promise<any> {
    try {
      const data = await this.getMetrics(filters);
      
      if (format === 'csv') {
        // TODO: convertir a CSV
        return data;
      }
      
      return data;
    } catch (error) {
      console.error('[AnalyticsService.exportData] Error:', error);
      throw error;
    }
  }
}

// Instancia singleton
const analyticsService = new AnalyticsService();

// TODO: Agregar pruebas unitarias en AnalyticsService.test.ts
// TODO: Documentar endpoints en swagger.json
export default analyticsService;
