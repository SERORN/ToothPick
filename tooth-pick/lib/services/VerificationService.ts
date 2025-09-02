import { connectToDatabase } from '@/lib/db';
import VerificationRequest from '@/lib/models/VerificationRequest';
import VerificationLog from '@/lib/models/VerificationLog';
import User from '@/lib/models/User';
import { DocumentUploadService } from './DocumentUploadService';
import { NotificationService } from './NotificationService';

export interface VerificationSubmissionData {
  companyType: 'persona_fisica' | 'persona_moral';
  businessName: string;
  legalName: string;
  rfc: string;
  phone: string;
  email: string;
  address: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  businessCategory: 'dental_supplies' | 'equipment' | 'technology' | 'services' | 'other';
  businessJustification?: string;
  yearsInBusiness?: number;
  estimatedMonthlyVolume?: string;
}

export interface DocumentFiles {
  ineFront: File;
  ineBack: File;
  rfc: File;
  constitutiveAct?: File;
  addressProof: File;
  additionalDocs?: File[];
}

export interface VerificationReviewData {
  action: 'approve' | 'reject' | 'request_documents';
  reason?: string;
  adminNotes?: string;
  documentsRequested?: string[];
  escalationLevel?: number;
}

export class VerificationService {
  
  /**
   * 📤 Enviar solicitud de verificación
   */
  static async submitVerificationRequest(
    userId: string,
    data: VerificationSubmissionData,
    files: DocumentFiles,
    metadata: { ipAddress: string; userAgent: string }
  ): Promise<{ success: boolean; requestId?: string; error?: string }> {
    try {
      await connectToDatabase();
      
      // Verificar si el usuario ya tiene una solicitud pendiente
      const existingRequest = await VerificationRequest.findOne({
        userId,
        status: { $in: ['pending', 'in_review', 'documents_required'] }
      });
      
      if (existingRequest) {
        return {
          success: false,
          error: 'Ya tienes una solicitud de verificación en proceso'
        };
      }
      
      // Verificar límite de rechazos
      const rejectedCount = await VerificationRequest.countDocuments({
        userId,
        status: 'rejected'
      });
      
      if (rejectedCount >= 3) {
        return {
          success: false,
          error: 'Has alcanzado el límite máximo de solicitudes de verificación'
        };
      }
      
      // Subir documentos
      const documentUrls = await DocumentUploadService.uploadVerificationDocuments(
        userId,
        files
      );
      
      // Crear solicitud de verificación
      const verificationRequest = new VerificationRequest({
        userId,
        ...data,
        documents: documentUrls,
        ipAddress: metadata.ipAddress,
        userAgent: metadata.userAgent,
        previousRejections: rejectedCount,
        isResubmission: rejectedCount > 0,
        originalRequestId: rejectedCount > 0 ? await this.getOriginalRequestId(userId) : undefined
      });
      
      // Calcular score automático
      verificationRequest.verificationScore = verificationRequest.calculateVerificationScore();
      
      const savedRequest = await verificationRequest.save();
      
      // Actualizar estado del usuario
      await User.findByIdAndUpdate(userId, {
        'verificationStatus.status': 'pending',
        'verificationStatus.requestId': savedRequest._id.toString(),
        'verificationStatus.lastVerificationAttempt': new Date()
      });
      
      // Crear log de actividad
      await this.createVerificationLog({
        verificationRequestId: savedRequest._id.toString(),
        userId,
        action: 'submitted',
        details: {
          newStatus: 'pending'
        },
        ipAddress: metadata.ipAddress,
        userAgent: metadata.userAgent,
        context: {
          verificationScore: verificationRequest.verificationScore
        }
      });
      
      // Enviar notificación al usuario
      await NotificationService.sendVerificationSubmitted(userId, savedRequest._id.toString());
      
      // Notificar a admins si el score es bajo
      if (verificationRequest.verificationScore < 70) {
        await NotificationService.notifyAdminsLowScore(savedRequest._id.toString());
      }
      
      return {
        success: true,
        requestId: savedRequest._id.toString()
      };
      
    } catch (error) {
      console.error('Error submitting verification request:', error);
      return {
        success: false,
        error: 'Error interno del servidor'
      };
    }
  }
  
