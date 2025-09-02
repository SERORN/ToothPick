import mongoose, { Schema, Document } from 'mongoose';

export interface IShippingOption extends Document {
  name: string;
  type: 'express' | 'standard' | 'milla';
  description: string;
  contactEmail: string;
  websiteUrl: string;
  trackingUrlTemplate: string;
  logoUrl?: string;
  baseCost: number;
  freeShippingThreshold?: number;
  deliveryTimeMin: number; // días mínimos
  deliveryTimeMax: number; // días máximos
  weightLimitKg?: number;
  active: boolean;
  coverageZones: string[]; // códigos postales o estados que cubre
  features: string[]; // ej: ["Seguro incluido", "Entrega en sábado", "Tracking"]
  createdAt: Date;
  updatedAt: Date;
}

const ShippingOptionSchema: Schema = new Schema<IShippingOption>(
  {
    name: { 
      type: String, 
      required: true,
      unique: true 
    },
    type: { 
      type: String, 
      enum: ['express', 'standard', 'milla'], 
      default: 'standard' 
    },
    description: {
      type: String,
      required: true
    },
    contactEmail: { 
      type: String, 
      required: true 
    },
    websiteUrl: { 
      type: String, 
      required: true 
    },
    trackingUrlTemplate: { 
      type: String, 
      required: true 
    },
    logoUrl: { 
      type: String 
    },
    baseCost: { 
      type: Number, 
      required: true, 
      min: 0 
    },
    freeShippingThreshold: { 
      type: Number, 
      min: 0 
    },
    deliveryTimeMin: { 
      type: Number, 
      required: true, 
      min: 1 
    },
    deliveryTimeMax: { 
      type: Number, 
      required: true, 
      min: 1 
    },
    weightLimitKg: { 
      type: Number, 
      min: 0 
    },
    active: { 
      type: Boolean, 
      default: true 
    },
    coverageZones: [{ 
      type: String 
    }],
    features: [{ 
      type: String 
    }]
  },
  { 
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Índices para mejor rendimiento
ShippingOptionSchema.index({ active: 1, type: 1 });
ShippingOptionSchema.index({ name: 1 });

// Virtual para generar URL de tracking
ShippingOptionSchema.virtual('generateTrackingUrl').get(function() {
  return (trackingNumber: string) => {
    return this.trackingUrlTemplate.replace('{trackingNumber}', trackingNumber);
  };
});

// Método para verificar si cubre una zona
ShippingOptionSchema.methods.coversZone = function(postalCode: string): boolean {
  if (!this.coverageZones || this.coverageZones.length === 0) {
    return true; // Sin restricciones significa cobertura nacional
  }
  
  // Verificar si el código postal o estado está en las zonas de cobertura
  return this.coverageZones.some(zone => 
    postalCode.startsWith(zone) || zone === 'nacional'
  );
};

// Método para calcular costo estimado
ShippingOptionSchema.methods.calculateCost = function(
  orderTotal: number, 
  weight: number = 1
): number {
  // Envío gratis si supera el umbral
  if (this.freeShippingThreshold && orderTotal >= this.freeShippingThreshold) {
    return 0;
  }
  
  // Costo base + ajuste por peso
  let cost = this.baseCost;
  
  if (weight > 1) {
    cost += (weight - 1) * 50; // $50 MXN por kg adicional
  }
  
  // Ajuste por tipo de servicio
  switch (this.type) {
    case 'express':
      cost *= 1.5;
      break;
    case 'milla':
      cost *= 0.8;
      break;
    default:
      // standard mantiene costo base
      break;
  }
  
  return Math.round(cost);
};

// Método estático para obtener opciones disponibles por zona
ShippingOptionSchema.statics.getAvailableOptions = async function(
  postalCode: string, 
  orderTotal: number = 0
) {
  const options = await this.find({ active: true });
  
  return options.filter(option => option.coversZone(postalCode))
    .map(option => ({
      _id: option._id,
      name: option.name,
      type: option.type,
      description: option.description,
      logoUrl: option.logoUrl,
      cost: option.calculateCost(orderTotal),
      deliveryTime: `${option.deliveryTimeMin}-${option.deliveryTimeMax} días`,
      features: option.features,
      freeShipping: option.freeShippingThreshold && orderTotal >= option.freeShippingThreshold
    }));
};

export default mongoose.models.ShippingOption || 
  mongoose.model<IShippingOption>('ShippingOption', ShippingOptionSchema);
