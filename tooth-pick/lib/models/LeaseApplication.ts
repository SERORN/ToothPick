import mongoose, { Schema, Document } from 'mongoose';

export interface ILeaseApplication extends Document {
  userId: mongoose.Types.ObjectId;
  distributorId: mongoose.Types.ObjectId;
  productId: mongoose.Types.ObjectId;
  leaseType: 'leasing' | 'financing';
  months: 12 | 24 | 36;
  monthlyPayment: number;
  totalToPay: number;
  orderType: 'b2b' | 'b2c';
  leaseProvider: string;
  status: 'pending' | 'approved' | 'rejected';
  applicantInfo: {
    name: string;
    email: string;
    phone: string;
    company?: string;
  };
  adminComments?: string;
  approvedAt?: Date;
  rejectedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const LeaseApplicationSchema: Schema = new Schema<ILeaseApplication>(
  {
    userId: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'User', 
      required: true,
      index: true
    },
    distributorId: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'User', 
      required: true,
      index: true
    },
    productId: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'Product', 
      required: true,
      index: true
    },
    leaseType: { 
      type: String, 
      enum: ['leasing', 'financing'], 
      required: true 
    },
    months: { 
      type: Number, 
      enum: [12, 24, 36], 
      required: true 
    },
    monthlyPayment: { 
      type: Number, 
      required: true 
    },
    totalToPay: { 
      type: Number, 
      required: true 
    },
    orderType: { 
      type: String, 
      enum: ['b2b', 'b2c'], 
      required: true 
    },
    leaseProvider: { 
      type: String, 
      default: 'Pendiente de asignación' 
    },
    status: { 
      type: String, 
      enum: ['pending', 'approved', 'rejected'], 
      default: 'pending',
      index: true
    },
    applicantInfo: {
      name: { type: String, required: true },
      email: { type: String, required: true },
      phone: { type: String, required: true },
      company: { type: String }
    },
    adminComments: { type: String },
    approvedAt: { type: Date },
    rejectedAt: { type: Date }
  },
  { 
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Índices compuestos para mejor rendimiento
LeaseApplicationSchema.index({ status: 1, createdAt: -1 });
LeaseApplicationSchema.index({ userId: 1, status: 1 });
LeaseApplicationSchema.index({ distributorId: 1, status: 1 });

// Virtual para poblar información del producto
LeaseApplicationSchema.virtual('product', {
  ref: 'Product',
  localField: 'productId',
  foreignField: '_id',
  justOne: true
});

// Virtual para poblar información del usuario
LeaseApplicationSchema.virtual('user', {
  ref: 'User',
  localField: 'userId',
  foreignField: '_id',
  justOne: true
});

// Virtual para poblar información del distribuidor
LeaseApplicationSchema.virtual('distributor', {
  ref: 'User',
  localField: 'distributorId',
  foreignField: '_id',
  justOne: true
});

// Método para aprobar solicitud
LeaseApplicationSchema.methods.approve = function(leaseProvider: string, adminComments?: string) {
  this.status = 'approved';
  this.leaseProvider = leaseProvider;
  this.adminComments = adminComments;
  this.approvedAt = new Date();
  return this.save();
};

// Método para rechazar solicitud
LeaseApplicationSchema.methods.reject = function(adminComments: string) {
  this.status = 'rejected';
  this.adminComments = adminComments;
  this.rejectedAt = new Date();
  return this.save();
};

export default mongoose.models.LeaseApplication || 
  mongoose.model<ILeaseApplication>('LeaseApplication', LeaseApplicationSchema);
