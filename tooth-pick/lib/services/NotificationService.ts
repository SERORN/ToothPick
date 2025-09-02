import dbConnect from '@/lib/db';
import Notification from '@/lib/models/Notification';
import User from '@/lib/models/User';

export interface CreateNotificationData {
  userId: string;
  title: string;
  message: string;
  type: 'order_success' | 'order_cancelled' | 'order_shipped' | 'order_delivered' |
        'verification_approved' | 'verification_rejected' | 'support_reply' |
        'subscription_upgraded' | 'subscription_expired' | 'loyalty_points_earned' |
        'system_announcement' | 'payment_processed' | 'payment_failed' |
        // Tipos legacy para compatibilidad
        'order' | 'system' | 'tracking' | 'stock' | 'payment';
  category?: 'order' | 'verification' | 'support' | 'subscription' | 'loyalty' | 'payment' | 'system' | 'collaboration';
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  url?: string;
  icon?: string;
  orderId?: string;
  productId?: string;
  metadata?: Record<string, any>;
  expiresAt?: Date;
}

export class NotificationService {
  /**
   * Crear una nueva notificación (FASE 38 - Expandido)
   */
  static async createNotification(data: CreateNotificationData) {
    try {
      await dbConnect();
      
      const notification = new Notification({
        userId: data.userId,
        title: data.title,
        message: data.message,
        type: data.type,
        category: data.category || 'system',
        priority: data.priority || 'medium',
        url: data.url,
        icon: data.icon,
        orderId: data.orderId,
        productId: data.productId,
        metadata: data.metadata || {},
        expiresAt: data.expiresAt,
        isRead: false
      });

      const savedNotification = await notification.save();
      
      // Limpiar notificaciones antiguas para mantener un máximo por usuario
      await this.cleanupOldNotifications(data.userId);
      
      return savedNotification;
    } catch (error) {
      console.error('Error creating notification:', error);
      throw error;
    }
  }

  /**
   * Obtener notificaciones de un usuario
   */
  static async getUserNotifications(
    userId: string, 
    options: { limit?: number; onlyUnread?: boolean } = {}
  ) {
    try {
      await dbConnect();
      
      const { limit = 50, onlyUnread = false } = options;
      const filter: any = { userId };
      
      if (onlyUnread) {
        filter.read = false;
      }

      const notifications = await Notification
        .find(filter)
        .sort({ createdAt: -1 })
        .limit(limit)
        .populate('orderId', 'status createdAt')
        .populate('productId', 'name')
        .lean();

      return notifications;
    } catch (error) {
      console.error('Error fetching notifications:', error);
      throw error;
    }
  }

  /**
   * Marcar notificación como leída
   */
  static async markAsRead(notificationId: string, userId: string) {
    try {
      await dbConnect();
      
      const notification = await Notification.findOneAndUpdate(
        { _id: notificationId, userId },
        { read: true },
        { new: true }
      );

      return notification;
    } catch (error) {
      console.error('Error marking notification as read:', error);
      throw error;
    }
  }

  /**
   * Marcar todas las notificaciones como leídas
   */
  static async markAllAsRead(userId: string) {
    try {
      await dbConnect();
      
      await Notification.updateMany(
        { userId, read: false },
        { read: true }
      );

      return true;
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      throw error;
    }
  }

  /**
   * Contar notificaciones no leídas
   */
  static async getUnreadCount(userId: string) {
    try {
      await dbConnect();
      
      const count = await Notification.countDocuments({
        userId,
        read: false
      });

      return count;
    } catch (error) {
      console.error('Error getting unread count:', error);
      return 0;
    }
  }

  /**
   * Crear notificación para nueva orden (Distribuidor)
   */
  static async notifyOrderCreated(orderId: string, buyerId: string, orderTotal: number, orderNumber: string) {
    return this.createNotification({
      userId: buyerId,
      title: '✅ Orden Confirmada',
      message: `Tu orden #${orderNumber} por ${new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(orderTotal)} ha sido confirmada y enviada al proveedor.`,
      type: 'order_success',
      category: 'order',
      priority: 'medium',
      orderId,
      metadata: {
        orderNumber,
        amount: orderTotal,
        status: 'confirmed'
      }
    });
  }

