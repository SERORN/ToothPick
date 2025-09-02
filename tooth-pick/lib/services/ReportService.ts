import ReviewReport, { IReviewReport } from '@/lib/models/ReviewReport';
import Review from '@/lib/models/Review';
import { Types } from 'mongoose';
import { connectToDatabase } from '@/lib/db';

export interface CreateReportData {
  reviewId: string;
  reporterId: string;
  reason: 'spam' | 'inappropriate' | 'fake' | 'offensive' | 'irrelevant' | 'other';
  reasonDetails?: string;
}

export interface ReportFilters {
  status?: 'pending' | 'dismissed' | 'removed';
  reason?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
}

class ReportService {
  
  /**
   * Crear un nuevo reporte de reseña
   */
  static async createReport(data: CreateReportData): Promise<IReviewReport> {
    await connectToDatabase();
    
    const { reviewId, reporterId, reason, reasonDetails } = data;
    
    // Verificar que la reseña existe
    const review = await Review.findById(reviewId);
    if (!review) {
      throw new Error('Reseña no encontrada');
    }
    
    // Verificar que el usuario no reporte su propia reseña
    if (review.userId.toString() === reporterId) {
      throw new Error('No puedes reportar tu propia reseña');
    }
    
    // Verificar que el usuario no haya ya reportado esta reseña
    const existingReport = await ReviewReport.findOne({
      reviewId: new Types.ObjectId(reviewId),
      reporterId: new Types.ObjectId(reporterId)
    });
    
    if (existingReport) {
      throw new Error('Ya has reportado esta reseña');
    }
    
    // Validar que se proporcionen detalles si el motivo es 'other'
    if (reason === 'other' && !reasonDetails?.trim()) {
      throw new Error('Se requieren detalles cuando el motivo es "otro"');
    }
    
    // Crear el reporte
    const report = new ReviewReport({
      reviewId: new Types.ObjectId(reviewId),
      reporterId: new Types.ObjectId(reporterId),
      reason,
      reasonDetails: reasonDetails?.trim()
    });
    
    await report.save();
    
    // Incrementar el contador de flags en la reseña
    await Review.findByIdAndUpdate(reviewId, {
      $inc: { flags: 1 }
    });
    
    // Poblar información relacionada
    await report.populate([
      { path: 'review', populate: { path: 'userId', select: 'name email' } },
      { path: 'reporter', select: 'name email' }
    ]);
    
    return report;
  }
  
  /**
   * Obtener reportes pendientes con filtros
   */
  static async getReports(filters: ReportFilters = {}) {
    await connectToDatabase();
    
    const {
      status = 'pending',
      reason,
      dateFrom,
      dateTo,
      page = 1,
      limit = 20
    } = filters;
    
    return (ReviewReport as any).getPendingReports(page, limit, {
      status,
      reason,
      dateFrom,
      dateTo
    });
  }
  
  /**
   * Resolver un reporte
   */
  static async resolveReport(
    reportId: string,
    adminId: string,
    action: 'dismiss' | 'remove',
    adminNotes?: string
  ) {
    await connectToDatabase();
    
    return (ReviewReport as any).resolveReport(
      new Types.ObjectId(reportId),
      new Types.ObjectId(adminId),
      action,
      adminNotes
    );
  }
  
  /**
   * Obtener estadísticas de reportes
   */
  static async getReportStatistics() {
    await connectToDatabase();
    
    const [generalStats, reasonStats] = await Promise.all([
      (ReviewReport as any).getReportStats(),
      (ReviewReport as any).getReportsByReason()
    ]);
    
    return {
      general: generalStats,
      byReason: reasonStats
    };
  }
  
  /**
   * Obtener un reporte específico
   */
  static async getReportById(reportId: string) {
    await connectToDatabase();
    
    const report = await ReviewReport.findById(reportId)
      .populate({
        path: 'review',
        populate: {
          path: 'userId',
          select: 'name email avatar'
        }
      })
      .populate('reporter', 'name email avatar')
      .populate('resolver', 'name email')
      .lean();
    
    if (!report) {
      throw new Error('Reporte no encontrado');
    }
    
    return report;
  }
  
  /**
   * Obtener reportes de un usuario específico
   */
  static async getUserReports(userId: string) {
    await connectToDatabase();
    
    return (ReviewReport as any).getUserReports(new Types.ObjectId(userId));
  }
  
