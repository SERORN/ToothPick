import RewardPoint from '@/lib/models/RewardPoint';
import Order from '@/lib/models/Order';
import Review from '@/lib/models/Review';
import Referral from '@/lib/models/Referral';
import User from '@/lib/models/User';

export class RewardService {
  
  // 🎁 CONFIGURACIÓN DE PUNTOS
  static readonly POINTS_CONFIG = {
    PURCHASE_RATE: 100, // 1 punto por cada $100 MXN
    REVIEW_POINTS: 5,   // 5 puntos por reseña aprobada
    WELCOME_POINTS: 10, // 10 puntos de bienvenida
    REFERRAL_POINTS: 20 // 20 puntos por referir un cliente
  };

  // 💰 CONFIGURACIÓN DE REDENCIÓN
  static readonly REDEMPTION_CONFIG = {
    MIN_REDEMPTION: 50,    // Mínimo 50 puntos para redimir
    POINTS_TO_PESOS: 0.5,  // 1 punto = $0.50 MXN
    MAX_DISCOUNT_PERCENT: 50 // Máximo 50% de descuento con puntos
  };

  /**
   * 🛒 OTORGAR PUNTOS POR COMPRA COMPLETADA
   */
  static async awardPointsForPurchase(orderId: string): Promise<void> {
    try {
      const order = await Order.findById(orderId);
      
      if (!order) {
        throw new Error('Orden no encontrada');
      }

      if (order.type !== 'b2c') {
        return; // Solo órdenes B2C reciben puntos
      }

      if (order.status !== 'delivered') {
        return; // Solo órdenes entregadas reciben puntos
      }

      await RewardPoint.addPointsForPurchase(
        order.customerId.toString(),
        orderId,
        order.total
      );

      console.log(`✅ Puntos otorgados para orden ${orderId}`);

      // 👥 VERIFICAR SI HAY REFERIDO PENDIENTE
      await this.checkAndAwardReferralPoints(order.customerId.toString(), orderId);
      
    } catch (error) {
      console.error('❌ Error otorgando puntos por compra:', error);
      // No lanzar error para no afectar el flujo de la orden
    }
  }

  /**
   * ⭐ OTORGAR PUNTOS POR RESEÑA APROBADA
   */
  static async awardPointsForReview(reviewId: string): Promise<void> {
    try {
      const review = await Review.findById(reviewId);
      
      if (!review) {
        throw new Error('Reseña no encontrada');
      }

      if (!review.isModerated || !review.isApproved) {
        return; // Solo reseñas aprobadas reciben puntos
      }

      await RewardPoint.addPointsForReview(
        review.userId.toString(),
        reviewId
      );

      console.log(`✅ Puntos otorgados por reseña ${reviewId}`);
      
    } catch (error) {
      console.error('❌ Error otorgando puntos por reseña:', error);
    }
  }

  /**
   * 🎉 OTORGAR PUNTOS DE BIENVENIDA
   */
  static async awardWelcomePoints(userId: string): Promise<void> {
    try {
      // Verificar que no haya puntos de bienvenida previos
      const existingWelcome = await RewardPoint.findOne({
        userId,
        reason: 'bienvenida'
      });

      if (existingWelcome) {
        return; // Ya recibió puntos de bienvenida
      }

      await RewardPoint.create({
        userId,
        points: this.POINTS_CONFIG.WELCOME_POINTS,
        reason: 'bienvenida',
        description: `Bienvenido a ToothPick - ${this.POINTS_CONFIG.WELCOME_POINTS} puntos`
      });

      console.log(`✅ Puntos de bienvenida otorgados al usuario ${userId}`);
      
    } catch (error) {
      console.error('❌ Error otorgando puntos de bienvenida:', error);
    }
  }

