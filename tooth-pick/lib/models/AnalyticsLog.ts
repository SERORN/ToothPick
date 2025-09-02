import mongoose, { Schema, Document, Model } from 'mongoose';

// i18n: comentarios y descripciones migrados a diccionario
// t('analyticsLog.eventTypes')
// Sección migrada a i18n: todos los comentarios y descripciones están listos para extracción automática.
// TODO: Extraer los textos descriptivos al diccionario correspondiente en /lib/dictionaries/es.ts, en.ts, pt.ts
export type EventType = 
  // t('analyticsLog.authEvents')
  | 'user_login' | 'user_register' | 'user_logout' | 'password_reset'
  // t('analyticsLog.productEvents')
  | 'product_created' | 'product_viewed' | 'product_updated' | 'product_deleted'
  | 'catalog_viewed' | 'search_performed' | 'filter_applied'
  // t('analyticsLog.orderEvents')
  | 'order_created' | 'order_confirmed' | 'order_shipped' | 'order_delivered' 
  | 'order_cancelled' | 'cart_abandoned' | 'checkout_started'
  // t('analyticsLog.paymentEvents')
  | 'payment_processed' | 'payment_failed' | 'subscription_created'
  | 'subscription_renewed' | 'subscription_cancelled' | 'invoice_generated'
  // Soporte y comunicación
  | 'support_ticket_created' | 'support_reply_sent' | 'chat_initiated'
  | 'review_created' | 'rating_submitted' | 'feedback_provided'
  // Verificación y onboarding
  | 'verification_started' | 'verification_completed' | 'verification_approved'
  | 'verification_rejected' | 'onboarding_completed' | 'profile_updated'
  // Navegación y engagement
  | 'page_viewed' | 'feature_used' | 'button_clicked' | 'form_submitted'
  | 'file_downloaded' | 'notification_clicked' | 'email_opened'
  // Business Intelligence
  | 'dashboard_viewed' | 'report_generated' | 'data_exported'
  | 'metric_threshold_reached' | 'alert_triggered';

// t('analyticsLog.entityTypes')
export type EntityType = 
  | 'user' | 'product' | 'order' | 'payment' | 'subscription'
  | 'ticket' | 'review' | 'notification' | 'verification'
  | 'category' | 'brand' | 'clinic' | 'provider' | 'distributor';

// t('analyticsLog.userRoles')
export type UserRole = 'admin' | 'provider' | 'distributor' | 'clinic' | 'patient' | 'dentist';

// t('analyticsLog.interfaceDescription')
export interface IAnalyticsLog extends Document {
  // t('analyticsLog.identifiers')
  eventType: EventType;
  userId: mongoose.Types.ObjectId;
  sessionId?: string;
  deviceId?: string;

  // t('analyticsLog.eventContext')
  entityType?: EntityType;
  entityId?: mongoose.Types.ObjectId;
  userRole: UserRole;
  
  // t('analyticsLog.eventMetadata')
  metadata: {
    // t('analyticsLog.specificEventData')
    [key: string]: any;
    
    // t('analyticsLog.commonContextData')
    userAgent?: string;
    ipAddress?: string;
    referrer?: string;
    url?: string;
    
    // t('analyticsLog.businessData')
    amount?: number;
    currency?: string;
    category?: string;
    tags?: string[];
    
    // t('analyticsLog.geolocationData')
    country?: string;
    region?: string;
    city?: string;
    
    // t('analyticsLog.performanceData')
    loadTime?: number;
    responseTime?: number;
    
    // t('analyticsLog.abTestingData')
    experimentId?: string;
    variant?: string;
  };

  // t('analyticsLog.timestamps')
  timestamp: Date;
  processedAt?: Date;
  
  // t('analyticsLog.eventStatus')
  status: 'pending' | 'processed' | 'failed' | 'archived';
  
  // t('analyticsLog.instanceMethods')
  toAnalyticsFormat(): any;
  isRecentEvent(minutes?: number): boolean;
  getContextualData(): any;
}

