import mongoose, { Schema, models, model } from 'mongoose';

const OrderItemSchema = new Schema({
  productId: { type: Schema.Types.ObjectId, required: true },
  name: { type: String, required: true },
  brand: { type: String, required: true },
  price: { type: Number, required: true },
  quantity: { type: Number, required: true },
  subtotal: { type: Number, required: true }, // price * quantity
  currency: { type: String, required: true },
  image: { type: String },
  provider: {
    id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true }
  },
  // Nuevos campos para productos de dentistas
  productType: {
    type: String,
    enum: ['marketplace', 'dentist_product'],
    default: 'marketplace'
  },
  dentistProductRef: { type: Schema.Types.ObjectId, ref: 'DentistProduct' },
  isDentistService: { type: Boolean, default: false },
  serviceDuration: { type: Number }, // en minutos para servicios
  appointmentRequired: { type: Boolean, default: false }
});

const ShippingInfoSchema = new Schema({
  fullName: { type: String, required: true },
  company: { type: String },
  address: { type: String, required: true },
  city: { type: String, required: true },
  state: { type: String, required: true },
  zipCode: { type: String, required: true },
  phone: { type: String, required: true },
  email: { type: String, required: true },
  notes: { type: String }
});

const OrderSchema = new Schema(
  {
    orderNumber: { 
      type: String, 
      unique: true,
      default: function() {
        return 'TP-' + Date.now() + '-' + Math.floor(Math.random() * 1000);
      }
    },
    // Comprador (distribuidor) y vendedor (proveedor)
    buyerId: { type: Schema.Types.ObjectId, ref: 'User', required: true }, // distribuidor
    sellerId: { type: Schema.Types.ObjectId, ref: 'User', required: true }, // proveedor principal
    
    items: [OrderItemSchema],
    shipping: ShippingInfoSchema,
    
    // Cálculos financieros
    subtotal: { type: Number, required: true }, // suma de todos los items
    platformFee: { type: Number, required: true }, // 5.5% B2B o 8.5% B2C para ToothPick
    total: { type: Number, required: true }, // subtotal + platformFee
    currency: { type: String, enum: ['MXN', 'USD'], default: 'MXN' },
    
    // Tipo de orden para aplicar comisión correcta
    orderType: { 
      type: String, 
      enum: ['b2b', 'b2c', 'dentist_marketplace'], 
      default: 'b2b' // Por defecto B2B (distribuidor comprando a proveedor)
    },
    
    // Estados y tracking
    status: { 
      type: String, 
      enum: ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'], 
      default: 'pending' 
    },
    paymentStatus: {
      type: String,
      enum: ['pending', 'paid', 'refunded'],
      default: 'pending'
    },
    
    // 📦 SISTEMA DE LOGÍSTICA Y ENVÍO AVANZADO
    shippingMethod: {
      type: String,
      enum: ['pickup', 'delivery'],
      default: 'delivery'
    },
    shippingProvider: { 
      type: String,
      sparse: true 
    },
    shippingCost: {
      type: Number,
      default: 0
    },
    trackingNumber: { type: String, sparse: true },
    trackingUrl: { type: String, sparse: true },
    
    // Información de recolección en sucursal
    pickupLocation: {
      address: { type: String },
      contact: { type: String },
      phone: { type: String },
      businessHours: { type: String },
      instructions: { type: String }
    },
    
    // 📅 FECHAS Y TIMESTAMPS DEL PROCESO
    confirmedAt: { type: Date }, // Cuando el proveedor confirma
    processingAt: { type: Date }, // Cuando inicia preparación
    shippedAt: { type: Date }, // Cuando se envía
    deliveredAt: { type: Date }, // Cuando se entrega
    cancelledAt: { type: Date }, // Si se cancela
    
    estimatedDelivery: { type: Date },
    actualDelivery: { type: Date }, // Fecha real de entrega
    cancelReason: { type: String },
    
    // 💳 STRIPE CONNECT FIELDS
    paymentIntentId: { type: String, sparse: true }, // ID del Payment Intent
    stripeAccountId: { type: String, sparse: true }, // Cuenta Stripe del proveedor
    clientSecret: { type: String, sparse: true }, // Para confirmar pago en frontend
    
    // Notas adicionales
    notes: { type: String },
    providerNotes: { type: String }, // notas del proveedor
    internalNotes: { type: String }, // notas internas del tracking
  },
  { timestamps: true }
);

// Índices para mejorar performance
OrderSchema.index({ buyerId: 1, createdAt: -1 });
OrderSchema.index({ sellerId: 1, createdAt: -1 });
OrderSchema.index({ orderNumber: 1 });
OrderSchema.index({ status: 1 });

export default models.Order || model('Order', OrderSchema);
