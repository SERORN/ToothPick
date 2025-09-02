import mongoose, { Schema, models, model } from 'mongoose';

const ProductSchema = new Schema(
  {
    name: { type: String, required: true },
    brand: { type: String, required: true },
    category: { type: String, required: true },
    description: { type: String },
    price: { type: Number, required: true },
    currency: { type: String, enum: ['MXN', 'USD'], default: 'MXN' },
    stock: { type: Number, required: true },
    images: [{ type: String }],
    
    // 🏭 PROVEEDOR (quien fabrica/suministra)
    providerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    
    // 🏪 DISTRIBUIDOR (quien vende al cliente final en B2C)
    // Opcional: si está vacío, solo disponible para B2B
    distributorId: { type: Schema.Types.ObjectId, ref: 'User', sparse: true },
    
    isActive: { type: Boolean, default: true },
    createdAt: { type: Date, default: Date.now }
  },
  { timestamps: true }
);

// 📊 CAMPOS VIRTUALES PARA RESEÑAS
ProductSchema.virtual('reviewStats', {
  ref: 'Review',
  localField: '_id',
  foreignField: 'productId',
  justOne: false
});

// 🔍 MÉTODO PARA OBTENER ESTADÍSTICAS DE RESEÑAS
ProductSchema.methods.getReviewStats = async function() {
  const Review = require('./Review').default;
  return await Review.getProductStats(this._id);
};

// Asegurar que los virtuals se incluyan cuando se convierta a JSON
ProductSchema.set('toJSON', { virtuals: true });
ProductSchema.set('toObject', { virtuals: true });

export default models.Product || model('Product', ProductSchema);