  /**
   * Verificar si un usuario ya reportó una reseña
   */
  static async hasUserReported(reviewId: string, userId: string): Promise<boolean> {
    await connectToDatabase();
    
    return (ReviewReport as any).hasUserReported(
      new Types.ObjectId(reviewId),
      new Types.ObjectId(userId)
    );
  }
  
  /**
   * Obtener reportes pendientes para dashboard admin
   */
  static async getPendingReportsForDashboard(limit = 5) {
    await connectToDatabase();
    
    return ReviewReport.find({ status: 'pending' })
      .populate({
        path: 'review',
        populate: {
          path: 'userId',
          select: 'name email'
        }
      })
      .populate('reporter', 'name email')
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();
  }
  
  /**
   * Obtener tendencias de reportes (últimos 30 días)
   */
  static async getReportTrends() {
    await connectToDatabase();
    
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const trends = await ReviewReport.aggregate([
      {
        $match: {
          createdAt: { $gte: thirtyDaysAgo }
        }
      },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            reason: '$reason'
          },
          count: { $sum: 1 }
        }
      },
      {
        $group: {
          _id: '$_id.date',
          total: { $sum: '$count' },
          byReason: {
            $push: {
              reason: '$_id.reason',
              count: '$count'
            }
          }
        }
      },
      {
        $sort: { _id: 1 }
      }
    ]);
    
    return trends;
  }
  
  /**
   * Obtener reportes masivos (posible spam de reportes)
   */
  static async getMassReports() {
    await connectToDatabase();
    
    // Obtener reseñas con más de 3 reportes en las últimas 24 horas
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    
    const massReports = await ReviewReport.aggregate([
      {
        $match: {
          createdAt: { $gte: yesterday },
          status: 'pending'
        }
      },
      {
        $group: {
          _id: '$reviewId',
          reportCount: { $sum: 1 },
          reporters: { $push: '$reporterId' },
          reasons: { $push: '$reason' }
        }
      },
      {
        $match: {
          reportCount: { $gte: 3 }
        }
      },
      {
        $lookup: {
          from: 'reviews',
          localField: '_id',
          foreignField: '_id',
          as: 'review'
        }
      },
      {
        $unwind: '$review'
      },
      {
        $lookup: {
          from: 'users',
          localField: 'review.userId',
          foreignField: '_id',
          as: 'reviewAuthor'
        }
      },
      {
        $unwind: '$reviewAuthor'
      }
    ]);
    
    return massReports;
  }
  
  /**
   * Auto-resolver reportes obvios (spam detection)
   */
  static async autoResolveSpamReports() {
    await connectToDatabase();
    
    // Encontrar reportes que claramente son spam
    // Por ejemplo: múltiples reportes del mismo usuario en poco tiempo
    const spamReports = await ReviewReport.aggregate([
      {
        $match: {
          status: 'pending',
          createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } // Últimas 24 horas
        }
      },
      {
        $group: {
          _id: '$reporterId',
          reportCount: { $sum: 1 },
          reports: { $push: '$_id' }
        }
      },
      {
        $match: {
          reportCount: { $gte: 10 } // Más de 10 reportes en 24 horas
        }
      }
    ]);
    
    // Auto-rechazar reportes de usuarios que claramente hacen spam
    for (const spamUser of spamReports) {
      await ReviewReport.updateMany(
        { _id: { $in: spamUser.reports } },
        {
          status: 'dismissed',
          resolvedAt: new Date(),
          adminNotes: 'Auto-rechazado: Detectado como spam de reportes'
        }
      );
    }
    
    return spamReports.length;
  }
  
  /**
   * Obtener reporte detallado para admin
   */
  static async getDetailedReport(reportId: string) {
    await connectToDatabase();
    
    const report = await ReviewReport.findById(reportId)
      .populate({
        path: 'review',
        populate: [
          { path: 'userId', select: 'name email avatar createdAt' },
          { path: 'target' }
        ]
      })
      .populate('reporter', 'name email avatar createdAt')
      .populate('resolver', 'name email')
      .lean();
    
    if (!report) {
      throw new Error('Reporte no encontrado');
    }
    
    // Obtener estadísticas adicionales del reportador
    const reporterStats = await ReviewReport.countDocuments({
      reporterId: (report as any).reporterId
    });
    
    // Obtener otros reportes de la misma reseña
    const otherReports = await ReviewReport.find({
      reviewId: (report as any).reviewId,
      _id: { $ne: (report as any)._id }
    })
      .populate('reporter', 'name email')
      .lean();
    
    return {
      report,
      reporterStats: {
        totalReports: reporterStats
      },
      otherReports
    };
  }
}

export default ReportService;
