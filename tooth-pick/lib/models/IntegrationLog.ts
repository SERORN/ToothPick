// 📝 FASE 33: Modelo para Logs de Integración ERP/CRM
// ✅ Trazabilidad completa de sincronizaciones y operaciones

import mongoose, { Schema, Document, Model } from 'mongoose';

// Interface para los logs de integración
export interface IIntegrationLog extends Document {
  _id: mongoose.Types.ObjectId;
  credentialId: mongoose.Types.ObjectId; // Referencia a IntegrationCredential
  providerId: string;
  organizationId: string;
  systemName: string;
  
  // Información del evento
  eventType: 'SYNC' | 'TEST_CONNECTION' | 'WEBHOOK' | 'MANUAL_OPERATION' | 'ERROR' | 'AUTH_REFRESH';
  operation: 'CREATE' | 'UPDATE' | 'DELETE' | 'READ' | 'BULK_IMPORT' | 'BULK_EXPORT' | 'VALIDATION';
  entityType: 'PRODUCT' | 'ORDER' | 'INVENTORY' | 'QUOTE' | 'CUSTOMER' | 'CONNECTION' | 'WEBHOOK';
  
  // Estado del evento
  status: 'PENDING' | 'IN_PROGRESS' | 'SUCCESS' | 'PARTIAL_SUCCESS' | 'FAILED' | 'CANCELLED';
  startedAt: Date;
  completedAt?: Date;
  duration?: number; // en milisegundos
  
  // Detalles del procesamiento
  details: {
    itemsProcessed: number;
    itemsSucceeded: number;
    itemsFailed: number;
    batchSize?: number;
    totalBatches?: number;
    currentBatch?: number;
  };
  
  // Datos específicos
  dataSnapshot: {
    requestPayload?: any; // Datos enviados al sistema externo
    responsePayload?: any; // Respuesta del sistema externo
    externalIds?: string[]; // IDs de entidades en el sistema externo
    localIds?: string[]; // IDs de entidades en ToothPick
    conflictsDetected?: Array<{
      field: string;
      localValue: any;
      remoteValue: any;
      resolution: 'LOCAL_WINS' | 'REMOTE_WINS' | 'MANUAL_REQUIRED';
    }>;
  };
  
  // Información de errores
  error?: {
    code: string;
    message: string;
    stack?: string;
    httpStatus?: number;
    retryCount: number;
    isRetryable: boolean;
    nextRetryAt?: Date;
  };
  
  // Metadatos
  metadata: {
    userAgent?: string;
    sourceIp?: string;
    triggeredBy: 'SCHEDULER' | 'WEBHOOK' | 'MANUAL' | 'SYSTEM';
    triggerUserId?: string;
    apiVersion?: string;
    integrationVersion?: string;
  };
  
  // Auditoría
  createdAt: Date;
}

// Schema de MongoDB
const IntegrationLogSchema = new Schema<IIntegrationLog>({
  credentialId: {
    type: Schema.Types.ObjectId,
    ref: 'IntegrationCredential',
    required: true,
    index: true
  },
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
  systemName: {
    type: String,
    required: true,
    index: true
  },
  
  // Información del evento
  eventType: {
    type: String,
    enum: ['SYNC', 'TEST_CONNECTION', 'WEBHOOK', 'MANUAL_OPERATION', 'ERROR', 'AUTH_REFRESH'],
    required: true,
    index: true
  },
  operation: {
    type: String,
    enum: ['CREATE', 'UPDATE', 'DELETE', 'READ', 'BULK_IMPORT', 'BULK_EXPORT', 'VALIDATION'],
    required: true
  },
  entityType: {
    type: String,
    enum: ['PRODUCT', 'ORDER', 'INVENTORY', 'QUOTE', 'CUSTOMER', 'CONNECTION', 'WEBHOOK'],
    required: true,
    index: true
  },
  
  // Estado del evento
  status: {
    type: String,
    enum: ['PENDING', 'IN_PROGRESS', 'SUCCESS', 'PARTIAL_SUCCESS', 'FAILED', 'CANCELLED'],
    required: true,
    default: 'PENDING',
    index: true
  },
  startedAt: {
    type: Date,
    required: true,
    default: Date.now,
    index: true
  },
  completedAt: Date,
  duration: Number,
  
  // Detalles del procesamiento
  details: {
    itemsProcessed: { type: Number, default: 0 },
    itemsSucceeded: { type: Number, default: 0 },
    itemsFailed: { type: Number, default: 0 },
    batchSize: Number,
    totalBatches: Number,
    currentBatch: Number
  },
  
  // Datos específicos
  dataSnapshot: {
    requestPayload: Schema.Types.Mixed,
    responsePayload: Schema.Types.Mixed,
    externalIds: [String],
    localIds: [String],
    conflictsDetected: [{
      field: String,
      localValue: Schema.Types.Mixed,
      remoteValue: Schema.Types.Mixed,
      resolution: {
        type: String,
        enum: ['LOCAL_WINS', 'REMOTE_WINS', 'MANUAL_REQUIRED']
      }
    }]
  },
  
  // Información de errores
  error: {
    code: String,
    message: String,
    stack: String,
    httpStatus: Number,
    retryCount: { type: Number, default: 0 },
    isRetryable: { type: Boolean, default: false },
    nextRetryAt: Date
  },
  
  // Metadatos
  metadata: {
    userAgent: String,
    sourceIp: String,
    triggeredBy: {
      type: String,
      enum: ['SCHEDULER', 'WEBHOOK', 'MANUAL', 'SYSTEM'],
      required: true
    },
    triggerUserId: String,
    apiVersion: String,
    integrationVersion: String
  }
}, {
  timestamps: { createdAt: true, updatedAt: false },
  collection: 'integration_logs'
});

