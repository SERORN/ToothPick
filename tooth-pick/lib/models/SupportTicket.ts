import mongoose, { Schema, Document } from 'mongoose';

export interface ISupportTicket extends Document {
  _id: string;
  userId: string;
  role: 'provider' | 'distributor' | 'clinic' | 'admin';
  subject: string;
  category: 'facturacion' | 'entregas' | 'producto' | 'cuenta' | 'tecnico' | 'otro';
  description: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high';
  assignedTo?: string;
  tags?: string[];
  attachments?: string[];
  createdAt: Date;
  updatedAt: Date;
  closedAt?: Date;
  lastReplyAt?: Date;
  satisfactionRating?: number; // 1-5
  satisfactionComment?: string;
}

const SupportTicketSchema = new Schema<ISupportTicket>({
  userId: {
    type: String,
    required: true,
    index: true
  },
  role: {
    type: String,
    required: true,
    enum: ['provider', 'distributor', 'clinic', 'admin'],
    index: true
  },
  subject: {
    type: String,
    required: true,
    maxlength: 200,
    trim: true
  },
  category: {
    type: String,
    required: true,
    enum: ['facturacion', 'entregas', 'producto', 'cuenta', 'tecnico', 'otro'],
    index: true
  },
  description: {
    type: String,
    required: true,
    maxlength: 2000,
    trim: true
  },
  status: {
    type: String,
    required: true,
    enum: ['open', 'in_progress', 'resolved', 'closed'],
    default: 'open',
    index: true
  },
  priority: {
    type: String,
    required: true,
    enum: ['low', 'medium', 'high'],
    default: 'medium',
    index: true
  },
  assignedTo: {
    type: String,
    index: true
  },
  tags: [{
    type: String,
    trim: true
  }],
  attachments: [{
    type: String
  }],
  closedAt: {
    type: Date
  },
  lastReplyAt: {
    type: Date
  },
  satisfactionRating: {
    type: Number,
    min: 1,
    max: 5
  },
  satisfactionComment: {
    type: String,
    maxlength: 500,
    trim: true
  }
}, {
  timestamps: true,
  collection: 'support_tickets'
});

// Índices compuestos para consultas frecuentes
SupportTicketSchema.index({ userId: 1, status: 1 });
SupportTicketSchema.index({ status: 1, priority: 1, createdAt: -1 });
SupportTicketSchema.index({ assignedTo: 1, status: 1 });
SupportTicketSchema.index({ category: 1, status: 1 });

// Middleware para actualizar lastReplyAt
SupportTicketSchema.pre('save', function(next) {
  if (this.isModified('status') && this.status === 'closed') {
    this.closedAt = new Date();
  }
  next();
});

// Métodos estáticos
SupportTicketSchema.statics.getByUserId = function(userId: string, filters?: any) {
  const query = { userId, ...filters };
  return this.find(query)
    .populate('userId', 'name email')
    .sort({ createdAt: -1 });
};

SupportTicketSchema.statics.getByStatus = function(status: string, filters?: any) {
  const query = { status, ...filters };
  return this.find(query)
    .populate('userId', 'name email role')
    .populate('assignedTo', 'name email')
    .sort({ priority: -1, createdAt: -1 });
};

SupportTicketSchema.statics.getStatistics = function() {
  return this.aggregate([
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        open: { $sum: { $cond: [{ $eq: ['$status', 'open'] }, 1, 0] } },
        inProgress: { $sum: { $cond: [{ $eq: ['$status', 'in_progress'] }, 1, 0] } },
        resolved: { $sum: { $cond: [{ $eq: ['$status', 'resolved'] }, 1, 0] } },
        closed: { $sum: { $cond: [{ $eq: ['$status', 'closed'] }, 1, 0] } },
        highPriority: { $sum: { $cond: [{ $eq: ['$priority', 'high'] }, 1, 0] } },
        avgSatisfaction: { $avg: '$satisfactionRating' }
      }
    }
  ]);
};

SupportTicketSchema.statics.getCategoryStats = function() {
  return this.aggregate([
    {
      $group: {
        _id: '$category',
        count: { $sum: 1 },
        open: { $sum: { $cond: [{ $eq: ['$status', 'open'] }, 1, 0] } },
        avgSatisfaction: { $avg: '$satisfactionRating' }
      }
    },
    { $sort: { count: -1 } }
  ]);
};

// Exportar modelo
const SupportTicket = mongoose.models.SupportTicket || mongoose.model<ISupportTicket>('SupportTicket', SupportTicketSchema);

export default SupportTicket;
