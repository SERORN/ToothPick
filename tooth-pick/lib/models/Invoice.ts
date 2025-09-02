// 🧾 FASE 28: Modelo de Factura para Sistema de Facturación Internacional
// ✅ Soporte para CFDI 4.0, facturación internacional, multimoneda y B2B/B2C

import mongoose from 'mongoose';

// 🌐 Enum para tipos de factura según el país y regulación
export enum InvoiceType {
  // 🇲🇽 México - CFDI 4.0
  CFDI_INGRESO = 'cfdi_ingreso',           // Factura de venta estándar
  CFDI_EGRESO = 'cfdi_egreso',             // Nota de crédito/devolución
  CFDI_TRASLADO = 'cfdi_traslado',         // Carta porte
  CFDI_NOMINA = 'cfdi_nomina',             // Nómina (futuro)
  CFDI_PAGO = 'cfdi_pago',                 // Complemento de pago
  
  // 🌎 Internacional
  INTERNACIONAL = 'internacional',          // Factura estándar internacional
  GLOBAL = 'global',                       // Factura global mensual simplificada
  B2B = 'b2b',                            // Business to Business
  B2C = 'b2c',                            // Business to Consumer
  
  // 🇧🇷 Brasil (placeholder para futuro)
  NFE = 'nfe',                            // Nota Fiscal Eletrônica
  NFCE = 'nfce',                          // NFC-e
  
  // 🇪🇺 Europa (placeholder)
  EU_INVOICE = 'eu_invoice'                // Factura UE con IVA
}

// 💰 Estados de factura
export enum InvoiceStatus {
  DRAFT = 'draft',                         // Borrador
  PENDING = 'pending',                     // Pendiente de timbrado
  TIMBRADA = 'timbrada',                   // Timbrada exitosamente (CFDI)
  ISSUED = 'issued',                       // Emitida (internacional)
  CANCELLED = 'cancelled',                 // Cancelada
  ERROR = 'error',                         // Error en timbrado/emisión
  REFUNDED = 'refunded'                    // Reembolsada
}

// 💸 Monedas soportadas
export enum Currency {
  MXN = 'MXN',     // Peso mexicano
  USD = 'USD',     // Dólar americano
  EUR = 'EUR',     // Euro
  BRL = 'BRL',     // Real brasileño
  ARS = 'ARS',     // Peso argentino
  COP = 'COP',     // Peso colombiano
  CLP = 'CLP'      // Peso chileno
}

// 🔧 Uso CFDI (México)
export enum UsoCFDI {
  G01 = 'G01',     // Adquisición de mercancías
  G02 = 'G02',     // Devoluciones, descuentos o bonificaciones
  G03 = 'G03',     // Gastos en general
  I01 = 'I01',     // Construcciones
  I02 = 'I02',     // Mobiliario y equipo de oficina por inversiones
  I03 = 'I03',     // Equipo de transporte
  I04 = 'I04',     // Equipo de computo y accesorios
  I05 = 'I05',     // Dados, troqueles, moldes, matrices y herramental
  I06 = 'I06',     // Comunicaciones telefónicas
  I07 = 'I07',     // Comunicaciones satelitales
  I08 = 'I08',     // Otra maquinaria y equipo
  D01 = 'D01',     // Honorarios médicos, dentales y gastos hospitalarios
  D02 = 'D02',     // Gastos médicos por incapacidad o discapacidad
  D03 = 'D03',     // Gastos funerales
  D04 = 'D04',     // Donativos
  D05 = 'D05',     // Intereses reales efectivamente pagados por créditos hipotecarios
  D06 = 'D06',     // Aportaciones voluntarias al SAR
  D07 = 'D07',     // Primas por seguros de gastos médicos
  D08 = 'D08',     // Gastos de transportación escolar obligatoria
  D09 = 'D09',     // Depósitos en cuentas para el ahorro, primas que tengan como base planes de pensiones
  D10 = 'D10',     // Pagos por servicios educativos
  P01 = 'P01',     // Por definir
  S01 = 'S01',     // Sin efectos fiscales
  CP01 = 'CP01'    // Pagos
}

