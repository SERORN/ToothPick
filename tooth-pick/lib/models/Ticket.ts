import mongoose, { Schema, Document } from 'mongoose';

export interface ITicketMessage {
  sender: 'user' | 'support';
  senderName: string;
  senderId?: mongoose.Types.ObjectId;
  message: string;
  timestamp: Date;
  attachments?: string[];
}

export interface ITicket extends Document {
  userId: mongoose.Types.ObjectId;
  userRole: 'dentist' | 'distributor' | 'customer';
  subject: string;
  description: string;
  status: 'open' | 'in_progress' | 'closed';
  priority: 'low' | 'medium' | 'high';
  category: 'facturacion' | 'envios' | 'soporte_tecnico' | 'toothpay' | 'marketplace' | 'suscripciones' | 'otros';
  assignedTo?: mongoose.Types.ObjectId; // ID de miembro de soporte
  messages: ITicketMessage[];
  
  // Metadatos adicionales
  tags?: string[];
  estimatedResolutionTime?: Date;
  resolvedAt?: Date;
  satisfaction?: number; // 1-5 rating después de resolver
  
  // Información contextual
  relatedOrderId?: mongoose.Types.ObjectId;
  relatedInvoiceId?: mongoose.Types.ObjectId;
  browserInfo?: string;
  deviceInfo?: string;
  
  createdAt: Date;
  updatedAt: Date;
}

const TicketMessageSchema = new Schema<ITicketMessage>({
  sender: {
    type: String,
    enum: ['user', 'support'],
    required: true
  },
  senderName: {
    type: String,
    required: true
  },
  senderId: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  message: {
    type: String,
    required: true,
    maxlength: 5000
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  attachments: [{
    type: String
  }]
}, { _id: false });

const TicketSchema: Schema = new Schema<ITicket>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    userRole: {
      type: String,
      enum: ['dentist', 'distributor', 'customer'],
      required: true,
      index: true
    },
    subject: {
      type: String,
      required: true,
      maxlength: 200
    },
    description: {
      type: String,
      required: true,
      maxlength: 2000
    },
    status: {
      type: String,
      enum: ['open', 'in_progress', 'closed'],
      default: 'open',
      index: true
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high'],
      default: 'medium',
      index: true
    },
    category: {
      type: String,
      enum: [
        'facturacion',
        'envios', 
        'soporte_tecnico',
        'toothpay',
        'marketplace',
        'suscripciones',
        'otros'
      ],
      required: true,
      index: true
    },
    assignedTo: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    },
    messages: [TicketMessageSchema],
    tags: [{
      type: String,
      maxlength: 50
    }],
    estimatedResolutionTime: {
      type: Date
    },
    resolvedAt: {
      type: Date
    },
    satisfaction: {
      type: Number,
      min: 1,
      max: 5
    },
    relatedOrderId: {
      type: Schema.Types.ObjectId,
      ref: 'Order'
    },
    relatedInvoiceId: {
      type: Schema.Types.ObjectId,
      ref: 'Invoice'
    },
    browserInfo: {
      type: String
    },
    deviceInfo: {
      type: String
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Índices compuestos para optimización
TicketSchema.index({ status: 1, priority: 1 });
TicketSchema.index({ category: 1, userRole: 1 });
TicketSchema.index({ assignedTo: 1, status: 1 });
TicketSchema.index({ createdAt: -1 });

// Virtual para obtener información del usuario
TicketSchema.virtual('user', {
  ref: 'User',
  localField: 'userId',
  foreignField: '_id',
  justOne: true
});

// Virtual para obtener información del agente asignado
TicketSchema.virtual('assignedAgent', {
  ref: 'User',
  localField: 'assignedTo',
  foreignField: '_id',
  justOne: true
});

// Método para generar número de ticket
TicketSchema.virtual('ticketNumber').get(function() {
  const rolePrefix = this.userRole.charAt(0).toUpperCase();
  const categoryPrefix = this.category.substring(0, 3).toUpperCase();
  const timestamp = this.createdAt.getTime().toString().slice(-6);
  return `${rolePrefix}${categoryPrefix}-${timestamp}`;
});

// Método para calcular tiempo de respuesta
TicketSchema.virtual('responseTime').get(function() {
  if (this.messages.length <= 1) return null;
  
  const firstMessage = this.messages[0];
  const firstResponse = this.messages.find(msg => msg.sender === 'support');
  
  if (!firstResponse) return null;
  
  return firstResponse.timestamp.getTime() - firstMessage.timestamp.getTime();
});

// Método para verificar si está vencido
TicketSchema.methods.isOverdue = function(): boolean {
  if (this.status === 'closed') return false;
  
  const now = new Date();
  const createdAt = this.createdAt;
  const hoursSinceCreated = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60);
  
  // SLA basado en prioridad
  const slaHours = {
    'high': 4,    // 4 horas
    'medium': 24, // 1 día
    'low': 72     // 3 días
  };
  
  return hoursSinceCreated > slaHours[this.priority];
};

