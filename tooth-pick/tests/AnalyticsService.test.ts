// tests/AnalyticsService.test.ts
// Pruebas unitarias para AnalyticsService consolidado
// Cobertura: métodos principales del servicio de analytics

import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import analyticsService from '../lib/services/AnalyticsService';
import AnalyticsLog from '../lib/models/AnalyticsLog';

describe('AnalyticsService', () => {
  let mongoServer: MongoMemoryServer;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri(), {});
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  afterEach(async () => {
    await AnalyticsLog.deleteMany({});
  });

  describe('logEvent', () => {
    it('debería registrar un evento correctamente', async () => {
      const eventData = {
        eventType: 'user_login' as const,
        userId: new mongoose.Types.ObjectId().toString(),
        userRole: 'admin' as const,
        metadata: { userAgent: 'test-browser' }
      };

      const result = await analyticsService.logEvent(eventData);
      
      expect(result).toBeTruthy();
      expect(result?.eventType).toBe('user_login');
      expect(result?.userRole).toBe('admin');
    });

    it('debería manejar errores y retornar null', async () => {
      const invalidData = {
        eventType: 'invalid_event' as any,
        userId: 'invalid-id',
        userRole: 'admin' as const
      };

      const result = await analyticsService.logEvent(invalidData);
      expect(result).toBeNull();
    });
  });

  describe('getMetrics', () => {
    beforeEach(async () => {
      // Crear datos de prueba
      await AnalyticsLog.create([
        {
          eventType: 'user_login',
          userId: new mongoose.Types.ObjectId(),
          userRole: 'admin',
          metadata: {},
          timestamp: new Date()
        },
        {
          eventType: 'product_viewed',
          userId: new mongoose.Types.ObjectId(),
          userRole: 'clinic',
          metadata: {},
          timestamp: new Date()
        }
      ]);
    });

    it('debería obtener métricas sin filtros', async () => {
      const metrics = await analyticsService.getMetrics({});
      expect(metrics.length).toBe(2);
    });

    it('debería filtrar por userRole', async () => {
      const metrics = await analyticsService.getMetrics({ userRole: 'admin' });
      expect(metrics.length).toBe(1);
      expect(metrics[0].userRole).toBe('admin');
    });

    it('debería filtrar por eventTypes', async () => {
      const metrics = await analyticsService.getMetrics({ 
        eventTypes: ['product_viewed'] 
      });
      expect(metrics.length).toBe(1);
      expect(metrics[0].eventType).toBe('product_viewed');
    });

    it('debería manejar errores', async () => {
      // Simular error cerrando conexión
      await mongoose.disconnect();
      const metrics = await analyticsService.getMetrics({});
      expect(metrics).toEqual([]);
      // Reconectar para otras pruebas
      await mongoose.connect(mongoServer.getUri(), {});
    });
  });

  describe('getDashboardMetrics', () => {
    beforeEach(async () => {
      const userId = new mongoose.Types.ObjectId();
      await AnalyticsLog.create([
        {
          eventType: 'user_login',
          userId,
          userRole: 'admin',
          metadata: {},
          timestamp: new Date()
        },
        {
          eventType: 'page_viewed',
          userId,
          userRole: 'admin',
          metadata: {},
          timestamp: new Date()
        }
      ]);
    });

    it('debería obtener métricas de dashboard', async () => {
      const dashboard = await analyticsService.getDashboardMetrics({});
      
      expect(dashboard.overview.totalEvents).toBe(2);
      expect(dashboard.overview.uniqueUsers).toBe(1);
      expect(dashboard.charts.topEvents).toHaveLength(2);
    });

    it('debería filtrar por rango de fechas', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      const dashboard = await analyticsService.getDashboardMetrics({
        startDate: tomorrow,
        endDate: tomorrow
      });
      
      expect(dashboard.overview.totalEvents).toBe(0);
    });
  });

  describe('exportData', () => {
    beforeEach(async () => {
      await AnalyticsLog.create({
        eventType: 'user_login',
        userId: new mongoose.Types.ObjectId(),
        userRole: 'admin',
        metadata: { test: 'data' },
        timestamp: new Date()
      });
    });

    it('debería exportar datos en formato JSON', async () => {
      const data = await analyticsService.exportData({}, 'json');
      expect(Array.isArray(data)).toBe(true);
      expect(data.length).toBe(1);
    });

    it('debería exportar datos en formato CSV', async () => {
      const data = await analyticsService.exportData({}, 'csv');
      // TODO: implementar conversión a CSV real
      expect(Array.isArray(data)).toBe(true);
    });
  });
});

// TODO: Agregar pruebas de integración con endpoints
// TODO: Agregar pruebas de rendimiento para grandes volúmenes de datos
