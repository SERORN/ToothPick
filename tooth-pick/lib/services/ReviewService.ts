import Review, { IReview } from '@/lib/models/Review';
import ReviewReport from '@/lib/models/ReviewReport';
import { Types } from 'mongoose';
import { connectToDatabase } from '@/lib/db';

export interface CreateReviewData {
  userId: string;
  targetId: string;
  targetType: 'product' | 'provider' | 'distributor';
  rating: number;
  title: string;
  comment: string;
  verifiedPurchase?: boolean;
}

export interface ReviewFilters {
  targetId?: string;
  targetType?: string;
  rating?: number;
  verifiedPurchase?: boolean;
  sortBy?: 'newest' | 'oldest' | 'rating_high' | 'rating_low' | 'helpful';
  page?: number;
  limit?: number;
}

export interface ReviewStats {
  averageRating: number;
  totalReviews: number;
  ratingDistribution: {
    1: number;
    2: number;
    3: number;
    4: number;
    5: number;
  };
  verifiedPercentage: number;
}

class ReviewService {
  
  /**
   * Crear una nueva reseña
   */
  static async createReview(data: CreateReviewData): Promise<IReview> {
    await connectToDatabase();
    
    const { userId, targetId, targetType, rating, title, comment, verifiedPurchase = false } = data;
    
    // Validar que el usuario no haya ya calificado este objetivo
    const existingReview = await Review.findOne({
      userId: new Types.ObjectId(userId),
      targetId: new Types.ObjectId(targetId),
      targetType
    });
    
    if (existingReview) {
      throw new Error('Ya has calificado este elemento');
    }
    
    // Validaciones adicionales
    if (rating < 1 || rating > 5 || !Number.isInteger(rating)) {
      throw new Error('La calificación debe ser un número entero entre 1 y 5');
    }
    
    if (title.trim().length < 3) {
      throw new Error('El título debe tener al menos 3 caracteres');
    }
    
    if (comment.trim().length < 10) {
      throw new Error('El comentario debe tener al menos 10 caracteres');
    }
    
    // Verificar compra previa si es un producto
    let isVerifiedPurchase = false;
    if (targetType === 'product' && verifiedPurchase) {
      isVerifiedPurchase = await this.checkVerifiedPurchase(userId, targetId);
    }
    
    // Crear la reseña
    const review = new Review({
      userId: new Types.ObjectId(userId),
      targetId: new Types.ObjectId(targetId),
      targetType,
      rating,
      title: title.trim(),
      comment: comment.trim(),
      verifiedPurchase: isVerifiedPurchase
    });
    
    await review.save();
    
    // Poblar con información del usuario
    await review.populate('userId', 'name avatar');
    
    // Enviar notificación al proveedor/distribuidor (si aplica)
    if (targetType !== 'product') {
      await this.notifyTargetOfNewReview(targetId, review);
    }
    
    return review;
  }
  
  /**
   * Obtener reseñas con filtros y paginación
   */
  static async getReviews(filters: ReviewFilters = {}) {
    await connectToDatabase();
    
    const {
      targetId,
      targetType,
      rating,
      verifiedPurchase,
      sortBy = 'newest',
      page = 1,
      limit = 10
    } = filters;
    
    const skip = (page - 1) * limit;
    
    // Construir filtros de búsqueda
    const searchFilters: any = {
      isVisible: true,
      moderationStatus: 'approved'
    };
    
    if (targetId) {
      searchFilters.targetId = new Types.ObjectId(targetId);
    }
    
    if (targetType) {
      searchFilters.targetType = targetType;
    }
    
    if (rating) {
      searchFilters.rating = rating;
    }
    
    if (verifiedPurchase !== undefined) {
      searchFilters.verifiedPurchase = verifiedPurchase;
    }
    
    // Configurar ordenamiento
    let sortOptions: any = {};
    switch (sortBy) {
      case 'newest':
        sortOptions = { createdAt: -1 };
        break;
      case 'oldest':
        sortOptions = { createdAt: 1 };
        break;
      case 'rating_high':
        sortOptions = { rating: -1, createdAt: -1 };
        break;
      case 'rating_low':
        sortOptions = { rating: 1, createdAt: -1 };
        break;
      case 'helpful':
        sortOptions = { helpfulVotes: -1, createdAt: -1 };
        break;
      default:
        sortOptions = { createdAt: -1 };
    }
    
    // Obtener reseñas
    const reviews = await Review.find(searchFilters)
      .populate('userId', 'name avatar')
      .sort(sortOptions)
      .skip(skip)
      .limit(limit)
      .lean();
    
    // Obtener total para paginación
    const total = await Review.countDocuments(searchFilters);
    
    return {
      reviews,
      pagination: {
        current: page,
        pages: Math.ceil(total / limit),
        total,
        limit
      }
    };
  }
  