  /**
   * Crear notificación para nueva orden (Proveedor)
   */
  static async notifyNewOrderReceived(orderId: string, sellerId: string, orderTotal: number, orderNumber: string, buyerName: string) {
    return this.createNotification({
      userId: sellerId,
      title: '📥 Nueva Orden Recibida',
      message: `Recibiste una nueva orden #${orderNumber} de ${buyerName} por ${new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(orderTotal)}. ¡Revísala en tu dashboard!`,
      type: 'order',
      orderId,
      metadata: {
        orderNumber,
        amount: orderTotal,
        buyerName,
        status: 'new'
      }
    });
  }

  /**
   * Crear notificación para cambio de estado de orden (ACTUALIZADA)
   */
  static async notifyOrderStatusChange(orderId: string, userId: string, newStatus: string, orderNumber: string) {
    const statusMessages = {
      confirmed: 'Tu orden ha sido confirmada por el proveedor.',
      processing: 'Tu orden está siendo procesada y preparada para envío.',
      shipped: 'Tu orden ha sido enviada. ¡Pronto la recibirás!',
      delivered: 'Tu orden ha sido entregada exitosamente.',
      cancelled: 'Tu orden ha sido cancelada. Contacta soporte si tienes dudas.'
    };

    const statusEmojis = {
      confirmed: '✅',
      processing: '🔄',
      shipped: '📦',
      delivered: '🎉',
      cancelled: '❌'
    };

    const message = statusMessages[newStatus as keyof typeof statusMessages] || `Tu orden cambió a estado: ${newStatus}`;
    const emoji = statusEmojis[newStatus as keyof typeof statusEmojis] || '📋';

    return this.createNotification({
      userId,
      title: `${emoji} Actualización de Orden`,
      message: `Orden #${orderNumber}: ${message}`,
      type: 'tracking',
      orderId,
      metadata: {
        orderNumber,
        status: newStatus,
        previousStatus: 'updated'
      }
    });
  }

  /**
   * Alias para compatibilidad (NUEVO MÉTODO EXPANDIDO)
   */
  static async notifyOrderStatusChanged(
    orderId: string, 
    userId: string, 
    newStatus: string, 
    orderNumber: string, 
    providerName?: string
  ) {
    return this.notifyOrderStatusChange(orderId, userId, newStatus, orderNumber);
  }

  /**
   * Notificación específica para número de tracking agregado
   */
  static async notifyTrackingNumberAdded(
    orderId: string,
    userId: string,
    trackingNumber: string,
    shippingProvider: string,
    orderNumber: string
  ) {
    return this.createNotification({
      userId,
      title: '📦 Número de Rastreo Disponible',
      message: `Tu orden #${orderNumber} ya tiene número de rastreo: ${trackingNumber} (${shippingProvider}). Puedes seguir tu envío en tiempo real.`,
      type: 'tracking',
      orderId,
      metadata: {
        orderNumber,
        trackingNumber,
        shippingProvider,
        trackingAdded: true
      }
    });
  }