// 💳 Métodos de pago CFDI
export enum MetodoPago {
  PUE = 'PUE',     // Pago en una sola exhibición
  PPD = 'PPD'      // Pago en parcialidades o diferido
}

// 💰 Formas de pago CFDI
export enum FormaPago {
  EFECTIVO = '01',           // Efectivo
  CHEQUE = '02',             // Cheque nominativo
  TRANSFERENCIA = '03',       // Transferencia electrónica de fondos
  TARJETA_CREDITO = '04',    // Tarjeta de crédito
  MONEDERO = '05',           // Monedero electrónico
  DINERO_ELECTRONICO = '06', // Dinero electrónico
  VALES = '08',              // Vales de despensa
  DACION = '12',             // Dación en pago
  PAGO_SUBROGACION = '13',   // Pago por subrogación
  PAGO_CONSIGNACION = '14',  // Pago por consignación
  CONDONACION = '15',        // Condonación
  COMPENSACION = '17',       // Compensación
  NOVACION = '23',           // Novación
  CONFUSION = '24',          // Confusión
  REMISION_DEUDA = '25',     // Remisión de deuda
  PRESCRIPCION = '26',       // Prescripción o caducidad
  SATISFACCION = '27',       // A satisfacción del acreedor
  TARJETA_DEBITO = '28',     // Tarjeta de débito
  TARJETA_SERVICIOS = '29',  // Tarjeta de servicios
  APLICACION_ANTICIPOS = '30', // Aplicación de anticipos
  INTERMEDIARIO = '31',      // Intermediario pagos
  POR_DEFINIR = '99'         // Por definir
}
    selloSat: string;
  };
  
  // Conceptos facturados
  items: {
    productCode: string; // Clave SAT
    description: string;
    unit: string;
    unitCode: string; // Clave unidad SAT
    quantity: number;
    unitPrice: number;
    subtotal: number;
    taxes: {
      name: string;
      rate: number;
      amount: number;
      isRetention: boolean;
    }[];
  }[];
  
  // Forma de pago
  paymentForm: string; // 03, 04, etc.
  paymentMethod: string; // PUE, PPD
  paymentConditions?: string;
  
  // Observaciones y notas
  observations?: string;
  internalNotes?: string;
  
  // Fechas
  issueDate: Date;
  createdAt: Date;
  updatedAt: Date;
}