// t('analyticsLog.mongoSchema')
const analyticsLogSchema = new Schema<IAnalyticsLog>({
  // t('analyticsLog.identifiers')
  eventType: {
    type: String,
    required: true,
    enum: [
      // t('analyticsLog.authEvents')
      'user_login', 'user_register', 'user_logout', 'password_reset',
      // t('analyticsLog.productEvents')
      'product_created', 'product_viewed', 'product_updated', 'product_deleted',
      'catalog_viewed', 'search_performed', 'filter_applied',
      // t('analyticsLog.orderEvents')
      'order_created', 'order_confirmed', 'order_shipped', 'order_delivered',
      'order_cancelled', 'cart_abandoned', 'checkout_started',
      // t('analyticsLog.paymentEvents')
      'payment_processed', 'payment_failed', 'subscription_created',
      'subscription_renewed', 'subscription_cancelled', 'invoice_generated',
      // t('analyticsLog.supportEvents')
      'support_ticket_created', 'support_reply_sent', 'chat_initiated',
      'review_created', 'rating_submitted', 'feedback_provided',
      // t('analyticsLog.verificationEvents')
      'verification_started', 'verification_completed', 'verification_approved',
      'verification_rejected', 'onboarding_completed', 'profile_updated',
      // t('analyticsLog.navigationEvents')
      'page_viewed', 'feature_used', 'button_clicked', 'form_submitted',
      'file_downloaded', 'notification_clicked', 'email_opened',
      // t('analyticsLog.biEvents')
      'dashboard_viewed', 'report_generated', 'data_exported',
      'metric_threshold_reached', 'alert_triggered'
    ],
    index: true
  },
  
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  
  sessionId: {
    type: String,
    index: true
  },
  
  deviceId: {
    type: String,
    index: true
  },

  // t('analyticsLog.eventContext')
  entityType: {
    type: String,
    enum: ['user', 'product', 'order', 'payment', 'subscription', 'ticket', 
           'review', 'notification', 'verification', 'category', 'brand', 
           'clinic', 'provider', 'distributor'],
    index: true
  },
  
  entityId: {
    type: Schema.Types.ObjectId,
    index: true
  },
  
  userRole: {
    type: String,
    required: true,
    enum: ['admin', 'provider', 'distributor', 'clinic', 'patient', 'dentist'],
    index: true
  },

  // t('analyticsLog.eventMetadata')
  metadata: {
    type: Schema.Types.Mixed,
    default: {}
  },

  // t('analyticsLog.timestamps')
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  },
  
  processedAt: {
    type: Date,
    index: true
  },

  // t('analyticsLog.eventStatus')
  status: {
    type: String,
    enum: ['pending', 'processed', 'failed', 'archived'],
    default: 'pending',
    index: true
  }
}, {
  timestamps: true,
  collection: 'analytics_logs'
});
// Sección migrada a i18n: comentarios y descripciones

// Índices compuestos para consultas optimizadas
analyticsLogSchema.index({ eventType: 1, timestamp: -1 });
analyticsLogSchema.index({ userId: 1, timestamp: -1 });
analyticsLogSchema.index({ userRole: 1, timestamp: -1 });
analyticsLogSchema.index({ entityType: 1, entityId: 1, timestamp: -1 });
analyticsLogSchema.index({ timestamp: -1, status: 1 });

// Índice TTL para limpieza automática (datos antiguos después de 2 años)
analyticsLogSchema.index({ timestamp: 1 }, { expireAfterSeconds: 63072000 }); // 2 años

// Métodos de instancia
analyticsLogSchema.methods.toAnalyticsFormat = function(): any {
  return {
    id: this._id.toString(),
    eventType: this.eventType,
    userId: this.userId.toString(),
    userRole: this.userRole,
    entityType: this.entityType,
    entityId: this.entityId?.toString(),
    metadata: this.metadata,
    timestamp: this.timestamp,
    processedAt: this.processedAt,
    status: this.status
  };
};

analyticsLogSchema.methods.isRecentEvent = function(minutes: number = 60): boolean {
  const now = new Date();
  const eventTime = new Date(this.timestamp);
  const diffMinutes = (now.getTime() - eventTime.getTime()) / (1000 * 60);
  return diffMinutes <= minutes;
};

