import mongoose, { Schema, Document } from 'mongoose';

export interface INotification extends Document {
  userId: mongoose.Types.ObjectId;
  type: 'order_success' | 'verification_approved' | 'verification_rejected' | 'support_reply' | 
        'subscription_upgraded' | 'subscription_expired' | 'loyalty_points_earned' | 'system_announcement' | 
        'payment_processed' | 'payment_failed' | 'document_required' | 'review_received' | 'collaboration_invite';
  title: string;
  message: string;
  isRead: boolean;
  url?: string;
  icon?: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  category: 'order' | 'verification' | 'support' | 'subscription' | 'loyalty' | 'payment' | 'system' | 'collaboration';
  metadata?: {
    orderId?: string;
    ticketId?: string;
    verificationId?: string;
    subscriptionId?: string;
    points?: number;
    amount?: number;
    currency?: string;
    [key: string]: any;
  };
  expiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  readAt?: Date;
}

const NotificationSchema: Schema = new Schema<INotification>(
  {
    userId: { 
      type: Schema.Types.ObjectId, 
      ref: 'User', 
      required: true,
      index: true 
    },
    type: {
      type: String,
      enum: [
        'order_success',
        'verification_approved', 
        'verification_rejected',
        'support_reply',
        'subscription_upgraded',
        'subscription_expired',
        'loyalty_points_earned',
        'system_announcement',
        'payment_processed',
        'payment_failed',
        'document_required',
        'review_received',
        'collaboration_invite'
      ],
      required: true,
      index: true
    },
    title: { 
      type: String, 
      required: true,
      maxlength: 200
    },
    message: { 
      type: String, 
      required: true,
      maxlength: 1000
    },
    isRead: { 
      type: Boolean, 
      default: false,
      index: true
    },
    url: {
      type: String,
      maxlength: 500
    },
    icon: {
      type: String,
      maxlength: 100
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'urgent'],
      default: 'medium',
      index: true
    },
    category: {
      type: String,
      enum: ['order', 'verification', 'support', 'subscription', 'loyalty', 'payment', 'system', 'collaboration'],
      required: true,
      index: true
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {}
    },
    expiresAt: {
      type: Date,
      index: { expireAfterSeconds: 0 }
    },
    readAt: {
      type: Date
    }
  },
  { 
    timestamps: true
  }
);

// Índices compuestos para consultas eficientes
NotificationSchema.index({ userId: 1, isRead: 1 });
NotificationSchema.index({ userId: 1, createdAt: -1 });
NotificationSchema.index({ userId: 1, category: 1, isRead: 1 });
NotificationSchema.index({ userId: 1, priority: 1, isRead: 1 });

// Middleware para actualizar readAt cuando se marca como leída
NotificationSchema.pre('save', function(next) {
  if (this.isModified('isRead') && this.isRead && !this.readAt) {
    this.readAt = new Date();
  }
  next();
});

// Métodos estáticos
NotificationSchema.statics.getUnreadCount = function(userId: string) {
  return this.countDocuments({ 
    userId: new mongoose.Types.ObjectId(userId), 
    isRead: false 
  });
};

NotificationSchema.statics.markAsRead = function(userId: string, notificationIds: string[]) {
  return this.updateMany(
    { 
      userId: new mongoose.Types.ObjectId(userId),
      _id: { $in: notificationIds.map(id => new mongoose.Types.ObjectId(id)) }
    },
    { 
      $set: { 
        isRead: true, 
        readAt: new Date() 
      } 
    }
  );
};

NotificationSchema.statics.markAllAsRead = function(userId: string) {
  return this.updateMany(
    { 
      userId: new mongoose.Types.ObjectId(userId),
      isRead: false 
    },
    { 
      $set: { 
        isRead: true, 
        readAt: new Date() 
      } 
    }
  );
};

// Método de instancia para formatear para frontend
NotificationSchema.methods.toClientFormat = function() {
  return {
    id: this._id,
    title: this.title,
    message: this.message,
    type: this.type,
    category: this.category,
    priority: this.priority,
    isRead: this.isRead,
    url: this.url,
    icon: this.icon,
    metadata: this.metadata,
    createdAt: this.createdAt,
    readAt: this.readAt,
    timeAgo: this.getTimeAgo()
  };
};

NotificationSchema.methods.getTimeAgo = function() {
  const now = new Date();
  const diff = now.getTime() - this.createdAt.getTime();
  
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  
  if (minutes < 1) return 'Ahora mismo';
  if (minutes < 60) return `Hace ${minutes} minuto${minutes > 1 ? 's' : ''}`;
  if (hours < 24) return `Hace ${hours} hora${hours > 1 ? 's' : ''}`;
  if (days < 7) return `Hace ${days} día${days > 1 ? 's' : ''}`;
  
  return this.createdAt.toLocaleDateString('es-ES', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

export default mongoose.models.Notification || mongoose.model<INotification>('Notification', NotificationSchema);
