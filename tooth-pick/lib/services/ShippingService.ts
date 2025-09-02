/**
 * 🚚 Servicio de Logística y Envío para ToothPick
 * Maneja cálculos de costo, estimaciones de tiempo y generación de tracking
 */

import ShippingOption from '@/lib/models/ShippingOption';

export interface ShippingEstimate {
  providerId: string;
  name: string;
  type: 'express' | 'standard' | 'milla';
  cost: number;
  originalCost: number;
  freeShipping: boolean;
  deliveryTime: string;
  deliveryDays: { min: number; max: number };
  features: string[];
  logoUrl?: string;
}

export interface ShippingCalculation {
  postalCode: string;
  orderTotal: number;
  weight: number;
  availableOptions: ShippingEstimate[];
  recommendedOption?: ShippingEstimate;
}

export class ShippingService {
  
  /**
   * Calcula opciones de envío disponibles para un código postal y orden
   */
  static async calculateShippingOptions(
    postalCode: string,
    orderTotal: number,
    weight: number = 1
  ): Promise<ShippingCalculation> {
    try {
      const shippingOptions = await ShippingOption.find({ active: true });
      
      const availableOptions: ShippingEstimate[] = shippingOptions
        .filter(option => option.coversZone(postalCode))
        .map(option => {
          const cost = option.calculateCost(orderTotal, weight);
          const freeShipping = option.freeShippingThreshold && orderTotal >= option.freeShippingThreshold;
          
          return {
            providerId: option._id.toString(),
            name: option.name,
            type: option.type,
            cost,
            originalCost: option.baseCost,
            freeShipping,
            deliveryTime: `${option.deliveryTimeMin}-${option.deliveryTimeMax} días`,
            deliveryDays: {
              min: option.deliveryTimeMin,
              max: option.deliveryTimeMax
            },
            features: option.features,
            logoUrl: option.logoUrl
          };
        })
        .sort((a, b) => {
          // Priorizar envío gratis, luego por costo, luego por velocidad
          if (a.freeShipping && !b.freeShipping) return -1;
          if (!a.freeShipping && b.freeShipping) return 1;
          if (a.cost !== b.cost) return a.cost - b.cost;
          return a.deliveryDays.min - b.deliveryDays.min;
        });

      // Recomendar la mejor opción (primera después del ordenamiento)
      const recommendedOption = availableOptions.length > 0 ? availableOptions[0] : undefined;

      return {
        postalCode,
        orderTotal,
        weight,
        availableOptions,
        recommendedOption
      };
    } catch (error) {
      console.error('Error calculating shipping options:', error);
      return {
        postalCode,
        orderTotal,
        weight,
        availableOptions: []
      };
    }
  }

  /**
   * Estima el costo de envío para un proveedor específico
   */
  static async estimateShippingCost(
    providerId: string,
    orderTotal: number,
    weight: number = 1
  ): Promise<number> {
    try {
      const provider = await ShippingOption.findById(providerId);
      if (!provider || !provider.active) {
        throw new Error('Proveedor de envío no disponible');
      }
      
      return provider.calculateCost(orderTotal, weight);
    } catch (error) {
      console.error('Error estimating shipping cost:', error);
      return 0;
    }
  }