  /**
   * Obtener estadísticas de reseñas para un objetivo
   */
  static async getReviewStats(targetId: string, targetType: string): Promise<ReviewStats> {
    await connectToDatabase();
    
    const stats = await (Review as any).getAverageRating(
      new Types.ObjectId(targetId),
      targetType
    );
    
    // Calcular porcentaje de compras verificadas
    const verifiedCount = await Review.countDocuments({
      targetId: new Types.ObjectId(targetId),
      targetType,
      verifiedPurchase: true,
      isVisible: true,
      moderationStatus: 'approved'
    });
    
    const verifiedPercentage = stats.totalReviews > 0 
      ? Math.round((verifiedCount / stats.totalReviews) * 100)
      : 0;
    
    return {
      ...stats,
      verifiedPercentage
    };
  }
  
  /**
   * Obtener una reseña específica
   */
  static async getReviewById(reviewId: string) {
    await connectToDatabase();
    
    const review = await Review.findById(reviewId)
      .populate('userId', 'name avatar')
      .lean();
    
    if (!review) {
      throw new Error('Reseña no encontrada');
    }
    
    return review;
  }
  
  /**
   * Eliminar una reseña (solo el autor)
   */
  static async deleteReview(reviewId: string, userId: string) {
    await connectToDatabase();
    
    const review = await Review.findById(reviewId);
    
    if (!review) {
      throw new Error('Reseña no encontrada');
    }
    
    if (review.userId.toString() !== userId) {
      throw new Error('No tienes permiso para eliminar esta reseña');
    }
    
    await Review.findByIdAndDelete(reviewId);
    
    // También eliminar reportes relacionados
    await ReviewReport.deleteMany({ reviewId: new Types.ObjectId(reviewId) });
    
    return true;
  }
  
  /**
   * Votar si una reseña es útil
   */
  static async voteReviewHelpfulness(
    reviewId: string, 
    userId: string, 
    isHelpful: boolean
  ) {
    await connectToDatabase();
    
    const review = await Review.findById(reviewId);
    
    if (!review) {
      throw new Error('Reseña no encontrada');
    }
    
    // Verificar que el usuario no sea el autor de la reseña
    if (review.userId.toString() === userId) {
      throw new Error('No puedes votar tu propia reseña');
    }
    
    // TODO: Implementar lógica para evitar votos duplicados
    // Por ahora simplemente incrementamos el contador
    if (isHelpful) {
      review.helpfulVotes += 1;
    } else {
      review.unhelpfulVotes += 1;
    }
    
    await review.save();
    
    return {
      helpfulVotes: review.helpfulVotes,
      unhelpfulVotes: review.unhelpfulVotes,
      helpfulness: review.calculateHelpfulness()
    };
  }
  
  /**
   * Obtener reseñas de un usuario
   */
  static async getUserReviews(userId: string, page = 1, limit = 10) {
    await connectToDatabase();
    
    const skip = (page - 1) * limit;
    
    const reviews = await Review.find({ 
      userId: new Types.ObjectId(userId),
      isVisible: true 
    })
      .populate('target')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();
    
    const total = await Review.countDocuments({ 
      userId: new Types.ObjectId(userId),
      isVisible: true 
    });
    
    return {
      reviews,
      pagination: {
        current: page,
        pages: Math.ceil(total / limit),
        total,
        limit
      }
    };
  }
  
  /**
   * Verificar si el usuario ya calificó un objetivo
   */
  static async hasUserReviewed(
    userId: string, 
    targetId: string, 
    targetType: string
  ): Promise<boolean> {
    await connectToDatabase();
    
    const review = await Review.findOne({
      userId: new Types.ObjectId(userId),
      targetId: new Types.ObjectId(targetId),
      targetType
    });
    
    return !!review;
  }
  
  /**
   * Obtener reseñas recientes para dashboard
   */
  static async getRecentReviews(limit = 5) {
    await connectToDatabase();
    
    return Review.find({
      isVisible: true,
      moderationStatus: 'approved'
    })
      .populate('userId', 'name avatar')
      .populate('target')
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();
  }
  
  // Métodos privados
  
  /**
   * Verificar si el usuario compró el producto
   */
  private static async checkVerifiedPurchase(
    userId: string, 
    productId: string
  ): Promise<boolean> {
    // TODO: Implementar verificación de compra con el sistema de órdenes
    // Por ahora retornamos false
    
    // Ejemplo de implementación:
    // const Order = mongoose.model('Order');
    // const order = await Order.findOne({
    //   userId: new Types.ObjectId(userId),
    //   'items.productId': new Types.ObjectId(productId),
    //   status: 'completed'
    // });
    // return !!order;
    
    return false;
  }
  
  /**
   * Notificar al objetivo de nueva reseña
   */
  private static async notifyTargetOfNewReview(
    targetId: string, 
    review: IReview
  ) {
    // TODO: Implementar sistema de notificaciones
    // Por ahora solo logueamos
    console.log(`Nueva reseña para ${review.targetType} ${targetId}: ${review.rating} estrellas`);
  }
}

export default ReviewService;