  /**
   * 💸 REDIMIR PUNTOS EN DESCUENTO
   */
  static async redeemPointsForDiscount(
    userId: string, 
    pointsToRedeem: number, 
    orderTotal: number
  ): Promise<{ discount: number; pointsUsed: number }> {
    
    if (pointsToRedeem < this.REDEMPTION_CONFIG.MIN_REDEMPTION) {
      throw new Error(`Mínimo ${this.REDEMPTION_CONFIG.MIN_REDEMPTION} puntos para redimir`);
    }

    // Verificar puntos disponibles
    const availablePoints = await RewardPoint.getUserTotalPoints(userId);
    if (availablePoints < pointsToRedeem) {
      throw new Error(`Puntos insuficientes. Disponibles: ${availablePoints}`);
    }

    // Calcular descuento en pesos
    const discountAmount = pointsToRedeem * this.REDEMPTION_CONFIG.POINTS_TO_PESOS;
    
    // Aplicar límite máximo de descuento (50% del total)
    const maxDiscount = orderTotal * (this.REDEMPTION_CONFIG.MAX_DISCOUNT_PERCENT / 100);
    const finalDiscount = Math.min(discountAmount, maxDiscount);
    
    // Calcular puntos realmente utilizados
    const actualPointsUsed = Math.ceil(finalDiscount / this.REDEMPTION_CONFIG.POINTS_TO_PESOS);

    // Registrar redención
    await RewardPoint.redeemPoints(
      userId,
      actualPointsUsed,
      `Descuento aplicado: $${finalDiscount.toFixed(2)} MXN`
    );

    return {
      discount: finalDiscount,
      pointsUsed: actualPointsUsed
    };
  }

  /**
   * 📊 OBTENER ESTADÍSTICAS DE USUARIO
   */
  static async getUserRewardStats(userId: string) {
    const totalPoints = await RewardPoint.getUserTotalPoints(userId);
    const history = await RewardPoint.getUserPointsHistory(userId, 10);
    
    // Calcular estadísticas
    const pointsFromPurchases = await RewardPoint.aggregate([
      { $match: { userId, reason: 'compra' } },
      { $group: { _id: null, total: { $sum: '$points' } } }
    ]);
    
    const pointsFromReviews = await RewardPoint.aggregate([
      { $match: { userId, reason: 'reseña' } },
      { $group: { _id: null, total: { $sum: '$points' } } }
    ]);

    const pointsRedeemed = await RewardPoint.aggregate([
      { $match: { userId, reason: 'redención' } },
      { $group: { _id: null, total: { $sum: '$points' } } }
    ]);

    // Calcular nivel de lealtad
    const loyaltyLevel = this.calculateLoyaltyLevel(totalPoints);
    const maxDiscount = totalPoints * this.REDEMPTION_CONFIG.POINTS_TO_PESOS;

    return {
      totalPoints,
      pointsFromPurchases: pointsFromPurchases[0]?.total || 0,
      pointsFromReviews: pointsFromReviews[0]?.total || 0,
      pointsRedeemed: Math.abs(pointsRedeemed[0]?.total || 0),
      loyaltyLevel,
      maxDiscount: Math.round(maxDiscount * 100) / 100,
      recentHistory: history
    };
  }

  /**
   * 🏆 CALCULAR NIVEL DE LEALTAD
   */
  static calculateLoyaltyLevel(totalPoints: number): {
    level: string;
    name: string;
    emoji: string;
    nextLevelPoints?: number;
  } {
    if (totalPoints >= 500) {
      return { level: 'gold', name: 'Oro', emoji: '👑' };
    } else if (totalPoints >= 200) {
      return { 
        level: 'silver', 
        name: 'Plata', 
        emoji: '🥈',
        nextLevelPoints: 500 - totalPoints
      };
    } else if (totalPoints >= 50) {
      return { 
        level: 'bronze', 
        name: 'Bronce', 
        emoji: '🥉',
        nextLevelPoints: 200 - totalPoints
      };
    } else {
      return { 
        level: 'basic', 
        name: 'Básico', 
        emoji: '🌟',
        nextLevelPoints: 50 - totalPoints
      };
    }
  }

