import mongoose, { Schema, Document } from 'mongoose';

export interface IDentistProduct extends Document {
  name: string;
  description: string;
  price: number;
  image?: string;
  images?: string[];
  stock: number;
  category: string;
  visible: boolean;
  tags: string[];
  owner: mongoose.Types.ObjectId; // ID del dentista
  type: 'kit' | 'servicio' | 'producto' | 'tratamiento';
  active: boolean;
  
  // Campos de envío
  shippingAvailable: boolean;
  shippingCost?: number;
  pickupOnly: boolean;
  
  // Campos de branding y personalización
  customMessage?: string;
  features?: string[];
  duration?: number; // Para servicios (en minutos)
  
  // Métricas de ventas
  totalSold: number;
  totalRevenue: number;
  
  createdAt: Date;
  updatedAt: Date;
}

const DentistProductSchema: Schema = new Schema<IDentistProduct>(
  {
    name: {
      type: String,
      required: true,
      maxlength: 100
    },
    description: {
      type: String,
      required: true,
      maxlength: 1000
    },
    price: {
      type: Number,
      required: true,
      min: 0
    },
    image: {
      type: String
    },
    images: [{
      type: String
    }],
    stock: {
      type: Number,
      required: true,
      min: 0,
      default: 0
    },
    category: {
      type: String,
      required: true,
      enum: [
        'higiene-oral',
        'blanqueamiento',
        'ortodoncia',
        'protesis',
        'cirugia',
        'endodoncia',
        'periodoncia',
        'estetica',
        'prevencion',
        'kits-dentales',
        'productos-profesionales',
        'otros'
      ]
    },
    visible: {
      type: Boolean,
      default: true
    },
    tags: [{
      type: String,
      maxlength: 30
    }],
    owner: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    type: {
      type: String,
      enum: ['kit', 'servicio', 'producto', 'tratamiento'],
      required: true
    },
    active: {
      type: Boolean,
      default: true
    },
    shippingAvailable: {
      type: Boolean,
      default: true
    },
    shippingCost: {
      type: Number,
      min: 0
    },
    pickupOnly: {
      type: Boolean,
      default: false
    },
    customMessage: {
      type: String,
      maxlength: 500
    },
    features: [{
      type: String,
      maxlength: 100
    }],
    duration: {
      type: Number, // en minutos
      min: 15
    },
    totalSold: {
      type: Number,
      default: 0,
      min: 0
    },
    totalRevenue: {
      type: Number,
      default: 0,
      min: 0
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Índices para optimización
DentistProductSchema.index({ owner: 1, active: 1 });
DentistProductSchema.index({ category: 1, visible: 1 });
DentistProductSchema.index({ tags: 1 });
DentistProductSchema.index({ type: 1, active: 1 });
DentistProductSchema.index({ name: 'text', description: 'text', tags: 'text' });

// Virtual para el dentista propietario
DentistProductSchema.virtual('dentist', {
  ref: 'User',
  localField: 'owner',
  foreignField: '_id',
  justOne: true
});

// Métodos del esquema
DentistProductSchema.methods.updateSales = function(quantity: number, revenue: number) {
  this.totalSold += quantity;
  this.totalRevenue += revenue;
  if (this.type !== 'servicio') {
    this.stock = Math.max(0, this.stock - quantity);
  }
  return this.save();
};

DentistProductSchema.methods.isAvailable = function(): boolean {
  return this.active && this.visible && (this.type === 'servicio' || this.stock > 0);
};

DentistProductSchema.methods.canBePurchased = function(quantity: number = 1): boolean {
  if (!this.isAvailable()) return false;
  if (this.type === 'servicio') return true;
  return this.stock >= quantity;
};

// Métodos estáticos
DentistProductSchema.statics.getByDentist = async function(
  dentistId: string,
  filters: any = {}
) {
  const query = { owner: dentistId, ...filters };
  return this.find(query)
    .populate('dentist', 'name clinicName profilePicture')
    .sort({ createdAt: -1 });
};

DentistProductSchema.statics.getPublicProducts = async function(
  dentistId?: string,
  category?: string,
  limit: number = 20
) {
  const query: any = {
    active: true,
    visible: true,
    $or: [
      { type: { $ne: 'servicio' }, stock: { $gt: 0 } },
      { type: 'servicio' }
    ]
  };

  if (dentistId) {
    query.owner = dentistId;
  }

  if (category) {
    query.category = category;
  }

  return this.find(query)
    .populate('dentist', 'name clinicName profilePicture city state')
    .sort({ totalSold: -1, createdAt: -1 })
    .limit(limit);
};

DentistProductSchema.statics.searchProducts = async function(
  searchTerm: string,
  filters: any = {},
  limit: number = 20
) {
  const query = {
    $text: { $search: searchTerm },
    active: true,
    visible: true,
    ...filters
  };

  return this.find(query, { score: { $meta: 'textScore' } })
    .populate('dentist', 'name clinicName profilePicture city state')
    .sort({ score: { $meta: 'textScore' }, totalSold: -1 })
    .limit(limit);
};

DentistProductSchema.statics.getTopSellingProducts = async function(
  dentistId?: string,
  limit: number = 10
) {
  const query: any = { active: true, visible: true, totalSold: { $gt: 0 } };
  if (dentistId) {
    query.owner = dentistId;
  }

  return this.find(query)
    .populate('dentist', 'name clinicName profilePicture')
    .sort({ totalSold: -1, totalRevenue: -1 })
    .limit(limit);
};

DentistProductSchema.statics.getDentistStats = async function(dentistId: string) {
  const stats = await this.aggregate([
    { $match: { owner: new mongoose.Types.ObjectId(dentistId) } },
    {
      $group: {
        _id: null,
        totalProducts: { $sum: 1 },
        activeProducts: {
          $sum: { $cond: [{ $and: ['$active', '$visible'] }, 1, 0] }
        },
        totalSold: { $sum: '$totalSold' },
        totalRevenue: { $sum: '$totalRevenue' },
        avgPrice: { $avg: '$price' }
      }
    }
  ]);

  return stats[0] || {
    totalProducts: 0,
    activeProducts: 0,
    totalSold: 0,
    totalRevenue: 0,
    avgPrice: 0
  };
};

export default mongoose.models.DentistProduct || 
  mongoose.model<IDentistProduct>('DentistProduct', DentistProductSchema);
