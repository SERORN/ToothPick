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

// 📦 Schema para conceptos de factura
const ConceptoSchema = new mongoose.Schema({
  claveProdServ: { type: String }, // Clave SAT del producto/servicio
  noIdentificacion: { type: String }, // Número de identificación del producto
  cantidad: { type: Number, required: true },
  claveUnidad: { type: String, default: 'H87' }, // Clave SAT de unidad de medida
  unidad: { type: String, default: 'Pieza' },
  descripcion: { type: String, required: true },
  valorUnitario: { type: Number, required: true },
  importe: { type: Number, required: true },
  descuento: { type: Number, default: 0 },
  objetoImp: { type: String, default: '02' }, // Objeto de impuesto
  
  // 💰 Impuestos
  impuestos: {
    traslados: [{
      base: Number,
      impuesto: { type: String, default: '002' }, // IVA
      tipoFactor: { type: String, default: 'Tasa' },
      tasaOCuota: { type: String, default: '0.160000' },
      importe: Number
    }],
    retenciones: [{
      base: Number,
      impuesto: String,
      tipoFactor: String,
      tasaOCuota: String,
      importe: Number
    }]
  }
}, { _id: false });

// 🏢 Schema para datos del emisor
const EmisorSchema = new mongoose.Schema({
  rfc: { type: String, required: true },
  nombre: { type: String, required: true },
  regimenFiscal: { type: String, required: true },
  codigoPostal: { type: String, required: true },
  
  // 🌐 Datos adicionales
  direccion: {
    calle: String,
    numeroExterior: String,
    numeroInterior: String,
    colonia: String,
    municipio: String,
    estado: String,
    pais: { type: String, default: 'México' },
    codigoPostal: String
  }
}, { _id: false });

// 👤 Schema para datos del receptor
const ReceptorSchema = new mongoose.Schema({
  rfc: { type: String, required: true },
  nombre: { type: String, required: true },
  codigoPostal: { type: String, required: true },
  domicilioFiscalReceptor: { type: String },
  regimenFiscalReceptor: { type: String, default: '616' }, // Sin obligaciones fiscales
  usoCFDI: { type: String, enum: Object.values(UsoCFDI), required: true },
  
  // 🌐 Datos adicionales
  direccion: {
    calle: String,
    numeroExterior: String,
    numeroInterior: String,
    colonia: String,
    municipio: String,
    estado: String,
    pais: { type: String, default: 'México' },
    codigoPostal: String
  },
  
  // 📧 Contacto
  email: String,
  telefono: String
}, { _id: false });