// Índices compuestos para optimizar consultas
IntegrationLogSchema.index({ providerId: 1, status: 1, startedAt: -1 });
IntegrationLogSchema.index({ organizationId: 1, eventType: 1, startedAt: -1 });
IntegrationLogSchema.index({ systemName: 1, entityType: 1, startedAt: -1 });
IntegrationLogSchema.index({ credentialId: 1, startedAt: -1 });
IntegrationLogSchema.index({ startedAt: -1 }); // Para limpieza de logs antiguos

// TTL index para auto-eliminar logs antiguos (90 días)
IntegrationLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 7776000 });

// Métodos de instancia
IntegrationLogSchema.methods.markAsStarted = function() {
  this.status = 'IN_PROGRESS';
  this.startedAt = new Date();
  return this.save();
};

IntegrationLogSchema.methods.markAsCompleted = function(
  status: 'SUCCESS' | 'PARTIAL_SUCCESS' | 'FAILED',
  details?: Partial<IIntegrationLog['details']>
) {
  this.status = status;
  this.completedAt = new Date();
  this.duration = this.completedAt.getTime() - this.startedAt.getTime();
  
  if (details) {
    Object.assign(this.details, details);
  }
  
  return this.save();
};

IntegrationLogSchema.methods.addError = function(
  code: string,
  message: string,
  isRetryable: boolean = false,
  httpStatus?: number
) {
  this.error = {
    code,
    message,
    httpStatus,
    retryCount: (this.error?.retryCount || 0) + 1,
    isRetryable,
    nextRetryAt: isRetryable ? new Date(Date.now() + (this.error?.retryCount || 0) * 30000) : undefined
  };
  
  this.status = 'FAILED';
  this.completedAt = new Date();
  this.duration = this.completedAt.getTime() - this.startedAt.getTime();
  
  return this.save();
};

IntegrationLogSchema.methods.updateProgress = function(
  itemsProcessed: number,
  itemsSucceeded: number,
  itemsFailed: number,
  currentBatch?: number
) {
  this.details.itemsProcessed = itemsProcessed;
  this.details.itemsSucceeded = itemsSucceeded;
  this.details.itemsFailed = itemsFailed;
  
  if (currentBatch !== undefined) {
    this.details.currentBatch = currentBatch;
  }
  
  return this.save();
};

// Métodos estáticos
IntegrationLogSchema.statics.findByProvider = function(
  providerId: string,
  limit: number = 100,
  status?: string
) {
  const query: any = { providerId };
  if (status) query.status = status;
  
  return this.find(query)
    .sort({ startedAt: -1 })
    .limit(limit)
    .populate('credentialId', 'connectionName systemName');
};

IntegrationLogSchema.statics.findRecentErrors = function(
  organizationId: string,
  hours: number = 24
) {
  const since = new Date(Date.now() - hours * 60 * 60 * 1000);
  
  return this.find({
    organizationId,
    status: 'FAILED',
    startedAt: { $gte: since }
  })
  .sort({ startedAt: -1 })
  .populate('credentialId', 'connectionName systemName');
};

IntegrationLogSchema.statics.getStatsBySystem = function(
  organizationId: string,
  systemName?: string,
  days: number = 7
) {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  
  const matchStage: any = {
    organizationId,
    startedAt: { $gte: since }
  };
  
  if (systemName) {
    matchStage.systemName = systemName;
  }
  
  return this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: {
          systemName: '$systemName',
          status: '$status',
          entityType: '$entityType'
        },
        count: { $sum: 1 },
        totalItemsProcessed: { $sum: '$details.itemsProcessed' },
        totalItemsSucceeded: { $sum: '$details.itemsSucceeded' },
        totalItemsFailed: { $sum: '$details.itemsFailed' },
        avgDuration: { $avg: '$duration' }
      }
    },
    {
      $group: {
        _id: '$_id.systemName',
        stats: {
          $push: {
            status: '$_id.status',
            entityType: '$_id.entityType',
            count: '$count',
            totalItemsProcessed: '$totalItemsProcessed',
            totalItemsSucceeded: '$totalItemsSucceeded',
            totalItemsFailed: '$totalItemsFailed',
            avgDuration: '$avgDuration'
          }
        }
      }
    }
  ]);
};

IntegrationLogSchema.statics.findRetryableErrors = function(limit: number = 50) {
  const now = new Date();
  
  return this.find({
    status: 'FAILED',
    'error.isRetryable': true,
    'error.nextRetryAt': { $lte: now },
    'error.retryCount': { $lt: 3 } // Máximo 3 reintentos
  })
  .sort({ 'error.nextRetryAt': 1 })
  .limit(limit);
};

// Hook pre-save para validaciones
IntegrationLogSchema.pre('save', function(next) {
  // Calcular duración si se está completando
  if (this.completedAt && this.startedAt && !this.duration) {
    this.duration = this.completedAt.getTime() - this.startedAt.getTime();
  }
  
  next();
});

// Crear el modelo
const IntegrationLog: Model<IIntegrationLog> = 
  mongoose.models.IntegrationLog || 
  mongoose.model<IIntegrationLog>('IntegrationLog', IntegrationLogSchema);

export default IntegrationLog;
