import mongoose, { Schema, Document } from 'mongoose';

export interface IRewardPoint extends Document {
  userId: mongoose.Types.ObjectId;
  orderId?: mongoose.Types.ObjectId;
  reviewId?: mongoose.Types.ObjectId;
  points: number; // Positivo para ganar, negativo para redimir
  reason: 'compra' | 'reseña' | 'bienvenida' | 'redención' | 'manual' | 'referido';
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Métodos estáticos para operaciones comunes
export interface IRewardPointStatics {
  getUserTotalPoints(userId: string): Promise<number>;
  addPointsForPurchase(userId: string, orderId: string, orderAmount: number): Promise<IRewardPoint>;
  addPointsForReview(userId: string, reviewId: string): Promise<IRewardPoint>;
  redeemPoints(userId: string, pointsToRedeem: number, description: string): Promise<IRewardPoint>;
  getUserPointsHistory(userId: string, limit?: number): Promise<IRewardPoint[]>;
}

const RewardPointSchema: Schema = new Schema<IRewardPoint>(
  {
    userId: { 
      type: Schema.Types.ObjectId, 
      ref: 'User', 
      required: true,
      index: true
    },
    orderId: { 
      type: Schema.Types.ObjectId, 
      ref: 'Order',
      sparse: true
    },
    reviewId: { 
      type: Schema.Types.ObjectId, 
      ref: 'Review',
      sparse: true
    },
    points: { 
      type: Number, 
      required: true 
    },
    reason: {
      type: String,
      enum: ['compra', 'reseña', 'bienvenida', 'redención', 'manual', 'referido'],
      required: true
    },
    description: { 
      type: String,
      maxlength: 200
    }
  },
  { 
    timestamps: true,
    // Índices para optimizar consultas
    indexes: [
      { userId: 1, createdAt: -1 },
      { userId: 1, reason: 1 }
    ]
  }
);

// **MÉTODO ESTÁTICO: Obtener puntos totales de un usuario**
RewardPointSchema.statics.getUserTotalPoints = async function(userId: string): Promise<number> {
  const result = await this.aggregate([
    { $match: { userId: new mongoose.Types.ObjectId(userId) } },
    { $group: { _id: null, totalPoints: { $sum: '$points' } } }
  ]);
  
  return result.length > 0 ? result[0].totalPoints : 0;
};

// **MÉTODO ESTÁTICO: Agregar puntos por compra**
RewardPointSchema.statics.addPointsForPurchase = async function(
  userId: string, 
  orderId: string, 
  orderAmount: number
): Promise<IRewardPoint> {
  // 1 punto por cada $100 MXN gastado
  const pointsToAward = Math.floor(orderAmount / 100);
  
  if (pointsToAward <= 0) {
    throw new Error('Monto insuficiente para otorgar puntos');
  }

  // Verificar que no existan puntos ya otorgados para esta orden
  const existingPoints = await this.findOne({ orderId: new mongoose.Types.ObjectId(orderId) });
  if (existingPoints) {
    throw new Error('Puntos ya otorgados para esta orden');
  }

  return await this.create({
    userId: new mongoose.Types.ObjectId(userId),
    orderId: new mongoose.Types.ObjectId(orderId),
    points: pointsToAward,
    reason: 'compra',
    description: `Compra completada - $${orderAmount} MXN`
  });
};

// **MÉTODO ESTÁTICO: Agregar puntos por reseña**
RewardPointSchema.statics.addPointsForReview = async function(
  userId: string, 
  reviewId: string
): Promise<IRewardPoint> {
  const pointsToAward = 5; // 5 puntos por reseña aprobada

  // Verificar que no existan puntos ya otorgados para esta reseña
  const existingPoints = await this.findOne({ reviewId: new mongoose.Types.ObjectId(reviewId) });
  if (existingPoints) {
    throw new Error('Puntos ya otorgados para esta reseña');
  }

  return await this.create({
    userId: new mongoose.Types.ObjectId(userId),
    reviewId: new mongoose.Types.ObjectId(reviewId),
    points: pointsToAward,
    reason: 'reseña',
    description: `Reseña aprobada - ${pointsToAward} puntos`
  });
};

// **MÉTODO ESTÁTICO: Redimir puntos**
RewardPointSchema.statics.redeemPoints = async function(
  userId: string, 
  pointsToRedeem: number, 
  description: string
): Promise<IRewardPoint> {
  if (pointsToRedeem <= 0) {
    throw new Error('Los puntos a redimir deben ser positivos');
  }

  // Verificar que el usuario tenga puntos suficientes
  const currentPoints = await this.getUserTotalPoints(userId);
  if (currentPoints < pointsToRedeem) {
    throw new Error(`Puntos insuficientes. Tienes ${currentPoints}, necesitas ${pointsToRedeem}`);
  }

  return await this.create({
    userId: new mongoose.Types.ObjectId(userId),
    points: -pointsToRedeem, // Negativo para redención
    reason: 'redención',
    description: description || `Redención de ${pointsToRedeem} puntos`
  });
};

// **MÉTODO ESTÁTICO: Obtener historial de puntos**
RewardPointSchema.statics.getUserPointsHistory = async function(
  userId: string, 
  limit: number = 50
): Promise<IRewardPoint[]> {
  return await this.find({ userId: new mongoose.Types.ObjectId(userId) })
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate('orderId', 'total status')
    .populate('reviewId', 'rating productId')
    .exec();
};

export default mongoose.models.RewardPoint || 
  mongoose.model<IRewardPoint, mongoose.Model<IRewardPoint> & IRewardPointStatics>('RewardPoint', RewardPointSchema);