// Método para agregar mensaje
TicketSchema.methods.addMessage = function(
  sender: 'user' | 'support',
  message: string,
  senderName: string,
  senderId?: string,
  attachments?: string[]
) {
  this.messages.push({
    sender,
    senderName,
    senderId: senderId ? new mongoose.Types.ObjectId(senderId) : undefined,
    message,
    timestamp: new Date(),
    attachments: attachments || []
  });
  
  // Auto-actualizar estado si es respuesta de soporte
  if (sender === 'support' && this.status === 'open') {
    this.status = 'in_progress';
  }
  
  return this.save();
};

// Método para cerrar ticket
TicketSchema.methods.close = function(resolutionMessage?: string, agentName?: string) {
  this.status = 'closed';
  this.resolvedAt = new Date();
  
  if (resolutionMessage && agentName) {
    this.messages.push({
      sender: 'support',
      senderName: agentName,
      message: resolutionMessage,
      timestamp: new Date()
    });
  }
  
  return this.save();
};

// Métodos estáticos
TicketSchema.statics.getByUser = async function(userId: string, status?: string) {
  const query: any = { userId };
  if (status) query.status = status;
  
  return this.find(query)
    .populate('user', 'name email role')
    .populate('assignedAgent', 'name email')
    .sort({ createdAt: -1 });
};

TicketSchema.statics.getForSupport = async function(filters: {
  status?: string;
  priority?: string;
  category?: string;
  userRole?: string;
  assignedTo?: string;
  search?: string;
}) {
  const query: any = {};
  
  if (filters.status) query.status = filters.status;
  if (filters.priority) query.priority = filters.priority;
  if (filters.category) query.category = filters.category;
  if (filters.userRole) query.userRole = filters.userRole;
  if (filters.assignedTo) query.assignedTo = filters.assignedTo;
  
  if (filters.search) {
    query.$or = [
      { subject: { $regex: filters.search, $options: 'i' } },
      { description: { $regex: filters.search, $options: 'i' } },
      { 'messages.message': { $regex: filters.search, $options: 'i' } }
    ];
  }
  
  return this.find(query)
    .populate('user', 'name email role profilePicture')
    .populate('assignedAgent', 'name email')
    .sort({ priority: -1, createdAt: -1 });
};

TicketSchema.statics.getStats = async function(timeRange?: number) {
  const matchStage: any = {};
  
  if (timeRange) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - timeRange);
    matchStage.createdAt = { $gte: startDate };
  }
  
  const stats = await this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        open: { $sum: { $cond: [{ $eq: ['$status', 'open'] }, 1, 0] } },
        inProgress: { $sum: { $cond: [{ $eq: ['$status', 'in_progress'] }, 1, 0] } },
        closed: { $sum: { $cond: [{ $eq: ['$status', 'closed'] }, 1, 0] } },
        high: { $sum: { $cond: [{ $eq: ['$priority', 'high'] }, 1, 0] } },
        medium: { $sum: { $cond: [{ $eq: ['$priority', 'medium'] }, 1, 0] } },
        low: { $sum: { $cond: [{ $eq: ['$priority', 'low'] }, 1, 0] } },
        avgResponseTime: {
          $avg: {
            $cond: [
              { $gt: [{ $size: '$messages' }, 1] },
              {
                $subtract: [
                  { $arrayElemAt: ['$messages.timestamp', 1] },
                  { $arrayElemAt: ['$messages.timestamp', 0] }
                ]
              },
              null
            ]
          }
        }
      }
    }
  ]);
  
  // Stats por categoría
  const categoryStats = await this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: '$category',
        count: { $sum: 1 }
      }
    }
  ]);
  
  // Stats por rol de usuario
  const roleStats = await this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: '$userRole',
        count: { $sum: 1 }
      }
    }
  ]);
  
  return {
    general: stats[0] || {
      total: 0, open: 0, inProgress: 0, closed: 0,
      high: 0, medium: 0, low: 0, avgResponseTime: 0
    },
    byCategory: categoryStats,
    byRole: roleStats
  };
};

export default mongoose.models.Ticket || 
  mongoose.model<ITicket>('Ticket', TicketSchema);
