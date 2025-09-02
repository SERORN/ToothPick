import mongoose, { Schema, Document } from 'mongoose';

export interface IReferral extends Document {
  referrerId: mongoose.Types.ObjectId;    // Usuario que hizo el referido
  referredUserId: mongoose.Types.ObjectId; // Usuario referido
  referralCode: string;                   // Código usado para el referido
  status: 'pending' | 'completed' | 'expired';
  rewardsClaimed: boolean;                // Si ambos ya recibieron recompensas
  firstOrderId?: mongoose.Types.ObjectId; // Primera orden del referido
  rewardsClaimedAt?: Date;               // Cuándo se otorgaron las recompensas
  createdAt: Date;
  updatedAt: Date;
}

// Métodos estáticos para operaciones comunes
export interface IReferralStatics {
  createReferral(referrerId: string, referredUserId: string, referralCode: string): Promise<IReferral>;
  completeReferral(referralId: string, orderId: string): Promise<IReferral>;
  getReferralStats(userId: string): Promise<any>;
  getPendingReferrals(userId: string): Promise<IReferral[]>;
}

const ReferralSchema: Schema = new Schema<IReferral>(
  {
    referrerId: { 
      type: Schema.Types.ObjectId, 
      ref: 'User', 
      required: true,
      index: true
    },
    referredUserId: { 
      type: Schema.Types.ObjectId, 
      ref: 'User', 
      required: true,
      index: true
    },
    referralCode: { 
      type: String, 
      required: true,
      uppercase: true
    },
    status: {
      type: String,
      enum: ['pending', 'completed', 'expired'],
      default: 'pending'
    },
    rewardsClaimed: { 
      type: Boolean, 
      default: false 
    },
    firstOrderId: { 
      type: Schema.Types.ObjectId, 
      ref: 'Order',
      sparse: true
    },
    rewardsClaimedAt: { 
      type: Date,
      sparse: true
    }
  },
  { 
    timestamps: true,
    // Índices para optimizar consultas
    indexes: [
      { referrerId: 1, createdAt: -1 },
      { referredUserId: 1 },
      { referralCode: 1 },
      { status: 1 }
    ]
  }
);

// Evitar referidos duplicados
ReferralSchema.index(
  { referrerId: 1, referredUserId: 1 }, 
  { unique: true }
);

// **MÉTODO ESTÁTICO: Crear referido**
ReferralSchema.statics.createReferral = async function(
  referrerId: string, 
  referredUserId: string, 
  referralCode: string
): Promise<IReferral> {
  
  // Verificar que no se autorrefiera
  if (referrerId === referredUserId) {
    throw new Error('No puedes referirte a ti mismo');
  }

  // Verificar que no exista ya un referido entre estos usuarios
  const existingReferral = await this.findOne({
    referrerId: new mongoose.Types.ObjectId(referrerId),
    referredUserId: new mongoose.Types.ObjectId(referredUserId)
  });

  if (existingReferral) {
    throw new Error('Este usuario ya fue referido por ti');
  }

  return await this.create({
    referrerId: new mongoose.Types.ObjectId(referrerId),
    referredUserId: new mongoose.Types.ObjectId(referredUserId),
    referralCode: referralCode.toUpperCase()
  });
};

// **MÉTODO ESTÁTICO: Completar referido cuando se hace primera compra**
ReferralSchema.statics.completeReferral = async function(
  referredUserId: string, 
  orderId: string
): Promise<IReferral | null> {
  
  const referral = await this.findOne({
    referredUserId: new mongoose.Types.ObjectId(referredUserId),
    status: 'pending'
  });

  if (!referral) {
    return null; // No hay referido pendiente
  }

  // Actualizar a completado
  referral.status = 'completed';
  referral.firstOrderId = new mongoose.Types.ObjectId(orderId);
  await referral.save();

  return referral;
};

// **MÉTODO ESTÁTICO: Obtener estadísticas de referidos**
ReferralSchema.statics.getReferralStats = async function(userId: string) {
  const totalReferrals = await this.countDocuments({
    referrerId: new mongoose.Types.ObjectId(userId)
  });

  const completedReferrals = await this.countDocuments({
    referrerId: new mongoose.Types.ObjectId(userId),
    status: 'completed'
  });

  const pendingReferrals = await this.countDocuments({
    referrerId: new mongoose.Types.ObjectId(userId),
    status: 'pending'
  });

  const totalRewardsClaimed = await this.countDocuments({
    referrerId: new mongoose.Types.ObjectId(userId),
    rewardsClaimed: true
  });

  return {
    totalReferrals,
    completedReferrals,
    pendingReferrals,
    totalRewardsClaimed,
    successRate: totalReferrals > 0 ? (completedReferrals / totalReferrals) * 100 : 0
  };
};

// **MÉTODO ESTÁTICO: Obtener referidos pendientes**
ReferralSchema.statics.getPendingReferrals = async function(userId: string): Promise<IReferral[]> {
  return await this.find({
    referrerId: new mongoose.Types.ObjectId(userId),
    status: 'pending'
  })
  .populate('referredUserId', 'name email createdAt')
  .sort({ createdAt: -1 });
};

export default mongoose.models.Referral || 
  mongoose.model<IReferral, mongoose.Model<IReferral> & IReferralStatics>('Referral', ReferralSchema);
