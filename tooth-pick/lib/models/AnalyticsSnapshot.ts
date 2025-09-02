import mongoose, { Schema, Document, Model } from 'mongoose';
import { EventType, UserRole, EntityType } from './AnalyticsLog';

// Tipos de agregación temporal
export type AggregationPeriod = 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';

// Métricas agregadas por período
export interface IAggregatedMetrics {
  // Contadores básicos
  totalEvents: number;
  uniqueUsers: number;
  uniqueSessions: number;
  
  // Métricas de negocio
  revenue?: number;
  orders?: number;
  conversions?: number;
  averageOrderValue?: number;
  
  // Métricas de engagement
  pageViews?: number;
  sessionDuration?: number;
  bounceRate?: number;
  returnVisitors?: number;
  
  // Métricas por rol
  adminActivity?: number;
  providerActivity?: number;
  distributorActivity?: number;
  clinicActivity?: number;
  
  // Métricas específicas
  newRegistrations?: number;
  productsCreated?: number;
  supportTickets?: number;
  verificationsCompleted?: number;
  subscriptionsCreated?: number;
  
  // Top eventos
  topEvents?: Array<{ eventType: EventType; count: number }>;
  topEntities?: Array<{ entityType: EntityType; entityId: string; count: number }>;
  topUsers?: Array<{ userId: string; userRole: UserRole; count: number }>;
}

// Interface principal del snapshot
export interface IAnalyticsSnapshot extends Document {
  // Identificadores temporales
  period: AggregationPeriod;
  startDate: Date;
  endDate: Date;
  
  // Filtros aplicados
  userRole?: UserRole;
  entityType?: EntityType;
  eventTypes?: EventType[];
  
  // Métricas agregadas
  metrics: IAggregatedMetrics;
  
  // Metadata del snapshot
  metadata: {
    generatedAt: Date;
    dataSourceCount: number; // Cantidad de registros procesados
    processingTimeMs: number;
    version: string; // Versión del algoritmo de agregación
    filters?: any;
    notes?: string;
  };
  
  // Estado del snapshot
  status: 'generating' | 'completed' | 'failed' | 'outdated';
  
  // Métodos de instancia
  isOutdated(): boolean;
  getGrowthRate(previousSnapshot?: IAnalyticsSnapshot): number;
  exportToCSV(): string;
  getKPIs(): any;
}