  /**
   * 📋 Obtener estado de verificación del usuario
   */
  static async getVerificationStatus(userId: string): Promise<{
    hasRequest: boolean;
    request?: any;
    canSubmit: boolean;
    rejectionCount: number;
  }> {
    try {
      await connectToDatabase();
      
      const currentRequest = await VerificationRequest.findOne({
        userId,
        status: { $in: ['pending', 'in_review', 'documents_required'] }
      }).sort({ submittedAt: -1 });
      
      const rejectionCount = await VerificationRequest.countDocuments({
        userId,
        status: 'rejected'
      });
      
      const approvedRequest = await VerificationRequest.findOne({
        userId,
        status: 'approved'
      });
      
      return {
        hasRequest: !!currentRequest || !!approvedRequest,
        request: currentRequest || approvedRequest,
        canSubmit: !currentRequest && !approvedRequest && rejectionCount < 3,
        rejectionCount
      };
      
    } catch (error) {
      console.error('Error getting verification status:', error);
      throw new Error('Error al obtener estado de verificación');
    }
  }
  
  /**
   * 👨‍💼 Obtener solicitudes pendientes para administradores
   */
  static async getPendingRequests(
    filters: {
      status?: string;
      businessCategory?: string;
      minScore?: number;
      maxScore?: number;
      sortBy?: 'submittedAt' | 'verificationScore' | 'businessName';
      sortOrder?: 'asc' | 'desc';
      page?: number;
      limit?: number;
    } = {}
  ): Promise<{
    requests: any[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    try {
      await connectToDatabase();
      
      const {
        status = 'pending',
        businessCategory,
        minScore,
        maxScore,
        sortBy = 'submittedAt',
        sortOrder = 'desc',
        page = 1,
        limit = 20
      } = filters;
      
      // Construir query
      const query: any = {};
      
      if (status !== 'all') {
        query.status = status;
      }
      
      if (businessCategory) {
        query.businessCategory = businessCategory;
      }
      
      if (minScore !== undefined || maxScore !== undefined) {
        query.verificationScore = {};
        if (minScore !== undefined) query.verificationScore.$gte = minScore;
        if (maxScore !== undefined) query.verificationScore.$lte = maxScore;
      }
      
      // Calcular paginación
      const skip = (page - 1) * limit;
      
      // Ordenamiento
      const sort: any = {};
      sort[sortBy] = sortOrder === 'desc' ? -1 : 1;
      
      // Ejecutar query
      const [requests, total] = await Promise.all([
        VerificationRequest.find(query)
          .sort(sort)
          .skip(skip)
          .limit(limit)
          .populate('userId', 'name email role'),
        VerificationRequest.countDocuments(query)
      ]);
      
      return {
        requests,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      };
      
    } catch (error) {
      console.error('Error getting pending requests:', error);
      throw new Error('Error al obtener solicitudes pendientes');
    }
  }
  
  /**
   * ✅ Aprobar solicitud de verificación
   */
  static async approveVerification(
    requestId: string,
    adminUserId: string,
    reviewData: VerificationReviewData,
    metadata: { ipAddress: string; userAgent: string }
  ): Promise<{ success: boolean; error?: string }> {
    try {
      await connectToDatabase();
      
      const request = await VerificationRequest.findById(requestId);
      if (!request) {
        return { success: false, error: 'Solicitud no encontrada' };
      }
      
      if (request.status === 'approved') {
        return { success: false, error: 'La solicitud ya fue aprobada' };
      }
      
      const startTime = Date.now();
      
      // Actualizar solicitud
      await VerificationRequest.findByIdAndUpdate(requestId, {
        status: 'approved',
        reviewedAt: new Date(),
        reviewedBy: adminUserId,
        adminNotes: reviewData.adminNotes
      });
      
      // Actualizar usuario
      await User.findByIdAndUpdate(request.userId, {
        'verificationStatus.isVerified': true,
        'verificationStatus.status': 'approved',
        'verificationStatus.verifiedAt': new Date(),
        'verificationStatus.verifiedBy': adminUserId,
        'verificationStatus.canSell': true,
        'verificationStatus.canReceiveOrders': true,
        'verificationStatus.verificationScore': request.verificationScore
      });
      
      const reviewDuration = Math.round((Date.now() - startTime) / (1000 * 60));
      
      // Crear log
      await this.createVerificationLog({
        verificationRequestId: requestId,
        userId: request.userId,
        adminUserId,
        action: 'approved',
        details: {
          previousStatus: request.status,
          newStatus: 'approved',
          reason: reviewData.reason,
          notes: reviewData.adminNotes
        },
        ipAddress: metadata.ipAddress,
        userAgent: metadata.userAgent,
        context: {
          verificationScore: request.verificationScore,
          reviewDuration,
          escalationLevel: reviewData.escalationLevel
        }
      });
      
      // Enviar notificación al usuario
      await NotificationService.sendVerificationApproved(request.userId, requestId);
      
      return { success: true };
      
    } catch (error) {
      console.error('Error approving verification:', error);
      return { success: false, error: 'Error interno del servidor' };
    }
  }
  
  /**
   * ❌ Rechazar solicitud de verificación
   */
  static async rejectVerification(
    requestId: string,
    adminUserId: string,
    reviewData: VerificationReviewData,
    metadata: { ipAddress: string; userAgent: string }
  ): Promise<{ success: boolean; error?: string }> {
    try {
      await connectToDatabase();
      
      const request = await VerificationRequest.findById(requestId);
      if (!request) {
        return { success: false, error: 'Solicitud no encontrada' };
      }
      
      if (request.status === 'approved') {
        return { success: false, error: 'No se puede rechazar una solicitud aprobada' };
      }
      
      const startTime = Date.now();
      
      // Actualizar solicitud
      await VerificationRequest.findByIdAndUpdate(requestId, {
        status: 'rejected',
        reviewedAt: new Date(),
        reviewedBy: adminUserId,
        adminNotes: reviewData.adminNotes,
        rejectionReason: reviewData.reason
      });
      
      // Actualizar contador de rechazos del usuario
      await User.findByIdAndUpdate(request.userId, {
        'verificationStatus.status': 'rejected',
        'verificationStatus.rejectionCount': { $inc: 1 },
        'verificationStatus.canSell': false,
        'verificationStatus.canReceiveOrders': false
      });
      
      const reviewDuration = Math.round((Date.now() - startTime) / (1000 * 60));
      
      // Crear log
      await this.createVerificationLog({
        verificationRequestId: requestId,
        userId: request.userId,
        adminUserId,
        action: 'rejected',
        details: {
          previousStatus: request.status,
          newStatus: 'rejected',
          reason: reviewData.reason,
          notes: reviewData.adminNotes
        },
        ipAddress: metadata.ipAddress,
        userAgent: metadata.userAgent,
        context: {
          verificationScore: request.verificationScore,
          reviewDuration,
          escalationLevel: reviewData.escalationLevel
        }
      });
      
      // Enviar notificación al usuario
      await NotificationService.sendVerificationRejected(
        request.userId, 
        requestId, 
        reviewData.reason || 'No especificado'
      );
      
      return { success: true };
      
    } catch (error) {
      console.error('Error rejecting verification:', error);
      return { success: false, error: 'Error interno del servidor' };
    }
  }
  
  /**
   * 📄 Solicitar documentos adicionales
   */
  static async requestAdditionalDocuments(
    requestId: string,
    adminUserId: string,
    reviewData: VerificationReviewData,
    metadata: { ipAddress: string; userAgent: string }
  ): Promise<{ success: boolean; error?: string }> {
    try {
      await connectToDatabase();
      
      const request = await VerificationRequest.findById(requestId);
      if (!request) {
        return { success: false, error: 'Solicitud no encontrada' };
      }
      
      // Actualizar solicitud
      await VerificationRequest.findByIdAndUpdate(requestId, {
        status: 'documents_required',
        reviewedAt: new Date(),
        reviewedBy: adminUserId,
        adminNotes: reviewData.adminNotes
      });
      
      // Actualizar usuario
      await User.findByIdAndUpdate(request.userId, {
        'verificationStatus.status': 'documents_required'
      });
      
      // Crear log
      await this.createVerificationLog({
        verificationRequestId: requestId,
        userId: request.userId,
        adminUserId,
        action: 'documents_requested',
        details: {
          previousStatus: request.status,
          newStatus: 'documents_required',
          reason: reviewData.reason,
          notes: reviewData.adminNotes,
          documentsRequested: reviewData.documentsRequested
        },
        ipAddress: metadata.ipAddress,
        userAgent: metadata.userAgent
      });
      
      // Enviar notificación al usuario
      await NotificationService.sendDocumentsRequested(
        request.userId,
        requestId,
        reviewData.documentsRequested || []
      );
      
      return { success: true };
      
    } catch (error) {
      console.error('Error requesting documents:', error);
      return { success: false, error: 'Error interno del servidor' };
    }
  }
  
  /**
   * 📊 Obtener estadísticas de verificación
   */
  static async getVerificationStats(filters: {
    startDate?: Date;
    endDate?: Date;
    adminUserId?: string;
  } = {}): Promise<{
    overview: any;
    byStatus: any[];
    byCategory: any[];
    adminPerformance: any[];
    trends: any[];
  }> {
    try {
      await connectToDatabase();
      
      const { startDate, endDate, adminUserId } = filters;
      
      // Query base
      const matchStage: any = {};
      if (startDate || endDate) {
        matchStage.submittedAt = {};
        if (startDate) matchStage.submittedAt.$gte = startDate;
        if (endDate) matchStage.submittedAt.$lte = endDate;
      }
      
      // Estadísticas generales
      const overview = await VerificationRequest.aggregate([
        { $match: matchStage },
        {
          $group: {
            _id: null,
            totalRequests: { $sum: 1 },
            approved: {
              $sum: { $cond: [{ $eq: ['$status', 'approved'] }, 1, 0] }
            },
            rejected: {
              $sum: { $cond: [{ $eq: ['$status', 'rejected'] }, 1, 0] }
            },
            pending: {
              $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] }
            },
            avgScore: { $avg: '$verificationScore' },
            avgProcessingTime: {
              $avg: {
                $cond: [
                  { $ne: ['$reviewedAt', null] },
                  {
                    $divide: [
                      { $subtract: ['$reviewedAt', '$submittedAt'] },
                      1000 * 60 * 60 * 24 // convertir a días
                    ]
                  },
                  null
                ]
              }
            }
          }
        }
      ]);
      
      // Por estado
      const byStatus = await VerificationRequest.aggregate([
        { $match: matchStage },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 }
          }
        }
      ]);
      
      // Por categoría de negocio
      const byCategory = await VerificationRequest.aggregate([
        { $match: matchStage },
        {
          $group: {
            _id: '$businessCategory',
            count: { $sum: 1 },
            approved: {
              $sum: { $cond: [{ $eq: ['$status', 'approved'] }, 1, 0] }
            },
            avgScore: { $avg: '$verificationScore' }
          }
        }
      ]);
      
      // Performance de admins
      const adminPerformance = await VerificationLog.getReviewStats(startDate, endDate);
      
      // Tendencias (últimos 30 días)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const trends = await VerificationRequest.aggregate([
        { $match: { submittedAt: { $gte: thirtyDaysAgo } } },
        {
          $group: {
            _id: {
              $dateToString: { format: '%Y-%m-%d', date: '$submittedAt' }
            },
            submitted: { $sum: 1 },
            approved: {
              $sum: { $cond: [{ $eq: ['$status', 'approved'] }, 1, 0] }
            }
          }
        },
        { $sort: { '_id': 1 } }
      ]);
      
      return {
        overview: overview[0] || {},
        byStatus,
        byCategory,
        adminPerformance,
        trends
      };
      
    } catch (error) {
      console.error('Error getting verification stats:', error);
      throw new Error('Error al obtener estadísticas');
    }
  }
  
  /**
   * 📜 Obtener historial completo de una solicitud
   */
  static async getRequestHistory(requestId: string): Promise<{
    request: any;
    logs: any[];
  }> {
    try {
      await connectToDatabase();
      
      const [request, logs] = await Promise.all([
        VerificationRequest.findById(requestId).populate('userId', 'name email role'),
        VerificationLog.getRequestHistory(requestId)
      ]);
      
      return { request, logs };
      
    } catch (error) {
      console.error('Error getting request history:', error);
      throw new Error('Error al obtener historial');
    }
  }
  
  // ======= MÉTODOS AUXILIARES =======
  
  private static async createVerificationLog(logData: any): Promise<void> {
    try {
      const log = new VerificationLog(logData);
      await log.save();
    } catch (error) {
      console.error('Error creating verification log:', error);
    }
  }
  
  private static async getOriginalRequestId(userId: string): Promise<string | undefined> {
    try {
      const firstRequest = await VerificationRequest.findOne({ userId })
        .sort({ submittedAt: 1 });
      return firstRequest?._id.toString();
    } catch (error) {
      console.error('Error getting original request ID:', error);
      return undefined;
    }
  }
  
  /**
   * 🔒 Verificar si el usuario puede realizar acciones (vender, recibir órdenes)
   */
  static async canUserPerformAction(
    userId: string, 
    action: 'sell' | 'receive_orders'
  ): Promise<boolean> {
    try {
      await connectToDatabase();
      
      const user = await User.findById(userId);
      if (!user) return false;
      
      // Solo proveedores y distribuidores necesitan verificación
      if (!['provider', 'distributor'].includes(user.role)) {
        return true;
      }
      
      const verificationStatus = user.verificationStatus;
      if (!verificationStatus) return false;
      
      if (action === 'sell') {
        return verificationStatus.canSell === true;
      }
      
      if (action === 'receive_orders') {
        return verificationStatus.canReceiveOrders === true;
      }
      
      return false;
      
    } catch (error) {
      console.error('Error checking user permissions:', error);
      return false;
    }
  }
}

export default VerificationService;
