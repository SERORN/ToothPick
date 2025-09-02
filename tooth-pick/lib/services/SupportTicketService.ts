import Ticket from '../models/Ticket';
import User from '../models/User';
import { NotificationService } from './NotificationService';
import { EmailService } from './EmailService';
import connectDB from '../db';

export interface CreateTicketData {
  userId: string;
  subject: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
  category: string;
  relatedOrderId?: string;
  relatedInvoiceId?: string;
  browserInfo?: string;
  deviceInfo?: string;
}

export interface TicketFilters {
  status?: string;
  priority?: string;
  category?: string;
  userRole?: string;
  assignedTo?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export class SupportTicketService {
  
  /**
   * Crear un nuevo ticket de soporte
   */
  static async createTicket(ticketData: CreateTicketData) {
    await connectDB();
    
    try {
      // Obtener información del usuario
      const user = await User.findById(ticketData.userId);
      if (!user) {
        throw new Error('Usuario no encontrado');
      }
      
      // Crear ticket
      const ticket = new Ticket({
        userId: ticketData.userId,
        userRole: user.role,
        subject: ticketData.subject,
        description: ticketData.description,
        priority: ticketData.priority,
        category: ticketData.category,
        relatedOrderId: ticketData.relatedOrderId,
        relatedInvoiceId: ticketData.relatedInvoiceId,
        browserInfo: ticketData.browserInfo,
        deviceInfo: ticketData.deviceInfo,
        messages: [{
          sender: 'user',
          senderName: user.name,
          senderId: user._id,
          message: ticketData.description,
          timestamp: new Date()
        }]
      });
      
      await ticket.save();
      
      // Poblar datos relacionados
      await ticket.populate('user', 'name email role profilePicture');
      
      // Enviar notificaciones
      await this.notifyTicketCreated(ticket, user);
      
      return ticket;
      
    } catch (error) {
      console.error('Error creando ticket:', error);
      throw error;
    }
  }
  
  /**
   * Obtener tickets de un usuario
   */
  static async getUserTickets(
    userId: string, 
    status?: string,
    page: number = 1,
    limit: number = 10
  ) {
    await connectDB();
    
    try {
      const query: any = { userId };
      if (status) query.status = status;
      
      const tickets = await Ticket.find(query)
        .populate('user', 'name email role')
        .populate('assignedAgent', 'name email')
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip((page - 1) * limit);
      
      const total = await Ticket.countDocuments(query);
      
      return {
        tickets,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      };
      
    } catch (error) {
      console.error('Error obteniendo tickets del usuario:', error);
      throw error;
    }
  }
  
  /**
   * Obtener tickets para el panel de soporte
   */
  static async getSupportTickets(filters: TicketFilters) {
    await connectDB();
    
    try {
      const {
        status,
        priority,
        category,
        userRole,
        assignedTo,
        search,
        page = 1,
        limit = 20
      } = filters;
      
      const query: any = {};
      
      if (status) query.status = status;
      if (priority) query.priority = priority;
      if (category) query.category = category;
      if (userRole) query.userRole = userRole;
      if (assignedTo) query.assignedTo = assignedTo;
      
      if (search) {
        query.$or = [
          { subject: { $regex: search, $options: 'i' } },
          { description: { $regex: search, $options: 'i' } },
          { 'messages.message': { $regex: search, $options: 'i' } }
        ];
      }
      
      const tickets = await Ticket.find(query)
        .populate('user', 'name email role profilePicture')
        .populate('assignedAgent', 'name email')
        .sort({ priority: -1, createdAt: -1 })
        .limit(limit)
        .skip((page - 1) * limit);
      
      const total = await Ticket.countDocuments(query);
      
      return {
        tickets,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      };
      
    } catch (error) {
      console.error('Error obteniendo tickets de soporte:', error);
      throw error;
    }
  }
  
  /**
   * Obtener un ticket específico
   */
  static async getTicketById(ticketId: string, userId?: string, isSupport: boolean = false) {
    await connectDB();
    
    try {
      const ticket = await Ticket.findById(ticketId)
        .populate('user', 'name email role profilePicture')
        .populate('assignedAgent', 'name email');
      
      if (!ticket) {
        throw new Error('Ticket no encontrado');
      }
      
      // Verificar permisos
      if (!isSupport && userId && ticket.userId.toString() !== userId) {
        throw new Error('No tienes permisos para ver este ticket');
      }
      
      return ticket;
      
    } catch (error) {
      console.error('Error obteniendo ticket:', error);
      throw error;
    }
  }
  
  /**
   * Agregar mensaje a un ticket
   */
  static async addMessageToTicket(
    ticketId: string,
    message: string,
    sender: 'user' | 'support',
    senderInfo: { id: string; name: string },
    attachments?: string[]
  ) {
    await connectDB();
    
    try {
      const ticket = await Ticket.findById(ticketId)
        .populate('user', 'name email role')
        .populate('assignedAgent', 'name email');
      
      if (!ticket) {
        throw new Error('Ticket no encontrado');
      }
      
      // Agregar mensaje
      await ticket.addMessage(
        sender,
        message,
        senderInfo.name,
        senderInfo.id,
        attachments
      );
      
      // Enviar notificaciones
      await this.notifyTicketUpdated(ticket, sender, message);
      
      return ticket;
      
    } catch (error) {
      console.error('Error agregando mensaje al ticket:', error);
      throw error;
    }
  }
  
  /**
   * Actualizar estado del ticket
   */
  static async updateTicketStatus(
    ticketId: string,
    status: 'open' | 'in_progress' | 'closed',
    agentId?: string,
    resolutionMessage?: string
  ) {
    await connectDB();
    
    try {
      const ticket = await Ticket.findById(ticketId)
        .populate('user', 'name email role');
      
      if (!ticket) {
        throw new Error('Ticket no encontrado');
      }
      
      const oldStatus = ticket.status;
      ticket.status = status;
      
      if (status === 'closed') {
        ticket.resolvedAt = new Date();
        
        if (resolutionMessage && agentId) {
          const agent = await User.findById(agentId);
          if (agent) {
            await ticket.addMessage(
              'support',
              resolutionMessage,
              agent.name,
              agentId
            );
          }
        }
      }
      
      await ticket.save();
      
      // Enviar notificaciones si el estado cambió
      if (oldStatus !== status) {
        await this.notifyStatusChanged(ticket, oldStatus, status);
      }
      
      return ticket;
      
    } catch (error) {
      console.error('Error actualizando estado del ticket:', error);
      throw error;
    }
  }
  
  /**
   * Asignar ticket a un agente
   */
  static async assignTicket(ticketId: string, agentId: string) {
    await connectDB();
    
    try {
      const ticket = await Ticket.findById(ticketId);
      if (!ticket) {
        throw new Error('Ticket no encontrado');
      }
      
      const agent = await User.findById(agentId);
      if (!agent) {
        throw new Error('Agente no encontrado');
      }
      
      ticket.assignedTo = agentId;
      if (ticket.status === 'open') {
        ticket.status = 'in_progress';
      }
      
      await ticket.save();
      
      // Notificar al agente
      await NotificationService.createNotification({
        userId: agentId,
        type: 'ticket_assigned',
        title: 'Ticket asignado',
        message: `Se te ha asignado el ticket: ${ticket.subject}`,
        data: {
          ticketId: ticket._id,
          ticketNumber: ticket.ticketNumber
        }
      });
      
      return ticket;
      
    } catch (error) {
      console.error('Error asignando ticket:', error);
      throw error;
    }
  }
  
  /**
   * Obtener estadísticas para panel de soporte
   */
  static async getSupportStatistics(filters: any = {}) {
    await connectDB();
    
    try {
      // Construir query base
      const query: any = {};
      
      if (filters.startDate || filters.endDate) {
        query.createdAt = {};
        if (filters.startDate) {
          query.createdAt.$gte = new Date(filters.startDate);
        }
        if (filters.endDate) {
          query.createdAt.$lte = new Date(filters.endDate);
        }
      }
      
      if (filters.userRole) {
        query.userRole = filters.userRole;
      }
      
      if (filters.category) {
        query.category = filters.category;
      }

      if (filters.agentId) {
        query.assignedAgent = filters.agentId;
      }
      
      // Estadísticas generales
      const generalStats = await Ticket.aggregate([
        { $match: query },
        {
          $group: {
            _id: null,
            totalTickets: { $sum: 1 },
            openTickets: {
              $sum: { $cond: [{ $eq: ['$status', 'open'] }, 1, 0] }
            },
            inProgressTickets: {
              $sum: { $cond: [{ $eq: ['$status', 'in_progress'] }, 1, 0] }
            },
            closedTickets: {
              $sum: { $cond: [{ $eq: ['$status', 'closed'] }, 1, 0] }
            },
            avgResponseTime: {
              $avg: {
                $cond: [
                  { $ne: ['$firstResponseTime', null] },
                  '$firstResponseTime',
                  null
                ]
              }
            },
            overdueTickets: {
              $sum: { $cond: [{ $eq: ['$isOverdue', true] }, 1, 0] }
            },
            highPriorityTickets: {
              $sum: { $cond: [{ $eq: ['$priority', 'high'] }, 1, 0] }
            },
            unassignedTickets: {
              $sum: { $cond: [{ $eq: ['$assignedAgent', null] }, 1, 0] }
            }
          }
        }
      ]);

      // Estadísticas por categoría
      const categoryStats = await Ticket.aggregate([
        { $match: query },
        {
          $group: {
            _id: '$category',
            count: { $sum: 1 },
            avgResponseTime: {
              $avg: {
                $cond: [
                  { $ne: ['$firstResponseTime', null] },
                  '$firstResponseTime',
                  null
                ]
              }
            }
          }
        },
        { $sort: { count: -1 } }
      ]);

      // Estadísticas por agente
      const agentStats = await Ticket.aggregate([
        { 
          $match: { 
            ...query, 
            assignedAgent: { $ne: null } 
          } 
        },
        {
          $group: {
            _id: '$assignedAgent',
            totalTickets: { $sum: 1 },
            closedTickets: {
              $sum: { $cond: [{ $eq: ['$status', 'closed'] }, 1, 0] }
            },
            avgResponseTime: {
              $avg: {
                $cond: [
                  { $ne: ['$firstResponseTime', null] },
                  '$firstResponseTime',
                  null
                ]
              }
            }
          }
        },
        {
          $lookup: {
            from: 'users',
            localField: '_id',
            foreignField: '_id',
            as: 'agentInfo'
          }
        },
        {
          $addFields: {
            agentName: { $arrayElemAt: ['$agentInfo.name', 0] },
            resolutionRate: {
              $cond: [
                { $gt: ['$totalTickets', 0] },
                { $multiply: [{ $divide: ['$closedTickets', '$totalTickets'] }, 100] },
                0
              ]
            }
          }
        },
        { $sort: { totalTickets: -1 } }
      ]);

      // Tendencias diarias (últimos 7 días)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const dailyTrends = await Ticket.aggregate([
        {
          $match: {
            createdAt: { $gte: sevenDaysAgo }
          }
        },
        {
          $group: {
            _id: {
              $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
            },
            ticketsCreated: { $sum: 1 },
            ticketsClosed: {
              $sum: { 
                $cond: [
                  { 
                    $and: [
                      { $eq: ['$status', 'closed'] },
                      { $gte: ['$closedAt', sevenDaysAgo] }
                    ]
                  }, 
                  1, 
                  0
                ]
              }
            }
          }
        },
        { $sort: { '_id': 1 } }
      ]);
      
      return {
        general: generalStats[0] || {
          totalTickets: 0,
          openTickets: 0,
          inProgressTickets: 0,
          closedTickets: 0,
          avgResponseTime: 0,
          overdueTickets: 0,
          highPriorityTickets: 0,
          unassignedTickets: 0
        },
        categories: categoryStats,
        agents: agentStats,
        trends: dailyTrends
      };
      
    } catch (error) {
      console.error('Error obteniendo estadísticas de soporte:', error);
      throw error;
    }
  }

  /**
   * Obtener estadísticas del sistema de tickets
   */
  static async getTicketStats(timeRange?: number) {
    await connectDB();
    
    try {
      return await Ticket.getStats(timeRange);
    } catch (error) {
      console.error('Error obteniendo estadísticas:', error);
      throw error;
    }
  }
  
  /**
   * Obtener categorías disponibles
   */
  static getAvailableCategories() {
    return [
      { value: 'facturacion', label: 'Facturación', description: 'Problemas con CFDI, facturas, pagos' },
      { value: 'envios', label: 'Envíos y Logística', description: 'Tracking, entregas, problemas de envío' },
      { value: 'soporte_tecnico', label: 'Soporte Técnico', description: 'Errores del sistema, bugs, funcionalidades' },
      { value: 'toothpay', label: 'ToothPay', description: 'Problemas con pagos, tarjetas, transacciones' },
      { value: 'marketplace', label: 'Marketplace', description: 'Productos de dentistas, ventas, comisiones' },
      { value: 'suscripciones', label: 'Suscripciones', description: 'Planes, upgrades, facturación recurrente' },
      { value: 'otros', label: 'Otros', description: 'Consultas generales, sugerencias' }
    ];
  }
  
  /**
   * Obtener tickets vencidos
   */
  static async getOverdueTickets() {
    await connectDB();
    
    try {
      const tickets = await Ticket.find({
        status: { $in: ['open', 'in_progress'] }
      }).populate('user', 'name email role');
      
      return tickets.filter(ticket => ticket.isOverdue());
      
    } catch (error) {
      console.error('Error obteniendo tickets vencidos:', error);
      throw error;
    }
  }
  
  /**
   * Notificar creación de ticket
   */
  private static async notifyTicketCreated(ticket: any, user: any) {
    try {
      // Notificación al usuario
      await NotificationService.createNotification({
        userId: user._id,
        type: 'ticket_created',
        title: 'Ticket de soporte creado',
        message: `Tu ticket "${ticket.subject}" ha sido creado y será atendido pronto`,
        data: {
          ticketId: ticket._id,
          ticketNumber: ticket.ticketNumber
        }
      });
      
      // Email al usuario
      await EmailService.sendEmail({
        to: user.email,
        subject: `Ticket de Soporte #${ticket.ticketNumber} - ${ticket.subject}`,
        template: 'ticket-created',
        data: {
          userName: user.name,
          ticketNumber: ticket.ticketNumber,
          subject: ticket.subject,
          priority: ticket.priority,
          category: ticket.category
        }
      });
      
      // Notificar al equipo de soporte (configurar emails de soporte)
      const supportEmails = process.env.SUPPORT_TEAM_EMAILS?.split(',') || [];
      for (const email of supportEmails) {
        await EmailService.sendEmail({
          to: email.trim(),
          subject: `Nuevo Ticket de Soporte #${ticket.ticketNumber}`,
          template: 'new-ticket-support',
          data: {
            ticketNumber: ticket.ticketNumber,
            subject: ticket.subject,
            userName: user.name,
            userEmail: user.email,
            priority: ticket.priority,
            category: ticket.category,
            description: ticket.description
          }
        });
      }
      
    } catch (error) {
      console.error('Error enviando notificaciones de ticket creado:', error);
    }
  }
  
  /**
   * Notificar actualización de ticket
   */
  private static async notifyTicketUpdated(ticket: any, sender: 'user' | 'support', message: string) {
    try {
      if (sender === 'support') {
        // Notificar al usuario
        await NotificationService.createNotification({
          userId: ticket.userId,
          type: 'ticket_updated',
          title: 'Respuesta de soporte',
          message: `Hay una nueva respuesta en tu ticket "${ticket.subject}"`,
          data: {
            ticketId: ticket._id,
            ticketNumber: ticket.ticketNumber
          }
        });
        
        // Email al usuario
        if (ticket.user?.email) {
          await EmailService.sendEmail({
            to: ticket.user.email,
            subject: `Respuesta a tu Ticket #${ticket.ticketNumber}`,
            template: 'ticket-response',
            data: {
              userName: ticket.user.name,
              ticketNumber: ticket.ticketNumber,
              subject: ticket.subject,
              responseMessage: message
            }
          });
        }
      } else if (sender === 'user' && ticket.assignedTo) {
        // Notificar al agente asignado
        await NotificationService.createNotification({
          userId: ticket.assignedTo,
          type: 'ticket_updated',
          title: 'Nueva respuesta del usuario',
          message: `El usuario respondió en el ticket "${ticket.subject}"`,
          data: {
            ticketId: ticket._id,
            ticketNumber: ticket.ticketNumber
          }
        });
      }
      
    } catch (error) {
      console.error('Error enviando notificaciones de ticket actualizado:', error);
    }
  }
  
  /**
   * Notificar cambio de estado
   */
  private static async notifyStatusChanged(
    ticket: any, 
    oldStatus: string, 
    newStatus: string
  ) {
    try {
      if (newStatus === 'closed') {
        // Notificar al usuario que el ticket fue cerrado
        await NotificationService.createNotification({
          userId: ticket.userId,
          type: 'ticket_closed',
          title: 'Ticket resuelto',
          message: `Tu ticket "${ticket.subject}" ha sido resuelto`,
          data: {
            ticketId: ticket._id,
            ticketNumber: ticket.ticketNumber
          }
        });
        
        // Email de cierre
        if (ticket.user?.email) {
          await EmailService.sendEmail({
            to: ticket.user.email,
            subject: `Ticket Resuelto #${ticket.ticketNumber}`,
            template: 'ticket-closed',
            data: {
              userName: ticket.user.name,
              ticketNumber: ticket.ticketNumber,
              subject: ticket.subject
            }
          });
        }
      }
      
    } catch (error) {
      console.error('Error enviando notificaciones de cambio de estado:', error);
    }
  }
}

export default SupportTicketService;