  /**
   * 👮‍♂️ ADMINISTRACIÓN: Agregar puntos manuales
   */
  static async addManualPoints(
    userId: string,
    points: number,
    description: string,
    adminId: string
  ): Promise<void> {
    await RewardPoint.create({
      userId,
      points,
      reason: 'manual',
      description: `[Admin ${adminId}] ${description}`
    });
  }

  /**
   * 👥 REFERIDOS: Verificar y otorgar puntos por referido
   */
  static async checkAndAwardReferralPoints(
    referredUserId: string, 
    orderId: string
  ): Promise<void> {
    try {
      // Verificar si es la primera orden del usuario referido
      const userOrders = await Order.countDocuments({
        customerId: referredUserId,
        status: 'delivered'
      });

      if (userOrders !== 1) {
        return; // No es la primera orden, no otorgar puntos de referido
      }

      // Completar el referido
      const referral = await Referral.completeReferral(referredUserId, orderId);
      
      if (!referral) {
        return; // No hay referido pendiente
      }

      // Verificar que no se hayan otorgado recompensas antes
      if (referral.rewardsClaimed) {
        return;
      }

      // Otorgar puntos al usuario que refirió (referrer)
      await RewardPoint.create({
        userId: referral.referrerId,
        points: this.POINTS_CONFIG.REFERRAL_POINTS,
        reason: 'referido',
        description: `Referido exitoso - Usuario invitado realizó su primera compra`
      });

      // Otorgar puntos al usuario referido
      await RewardPoint.create({
        userId: referral.referredUserId,
        points: this.POINTS_CONFIG.REFERRAL_POINTS,
        reason: 'referido',
        description: `Bienvenida por referido - Gracias por unirte a ToothPick`
      });

      // Marcar como recompensas otorgadas
      referral.rewardsClaimed = true;
      referral.rewardsClaimedAt = new Date();
      await referral.save();

      console.log(`✅ Puntos de referido otorgados: ${referral.referrerId} <- -> ${referral.referredUserId}`);

    } catch (error) {
      console.error('❌ Error otorgando puntos de referido:', error);
    }
  }

  /**
   * 👥 REFERIDOS: Crear nuevo referido
   */
  static async createReferral(
    referralCode: string,
    referredUserId: string
  ): Promise<void> {
    try {
      // Buscar al usuario que tiene este código de referido
      const referrer = await User.findByReferralCode(referralCode);
      
      if (!referrer) {
        throw new Error('Código de referido inválido');
      }

      if (referrer._id.toString() === referredUserId) {
        throw new Error('No puedes referirte a ti mismo');
      }

      // Crear el referido
      await Referral.createReferral(
        referrer._id.toString(),
        referredUserId,
        referralCode
      );

      console.log(`✅ Referido creado: ${referrer._id} -> ${referredUserId}`);

    } catch (error) {
      console.error('❌ Error creando referido:', error);
      throw error; // Re-lanzar para manejo en el registro
    }
  }

  /**
   * 👥 REFERIDOS: Obtener estadísticas de referidos de un usuario
   */
  static async getReferralStats(userId: string) {
    const stats = await Referral.getReferralStats(userId);
    const pendingReferrals = await Referral.getPendingReferrals(userId);
    
    // Obtener detalles de referidos completados
    const completedReferrals = await Referral.find({
      referrerId: userId,
      status: 'completed'
    })
    .populate('referredUserId', 'name email')
    .populate('firstOrderId', 'total createdAt')
    .sort({ rewardsClaimedAt: -1 })
    .limit(10);

    return {
      ...stats,
      pendingReferrals,
      recentCompletedReferrals: completedReferrals
    };
  }

  /**
   * 👥 REFERIDOS: Generar código de referido para usuario
   */
  static async ensureReferralCode(userId: string): Promise<string> {
    const user = await User.findById(userId);
    
    if (!user) {
      throw new Error('Usuario no encontrado');
    }

    if (user.referralCode) {
      return user.referralCode;
    }

    // Generar nuevo código
    return await User.generateReferralCode(userId);
  }
}

export default RewardService;
