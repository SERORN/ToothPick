// tests/AnalyticsLog.test.ts
// Pruebas unitarias para el modelo AnalyticsLog
// Cobertura: métodos estáticos y de instancia
// Uso de mongodb-memory-server para entorno aislado

import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import AnalyticsLog from '../lib/models/AnalyticsLog';

describe('AnalyticsLog Model', () => {
  let mongoServer: MongoMemoryServer;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri(), {});
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  it('debería crear un log y usar toAnalyticsFormat()', async () => {
    const log = await AnalyticsLog.create({
      eventType: 'user_login',
      userId: new mongoose.Types.ObjectId(),
      userRole: 'admin',
      metadata: { userAgent: 'test' },
      timestamp: new Date(),
      status: 'pending'
    });
    expect(log.toAnalyticsFormat()).toHaveProperty('eventType', 'user_login');
  });

  it('debería detectar evento reciente', async () => {
    const log = await AnalyticsLog.create({
      eventType: 'user_login',
      userId: new mongoose.Types.ObjectId(),
      userRole: 'admin',
      metadata: {},
      timestamp: new Date(),
      status: 'pending'
    });
    expect(log.isRecentEvent(5)).toBe(true);
  });

  it('debería obtener datos contextuales', async () => {
    const log = await AnalyticsLog.create({
      eventType: 'user_login',
      userId: new mongoose.Types.ObjectId(),
      userRole: 'admin',
      sessionId: 'sess123',
      deviceId: 'dev456',
      metadata: {},
      timestamp: new Date(),
      status: 'pending'
    });
    const context = log.getContextualData();
    expect(context).toHaveProperty('user');
    expect(context).toHaveProperty('event');
    expect(context).toHaveProperty('session');
  });

  it('debería filtrar por rango de fechas (estático)', async () => {
    const userId = new mongoose.Types.ObjectId();
    await AnalyticsLog.create({
      eventType: 'user_login',
      userId,
      userRole: 'admin',
      metadata: {},
      timestamp: new Date(),
      status: 'pending'
    });
    const logs = await AnalyticsLog.findByDateRange(new Date(Date.now() - 10000), new Date());
    expect(logs.length).toBeGreaterThan(0);
  });

  it('debería filtrar por usuario (estático)', async () => {
    const userId = new mongoose.Types.ObjectId();
    await AnalyticsLog.create({
      eventType: 'user_login',
      userId,
      userRole: 'admin',
      metadata: {},
      timestamp: new Date(),
      status: 'pending'
    });
    const logs = await AnalyticsLog.findByUser(userId.toString());
    expect(logs.length).toBeGreaterThan(0);
  });

  // TODO: Agregar pruebas para getEventCounts y getUserActivity
  // TODO: Agregar pruebas de error y edge cases
});
