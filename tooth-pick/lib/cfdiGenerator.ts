import { v4 as uuidv4 } from 'uuid';
import { format } from 'date-fns';

// Configuraciones CFDI por tipo de servicio
export const CFDI_CONFIGS = {
  // Suscripciones SaaS
  saas: {
    productCode: '81112500', // Servicios de acceso a software
    unitCode: 'E48', // Unidad de servicio
    usoCfdi: 'G03', // Gastos en general
    regimenFiscal: '612' // Persona física con actividades empresariales
  },
  
  // Tratamientos dentales
  tratamiento: {
    productCode: '86121600', // Servicios de salud dental
    unitCode: 'E48', // Unidad de servicio
    usoCfdi: 'G03', // Gastos en general
    regimenFiscal: '612'
  },
  
  // Marketplace (insumos)
  marketplace: {
    productCode: '42131600', // Equipos dentales
    unitCode: 'H87', // Pieza
    usoCfdi: 'G03',
    regimenFiscal: '612'
  },
  
  // ToothPay (procesamiento de pagos)
  toothpay: {
    productCode: '81141700', // Servicios de procesamiento de transacciones
    unitCode: 'E48',
    usoCfdi: 'G03',
    regimenFiscal: '612'
  }
};

// Configuración del emisor (ToothPick)
export const TOOTHPICK_EMISOR = {
  rfc: process.env.TOOTHPICK_RFC || 'XAXX010101000',
  name: process.env.TOOTHPICK_RAZON_SOCIAL || 'ToothPick Technologies S.A. de C.V.',
  zipCode: process.env.TOOTHPICK_CP || '64000',
  regimenFiscal: '601' // General de Ley Personas Morales
};

// Tipos TypeScript para CFDI
export interface CFDIReceiver {
  rfc: string;
  name: string;
  email?: string;
  zipCode: string;
  usoCfdi?: string;
  regimenFiscal?: string;
}

export interface CFDIItem {
  description: string;
  quantity: number;
  unitPrice: number;
  productCode?: string;
  unitCode?: string;
  unit?: string;
  discountRate?: number;
  taxRate?: number;
}

export interface CFDIData {
  type: 'saas' | 'tratamiento' | 'marketplace' | 'toothpay';
  receiver: CFDIReceiver;
  items: CFDIItem[];
  paymentForm?: string; // 03 = Transferencia, 04 = Tarjeta de crédito
  paymentMethod?: string; // PUE = Pago en una exhibición
  observations?: string;
  relatedEntityId?: string;
  relatedEntityType?: string;
}

/**
 * Genera el cuerpo del CFDI para Facturama
 */
export class CFDIGenerator {
  
  /**
   * Genera CFDI para suscripción SaaS
   */
  static generateSaaSCFDI(
    clinic: { rfc: string; nombreFiscal: string; email?: string; cpFiscal: string },
    plan: { nombre: string; precio: number; descripcion?: string },
    relatedSubscriptionId?: string
  ) {
    const config = CFDI_CONFIGS.saas;
    const subtotal = plan.precio / 1.16; // Sin IVA
    const iva = subtotal * 0.16;
    
    return this.generateCFDI({
      type: 'saas',
      receiver: {
        rfc: clinic.rfc,
        name: clinic.nombreFiscal,
        email: clinic.email,
        zipCode: clinic.cpFiscal,
        usoCfdi: config.usoCfdi,
        regimenFiscal: config.regimenFiscal
      },
      items: [{
        description: `Suscripción ToothPick - Plan ${plan.nombre}${plan.descripcion ? ` - ${plan.descripcion}` : ''}`,
        quantity: 1,
        unitPrice: subtotal,
        productCode: config.productCode,
        unitCode: config.unitCode,
        unit: 'Servicio',
        taxRate: 0.16
      }],
      paymentForm: '03', // Transferencia electrónica
      paymentMethod: 'PUE',
      observations: `Suscripción mensual ToothPick. Plan: ${plan.nombre}`,
      relatedEntityId: relatedSubscriptionId,
      relatedEntityType: 'subscription'
    });
  }
  
  /**
   * Genera CFDI para tratamiento dental
   */
  static generateTreatmentCFDI(
    patient: { rfc: string; nombre: string; email?: string; cpFiscal: string },
    treatment: { descripcion: string; costo: number },
    clinic: { nombre: string },
    appointmentId?: string
  ) {
    const config = CFDI_CONFIGS.tratamiento;
    const subtotal = treatment.costo / 1.16;
    const iva = subtotal * 0.16;
    
    return this.generateCFDI({
      type: 'tratamiento',
      receiver: {
        rfc: patient.rfc,
        name: patient.nombre,
        email: patient.email,
        zipCode: patient.cpFiscal,
        usoCfdi: config.usoCfdi,
        regimenFiscal: config.regimenFiscal
      },
      items: [{
        description: `Servicio odontológico: ${treatment.descripcion} - ${clinic.nombre}`,
        quantity: 1,
        unitPrice: subtotal,
        productCode: config.productCode,
        unitCode: config.unitCode,
        unit: 'Servicio',
        taxRate: 0.16
      }],
      paymentForm: '04', // Tarjeta de crédito/débito
      paymentMethod: 'PUE',
      observations: `Tratamiento dental realizado en ${clinic.nombre}`,
      relatedEntityId: appointmentId,
      relatedEntityType: 'appointment'
    });
  }
  
