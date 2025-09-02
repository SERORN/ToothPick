import mongoose from 'mongoose';
import {   // Conectar a la base de datos antes de cada operación
  private async ensureConnection() {
    await dbConnect()
  }t } from 'react-hot-toast';
import RewardItem, { IRewardItem } from '@/lib/models/RewardItem';
import RewardClaim, { IRewardClaim } from '@/lib/models/RewardClaim';
import dbConnect from '@/lib/db';

export interface RewardFilters {
  type?: string;
  role?: string;
  minCost?: number;
  maxCost?: number;
  available?: boolean;
  search?: string;
}

export interface ClaimRewardParams {
  userId: string;
  rewardId: string;
  userRole: string;
  currentPoints: number;
  metadata?: {
    shippingAddress?: any;
    contactInfo?: any;
    preferences?: any;
  };
}

export interface AdminRewardData {
  title: string;
  description: string;
  cost: number;
  type: string;
  category: string;
  imageUrl: string;
  availableFor: string[];
  quantity?: number;
  isActive?: boolean;
  expiresAt?: Date;
  metadata?: any;
}

class RewardStoreService {
  
  // Conectar a la base de datos antes de cada operación
  private async ensureConnection() {
    await connectToDatabase();
  }

  /**
   * Obtener recompensas disponibles con filtros
   */
  async getAvailableRewards(filters: RewardFilters = {}): Promise<IRewardItem[]> {
    await this.ensureConnection();

    let query: any = { isActive: true };

    // Filtrar por tipo
    if (filters.type) {
      query.type = filters.type;
    }

    // Filtrar por rol
    if (filters.role) {
      query.availableFor = { $in: [filters.role] };
    }

    // Filtrar por rango de costo
    if (filters.minCost !== undefined || filters.maxCost !== undefined) {
      query.cost = {};
      if (filters.minCost !== undefined) query.cost.$gte = filters.minCost;
      if (filters.maxCost !== undefined) query.cost.$lte = filters.maxCost;
    }

    // Filtrar por disponibilidad
    if (filters.available) {
      query.$or = [
        { quantity: { $gt: 0 } },
        { quantity: { $exists: false } }
      ];
    }

    // Filtrar por búsqueda
    if (filters.search) {
      query.$or = [
        { title: { $regex: filters.search, $options: 'i' } },
        { description: { $regex: filters.search, $options: 'i' } },
        { category: { $regex: filters.search, $options: 'i' } }
      ];
    }

    // Filtrar por expiración
    query.$or = [
      { expiresAt: { $exists: false } },
      { expiresAt: { $gt: new Date() } }
    ];

    return await RewardItem.find(query)
      .sort({ cost: 1, title: 1 })
      .exec();
  }

  /**
   * Obtener recompensas por categoría/tipo
   */
  async getRewardsByType(type: string, role?: string): Promise<IRewardItem[]> {
    return this.getAvailableRewards({ type, role, available: true });
  }

  /**
   * Obtener recompensas por rol de usuario
   */
  async getRewardsByRole(role: string): Promise<IRewardItem[]> {
    return this.getAvailableRewards({ role, available: true });
  }

  /**
   * Obtener una recompensa específica
   */
  async getRewardById(rewardId: string): Promise<IRewardItem | null> {
    await this.ensureConnection();
    return await RewardItem.findById(rewardId).exec();
  }

  /**
   * Validar si el usuario puede reclamar una recompensa
   */
  async canUserClaimReward(userId: string, rewardId: string, userRole: string, userPoints: number): Promise<{
    canClaim: boolean;
    reason?: string;
  }> {
    await this.ensureConnection();

    const reward = await RewardItem.findById(rewardId);
    if (!reward) {
      return { canClaim: false, reason: 'Recompensa no encontrada' };
    }

    // Verificar si la recompensa está activa
    if (!reward.isActive) {
      return { canClaim: false, reason: 'Recompensa no disponible' };
    }

    // Verificar si ha expirado
    if (reward.expiresAt && reward.expiresAt < new Date()) {
      return { canClaim: false, reason: 'Recompensa expirada' };
    }

    // Verificar si el usuario tiene el rol necesario
    if (!reward.availableFor.includes(userRole)) {
      return { canClaim: false, reason: 'No disponible para tu rol' };
    }

    // Verificar si hay cantidad disponible
    if (reward.quantity !== undefined && reward.quantity <= 0) {
      return { canClaim: false, reason: 'Sin stock disponible' };
    }

    // Verificar si el usuario tiene suficientes puntos
    if (userPoints < reward.cost) {
      return { canClaim: false, reason: `Necesitas ${reward.cost - userPoints} puntos más` };
    }

    // Verificar si el usuario ya reclamó esta recompensa recientemente
    const recentClaim = await RewardClaim.findOne({
      userId,
      rewardId,
      status: { $in: ['pending', 'approved'] },
      claimedAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } // Últimas 24 horas
    });

    if (recentClaim) {
      return { canClaim: false, reason: 'Ya reclamaste esta recompensa recientemente' };
    }

