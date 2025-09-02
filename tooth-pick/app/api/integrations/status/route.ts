// 📊 FASE 33: API para Estado de Integraciones
// ✅ Endpoint para dashboard general de integraciones

import { NextRequest, NextResponse } from 'next/server';
import IntegrationCredential from '@/lib/models/IntegrationCredential';
import IntegrationLog from '@/lib/models/IntegrationLog';

// GET: Obtener estado general de integraciones
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get('organizationId');
    const providerId = searchParams.get('providerId');
    
    if (!organizationId && !providerId) {
      return NextResponse.json(
        { error: 'Se requiere organizationId o providerId' },
        { status: 400 }
      );
    }
    
    const query: any = {};
    if (organizationId) query.organizationId = organizationId;
    if (providerId) query.providerId = providerId;
    
    // Obtener todas las credenciales activas
    const credentials = await IntegrationCredential.find({
      ...query,
      isActive: true
    }).select('-credentials'); // Excluir credenciales sensibles
    
    // Estadísticas básicas
    const totalConnections = credentials.length;
    const connectedSystems = credentials.filter(c => c.connectionStatus.isConnected).length;
    const systemTypes = credentials.reduce((acc, c) => {
      acc[c.systemName] = (acc[c.systemName] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    // Obtener logs recientes (últimas 24 horas)
    const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentLogs = await IntegrationLog.find({
      ...query,
      startedAt: { $gte: last24Hours }
    })
    .sort({ startedAt: -1 })
    .limit(10)
    .populate('credentialId', 'connectionName systemName');
    
    // Estadísticas de logs por estado
    const logStats = await IntegrationLog.aggregate([
      {
        $match: {
          ...query,
          startedAt: { $gte: last24Hours }
        }
      },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalItemsProcessed: { $sum: '$details.itemsProcessed' }
        }
      }
    ]);
    
    // Próximas sincronizaciones programadas
    const upcomingSyncs = credentials
      .filter(c => c.syncConfig.nextSyncAt)
      .sort((a, b) => new Date(a.syncConfig.nextSyncAt!).getTime() - new Date(b.syncConfig.nextSyncAt!).getTime())
      .slice(0, 5)
      .map(c => ({
        connectionName: c.connectionName,
        systemName: c.systemName,
        nextSyncAt: c.syncConfig.nextSyncAt,
        syncInterval: c.syncConfig.syncInterval,
        enabledEntities: [
          c.syncConfig.enableProducts && 'PRODUCTS',
          c.syncConfig.enableOrders && 'ORDERS',
          c.syncConfig.enableInventory && 'INVENTORY',
          c.syncConfig.enableQuotes && 'QUOTES',
          c.syncConfig.enableCustomers && 'CUSTOMERS'
        ].filter(Boolean)
      }));
    
    // Sistemas con errores recientes
    const systemsWithErrors = await IntegrationLog.aggregate([
      {
        $match: {
          ...query,
          status: 'FAILED',
          startedAt: { $gte: last24Hours }
        }
      },
      {
        $group: {
          _id: '$systemName',
          errorCount: { $sum: 1 },
          lastError: { $max: '$startedAt' },
          lastErrorMessage: { $last: '$error.message' }
        }
      },
      {
        $sort: { errorCount: -1 }
      }
    ]);
    
    // Health score (porcentaje de sistemas conectados y sin errores recientes)
    const healthScore = totalConnections > 0 
      ? Math.round(((connectedSystems - systemsWithErrors.length) / totalConnections) * 100)
      : 100;
    
    return NextResponse.json({
      success: true,
      status: {
        overview: {
          totalConnections,
          connectedSystems,
          disconnectedSystems: totalConnections - connectedSystems,
          healthScore,
          systemTypes
        },
        recentActivity: {
          logs: recentLogs.slice(0, 5), // Últimos 5 logs
          logStats: logStats.reduce((acc, stat) => {
            acc[stat._id] = {
              count: stat.count,
              totalItemsProcessed: stat.totalItemsProcessed
            };
            return acc;
          }, {} as Record<string, any>)
        },
        upcomingSyncs,
        alerts: {
          systemsWithErrors,
          disconnectedSystems: credentials
            .filter(c => !c.connectionStatus.isConnected)
            .map(c => ({
              connectionName: c.connectionName,
              systemName: c.systemName,
              lastError: c.connectionStatus.errorMessage,
              lastTestAt: c.connectionStatus.lastTestAt
            }))
        },
        integrations: credentials.map(c => ({
          id: c._id,
          connectionName: c.connectionName,
          systemName: c.systemName,
          integrationType: c.integrationType,
          isConnected: c.connectionStatus.isConnected,
          lastSyncAt: c.syncConfig.lastSyncAt,
          nextSyncAt: c.syncConfig.nextSyncAt,
          enabledEntities: {
            products: c.syncConfig.enableProducts,
            orders: c.syncConfig.enableOrders,
            inventory: c.syncConfig.enableInventory,
            quotes: c.syncConfig.enableQuotes,
            customers: c.syncConfig.enableCustomers
          },
          apiCallsToday: c.connectionStatus.apiCallsToday,
          apiCallsLimit: c.connectionStatus.apiCallsLimit
        }))
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Error en GET /api/integrations/status:', error);
    return NextResponse.json(
      { 
        error: 'Error al obtener estado de integraciones',
        details: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    );
  }
}