// 🧾 Schema principal de Invoice FASE 28
const InvoiceFase28Schema = new mongoose.Schema({
  // 🆔 Identificadores únicos
  uuid: { type: String, unique: true, sparse: true }, // UUID fiscal (CFDI)
  folio: { type: String, required: true }, // Folio interno secuencial
  serie: { type: String, default: 'A' }, // Serie de la factura
  numeroOrden: { type: String }, // Número de orden asociada
  
  // 📋 Información básica
  tipo: { type: String, enum: Object.values(InvoiceType), required: true },
  status: { type: String, enum: Object.values(InvoiceStatus), default: InvoiceStatus.DRAFT },
  moneda: { type: String, enum: Object.values(Currency), required: true },
  tipoCambio: { type: Number, default: 1 }, // Tipo de cambio al momento de emisión
  
  // 💰 Importes
  subtotal: { type: Number, required: true },
  descuento: { type: Number, default: 0 },
  impuestos: {
    totalImpuestosTrasladados: { type: Number, default: 0 },
    totalImpuestosRetenidos: { type: Number, default: 0 }
  },
  total: { type: Number, required: true },
  
  // 🇲🇽 CFDI específicos
  metodoPago: { type: String, enum: Object.values(MetodoPago) },
  formaPago: { type: String, enum: Object.values(FormaPago) },
  condicionesDePago: { type: String },
  
  // 🏢 Partes involucradas
  emisor: { type: EmisorSchema, required: true },
  receptor: { type: ReceptorSchema, required: true },
  
  // 📦 Conceptos/productos
  conceptos: [ConceptoSchema],
  
  // 🔗 Referencias
  organizacionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true },
  usuarioId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  ordenId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
  pacienteId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  
  // 📄 Archivos generados
  xmlPath: { type: String }, // Ruta al XML timbrado
  pdfPath: { type: String }, // Ruta al PDF generado
  xmlContent: { type: String }, // Contenido XML completo
  qrCode: { type: String }, // Código QR para verificación
  
  // 🔒 Datos del PAC (Proveedor Autorizado de Certificación)
  pac: {
    nombre: { type: String }, // Facturama, otro PAC
    certificadoSAT: { type: String },
    noCertificadoSAT: { type: String },
    fechaTimbrado: { type: Date },
    selloCFD: { type: String },
    selloSAT: { type: String },
    cadenaOriginalSAT: { type: String }
  },
  
  // 📧 Configuración de envío
  emailEnviado: { type: Boolean, default: false },
  emailFecha: { type: Date },
  emailDestinatarios: [String],
  
  // 🔄 Información de cancelación
  cancelacion: {
    fecha: { type: Date },
    motivo: { type: String },
    uuid: { type: String },
    folioSustitucion: { type: String }
  },
  
  // 📊 Metadatos adicionales
  pais: { type: String, default: 'MX' },
  zona: { type: String }, // Zona horaria
  notas: { type: String },
  referencias: { type: String },
  observaciones: { type: String },
  
  // 🔄 Información de conversion de moneda
  conversion: {
    monedaOriginal: { type: String },
    monedaDestino: { type: String },
    tipoCambio: { type: Number },
    fecha: { type: Date },
    proveedor: { type: String } // API de conversión utilizada
  },
  
  // 🤖 Información de generación automática
  esAutomatica: { type: Boolean, default: false },
  cronjobId: { type: String },
  webhook: { type: String },
  
  // 📅 Timestamps
  fechaEmision: { type: Date, default: Date.now },
  fechaVencimiento: { type: Date },
  fechaTimbrado: { type: Date },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// 🔍 Índices para optimización
InvoiceFase28Schema.index({ organizacionId: 1, fechaEmision: -1 });
InvoiceFase28Schema.index({ uuid: 1 }, { unique: true, sparse: true });
InvoiceFase28Schema.index({ folio: 1, organizacionId: 1 }, { unique: true });
InvoiceFase28Schema.index({ usuarioId: 1, fechaEmision: -1 });
InvoiceFase28Schema.index({ status: 1 });
InvoiceFase28Schema.index({ tipo: 1 });
InvoiceFase28Schema.index({ ordenId: 1 });
InvoiceFase28Schema.index({ 'receptor.rfc': 1 });
InvoiceFase28Schema.index({ moneda: 1 });
InvoiceFase28Schema.index({ esAutomatica: 1, status: 1 });

// 🔄 Middleware para actualizar updatedAt
InvoiceFase28Schema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// ✨ Métodos virtuales
InvoiceFase28Schema.virtual('folioCompleto').get(function() {
  return `${this.serie}${this.folio}`;
});

InvoiceFase28Schema.virtual('totalConvertido').get(function() {
  if (this.conversion && this.conversion.tipoCambio) {
    return this.total * this.conversion.tipoCambio;
  }
  return this.total;
});

InvoiceFase28Schema.virtual('esCFDI').get(function() {
  return this.tipo.startsWith('cfdi_');
});

InvoiceFase28Schema.virtual('esInternacional').get(function() {
  return ['internacional', 'global', 'b2b', 'b2c', 'eu_invoice'].includes(this.tipo);
});

// 🛠️ Métodos de instancia
InvoiceFase28Schema.methods.generarFolio = async function() {
  if (!this.folio) {
    const ultimaFactura = await (this.constructor as any).findOne(
      { organizacionId: this.organizacionId, serie: this.serie },
      {},
      { sort: { folio: -1 } }
    );
    
    const ultimoNumero = ultimaFactura ? parseInt(ultimaFactura.folio) : 0;
    this.folio = (ultimoNumero + 1).toString().padStart(6, '0');
  }
  return this.folio;
};

InvoiceFase28Schema.methods.calcularTotal = function() {
  const subtotal = this.conceptos.reduce((sum: number, concepto: any) => {
    return sum + (concepto.importe - (concepto.descuento || 0));
  }, 0);
  
  const totalImpuestosTrasladados = this.conceptos.reduce((sum: number, concepto: any) => {
    if (concepto.impuestos && concepto.impuestos.traslados) {
      return sum + concepto.impuestos.traslados.reduce((impSum: number, imp: any) => impSum + (imp.importe || 0), 0);
    }
    return sum;
  }, 0);
  
  const totalImpuestosRetenidos = this.conceptos.reduce((sum: number, concepto: any) => {
    if (concepto.impuestos && concepto.impuestos.retenciones) {
      return sum + concepto.impuestos.retenciones.reduce((impSum: number, imp: any) => impSum + (imp.importe || 0), 0);
    }
    return sum;
  }, 0);
  
  this.subtotal = subtotal;
  this.impuestos.totalImpuestosTrasladados = totalImpuestosTrasladados;
  this.impuestos.totalImpuestosRetenidos = totalImpuestosRetenidos;
  this.total = subtotal + totalImpuestosTrasladados - totalImpuestosRetenidos - this.descuento;
  
  return this.total;
};

InvoiceFase28Schema.methods.puedeSerCancelada = function() {
  return ['timbrada', 'issued'].includes(this.status) && !this.cancelacion.fecha;
};

InvoiceFase28Schema.methods.marcarComoCancelada = function(motivo: string, folioSustitucion?: string) {
  this.status = InvoiceStatus.CANCELLED;
  this.cancelacion = {
    fecha: new Date(),
    motivo,
    uuid: this.uuid,
    folioSustitucion
  };
};

// 📊 Métodos estáticos
InvoiceFase28Schema.statics.obtenerEstadisticas = async function(organizacionId: string, fechaInicio?: Date, fechaFin?: Date) {
  const filtro: any = { organizacionId };
  
  if (fechaInicio && fechaFin) {
    filtro.fechaEmision = { $gte: fechaInicio, $lte: fechaFin };
  }
  
  const estadisticas = await this.aggregate([
    { $match: filtro },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        totalAmount: { $sum: '$total' },
        currencies: { $addToSet: '$moneda' }
      }
    }
  ]);
  
  return estadisticas;
};

InvoiceFase28Schema.statics.obtenerFacturasAutomaticas = async function() {
  return this.find({
    esAutomatica: true,
    status: { $in: [InvoiceStatus.DRAFT, InvoiceStatus.PENDING] }
  }).populate('organizacionId usuarioId ordenId');
};

// 🏷️ Crear y exportar el modelo
const InvoiceFase28 = mongoose.models.InvoiceFase28 || mongoose.model('InvoiceFase28', InvoiceFase28Schema);

export default InvoiceFase28;