    return { canClaim: true };
  }

  /**
   * Reclamar una recompensa
   */
  async claimReward(params: ClaimRewardParams): Promise<{
    success: boolean;
    claim?: IRewardClaim;
    error?: string;
  }> {
    await this.ensureConnection();

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const { userId, rewardId, userRole, currentPoints, metadata } = params;

      // Validar si puede reclamar
      const validation = await this.canUserClaimReward(userId, rewardId, userRole, currentPoints);
      if (!validation.canClaim) {
        await session.abortTransaction();
        return { success: false, error: validation.reason };
      }

      // Obtener la recompensa
      const reward = await RewardItem.findById(rewardId).session(session);
      if (!reward) {
        await session.abortTransaction();
        return { success: false, error: 'Recompensa no encontrada' };
      }

      // Reducir cantidad si es limitada
      if (reward.quantity !== undefined) {
        reward.quantity -= 1;
        await reward.save({ session });
      }

      // Crear el claim
      const rewardClaim = new RewardClaim({
        userId,
        rewardId,
        rewardSnapshot: {
          title: reward.title,
          description: reward.description,
          cost: reward.cost,
          type: reward.type,
          imageUrl: reward.imageUrl
        },
        pointsDeducted: reward.cost,
        metadata: metadata || {},
        status: 'pending'
      });

      await rewardClaim.save({ session });

      // Generar código de tracking
      rewardClaim.trackingCode = rewardClaim.generateTrackingCode();
      await rewardClaim.save({ session });

      await session.commitTransaction();

      return { success: true, claim: rewardClaim };

    } catch (error) {
      await session.abortTransaction();
      console.error('Error claiming reward:', error);
      return { success: false, error: 'Error interno del servidor' };
    } finally {
      session.endSession();
    }
  }

  /**
   * Obtener claims del usuario
   */
  async getUserClaims(userId: string, options: {
    status?: string;
    limit?: number;
    page?: number;
  } = {}): Promise<{
    claims: IRewardClaim[];
    total: number;
    hasMore: boolean;
  }> {
    await this.ensureConnection();

    const { status, limit = 10, page = 1 } = options;
    const skip = (page - 1) * limit;

    let query: any = { userId };
    if (status) {
      query.status = status;
    }

    const [claims, total] = await Promise.all([
      RewardClaim.find(query)
        .populate('reward')
        .sort({ claimedAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      RewardClaim.countDocuments(query)
    ]);

    return {
      claims,
      total,
      hasMore: total > skip + claims.length
    };
  }

  /**
   * FUNCIONES DE ADMINISTRACIÓN
   */

  /**
   * Crear nueva recompensa (solo admin)
   */
  async createReward(data: AdminRewardData): Promise<IRewardItem> {
    await this.ensureConnection();

    const reward = new RewardItem({
      ...data,
      isActive: data.isActive ?? true,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    return await reward.save();
  }

  /**
   * Actualizar recompensa (solo admin)
   */
  async updateReward(rewardId: string, data: Partial<AdminRewardData>): Promise<IRewardItem | null> {
    await this.ensureConnection();

    return await RewardItem.findByIdAndUpdate(
      rewardId,
      { ...data, updatedAt: new Date() },
      { new: true }
    ).exec();
  }

  /**
   * Obtener todos los claims para administración
   */
  async getAllClaims(options: {
    status?: string;
    limit?: number;
    page?: number;
  } = {}): Promise<{
    claims: IRewardClaim[];
    total: number;
    hasMore: boolean;
  }> {
    await this.ensureConnection();

    const { status, limit = 20, page = 1 } = options;
    const skip = (page - 1) * limit;

    let query: any = {};
    if (status) {
      query.status = status;
    }

    const [claims, total] = await Promise.all([
      RewardClaim.find(query)
        .populate('reward')
        .sort({ claimedAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      RewardClaim.countDocuments(query)
    ]);

    return {
      claims,
      total,
      hasMore: total > skip + claims.length
    };
  }

  /**
   * Aprobar claim (solo admin)
   */
  async approveClaim(claimId: string, adminNotes?: string, trackingCode?: string): Promise<IRewardClaim | null> {
    await this.ensureConnection();

    const claim = await RewardClaim.findById(claimId);
    if (!claim) return null;

    return await claim.approve(adminNotes, trackingCode);
  }

  /**
   * Rechazar claim (solo admin)
   */
  async rejectClaim(claimId: string, reason: string): Promise<IRewardClaim | null> {
    await this.ensureConnection();

    const claim = await RewardClaim.findById(claimId);
    if (!claim) return null;

    return await claim.reject(reason);
  }

  /**
   * Marcar como entregado (solo admin)
   */
  async markClaimDelivered(claimId: string, deliveryNotes?: string): Promise<IRewardClaim | null> {
    await this.ensureConnection();

    const claim = await RewardClaim.findById(claimId);
    if (!claim) return null;

    return await claim.markDelivered(deliveryNotes);
  }

  /**
   * Obtener estadísticas del sistema de recompensas
   */
  async getRewardStats(): Promise<{
    totalRewards: number;
    activeRewards: number;
    totalClaims: number;
    pendingClaims: number;
    totalPointsRedeemed: number;
    popularRewards: Array<{
      rewardId: string;
      title: string;
      claimCount: number;
    }>;
  }> {
    await this.ensureConnection();

    const [
      totalRewards,
      activeRewards,
      claimStats,
      popularRewards
    ] = await Promise.all([
      RewardItem.countDocuments(),
      RewardItem.countDocuments({ isActive: true }),
      RewardClaim.getStats(),
      RewardClaim.aggregate([
        {
          $group: {
            _id: '$rewardId',
            claimCount: { $sum: 1 },
            title: { $first: '$rewardSnapshot.title' }
          }
        },
        { $sort: { claimCount: -1 } },
        { $limit: 5 }
      ])
    ]);

    return {
      totalRewards,
      activeRewards,
      totalClaims: claimStats.totalClaims,
      pendingClaims: claimStats.byStatus.find(s => s._id === 'pending')?.count || 0,
      totalPointsRedeemed: claimStats.byStatus.reduce((total, status) => total + (status.totalPoints || 0), 0),
      popularRewards: popularRewards.map(reward => ({
        rewardId: reward._id,
        title: reward.title,
        claimCount: reward.claimCount
      }))
    };
  }
}

// Singleton instance
export const rewardStoreService = new RewardStoreService();
export default rewardStoreService;
