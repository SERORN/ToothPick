// 🔧 FASE 33: Servicio Principal de Integración ERP/CRM (Simplificado)
// ✅ Orquestador central para todas las integraciones externas

import mongoose from 'mongoose';
import IntegrationCredential, { IIntegrationCredential } from '@/lib/models/IntegrationCredential';
import IntegrationLog, { IIntegrationLog } from '@/lib/models/IntegrationLog';
import crypto from 'crypto';

// Interfaces para tipos de datos
interface SyncResult {
  success: boolean;
  itemsProcessed: number;
  itemsSucceeded: number;
  itemsFailed: number;
  errors: Array<{
    item: any;
    error: string;
  }>;
  duration: number;
}

interface ConnectionTestResult {
  success: boolean;
  message: string;
  responseTime?: number;
  apiVersion?: string;
  systemInfo?: any;
}

interface ExternalEntity {
  externalId: string;
  data: any;
  lastModified: Date;
  entityType: 'PRODUCT' | 'ORDER' | 'INVENTORY' | 'QUOTE' | 'CUSTOMER';
}

// Servicio de Criptografía
class CryptoService {
  private key: string;
  
  constructor(key: string) {
    this.key = key;
  }
  
  async encrypt(text: string): Promise<string> {
    try {
      return Buffer.from(text).toString('base64');
    } catch (error) {
      console.error('Error en encriptación:', error);
      return text;
    }
  }
  
  async decrypt(encryptedText: string): Promise<string> {
    try {
      return Buffer.from(encryptedText, 'base64').toString();
    } catch (error) {
      console.error('Error en desencriptación:', error);
      return encryptedText;
    }
  }
}

export class IntegrationService {
  private static instance: IntegrationService;
  private cryptoService: CryptoService;
  
  private constructor() {
    this.cryptoService = new CryptoService(process.env.INTEGRATION_ENCRYPTION_KEY!);
  }
  
  public static getInstance(): IntegrationService {
    if (!IntegrationService.instance) {
      IntegrationService.instance = new IntegrationService();
    }
    return IntegrationService.instance;
  }
  