// Schema de MongoDB
const analyticsSnapshotSchema = new Schema<IAnalyticsSnapshot>({
  // Identificadores temporales
  period: {
    type: String,
    required: true,
    enum: ['daily', 'weekly', 'monthly', 'quarterly', 'yearly'],
    index: true
  },
  
  startDate: {
    type: Date,
    required: true,
    index: true
  },
  
  endDate: {
    type: Date,
    required: true,
    index: true
  },

  // Filtros
  userRole: {
    type: String,
    enum: ['admin', 'provider', 'distributor', 'clinic', 'patient', 'dentist'],
    index: true
  },
  
  entityType: {
    type: String,
    enum: ['user', 'product', 'order', 'payment', 'subscription', 'ticket', 
           'review', 'notification', 'verification', 'category', 'brand', 
           'clinic', 'provider', 'distributor'],
    index: true
  },
  
  eventTypes: [{
    type: String,
    enum: [
      'user_login', 'user_register', 'user_logout', 'password_reset',
      'product_created', 'product_viewed', 'product_updated', 'product_deleted',
      'catalog_viewed', 'search_performed', 'filter_applied',
      'order_created', 'order_confirmed', 'order_shipped', 'order_delivered',
      'order_cancelled', 'cart_abandoned', 'checkout_started',
      'payment_processed', 'payment_failed', 'subscription_created',
      'subscription_renewed', 'subscription_cancelled', 'invoice_generated',
      'support_ticket_created', 'support_reply_sent', 'chat_initiated',
      'review_created', 'rating_submitted', 'feedback_provided',
      'verification_started', 'verification_completed', 'verification_approved',
      'verification_rejected', 'onboarding_completed', 'profile_updated',
      'page_viewed', 'feature_used', 'button_clicked', 'form_submitted',
      'file_downloaded', 'notification_clicked', 'email_opened',
      'dashboard_viewed', 'report_generated', 'data_exported',
      'metric_threshold_reached', 'alert_triggered'
    ]
  }],

  // Métricas agregadas
  metrics: {
    // Contadores básicos
    totalEvents: { type: Number, default: 0 },
    uniqueUsers: { type: Number, default: 0 },
    uniqueSessions: { type: Number, default: 0 },
    
    // Métricas de negocio
    revenue: { type: Number, default: 0 },
    orders: { type: Number, default: 0 },
    conversions: { type: Number, default: 0 },
    averageOrderValue: { type: Number, default: 0 },
    
    // Métricas de engagement
    pageViews: { type: Number, default: 0 },
    sessionDuration: { type: Number, default: 0 },
    bounceRate: { type: Number, default: 0 },
    returnVisitors: { type: Number, default: 0 },
    
    // Métricas por rol
    adminActivity: { type: Number, default: 0 },
    providerActivity: { type: Number, default: 0 },
    distributorActivity: { type: Number, default: 0 },
    clinicActivity: { type: Number, default: 0 },
    
    // Métricas específicas
    newRegistrations: { type: Number, default: 0 },
    productsCreated: { type: Number, default: 0 },
    supportTickets: { type: Number, default: 0 },
    verificationsCompleted: { type: Number, default: 0 },
    subscriptionsCreated: { type: Number, default: 0 },
    
    // Top eventos (arrays de objetos)
    topEvents: [{
      eventType: String,
      count: Number
    }],
    
    topEntities: [{
      entityType: String,
      entityId: String,
      count: Number
    }],
    
    topUsers: [{
      userId: String,
      userRole: String,
      count: Number
    }]
  },

  // Metadata
  metadata: {
    generatedAt: { type: Date, default: Date.now },
    dataSourceCount: { type: Number, required: true },
    processingTimeMs: { type: Number, required: true },
    version: { type: String, default: '1.0.0' },
    filters: { type: Schema.Types.Mixed },
    notes: String
  },

  // Estado
  status: {
    type: String,
    enum: ['generating', 'completed', 'failed', 'outdated'],
    default: 'generating',
    index: true
  }
}, {
  timestamps: true,
  collection: 'analytics_snapshots'
});

// Índices compuestos para consultas optimizadas
analyticsSnapshotSchema.index({ period: 1, startDate: -1 });
analyticsSnapshotSchema.index({ userRole: 1, period: 1, startDate: -1 });
analyticsSnapshotSchema.index({ entityType: 1, period: 1, startDate: -1 });
analyticsSnapshotSchema.index({ status: 1, period: 1 });

// Índice único para evitar duplicados
analyticsSnapshotSchema.index(
  { period: 1, startDate: 1, endDate: 1, userRole: 1, entityType: 1 },
  { unique: true, sparse: true }
);

// Métodos de instancia
analyticsSnapshotSchema.methods.isOutdated = function(): boolean {
  const now = new Date();
  const generatedAt = this.metadata.generatedAt;
  
  // Determinar si está desactualizado según el período
  const thresholds: Record<AggregationPeriod, number> = {
    daily: 24 * 60 * 60 * 1000, // 24 horas
    weekly: 7 * 24 * 60 * 60 * 1000, // 7 días
    monthly: 30 * 24 * 60 * 60 * 1000, // 30 días
    quarterly: 90 * 24 * 60 * 60 * 1000, // 90 días
    yearly: 365 * 24 * 60 * 60 * 1000 // 365 días
  };
  
  const threshold = thresholds[this.period as AggregationPeriod] || thresholds.daily;
  const timeDiff = now.getTime() - generatedAt.getTime();
  
  return timeDiff > threshold;
};

analyticsSnapshotSchema.methods.getGrowthRate = function(
  previousSnapshot?: IAnalyticsSnapshot
): number {
  if (!previousSnapshot) return 0;
  
  const currentValue = this.metrics.totalEvents || 0;
  const previousValue = previousSnapshot.metrics.totalEvents || 0;
  
  if (previousValue === 0) return currentValue > 0 ? 100 : 0;
  
  return ((currentValue - previousValue) / previousValue) * 100;
};