const InvoiceSchema: Schema = new Schema<IInvoice>(
  {
    uuid: { 
      type: String, 
      required: true, 
      unique: true 
    },
    serie: { 
      type: String, 
      required: true 
    },
    folio: { 
      type: String, 
      required: true 
    },
    type: { 
      type: String, 
      enum: ['saas', 'tratamiento', 'marketplace', 'toothpay'], 
      required: true 
    },
    
    // Emisor
    emitterRfc: { 
      type: String, 
      required: true 
    },
    emitterName: { 
      type: String, 
      required: true 
    },
    
    // Receptor
    receiverRfc: { 
      type: String, 
      required: true 
    },
    receiverName: { 
      type: String, 
      required: true 
    },
    receiverEmail: String,
    usoCfdi: { 
      type: String, 
      required: true 
    },
    regimenFiscal: { 
      type: String, 
      required: true 
    },
    
    // Financiero
    subtotal: { 
      type: Number, 
      required: true, 
      min: 0 
    },
    iva: { 
      type: Number, 
      required: true, 
      min: 0 
    },
    total: { 
      type: Number, 
      required: true, 
      min: 0 
    },
    currency: { 
      type: String, 
      default: 'MXN' 
    },
    exchangeRate: Number,
    
    // Archivos
    xmlUrl: String,
    pdfUrl: String,
    xmlContent: String,
    
    // Estado
    status: { 
      type: String, 
      enum: ['draft', 'sent', 'active', 'cancelled'], 
      default: 'draft' 
    },
    cancelReason: String,
    cancelDate: Date,
    
    // Referencias
    relatedEntityId: mongoose.Schema.Types.ObjectId,
    relatedEntityType: String,
    
    // Facturama
    facturamaId: String,
    timbreFiscalDigital: {
      uuid: String,
      fechaTimbrado: Date,
      selloCfd: String,
      noCertificadoSat: String,
      selloSat: String
    },
    
    // Conceptos
    items: [{
      productCode: { type: String, required: true },
      description: { type: String, required: true },
      unit: { type: String, required: true },
      unitCode: { type: String, required: true },
      quantity: { type: Number, required: true, min: 0 },
      unitPrice: { type: Number, required: true, min: 0 },
      subtotal: { type: Number, required: true, min: 0 },
      taxes: [{
        name: { type: String, required: true },
        rate: { type: Number, required: true },
        amount: { type: Number, required: true },
        isRetention: { type: Boolean, default: false }
      }]
    }],
    
    // Pago
    paymentForm: { 
      type: String, 
      required: true 
    },
    paymentMethod: { 
      type: String, 
      required: true 
    },
    paymentConditions: String,
    
    // Notas
    observations: String,
    internalNotes: String,
    
    // Fechas
    issueDate: { 
      type: Date, 
      required: true, 
      default: Date.now 
    }
  },
  { 
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Índices para mejor rendimiento
InvoiceSchema.index({ uuid: 1 });
InvoiceSchema.index({ receiverRfc: 1, issueDate: -1 });
InvoiceSchema.index({ type: 1, status: 1 });
InvoiceSchema.index({ relatedEntityId: 1, relatedEntityType: 1 });
InvoiceSchema.index({ issueDate: -1 });

// Virtual para número completo de factura
InvoiceSchema.virtual('fullNumber').get(function() {
  return `${this.serie}-${this.folio}`;
});

// Virtual para verificar si está cancelada
InvoiceSchema.virtual('isCancelled').get(function() {
  return this.status === 'cancelled';
});

// Virtual para verificar si es válida
InvoiceSchema.virtual('isValid').get(function() {
  return ['sent', 'active'].includes(this.status);
});

// Método para generar serie y folio automáticamente
InvoiceSchema.statics.generateSerieAndFolio = async function(type: string) {
  const currentYear = new Date().getFullYear();
  const serie = type === 'saas' ? 'SAAS' : 
               type === 'tratamiento' ? 'TRAT' : 
               type === 'marketplace' ? 'MKTP' : 'TPAY';
  
  // Buscar el último folio del año para esta serie
  const lastInvoice = await this.findOne(
    { 
      serie, 
      issueDate: { 
        $gte: new Date(currentYear, 0, 1),
        $lt: new Date(currentYear + 1, 0, 1)
      }
    },
    {},
    { sort: { folio: -1 } }
  );
  
  const lastFolio = lastInvoice ? parseInt(lastInvoice.folio) : 0;
  const newFolio = (lastFolio + 1).toString().padStart(6, '0');
  
  return { serie, folio: newFolio };
};

// Método para calcular totales
InvoiceSchema.methods.calculateTotals = function() {
  let subtotal = 0;
  let totalTaxes = 0;
  
  this.items.forEach((item: any) => {
    subtotal += item.subtotal;
    item.taxes.forEach((tax: any) => {
      if (!tax.isRetention) {
        totalTaxes += tax.amount;
      }
    });
  });
  
  this.subtotal = Math.round(subtotal * 100) / 100;
  this.iva = Math.round(totalTaxes * 100) / 100;
  this.total = Math.round((subtotal + totalTaxes) * 100) / 100;
};

// Método para cancelar factura
InvoiceSchema.methods.cancel = async function(reason: string) {
  this.status = 'cancelled';
  this.cancelReason = reason;
  this.cancelDate = new Date();
  return await this.save();
};

// Método estático para buscar facturas por RFC
InvoiceSchema.statics.findByRfc = function(rfc: string, startDate?: Date, endDate?: Date) {
  const query: any = { receiverRfc: rfc };
  
  if (startDate || endDate) {
    query.issueDate = {};
    if (startDate) query.issueDate.$gte = startDate;
    if (endDate) query.issueDate.$lte = endDate;
  }
  
  return this.find(query).sort({ issueDate: -1 });
};

export default mongoose.models.Invoice || 
  mongoose.model<IInvoice>('Invoice', InvoiceSchema);