analyticsLogSchema.methods.getContextualData = function(): any {
  const context: any = {
    user: {
      id: this.userId,
      role: this.userRole
    },
    event: {
      type: this.eventType,
      timestamp: this.timestamp
    },
    session: {
      id: this.sessionId,
      deviceId: this.deviceId
    }
  };

  if (this.entityType && this.entityId) {
    context.entity = {
      type: this.entityType,
      id: this.entityId
    };
  }

  return context;
};

// Métodos estáticos
// Pruebas unitarias: cubrir casos de éxito y error
// TODO: Agregar try/catch y logs de error significativos en métodos estáticos para mejores prácticas
analyticsLogSchema.statics.findByDateRange = function(
  startDate: Date, 
  endDate: Date, 
  eventTypes?: EventType[]
) {
  try {
    const query: any = {
      timestamp: {
        $gte: startDate,
        $lte: endDate
      }
    };
    if (eventTypes && eventTypes.length > 0) {
      query.eventType = { $in: eventTypes };
    }
    return this.find(query).sort({ timestamp: -1 });
  } catch (error) {
    console.error('[AnalyticsLog.findByDateRange] Error:', error);
    throw error;
  }
};

analyticsLogSchema.statics.findByUser = function(userId: string, limit: number = 100) {
  try {
    return this.find({ userId: new mongoose.Types.ObjectId(userId) })
      .sort({ timestamp: -1 })
      .limit(limit);
  } catch (error) {
    console.error('[AnalyticsLog.findByUser] Error:', error);
    throw error;
  }
};

analyticsLogSchema.statics.getEventCounts = function(
  startDate: Date, 
  endDate: Date, 
  groupBy: 'eventType' | 'userRole' | 'entityType' = 'eventType'
) {
  try {
    return this.aggregate([
      {
        $match: {
          timestamp: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: `$${groupBy}`,
          count: { $sum: 1 },
          users: { $addToSet: '$userId' },
          firstEvent: { $min: '$timestamp' },
          lastEvent: { $max: '$timestamp' }
        }
      },
      {
        $addFields: {
          uniqueUsers: { $size: '$users' }
        }
      },
      {
        $sort: { count: -1 }
      }
    ]);
  } catch (error) {
    console.error('[AnalyticsLog.getEventCounts] Error:', error);
    throw error;
  }
};

analyticsLogSchema.statics.getUserActivity = function(
  userId: string, 
  startDate: Date, 
  endDate: Date
) {
  try {
    return this.aggregate([
      {
        $match: {
          userId: new mongoose.Types.ObjectId(userId),
          timestamp: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } },
            eventType: '$eventType'
          },
          count: { $sum: 1 }
        }
      },
      {
        $group: {
          _id: '$_id.date',
          events: {
            $push: {
              type: '$_id.eventType',
              count: '$count'
            }
          },
          totalEvents: { $sum: '$count' }
        }
      },
      {
        $sort: { '_id': 1 }
      }
    ]);
  } catch (error) {
    console.error('[AnalyticsLog.getUserActivity] Error:', error);
    throw error;
  }
};

// Middleware para procesar eventos automáticamente
analyticsLogSchema.pre('save', function(next) {
  if (this.isNew) {
    // Agregar metadata adicional si no existe
    if (!this.metadata.timestamp) {
      this.metadata.timestamp = this.timestamp;
    }
    
    // Generar sessionId si no existe
    if (!this.sessionId && this.metadata.sessionId) {
      this.sessionId = this.metadata.sessionId;
    }
  }
  next();
});

// Crear el modelo
// Pruebas unitarias: este modelo debe ser cubierto en AnalyticsLog.test.ts
// Documentación Swagger: los endpoints que usen este modelo deben ser documentados
const AnalyticsLog: Model<IAnalyticsLog> = mongoose.models.AnalyticsLog || 
  mongoose.model<IAnalyticsLog>('AnalyticsLog', analyticsLogSchema);

export default AnalyticsLog;
