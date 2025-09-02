// 🔗 FASE 33: Modelo para Credenciales de Integración ERP/CRM
// ✅ Almacenamiento seguro de credenciales de API de sistemas externos

import mongoose, { Schema, Document, Model } from 'mongoose';

// Interface para las credenciales
export interface IIntegrationCredential extends Document {
  _id: mongoose.Types.ObjectId;
  providerId: string; // ID del proveedor en ToothPick
  organizationId: string; // ID de la organización
  integrationType: 'ERP' | 'CRM';
  systemName: 'SAP' | 'ODOO' | 'ORACLE' | 'ZOHO' | 'SALESFORCE' | 'HUBSPOT' | 'PIPEDRIVE' | 'CUSTOM';
  connectionName: string; // Nombre personalizado de la conexión
  isActive: boolean;
  
  // Credenciales encriptadas
  credentials: {
    apiKey?: string;
    apiSecret?: string;
    accessToken?: string;
    refreshToken?: string;
    serverUrl?: string;
    database?: string;
    username?: string;
    clientId?: string;
    clientSecret?: string;
    instanceUrl?: string;
    customFields?: Record<string, string>;
  };
  
  // Configuración de sincronización
  syncConfig: {
    enableProducts: boolean;
    enableOrders: boolean;
    enableInventory: boolean;
    enableQuotes: boolean;
    enableCustomers: boolean;
    syncInterval: number; // en milisegundos
    lastSyncAt?: Date;
    nextSyncAt?: Date;
    conflictResolution: 'LOCAL_WINS' | 'REMOTE_WINS' | 'MANUAL_REVIEW';
    batchSize: number;
  };
  
  // Estado de la conexión
  connectionStatus: {
    isConnected: boolean;
    lastTestAt?: Date;
    lastSuccessAt?: Date;
    lastErrorAt?: Date;
    errorMessage?: string;
    apiCallsToday: number;
    apiCallsLimit: number;
  };
  
  // Metadatos
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

// Schema de MongoDB
const IntegrationCredentialSchema = new Schema<IIntegrationCredential>({
  providerId: {
    type: String,
    required: true,
    index: true
  },
  organizationId: {
    type: String,
    required: true,
    index: true
  },
  integrationType: {
    type: String,
    enum: ['ERP', 'CRM'],
    required: true
  },
  systemName: {
    type: String,
    enum: ['SAP', 'ODOO', 'ORACLE', 'ZOHO', 'SALESFORCE', 'HUBSPOT', 'PIPEDRIVE', 'CUSTOM'],
    required: true
  },
  connectionName: {
    type: String,
    required: true,
    maxlength: 100
  },
  isActive: {
    type: Boolean,
    default: true
  },
  
  // Credenciales (se encriptarán antes de guardar)
  credentials: {
    apiKey: { type: String, select: false }, // No incluir en queries por defecto
    apiSecret: { type: String, select: false },
    accessToken: { type: String, select: false },
    refreshToken: { type: String, select: false },
    serverUrl: String,
    database: String,
    username: String,
    clientId: { type: String, select: false },
    clientSecret: { type: String, select: false },
    instanceUrl: String,
    customFields: {
      type: Map,
      of: String,
      default: new Map()
    }
  },
  
  // Configuración de sincronización
  syncConfig: {
    enableProducts: { type: Boolean, default: true },
    enableOrders: { type: Boolean, default: true },
    enableInventory: { type: Boolean, default: false },
    enableQuotes: { type: Boolean, default: false },
    enableCustomers: { type: Boolean, default: false },
    syncInterval: { type: Number, default: 21600000 }, // 6 horas por defecto
    lastSyncAt: Date,
    nextSyncAt: Date,
    conflictResolution: {
      type: String,
      enum: ['LOCAL_WINS', 'REMOTE_WINS', 'MANUAL_REVIEW'],
      default: 'LOCAL_WINS'
    },
    batchSize: { type: Number, default: 100 }
  },
  
  // Estado de conexión
  connectionStatus: {
    isConnected: { type: Boolean, default: false },
    lastTestAt: Date,
    lastSuccessAt: Date,
    lastErrorAt: Date,
    errorMessage: String,
    apiCallsToday: { type: Number, default: 0 },
    apiCallsLimit: { type: Number, default: 1000 }
  }
}, {
  timestamps: true,
  collection: 'integration_credentials'
});

// Índices compuestos
IntegrationCredentialSchema.index({ providerId: 1, systemName: 1 });
IntegrationCredentialSchema.index({ organizationId: 1, isActive: 1 });
IntegrationCredentialSchema.index({ 'syncConfig.nextSyncAt': 1, isActive: 1 });

// Métodos de instancia
IntegrationCredentialSchema.methods.updateConnectionStatus = function(
  isConnected: boolean, 
  errorMessage?: string
) {
  this.connectionStatus.isConnected = isConnected;
  this.connectionStatus.lastTestAt = new Date();
  
  if (isConnected) {
    this.connectionStatus.lastSuccessAt = new Date();
    this.connectionStatus.errorMessage = undefined;
  } else {
    this.connectionStatus.lastErrorAt = new Date();
    this.connectionStatus.errorMessage = errorMessage;
  }
  
  return this.save();
};

IntegrationCredentialSchema.methods.updateSyncSchedule = function() {
  const now = new Date();
  this.syncConfig.lastSyncAt = now;
  this.syncConfig.nextSyncAt = new Date(now.getTime() + this.syncConfig.syncInterval);
  return this.save();
};

IntegrationCredentialSchema.methods.incrementApiCalls = function() {
  this.connectionStatus.apiCallsToday += 1;
  return this.save();
};

IntegrationCredentialSchema.methods.resetDailyApiCalls = function() {
  this.connectionStatus.apiCallsToday = 0;
  return this.save();
};

// Métodos estáticos
IntegrationCredentialSchema.statics.findByProvider = function(providerId: string) {
  return this.find({ providerId, isActive: true });
};

IntegrationCredentialSchema.statics.findReadyForSync = function() {
  const now = new Date();
  return this.find({
    isActive: true,
    'connectionStatus.isConnected': true,
    'syncConfig.nextSyncAt': { $lte: now }
  });
};

IntegrationCredentialSchema.statics.findBySystem = function(systemName: string, organizationId?: string) {
  const query: any = { systemName, isActive: true };
  if (organizationId) {
    query.organizationId = organizationId;
  }
  return this.find(query);
};

// Hook pre-save para validaciones
IntegrationCredentialSchema.pre('save', function(next) {
  // Calcular próxima sincronización si no existe
  if (!this.syncConfig.nextSyncAt && this.isActive) {
    this.syncConfig.nextSyncAt = new Date(Date.now() + this.syncConfig.syncInterval);
  }
  
  // Validar que al menos un tipo de sincronización esté habilitado
  const syncTypes = [
    this.syncConfig.enableProducts,
    this.syncConfig.enableOrders,
    this.syncConfig.enableInventory,
    this.syncConfig.enableQuotes,
    this.syncConfig.enableCustomers
  ];
  
  if (!syncTypes.some(enabled => enabled)) {
    return next(new Error('Al menos un tipo de sincronización debe estar habilitado'));
  }
  
  next();
});

// Crear el modelo
const IntegrationCredential: Model<IIntegrationCredential> = 
  mongoose.models.IntegrationCredential || 
  mongoose.model<IIntegrationCredential>('IntegrationCredential', IntegrationCredentialSchema);

export default IntegrationCredential;