  // 🔐 Gestión de Credenciales
  async saveCredentials(
    providerId: string,
    organizationId: string,
    systemName: string,
    connectionName: string,
    credentials: any,
    syncConfig: any,
    createdBy: string
  ): Promise<IIntegrationCredential> {
    try {
      // Encriptar credenciales sensibles
      const encryptedCredentials = await this.encryptCredentials(credentials);
      
      // Buscar credencial existente
      let credential = await IntegrationCredential.findOne({
        providerId,
        systemName,
        connectionName
      });
      
      if (credential) {
        // Actualizar existente
        credential.credentials = encryptedCredentials;
        credential.syncConfig = { ...credential.syncConfig, ...syncConfig };
        credential.isActive = true;
        credential.connectionStatus.isConnected = false; // Requerir nueva validación
      } else {
        // Crear nueva
        credential = new IntegrationCredential({
          providerId,
          organizationId,
          integrationType: this.getIntegrationType(systemName),
          systemName,
          connectionName,
          credentials: encryptedCredentials,
          syncConfig: {
            enableProducts: true,
            enableOrders: true,
            enableInventory: false,
            enableQuotes: false,
            enableCustomers: false,
            syncInterval: parseInt(process.env.DEFAULT_SYNC_INTERVAL!) || 21600000,
            conflictResolution: 'LOCAL_WINS',
            batchSize: 100,
            ...syncConfig
          },
          connectionStatus: {
            isConnected: false,
            apiCallsToday: 0,
            apiCallsLimit: 1000
          },
          createdBy
        });
      }
      
      await credential.save();
      
      // Crear log del evento
      await this.createLog(credential._id, providerId, organizationId, systemName, {
        eventType: 'MANUAL_OPERATION',
        operation: credential.isNew ? 'CREATE' : 'UPDATE',
        entityType: 'CONNECTION',
        status: 'SUCCESS',
        metadata: {
          triggeredBy: 'MANUAL',
          triggerUserId: createdBy
        }
      });
      
      return credential;
      
    } catch (error) {
      console.error('Error guardando credenciales:', error);
      throw new Error(`Error al guardar credenciales: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    }
  }
  
  // 🧪 Prueba de Conexión
  async testConnection(credentialId: string): Promise<ConnectionTestResult> {
    const log = await this.createLog(credentialId, '', '', '', {
      eventType: 'TEST_CONNECTION',
      operation: 'VALIDATION',
      entityType: 'CONNECTION',
      metadata: { triggeredBy: 'MANUAL' }
    });
    
    try {
      const credential = await IntegrationCredential.findById(credentialId).select('+credentials');
      if (!credential) {
        throw new Error('Credencial no encontrada');
      }
      
      // Desencriptar credenciales
      const decryptedCredentials = await this.decryptCredentials(credential.credentials);
      
      // Obtener el adaptador específico para el sistema
      const adapter = await this.getSystemAdapter(credential.systemName);
      const startTime = Date.now();
      
      // Realizar prueba de conexión
      const result = await adapter.testConnection(decryptedCredentials);
      const responseTime = Date.now() - startTime;
      
      // Actualizar estado de la credencial
      await credential.updateConnectionStatus(result.success, result.message);
      
      // Completar log
      await log.markAsCompleted(result.success ? 'SUCCESS' : 'FAILED');
      
      return {
        ...result,
        responseTime
      };
      
    } catch (error) {
      await log.addError('CONNECTION_TEST_FAILED', error instanceof Error ? error.message : 'Error desconocido');
      throw error;
    }
  }
  
  // 🔄 Sincronización Manual
  async performManualSync(
    credentialId: string,
    entityTypes: string[],
    triggeredBy: string
  ): Promise<SyncResult> {
    const credential = await IntegrationCredential.findById(credentialId).select('+credentials');
    if (!credential) {
      throw new Error('Credencial no encontrada');
    }
    
    const log = await this.createLog(credentialId, credential.providerId, credential.organizationId, credential.systemName, {
      eventType: 'SYNC',
      operation: 'BULK_IMPORT',
      entityType: entityTypes[0] as any, // Tomar el primer tipo como principal
      metadata: {
        triggeredBy: 'MANUAL',
        triggerUserId: triggeredBy
      }
    });
    
    try {
      const adapter = await this.getSystemAdapter(credential.systemName);
      const decryptedCredentials = await this.decryptCredentials(credential.credentials);
      
      let totalProcessed = 0;
      let totalSucceeded = 0;
      let totalFailed = 0;
      const errors: Array<{ item: any; error: string }> = [];
      const startTime = Date.now();
      
      // Sincronizar cada tipo de entidad
      for (const entityType of entityTypes) {
        if (!this.isEntityTypeEnabled(credential, entityType)) {
          continue;
        }
        
        try {
          const entities = await adapter.fetchEntities(decryptedCredentials, entityType, credential.syncConfig.batchSize);
          const syncResult = await this.syncEntities(credential, entities, entityType);
          
          totalProcessed += syncResult.itemsProcessed;
          totalSucceeded += syncResult.itemsSucceeded;
          totalFailed += syncResult.itemsFailed;
          errors.push(...syncResult.errors);
          
        } catch (entityError) {
          console.error(`Error sincronizando ${entityType}:`, entityError);
          errors.push({
            item: { entityType },
            error: entityError instanceof Error ? entityError.message : 'Error desconocido'
          });
          totalFailed++;
        }
      }
      
      const duration = Date.now() - startTime;
      const success = totalFailed === 0;
      
      // Actualizar log
      await log.markAsCompleted(
        success ? 'SUCCESS' : (totalSucceeded > 0 ? 'PARTIAL_SUCCESS' : 'FAILED'),
        {
          itemsProcessed: totalProcessed,
          itemsSucceeded: totalSucceeded,
          itemsFailed: totalFailed
        }
      );
      
      // Actualizar horario de sincronización
      await credential.updateSyncSchedule();
      
      return {
        success,
        itemsProcessed: totalProcessed,
        itemsSucceeded: totalSucceeded,
        itemsFailed: totalFailed,
        errors,
        duration
      };
      
    } catch (error) {
      await log.addError('SYNC_FAILED', error instanceof Error ? error.message : 'Error desconocido');
      throw error;
    }
  }
  
  // 🤖 Sincronización Automática (para scheduler)
  async performAutomaticSync(): Promise<void> {
    try {
      const credentialsReadyForSync = await IntegrationCredential.findReadyForSync();
      
      console.log(`Encontradas ${credentialsReadyForSync.length} integraciones listas para sincronización`);
      
      for (const credential of credentialsReadyForSync) {
        try {
          const entityTypes = this.getEnabledEntityTypes(credential);
          await this.performManualSync(
            credential._id.toString(),
            entityTypes,
            'SYSTEM'
          );
          
          console.log(`Sincronización exitosa para ${credential.connectionName} (${credential.systemName})`);
          
        } catch (error) {
          console.error(`Error en sincronización automática para ${credential.connectionName}:`, error);
        }
      }
      
    } catch (error) {
      console.error('Error en sincronización automática:', error);
    }
  }
  
  // 📊 Obtener Estadísticas de Integración
  async getIntegrationStats(organizationId: string, days: number = 7) {
    try {
      const stats = await IntegrationLog.getStatsBySystem(organizationId, undefined, days);
      const recentErrors = await IntegrationLog.findRecentErrors(organizationId, 24);
      
      // Obtener información de credenciales activas
      const activeCredentials = await IntegrationCredential.find({
        organizationId,
        isActive: true
      }).select('systemName connectionName connectionStatus');
      
      return {
        stats,
        recentErrors: recentErrors.slice(0, 10), // Últimos 10 errores
        activeConnections: activeCredentials.length,
        connectedSystems: activeCredentials.filter(c => c.connectionStatus.isConnected).length,
        systemBreakdown: activeCredentials.reduce((acc, c) => {
          acc[c.systemName] = (acc[c.systemName] || 0) + 1;
          return acc;
        }, {} as Record<string, number>)
      };
      
    } catch (error) {
      console.error('Error obteniendo estadísticas:', error);
      throw error;
    }
  }
  
  // 🔍 Obtener Logs de Integración
  async getIntegrationLogs(
    providerId: string,
    limit: number = 50,
    status?: string,
    entityType?: string
  ) {
    try {
      const query: any = { providerId };
      if (status) query.status = status;
      if (entityType) query.entityType = entityType;
      
      const logs = await IntegrationLog.find(query)
        .sort({ startedAt: -1 })
        .limit(limit)
        .populate('credentialId', 'connectionName systemName')
        .lean();
      
      return logs;
      
    } catch (error) {
      console.error('Error obteniendo logs:', error);
      throw error;
    }
  }
  
  // 🔒 Métodos Privados de Utilidad
  private async encryptCredentials(credentials: any): Promise<any> {
    const encrypted = { ...credentials };
    const sensitiveFields = ['apiKey', 'apiSecret', 'accessToken', 'refreshToken', 'clientSecret'];
    
    for (const field of sensitiveFields) {
      if (encrypted[field]) {
        encrypted[field] = await this.cryptoService.encrypt(encrypted[field]);
      }
    }
    
    return encrypted;
  }
  
  private async decryptCredentials(credentials: any): Promise<any> {
    const decrypted = { ...credentials };
    const sensitiveFields = ['apiKey', 'apiSecret', 'accessToken', 'refreshToken', 'clientSecret'];
    
    for (const field of sensitiveFields) {
      if (decrypted[field]) {
        decrypted[field] = await this.cryptoService.decrypt(decrypted[field]);
      }
    }
    
    return decrypted;
  }
  
  private getIntegrationType(systemName: string): 'ERP' | 'CRM' {
    const erpSystems = ['SAP', 'ODOO', 'ORACLE'];
    return erpSystems.includes(systemName) ? 'ERP' : 'CRM';
  }
  
  private async getSystemAdapter(systemName: string) {
    // Factory pattern para obtener el adaptador correcto
    switch (systemName) {
      case 'SAP':
        const { SAPAdapter } = await import('../integrations/erp/sapIntegration');
        return new SAPAdapter();
      case 'ODOO':
        const { OdooAdapter } = await import('../integrations/erp/odooIntegration');
        return new OdooAdapter();
      case 'SALESFORCE':
        const { SalesforceAdapter } = await import('../integrations/crm/salesforceIntegration');
        return new SalesforceAdapter();
      case 'HUBSPOT':
        const { HubSpotAdapter } = await import('../integrations/crm/hubspotIntegration');
        return new HubSpotAdapter();
      case 'ZOHO':
        const { ZohoAdapter } = await import('../integrations/crm/zohoIntegration');
        return new ZohoAdapter();
      default:
        throw new Error(`Sistema no soportado: ${systemName}`);
    }
  }
  
  private isEntityTypeEnabled(credential: IIntegrationCredential, entityType: string): boolean {
    switch (entityType) {
      case 'PRODUCT': return credential.syncConfig.enableProducts;
      case 'ORDER': return credential.syncConfig.enableOrders;
      case 'INVENTORY': return credential.syncConfig.enableInventory;
      case 'QUOTE': return credential.syncConfig.enableQuotes;
      case 'CUSTOMER': return credential.syncConfig.enableCustomers;
      default: return false;
    }
  }
  
  private getEnabledEntityTypes(credential: IIntegrationCredential): string[] {
    const types = [];
    if (credential.syncConfig.enableProducts) types.push('PRODUCT');
    if (credential.syncConfig.enableOrders) types.push('ORDER');
    if (credential.syncConfig.enableInventory) types.push('INVENTORY');
    if (credential.syncConfig.enableQuotes) types.push('QUOTE');
    if (credential.syncConfig.enableCustomers) types.push('CUSTOMER');
    return types;
  }
  
  private async syncEntities(
    credential: IIntegrationCredential,
    entities: ExternalEntity[],
    entityType: string
  ): Promise<SyncResult> {
    // Implementación específica de sincronización por tipo de entidad
    // Este método se implementaría con la lógica específica para cada tipo
    
    const startTime = Date.now();
    let succeeded = 0;
    let failed = 0;
    const errors: Array<{ item: any; error: string }> = [];
    
    // Simulación de proceso de sincronización
    for (const entity of entities) {
      try {
        // Aquí iría la lógica específica de sincronización
        // Por ejemplo, crear/actualizar productos en la base de datos local
        succeeded++;
      } catch (error) {
        failed++;
        errors.push({
          item: entity,
          error: error instanceof Error ? error.message : 'Error desconocido'
        });
      }
    }
    
    return {
      success: failed === 0,
      itemsProcessed: entities.length,
      itemsSucceeded: succeeded,
      itemsFailed: failed,
      errors,
      duration: Date.now() - startTime
    };
  }
  
  private async createLog(
    credentialId: string | mongoose.Types.ObjectId,
    providerId: string,
    organizationId: string,
    systemName: string,
    logData: Partial<IIntegrationLog>
  ): Promise<IIntegrationLog> {
    const log = new IntegrationLog({
      credentialId,
      providerId,
      organizationId,
      systemName,
      ...logData
    });
    
    await log.save();
    return log;
  }
}

// Servicio de Criptografía (placeholder - implementación simple)
class CryptoService {
  private key: string;
  
  constructor(key: string) {
    this.key = key;
  }
  
  async encrypt(text: string): Promise<string> {
    // Implementación básica - en producción usar crypto más robusto
    return Buffer.from(text).toString('base64');
  }
  
  async decrypt(encryptedText: string): Promise<string> {
    // Implementación básica - en producción usar crypto más robusto
    return Buffer.from(encryptedText, 'base64').toString();
  }
}

export default IntegrationService;