  /**
   * Genera CFDI para venta en marketplace
   */
  static generateMarketplaceCFDI(
    buyer: { rfc: string; nombre: string; email?: string; cpFiscal: string },
    products: { nombre: string; cantidad: number; precio: number }[],
    orderId?: string
  ) {
    const config = CFDI_CONFIGS.marketplace;
    
    const items = products.map(product => {
      const subtotal = (product.precio * product.cantidad) / 1.16;
      return {
        description: product.nombre,
        quantity: product.cantidad,
        unitPrice: product.precio / 1.16,
        productCode: config.productCode,
        unitCode: config.unitCode,
        unit: 'Pieza',
        taxRate: 0.16
      };
    });
    
    return this.generateCFDI({
      type: 'marketplace',
      receiver: {
        rfc: buyer.rfc,
        name: buyer.nombre,
        email: buyer.email,
        zipCode: buyer.cpFiscal,
        usoCfdi: config.usoCfdi,
        regimenFiscal: config.regimenFiscal
      },
      items,
      paymentForm: '04',
      paymentMethod: 'PUE',
      observations: 'Compra en ToothPick Marketplace',
      relatedEntityId: orderId,
      relatedEntityType: 'order'
    });
  }
  
  /**
   * Genera el cuerpo base del CFDI para Facturama
   */
  private static generateCFDI(data: CFDIData) {
    const { type, receiver, items, paymentForm = '03', paymentMethod = 'PUE' } = data;
    
    // Calcular totales
    let subtotal = 0;
    let totalTaxes = 0;
    
    const processedItems = items.map(item => {
      const itemSubtotal = item.quantity * item.unitPrice;
      const taxAmount = itemSubtotal * (item.taxRate || 0.16);
      
      subtotal += itemSubtotal;
      totalTaxes += taxAmount;
      
      return {
        ProductCode: item.productCode || CFDI_CONFIGS[type].productCode,
        Description: item.description,
        Unit: item.unit || 'Servicio',
        UnitCode: item.unitCode || CFDI_CONFIGS[type].unitCode,
        Quantity: item.quantity,
        UnitPrice: Math.round(item.unitPrice * 100) / 100,
        Subtotal: Math.round(itemSubtotal * 100) / 100,
        Total: Math.round((itemSubtotal + taxAmount) * 100) / 100,
        Taxes: [
          {
            Total: Math.round(taxAmount * 100) / 100,
            Name: 'IVA',
            Base: Math.round(itemSubtotal * 100) / 100,
            Rate: item.taxRate || 0.16,
            IsRetention: false
          }
        ]
      };
    });
    
    const total = subtotal + totalTaxes;
    
    // Generar serie y folio únicos
    const date = new Date();
    const serie = type === 'saas' ? 'SAAS' : 
                 type === 'tratamiento' ? 'TRAT' : 
                 type === 'marketplace' ? 'MKTP' : 'TPAY';
    const folio = `${Date.now()}`.slice(-6); // Últimos 6 dígitos del timestamp
    
    return {
      Serie: serie,
      Folio: folio,
      Currency: 'MXN',
      Date: format(date, "yyyy-MM-dd'T'HH:mm:ss"),
      ExpeditionPlace: TOOTHPICK_EMISOR.zipCode,
      PaymentConditions: paymentMethod === 'PUE' ? 'CONTADO' : 'CREDITO',
      Subtotal: Math.round(subtotal * 100) / 100,
      Total: Math.round(total * 100) / 100,
      
      // Receptor
      Receiver: {
        Rfc: receiver.rfc,
        Name: receiver.name,
        CfdiUse: receiver.usoCfdi || CFDI_CONFIGS[type].usoCfdi,
        FiscalRegime: receiver.regimenFiscal || CFDI_CONFIGS[type].regimenFiscal,
        TaxZipCode: receiver.zipCode,
        Email: receiver.email
      },
      
      // Conceptos
      Items: processedItems,
      
      // Forma de pago
      PaymentForm: paymentForm,
      PaymentMethod: paymentMethod,
      
      // Observaciones
      Observations: data.observations,
      
      // Metadatos internos (no van al CFDI)
      _metadata: {
        type: data.type,
        relatedEntityId: data.relatedEntityId,
        relatedEntityType: data.relatedEntityType,
        generatedAt: new Date().toISOString()
      }
    };
  }
  
  /**
   * Valida los datos antes de generar el CFDI
   */
  static validateCFDIData(data: CFDIData): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    // Validar receptor
    if (!data.receiver.rfc || data.receiver.rfc.length < 12) {
      errors.push('RFC del receptor inválido');
    }
    
    if (!data.receiver.name || data.receiver.name.length < 3) {
      errors.push('Nombre del receptor inválido');
    }
    
    if (!data.receiver.zipCode || data.receiver.zipCode.length !== 5) {
      errors.push('Código postal del receptor inválido');
    }
    
    // Validar items
    if (!data.items || data.items.length === 0) {
      errors.push('Debe incluir al menos un concepto');
    }
    
    data.items.forEach((item, index) => {
      if (!item.description || item.description.length < 3) {
        errors.push(`Descripción del concepto ${index + 1} inválida`);
      }
      
      if (!item.quantity || item.quantity <= 0) {
        errors.push(`Cantidad del concepto ${index + 1} inválida`);
      }
      
      if (!item.unitPrice || item.unitPrice <= 0) {
        errors.push(`Precio unitario del concepto ${index + 1} inválido`);
      }
    });
    
    return {
      valid: errors.length === 0,
      errors
    };
  }
}
