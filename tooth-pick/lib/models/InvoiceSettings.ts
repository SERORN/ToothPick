// ⚙️ FASE 28: Modelo de Configuración de Facturación por Organización
// ✅ Configuración fiscal, PAC, monedas y preferencias por rol

import mongoose from 'mongoose';

// 🏛️ Régimen fiscal SAT (México)
export enum RegimenFiscal {
  PERSONA_FISICA_ACTIVIDAD_EMPRESARIAL = '612',         // Persona Física con Actividades Empresariales
  PERSONA_FISICA_ACTIVIDAD_PROFESIONAL = '611',         // Persona Física con Actividades Profesionales
  PERSONA_FISICA_ARRENDAMIENTO = '605',                 // Arrendamiento
  PERSONA_FISICA_SINACTIVIDAD = '621',                  // Persona Física sin actividades
  PERSONA_MORAL_GENERAL = '601',                        // General de Ley Personas Morales
  PERSONA_MORAL_LUCRO = '603',                          // Personas Morales con Fines no Lucrativos
  INCORPORACION_FISCAL = '621',                         // Régimen de Incorporación Fiscal
  RESICO = '626',                                       // Régimen Simplificado de Confianza
  ACTIVIDADES_AGRICOLAS = '625',                        // Actividades Agrícolas, Ganaderas, Silvícolas y Pesqueras
  SUELDOS_SALARIOS = '605',                             // Sueldos y Salarios
  PLATAFORMAS_TECNOLOGICAS = '626'                      // Plataformas Tecnológicas
}

// 🌍 Países soportados
export enum PaisSoportado {
  MEXICO = 'MX',
  ESTADOS_UNIDOS = 'US',
  BRASIL = 'BR',
  ARGENTINA = 'AR',
  COLOMBIA = 'CO',
  CHILE = 'CL',
  ESPAÑA = 'ES',
  ALEMANIA = 'DE',
  FRANCIA = 'FR',
  REINO_UNIDO = 'GB'
}

// 🔐 Proveedores de PAC (México)
export enum PacProvider {
  FACTURAMA = 'facturama',
  TIMBRADO = 'timbrado',
  FINKOK = 'finkok',
  ECODEX = 'ecodex',
  NONE = 'none'                                         // Para facturas internacionales
}

// 🎯 Tipos de facturación automática
export enum AutoInvoiceType {
  NONE = 'none',                                        // Sin facturación automática
  DAILY = 'daily',                                      // Diaria
  WEEKLY = 'weekly',                                    // Semanal
  MONTHLY = 'monthly',                                  // Mensual global
  ON_ORDER_COMPLETION = 'on_order_completion',          // Al completar orden
  ON_PAYMENT = 'on_payment'                            // Al recibir pago
}

// 📧 Schema para configuración de email
const EmailConfigSchema = new mongoose.Schema({
  enviarAutomaticamente: { type: Boolean, default: true },
  asunto: { type: String, default: 'Factura {folio} - {organizacion}' },
  mensaje: { type: String, default: 'Adjunto encontrará su factura electrónica.' },
  copiaA: [String],                                     // Emails adicionales para envío
  copiaOculta: [String],                                // BCC emails
  plantillaPersonalizada: { type: String },             // Template personalizado
  logoUrl: { type: String }                             // Logo personalizado para el email
}, { _id: false });

// 🔐 Schema para configuración del PAC
const PacConfigSchema = new mongoose.Schema({
  proveedor: { type: String, enum: Object.values(PacProvider), default: PacProvider.NONE },
  
  // Facturama
  facturamaUsuario: { type: String },
  facturamaPassword: { type: String },
  facturamaApiUrl: { type: String, default: 'https://api.facturama.mx' },
  
  // Otros PACs (configuración genérica)
  apiKey: { type: String },
  apiSecret: { type: String },
  apiUrl: { type: String },
  certificadoPath: { type: String },
  
  // Testing/Sandbox
  esSandbox: { type: Boolean, default: true },
  urlSandbox: { type: String },
  
  // Configuración adicional
  timeoutMs: { type: Number, default: 30000 },
  reintentos: { type: Number, default: 3 },
  habilitado: { type: Boolean, default: false }
}, { _id: false });

// 💰 Schema para configuración de monedas
const CurrencyConfigSchema = new mongoose.Schema({
  monedaPrincipal: { type: String, default: 'MXN' },
  monedasSoportadas: [{ type: String, default: ['MXN', 'USD'] }],
  conversion: {
    proveedorApi: { type: String, default: 'exchangerate-api' },    // API de conversión
    apiKey: { type: String },
    actualizacionAutomatica: { type: Boolean, default: true },
    frecuenciaHoras: { type: Number, default: 24 },
    margenPorcentaje: { type: Number, default: 0 }                  // Margen adicional
  },
  formateo: {
    decimales: { type: Number, default: 2 },
    separadorMiles: { type: String, default: ',' },
    separadorDecimal: { type: String, default: '.' },
    simboloAntes: { type: Boolean, default: true }
  }
}, { _id: false });