  /**
   * Genera URL de tracking basada en el proveedor y número de guía
   */
  static async generateTrackingUrl(
    providerName: string,
    trackingNumber: string
  ): Promise<string | null> {
    try {
      const provider = await ShippingOption.findOne({ 
        name: { $regex: new RegExp(providerName, 'i') },
        active: true 
      });
      
      if (!provider || !provider.trackingUrlTemplate) {
        // URLs de tracking por defecto para proveedores conocidos
        const defaultUrls: Record<string, string> = {
          'dhl': 'https://www.dhl.com.mx/es/express/rastreo.html?AWB={trackingNumber}',
          'fedex': 'https://www.fedex.com/fedextrack/?trknbr={trackingNumber}',
          'estafeta': 'https://rastreo.estafeta.com/?guia={trackingNumber}',
          'ups': 'https://www.ups.com/track?tracknum={trackingNumber}',
          '99minutos': 'https://99minutos.com/tracking/{trackingNumber}',
          'correos': 'https://www.correosdemexico.gob.mx/SSLServicios/ConsultaCP/Rastreo.aspx?data={trackingNumber}'
        };
        
        const providerKey = providerName.toLowerCase();
        const template = Object.keys(defaultUrls).find(key => 
          providerKey.includes(key)
        );
        
        if (template) {
          return defaultUrls[template].replace('{trackingNumber}', trackingNumber);
        }
        
        return null;
      }
      
      return provider.trackingUrlTemplate.replace('{trackingNumber}', trackingNumber);
    } catch (error) {
      console.error('Error generating tracking URL:', error);
      return null;
    }
  }

  /**
   * Obtiene todas las opciones de envío activas
   */
  static async getActiveShippingProviders(): Promise<ShippingEstimate[]> {
    try {
      const providers = await ShippingOption.find({ active: true });
      
      return providers.map(provider => ({
        providerId: provider._id.toString(),
        name: provider.name,
        type: provider.type,
        cost: provider.baseCost,
        originalCost: provider.baseCost,
        freeShipping: false,
        deliveryTime: `${provider.deliveryTimeMin}-${provider.deliveryTimeMax} días`,
        deliveryDays: {
          min: provider.deliveryTimeMin,
          max: provider.deliveryTimeMax
        },
        features: provider.features,
        logoUrl: provider.logoUrl
      }));
    } catch (error) {
      console.error('Error getting shipping providers:', error);
      return [];
    }
  }

  /**
   * Calcula la fecha estimada de entrega
   */
  static calculateEstimatedDelivery(
    shippingDaysMin: number,
    shippingDaysMax: number,
    shippedDate?: Date
  ): { estimatedMin: Date; estimatedMax: Date } {
    const baseDate = shippedDate || new Date();
    
    const estimatedMin = new Date(baseDate);
    estimatedMin.setDate(baseDate.getDate() + shippingDaysMin);
    
    const estimatedMax = new Date(baseDate);
    estimatedMax.setDate(baseDate.getDate() + shippingDaysMax);
    
    return { estimatedMin, estimatedMax };
  }

  /**
   * Valida que un código postal sea válido para México
   */
  static validateMexicanPostalCode(postalCode: string): boolean {
    // Código postal mexicano: 5 dígitos
    const regex = /^[0-9]{5}$/;
    return regex.test(postalCode);
  }

  /**
   * Determina la zona de envío basada en código postal
   */
  static getShippingZone(postalCode: string): 'metropolitana' | 'foranea' | 'remota' {
    if (!this.validateMexicanPostalCode(postalCode)) {
      return 'remota';
    }

    const code = parseInt(postalCode);
    
    // Zona Metropolitana (CDMX y área metropolitana)
    if ((code >= 1000 && code <= 16999) || 
        (code >= 50000 && code <= 56999) || // Edo. México
        (code >= 54000 && code <= 54999)) { // Tlalnepantla, Naucalpan
      return 'metropolitana';
    }
    
    // Principales ciudades (zona foránea estándar)
    if ((code >= 20000 && code <= 20999) || // Aguascalientes
        (code >= 44100 && code <= 45999) || // Guadalajara
        (code >= 64000 && code <= 67999) || // Monterrey
        (code >= 72000 && code <= 72999) || // Puebla
        (code >= 76000 && code <= 76999)) { // Querétaro
      return 'foranea';
    }
    
    // Todo lo demás es zona remota
    return 'remota';
  }

  /**
   * Ajusta el costo de envío según la zona
   */
  static adjustCostByZone(baseCost: number, zone: 'metropolitana' | 'foranea' | 'remota'): number {
    const multipliers = {
      metropolitana: 1.0,
      foranea: 1.3,
      remota: 1.6
    };
    
    return Math.round(baseCost * multipliers[zone]);
  }
}