analyticsSnapshotSchema.methods.exportToCSV = function(): string {
  const metrics = this.metrics;
  const headers = [
    'Period', 'StartDate', 'EndDate', 'TotalEvents', 'UniqueUsers', 
    'Revenue', 'Orders', 'Conversions', 'PageViews', 'NewRegistrations'
  ];
  
  const values = [
    this.period,
    this.startDate.toISOString().split('T')[0],
    this.endDate.toISOString().split('T')[0],
    metrics.totalEvents,
    metrics.uniqueUsers,
    metrics.revenue || 0,
    metrics.orders || 0,
    metrics.conversions || 0,
    metrics.pageViews || 0,
    metrics.newRegistrations || 0
  ];
  
  return [headers.join(','), values.join(',')].join('\n');
};

analyticsSnapshotSchema.methods.getKPIs = function(): any {
  const metrics = this.metrics;
  
  return {
    overview: {
      totalEvents: metrics.totalEvents,
      uniqueUsers: metrics.uniqueUsers,
      growth: this.getGrowthRate(),
      period: this.period
    },
    business: {
      revenue: metrics.revenue || 0,
      orders: metrics.orders || 0,
      averageOrderValue: metrics.averageOrderValue || 0,
      conversionRate: metrics.conversions || 0
    },
    engagement: {
      pageViews: metrics.pageViews || 0,
      sessionDuration: metrics.sessionDuration || 0,
      bounceRate: metrics.bounceRate || 0,
      returnVisitors: metrics.returnVisitors || 0
    },
    activity: {
      newRegistrations: metrics.newRegistrations || 0,
      productsCreated: metrics.productsCreated || 0,
      supportTickets: metrics.supportTickets || 0,
      verificationsCompleted: metrics.verificationsCompleted || 0
    }
  };
};

// Métodos estáticos
analyticsSnapshotSchema.statics.findByPeriod = function(
  period: AggregationPeriod,
  startDate?: Date,
  endDate?: Date
) {
  const query: any = { period, status: 'completed' };
  
  if (startDate && endDate) {
    query.startDate = { $gte: startDate };
    query.endDate = { $lte: endDate };
  }
  
  return this.find(query).sort({ startDate: -1 });
};

analyticsSnapshotSchema.statics.findLatest = function(
  period: AggregationPeriod,
  userRole?: UserRole,
  entityType?: EntityType
) {
  const query: any = { period, status: 'completed' };
  
  if (userRole) query.userRole = userRole;
  if (entityType) query.entityType = entityType;
  
  return this.findOne(query).sort({ startDate: -1 });
};

analyticsSnapshotSchema.statics.getGrowthTrend = function(
  period: AggregationPeriod,
  metric: keyof IAggregatedMetrics,
  limit: number = 12
) {
  return this.aggregate([
    {
      $match: { period, status: 'completed' }
    },
    {
      $sort: { startDate: -1 }
    },
    {
      $limit: limit
    },
    {
      $project: {
        startDate: 1,
        endDate: 1,
        value: `$metrics.${metric}`,
        period: 1
      }
    },
    {
      $sort: { startDate: 1 }
    }
  ]);
};

analyticsSnapshotSchema.statics.compareMetrics = function(
  period: AggregationPeriod,
  currentDate: Date,
  previousDate: Date
) {
  return this.aggregate([
    {
      $match: {
        period,
        status: 'completed',
        startDate: { $in: [currentDate, previousDate] }
      }
    },
    {
      $group: {
        _id: '$startDate',
        metrics: { $first: '$metrics' }
      }
    },
    {
      $sort: { '_id': 1 }
    }
  ]);
};

// Middleware para validaciones
analyticsSnapshotSchema.pre('save', function(next) {
  // Validar que endDate sea posterior a startDate
  if (this.endDate <= this.startDate) {
    return next(new Error('endDate debe ser posterior a startDate'));
  }
  
  // Marcar como completado si tiene métricas y no hay errores
  if (this.status === 'generating' && this.metrics.totalEvents >= 0) {
    this.status = 'completed';
  }
  
  next();
});

// Crear el modelo
const AnalyticsSnapshot: Model<IAnalyticsSnapshot> = mongoose.models.AnalyticsSnapshot || 
  mongoose.model<IAnalyticsSnapshot>('AnalyticsSnapshot', analyticsSnapshotSchema);

export default AnalyticsSnapshot;