// 📊 Schema para configuración de impuestos por país
const TaxConfigSchema = new mongoose.Schema({
  pais: { type: String, enum: Object.values(PaisSoportado), required: true },
  iva: {
    tasa: { type: Number, default: 0.16 },               // 16% México
    incluido: { type: Boolean, default: false },         // IVA incluido en precios
    descripcion: { type: String, default: 'IVA' }
  },
  retenciones: [{
    nombre: { type: String },                            // ISR, IVA Ret, etc.
    tasa: { type: Number },
    aplicaA: { type: String }                           // 'profesionales', 'arrendamiento'
  }],
  otros: [{
    nombre: { type: String },
    tasa: { type: Number },
    descripcion: { type: String }
  }]
}, { _id: false });

// 🏢 Schema principal de InvoiceSettings
const InvoiceSettingsSchema = new mongoose.Schema({
  // 🔗 Referencias
  organizacionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true, unique: true },
  
  // 🌍 Configuración básica
  pais: { type: String, enum: Object.values(PaisSoportado), required: true },
  zona: { type: String, default: 'America/Mexico_City' },
  idioma: { type: String, default: 'es' },
  
  // 🏛️ Datos fiscales (México)
  datosFiscales: {
    rfc: { type: String, required: true },
    razonSocial: { type: String, required: true },
    regimenFiscal: { type: String, enum: Object.values(RegimenFiscal), required: true },
    codigoPostal: { type: String, required: true },
    
    // Dirección fiscal
    direccion: {
      calle: { type: String, required: true },
      numeroExterior: { type: String, required: true },
      numeroInterior: { type: String },
      colonia: { type: String, required: true },
      municipio: { type: String, required: true },
      estado: { type: String, required: true },
      pais: { type: String, default: 'México' },
      codigoPostal: { type: String, required: true }
    },
    
    // Contacto
    telefono: { type: String },
    email: { type: String, required: true },
    sitioWeb: { type: String }
  },
  
  // 🔐 Configuración del PAC
  pac: { type: PacConfigSchema, default: () => ({}) },
  
  // 💰 Configuración de monedas
  monedas: { type: CurrencyConfigSchema, default: () => ({}) },
  
  // 📊 Configuración de impuestos
  impuestos: [TaxConfigSchema],
  
  // 📄 Configuración de series y folios
  series: {
    factura: { type: String, default: 'A' },
    notaCredito: { type: String, default: 'NC' },
    notaDebito: { type: String, default: 'ND' },
    
    // Folios por serie
    folioActual: { type: Map, of: Number, default: new Map() },
    folioInicial: { type: Number, default: 1 },
    digitosFolio: { type: Number, default: 6 }
  },
  
  // 🤖 Facturación automática
  facturacionAutomatica: {
    tipo: { type: String, enum: Object.values(AutoInvoiceType), default: AutoInvoiceType.NONE },
    
    // Configuración por tipo
    diaria: {
      hora: { type: String, default: '23:59' },         // HH:MM formato 24h
      diasLaborales: { type: Boolean, default: false }
    },
    
    semanal: {
      diaSemana: { type: Number, default: 0 },          // 0=Domingo, 6=Sábado
      hora: { type: String, default: '23:59' }
    },
    
    mensual: {
      dia: { type: Number, default: 31 },               // Último día del mes
      hora: { type: String, default: '23:59' },
      facturaGlobal: { type: Boolean, default: true }   // Una factura global vs individual
    },
    
    // Filtros
    montoMinimo: { type: Number, default: 0 },
    solo: {
      dentistas: { type: Boolean, default: true },
      distribuidores: { type: Boolean, default: true },
      pacientes: { type: Boolean, default: false }      // Solo bajo petición
    }
  },
  
  // 📧 Configuración de email
  email: { type: EmailConfigSchema, default: () => ({}) },
  
  // 🎨 Configuración de PDF
  pdf: {
    logoUrl: { type: String },
    colorPrimario: { type: String, default: '#2563eb' },
    colorSecundario: { type: String, default: '#64748b' },
    mostrarQR: { type: Boolean, default: true },
    incluirDetalles: { type: Boolean, default: true },
    plantilla: { type: String, default: 'default' },     // 'default', 'minimal', 'corporate'
    
    // Watermark para facturas de prueba
    watermark: {
      texto: { type: String, default: 'FACTURA DE PRUEBA' },
      mostrar: { type: Boolean, default: true }
    }
  },
  
  // ⚡ Configuración de webhook/notificaciones
  webhooks: {
    url: { type: String },
    eventos: [{ type: String, enum: ['timbrada', 'cancelada', 'error', 'enviada'] }],
    secreto: { type: String },
    habilitado: { type: Boolean, default: false }
  },
  
  // 🔒 Configuración de seguridad
  seguridad: {
    requiereAutorizacion: { type: Boolean, default: false },  // Para facturas altas
    autorizadores: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    logs: {
      habilitado: { type: Boolean, default: true },
      retencionDias: { type: Number, default: 365 }
    }
  },
  
  // 📊 Metadatos y configuración adicional
  activa: { type: Boolean, default: true },
  validadaHacienda: { type: Boolean, default: false },        // RFC validado en SAT
  fechaValidacion: { type: Date },
  configuradaPor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  
  // 📅 Timestamps
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// 🔍 Índices para optimización
InvoiceSettingsSchema.index({ organizacionId: 1 }, { unique: true });
InvoiceSettingsSchema.index({ 'datosFiscales.rfc': 1 });
InvoiceSettingsSchema.index({ pais: 1 });
InvoiceSettingsSchema.index({ activa: 1 });
InvoiceSettingsSchema.index({ 'pac.proveedor': 1 });

// 🔄 Middleware para actualizar updatedAt
InvoiceSettingsSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// ✨ Métodos virtuales
InvoiceSettingsSchema.virtual('tieneConfiguracionCompleta').get(function() {
  return this.datosFiscales.rfc && 
         this.datosFiscales.razonSocial && 
         this.pais && 
         (this.pais !== 'MX' || (this.pac.proveedor !== 'none' && this.pac.habilitado));
});

InvoiceSettingsSchema.virtual('facturamanualRequiereAuth').get(function() {
  return this.seguridad.requiereAutorizacion;
});

InvoiceSettingsSchema.virtual('siguienteFolio').get(function() {
  const serieActual = this.series.factura;
  const folioActual = this.series.folioActual.get(serieActual) || this.series.folioInicial;
  return (folioActual + 1).toString().padStart(this.series.digitosFolio, '0');
});

// 🛠️ Métodos de instancia
InvoiceSettingsSchema.methods.obtenerSiguienteFolio = function(serie: string = 'A') {
  const folioActual = this.series.folioActual.get(serie) || this.series.folioInicial - 1;
  const nuevoFolio = folioActual + 1;
  
  this.series.folioActual.set(serie, nuevoFolio);
  
  return nuevoFolio.toString().padStart(this.series.digitosFolio, '0');
};

InvoiceSettingsSchema.methods.validarConfiguracion = function() {
  const errores = [];
  
  // Validaciones básicas
  if (!this.datosFiscales.rfc) errores.push('RFC requerido');
  if (!this.datosFiscales.razonSocial) errores.push('Razón social requerida');
  if (!this.datosFiscales.email) errores.push('Email requerido');
  
  // Validaciones específicas por país
  if (this.pais === 'MX') {
    if (!this.datosFiscales.regimenFiscal) errores.push('Régimen fiscal requerido');
    if (this.pac.proveedor === 'none') errores.push('PAC requerido para México');
    if (this.pac.proveedor === 'facturama' && (!this.pac.facturamaUsuario || !this.pac.facturamaPassword)) {
      errores.push('Credenciales de Facturama requeridas');
    }
  }
  
  return errores;
};

InvoiceSettingsSchema.methods.calcularImpuestos = function(subtotal: number, conceptos?: any[]) {
  const impuestosPais = this.impuestos.find(imp => imp.pais === this.pais);
  
  if (!impuestosPais) {
    return {
      iva: 0,
      retenciones: 0,
      total: subtotal
    };
  }
  
  const iva = subtotal * impuestosPais.iva.tasa;
  
  let retenciones = 0;
  if (impuestosPais.retenciones) {
    retenciones = impuestosPais.retenciones.reduce((sum, ret) => {
      return sum + (subtotal * ret.tasa);
    }, 0);
  }
  
  return {
    iva,
    retenciones,
    total: subtotal + iva - retenciones
  };
};

// 📊 Métodos estáticos
InvoiceSettingsSchema.statics.obtenerPorOrganizacion = async function(organizacionId: string) {
  return this.findOne({ organizacionId, activa: true });
};

InvoiceSettingsSchema.statics.configuracionesPorPais = async function(pais: string) {
  return this.find({ pais, activa: true }).populate('organizacionId');
};

InvoiceSettingsSchema.statics.configuracionesConAutofacturacion = async function() {
  return this.find({
    'facturacionAutomatica.tipo': { $ne: 'none' },
    activa: true
  }).populate('organizacionId');
};

// 🏷️ Crear y exportar el modelo
const InvoiceSettings = mongoose.models.InvoiceSettings || mongoose.model('InvoiceSettings', InvoiceSettingsSchema);

export default InvoiceSettings;