  /**
   * Notificación de entrega próxima
   */
  static async notifyDeliveryApproaching(
    orderId: string,
    userId: string,
    orderNumber: string,
    estimatedDate: Date
  ) {
    const dateStr = estimatedDate.toLocaleDateString('es-MX', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    return this.createNotification({
      userId,
      title: '🚚 Entrega Próxima',
      message: `Tu orden #${orderNumber} llegará aproximadamente el ${dateStr}. ¡Prepárate para recibirla!`,
      type: 'tracking',
      orderId,
      metadata: {
        orderNumber,
        estimatedDelivery: estimatedDate.toISOString(),
        deliveryReminder: true
      }
    });
  }

  /**
   * Crear notificación para stock bajo (Proveedor)
   */
  static async notifyLowStock(productId: string, providerId: string, productName: string, currentStock: number) {
    return this.createNotification({
      userId: providerId,
      title: '🚨 Stock Bajo',
      message: `El producto "${productName}" tiene stock bajo (${currentStock} unidades). Considera reabastecerlo pronto.`,
      type: 'stock',
      productId,
      metadata: {
        productName,
        currentStock,
        threshold: 5
      }
    });
  }

  /**
   * Crear notificación de sistema para administradores
   */
  static async notifyAdminSystemEvent(title: string, message: string, metadata?: Record<string, any>) {
    try {
      await dbConnect();
      
      // Obtener todos los administradores
      const admins = await User.find({ role: 'admin' }).select('_id');
      
      const notifications = admins.map(admin => 
        this.createNotification({
          userId: admin._id.toString(),
          title,
          message,
          type: 'system',
          metadata
        })
      );

      await Promise.all(notifications);
      return true;
    } catch (error) {
      console.error('Error notifying admins:', error);
      throw error;
    }
  }

  // ===============================
  // 🔐 MÉTODOS DE VERIFICACIÓN (FASE 35)
  // ===============================

  /**
   * 📤 Notificar al usuario que su solicitud fue enviada
   */
  static async sendVerificationSubmitted(userId: string, requestId: string): Promise<void> {
    try {
      await this.createNotification({
        userId,
        title: '📤 Solicitud de Verificación Enviada',
        message: 'Tu solicitud de verificación ha sido recibida y está siendo procesada. Te notificaremos sobre cualquier actualización.',
        type: 'system',
        metadata: { requestId, action: 'verification_submitted' }
      });
      
      console.log(`📤 NOTIFICATION: Verification submitted for user ${userId}, request ${requestId}`);
      
    } catch (error) {
      console.error('Error sending verification submitted notification:', error);
    }
  }

  /**
   * ✅ Notificar al usuario que su solicitud fue aprobada
   */
  static async sendVerificationApproved(userId: string, requestId: string): Promise<void> {
    try {
      await this.createNotification({
        userId,
        title: '✅ Verificación Aprobada',
        message: '¡Felicidades! Tu solicitud de verificación ha sido aprobada. Ahora puedes comenzar a vender en la plataforma.',
        type: 'system',
        metadata: { requestId, action: 'verification_approved' }
      });
      
      console.log(`✅ NOTIFICATION: Verification approved for user ${userId}, request ${requestId}`);
      
    } catch (error) {
      console.error('Error sending verification approved notification:', error);
    }
  }

  /**
   * ❌ Notificar al usuario que su solicitud fue rechazada
   */
  static async sendVerificationRejected(
    userId: string, 
    requestId: string, 
    reason: string
  ): Promise<void> {
    try {
      await this.createNotification({
        userId,
        title: '❌ Verificación Rechazada',
        message: `Tu solicitud de verificación ha sido rechazada. Motivo: ${reason}. Puedes enviar una nueva solicitud corrigiendo los problemas indicados.`,
        type: 'system',
        metadata: { requestId, action: 'verification_rejected', reason }
      });
      
      console.log(`❌ NOTIFICATION: Verification rejected for user ${userId}, request ${requestId}, reason: ${reason}`);
      
    } catch (error) {
      console.error('Error sending verification rejected notification:', error);
    }
  }

  /**
   * 📄 Notificar al usuario que necesita enviar documentos adicionales
   */
  static async sendDocumentsRequested(
    userId: string,
    requestId: string,
    documentsRequested: string[]
  ): Promise<void> {
    try {
      const docsList = documentsRequested.join(', ');
      
      await this.createNotification({
        userId,
        title: '📄 Documentos Adicionales Requeridos',
        message: `Se requieren documentos adicionales para completar tu verificación: ${docsList}. Por favor, sube los documentos solicitados.`,
        type: 'system',
        metadata: { requestId, action: 'documents_requested', documentsRequested }
      });
      
      console.log(`📄 NOTIFICATION: Documents requested for user ${userId}, request ${requestId}`, documentsRequested);
      
    } catch (error) {
      console.error('Error sending documents requested notification:', error);
    }
  }

  /**
   * 🚨 Notificar a administradores sobre solicitud con score bajo
   */
  static async notifyAdminsLowScore(requestId: string): Promise<void> {
    try {
      const adminUsers = await User.find({ role: 'admin' });
      
      const notifications = adminUsers.map(admin =>
        this.createNotification({
          userId: admin._id.toString(),
          title: '🚨 Solicitud de Verificación con Score Bajo',
          message: `Una nueva solicitud de verificación tiene un score de riesgo bajo y requiere revisión manual inmediata.`,
          type: 'system',
          metadata: { requestId, action: 'low_score_alert', priority: 'high' }
        })
      );
      
      await Promise.all(notifications);
      console.log(`🚨 ADMIN ALERT: Low score verification request ${requestId}`);
      
    } catch (error) {
      console.error('Error sending low score notification to admins:', error);
    }
  }

  /**
   * 📊 Notificar a administradores sobre solicitudes pendientes
   */
  static async notifyAdminsPendingRequests(pendingCount: number): Promise<void> {
    try {
      if (pendingCount === 0) return;
      
      const adminUsers = await User.find({ role: 'admin' });
      
      const notifications = adminUsers.map(admin =>
        this.createNotification({
          userId: admin._id.toString(),
          title: '📊 Solicitudes de Verificación Pendientes',
          message: `Hay ${pendingCount} solicitudes de verificación pendientes de revisión.`,
          type: 'system',
          metadata: { action: 'pending_requests_alert', count: pendingCount }
        })
      );
      
      await Promise.all(notifications);
      console.log(`📊 ADMIN NOTIFICATION: ${pendingCount} pending verification requests`);
      
    } catch (error) {
      console.error('Error sending pending requests notification to admins:', error);
    }
  }

  // ===============================
  // 🔔 MÉTODOS FASE 38 - SISTEMA DE NOTIFICACIONES
  // ===============================

  /**
   * Limpiar notificaciones antiguas por usuario (mantener solo las últimas 100)
   */
  static async cleanupOldNotifications(userId: string): Promise<void> {
    try {
      await dbConnect();
      
      const notificationCount = await Notification.countDocuments({ userId });
      
      if (notificationCount > 100) {
        // Obtener las notificaciones más antiguas para eliminar
        const notificationsToDelete = await Notification.find({ userId })
          .sort({ createdAt: -1 })
          .skip(100)
          .select('_id');
        
        const idsToDelete = notificationsToDelete.map(n => n._id);
        await Notification.deleteMany({ _id: { $in: idsToDelete } });
      }
    } catch (error) {
      console.error('Error cleaning up old notifications:', error);
      // No throw error para no interrumpir el flujo principal
    }
  }

  /**
   * Crear múltiples notificaciones (para notificaciones masivas)
   */
  static async createBulkNotifications(notifications: CreateNotificationData[]): Promise<any[]> {
    try {
      await dbConnect();
      
      const notificationDocs = notifications.map(data => ({
        userId: data.userId,
        title: data.title,
        message: data.message,
        type: data.type,
        category: data.category || 'system',
        priority: data.priority || 'medium',
        url: data.url,
        icon: data.icon,
        orderId: data.orderId,
        productId: data.productId,
        metadata: data.metadata || {},
        expiresAt: data.expiresAt,
        isRead: false
      }));

      const savedNotifications = await Notification.insertMany(notificationDocs);
      
      // Cleanup para cada usuario único
      const uniqueUserIds = [...new Set(notifications.map(n => n.userId))];
      await Promise.all(uniqueUserIds.map(userId => this.cleanupOldNotifications(userId)));
      
      return savedNotifications;
    } catch (error) {
      console.error('Error creating bulk notifications:', error);
      throw error;
    }
  }

  /**
   * Obtener notificaciones de un usuario con filtros y paginación avanzada
   */
  static async getUserNotificationsAdvanced(
    userId: string, 
    filters: { 
      category?: string; 
      isRead?: boolean; 
      priority?: string; 
      startDate?: Date; 
      endDate?: Date; 
    } = {},
    options: { 
      page?: number; 
      limit?: number; 
      sortBy?: string; 
      sortOrder?: 'asc' | 'desc'; 
    } = {}
  ) {
    try {
      await dbConnect();
      
      const page = options.page || 1;
      const limit = Math.min(options.limit || 20, 100);
      const sortBy = options.sortBy || 'createdAt';
      const sortOrder = options.sortOrder || 'desc';
      const skip = (page - 1) * limit;

      // Construir query de filtros
      const query: any = { userId };

      if (filters.category) {
        query.category = filters.category;
      }

      if (typeof filters.isRead === 'boolean') {
        query.isRead = filters.isRead;
      }

      if (filters.priority) {
        query.priority = filters.priority;
      }

      if (filters.startDate || filters.endDate) {
        query.createdAt = {};
        if (filters.startDate) {
          query.createdAt.$gte = filters.startDate;
        }
        if (filters.endDate) {
          query.createdAt.$lte = filters.endDate;
        }
      }

      // Obtener notificaciones con paginación
      const [notifications, total] = await Promise.all([
        Notification.find(query)
          .sort({ [sortBy]: sortOrder === 'desc' ? -1 : 1 })
          .skip(skip)
          .limit(limit)
          .populate('orderId', 'status createdAt')
          .populate('productId', 'name')
          .lean(),
        Notification.countDocuments(query)
      ]);

      return {
        notifications: notifications.map(n => this.formatNotificationForClient(n)),
        pagination: {
          current: page,
          total: Math.ceil(total / limit),
          count: notifications.length,
          totalDocuments: total
        }
      };
    } catch (error) {
      console.error('Error getting user notifications:', error);
      throw error;
    }
  }

  /**
   * Marcar notificaciones específicas como leídas
   */
  static async markNotificationsAsRead(userId: string, notificationIds: string[]): Promise<number> {
    try {
      await dbConnect();
      
      const result = await Notification.updateMany(
        {
          userId,
          _id: { $in: notificationIds },
          isRead: false
        },
        {
          $set: {
            isRead: true,
            readAt: new Date()
          }
        }
      );

      return result.modifiedCount;
    } catch (error) {
      console.error('Error marking notifications as read:', error);
      throw error;
    }
  }

  /**
   * Eliminar notificación específica
   */
  static async deleteNotification(userId: string, notificationId: string): Promise<boolean> {
    try {
      await dbConnect();
      
      const result = await Notification.deleteOne({
        _id: notificationId,
        userId
      });

      return result.deletedCount > 0;
    } catch (error) {
      console.error('Error deleting notification:', error);
      throw error;
    }
  }

  /**
   * Limpiar notificaciones expiradas
   */
  static async cleanupExpiredNotifications(): Promise<number> {
    try {
      await dbConnect();
      
      const result = await Notification.deleteMany({
        expiresAt: { $lt: new Date() }
      });

      return result.deletedCount;
    } catch (error) {
      console.error('Error cleaning up expired notifications:', error);
      return 0;
    }
  }

  /**
   * Obtener estadísticas de notificaciones
   */
  static async getNotificationStats(userId: string, days: number = 30) {
    try {
      await dbConnect();
      
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const [
        totalCount,
        unreadCount,
        categoryStats,
        priorityStats,
        recentActivity
      ] = await Promise.all([
        // Total de notificaciones
        Notification.countDocuments({ userId }),
        
        // No leídas
        Notification.countDocuments({ userId, isRead: false }),
        
        // Por categoría
        Notification.aggregate([
          { $match: { userId, createdAt: { $gte: startDate } } },
          { $group: { _id: '$category', count: { $sum: 1 } } },
          { $sort: { count: -1 } }
        ]),
        
        // Por prioridad
        Notification.aggregate([
          { $match: { userId, createdAt: { $gte: startDate } } },
          { $group: { _id: '$priority', count: { $sum: 1 } } },
          { $sort: { count: -1 } }
        ]),

        // Actividad reciente
        Notification.find({ userId })
          .sort({ createdAt: -1 })
          .limit(10)
          .select('type title createdAt isRead')
          .lean()
      ]);

      return {
        total: totalCount,
        unread: unreadCount,
        readRate: totalCount > 0 ? ((totalCount - unreadCount) / totalCount * 100).toFixed(1) : '0',
        byCategory: categoryStats,
        byPriority: priorityStats,
        recentActivity: recentActivity.map(n => this.formatNotificationForClient(n))
      };
    } catch (error) {
      console.error('Error getting notification stats:', error);
      throw error;
    }
  }

  /**
   * Método auxiliar para formatear notificaciones para el cliente
   */
  private static formatNotificationForClient(notification: any) {
    return {
      id: notification._id?.toString() || notification.id,
      title: notification.title,
      message: notification.message,
      type: notification.type,
      category: notification.category,
      priority: notification.priority,
      isRead: notification.isRead || notification.read, // Compatibilidad
      url: notification.url,
      icon: notification.icon,
      metadata: notification.metadata,
      createdAt: notification.createdAt,
      readAt: notification.readAt,
      timeAgo: this.getTimeAgo(notification.createdAt)
    };
  }

  /**
   * Método auxiliar para calcular tiempo relativo
   */
  private static getTimeAgo(date: Date): string {
    const now = new Date();
    const diff = now.getTime() - new Date(date).getTime();
    
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (minutes < 1) return 'Ahora mismo';
    if (minutes < 60) return `Hace ${minutes} minuto${minutes > 1 ? 's' : ''}`;
    if (hours < 24) return `Hace ${hours} hora${hours > 1 ? 's' : ''}`;
    if (days < 7) return `Hace ${days} día${days > 1 ? 's' : ''}`;
    
    return new Date(date).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  // ===============================
  // 🎯 HELPERS PARA NOTIFICACIONES ESPECÍFICAS DEL DOMINIO
  // ===============================

  /**
   * Crear notificación de orden exitosa
   */
  static async createOrderNotification(userId: string, orderData: {
    orderId: string;
    orderNumber: string;
    amount: number;
    currency: string;
  }) {
    return this.createNotification({
      userId,
      type: 'order_success',
      title: '¡Pedido confirmado!',
      message: `Tu pedido #${orderData.orderNumber} por ${orderData.amount} ${orderData.currency} ha sido procesado exitosamente.`,
      category: 'order',
      priority: 'medium',
      url: `/orders/${orderData.orderId}`,
      icon: '🛒',
      orderId: orderData.orderId,
      metadata: {
        orderId: orderData.orderId,
        orderNumber: orderData.orderNumber,
        amount: orderData.amount,
        currency: orderData.currency
      }
    });
  }

  /**
   * Crear notificación de verificación
   */
  static async createVerificationNotification(userId: string, status: 'approved' | 'rejected', verificationId: string) {
    const isApproved = status === 'approved';
    
    return this.createNotification({
      userId,
      type: isApproved ? 'verification_approved' : 'verification_rejected',
      title: isApproved ? '✅ Verificación aprobada' : '❌ Verificación rechazada',
      message: isApproved 
        ? 'Tu cuenta ha sido verificada exitosamente. Ya puedes acceder a todas las funcionalidades.'
        : 'Tu solicitud de verificación ha sido rechazada. Revisa los requisitos y vuelve a intentarlo.',
      category: 'verification',
      priority: 'high',
      url: `/verification/${verificationId}`,
      icon: isApproved ? '✅' : '❌',
      metadata: {
        verificationId,
        status
      }
    });
  }

  /**
   * Crear notificación de respuesta de soporte
   */
  static async createSupportReplyNotification(userId: string, ticketData: {
    ticketId: string;
    ticketNumber: string;
    subject: string;
  }) {
    return this.createNotification({
      userId,
      type: 'support_reply',
      title: 'Nueva respuesta en tu ticket',
      message: `Hay una nueva respuesta en tu ticket #${ticketData.ticketNumber}: ${ticketData.subject}`,
      category: 'support',
      priority: 'medium',
      url: `/support/${ticketData.ticketId}`,
      icon: '💬',
      metadata: {
        ticketId: ticketData.ticketId,
        ticketNumber: ticketData.ticketNumber
      }
    });
  }

  /**
   * Crear notificación de puntos de lealtad
   */
  static async createLoyaltyPointsNotification(userId: string, pointsData: {
    points: number;
    reason: string;
    orderId?: string;
  }) {
    return this.createNotification({
      userId,
      type: 'loyalty_points_earned',
      title: '🎉 ¡Puntos ganados!',
      message: `Has ganado ${pointsData.points} puntos por ${pointsData.reason}`,
      category: 'loyalty',
      priority: 'low',
      url: '/loyalty',
      icon: '⭐',
      metadata: {
        points: pointsData.points,
        reason: pointsData.reason,
        orderId: pointsData.orderId
      }
    });
  }

  /**
   * Crear notificación de suscripción
   */
  static async createSubscriptionNotification(userId: string, type: 'upgraded' | 'expired', subscriptionData: {
    planName: string;
    subscriptionId: string;
  }) {
    const isUpgrade = type === 'upgraded';
    
    return this.createNotification({
      userId,
      type: isUpgrade ? 'subscription_upgraded' : 'subscription_expired',
      title: isUpgrade ? '🎯 Suscripción actualizada' : '⚠️ Suscripción expirada',
      message: isUpgrade 
        ? `Tu suscripción ha sido actualizada al plan ${subscriptionData.planName}. ¡Disfruta de las nuevas funcionalidades!`
        : `Tu suscripción al plan ${subscriptionData.planName} ha expirado. Renueva para continuar con todos los beneficios.`,
      category: 'subscription',
      priority: isUpgrade ? 'medium' : 'high',
      url: '/subscription',
      icon: isUpgrade ? '🎯' : '⚠️',
      metadata: {
        subscriptionId: subscriptionData.subscriptionId,
        planName: subscriptionData.planName,
        type
      }
    });
  }
}

export default NotificationService;
