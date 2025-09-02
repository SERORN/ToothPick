// 📋 FASE 28: Modelo de Logs de Facturación
// ✅ Historial de eventos, errores y auditoría del sistema de facturación

import mongoose from 'mongoose';

// 📊 Tipos de eventos de facturación
export enum InvoiceEventType {
  // ✅ Eventos exitosos
  CREATED = 'created',                     // Factura creada
  CALCULATED = 'calculated',               // Importes calculados
  VALIDATED = 'validated',                 // Validación exitosa
  SENT_TO_PAC = 'sent_to_pac',            // Enviada al PAC
  STAMPED = 'stamped',                     // Timbrada exitosamente
  PDF_GENERATED = 'pdf_generated',         // PDF generado
  EMAIL_SENT = 'email_sent',              // Email enviado
  DOWNLOADED = 'downloaded',               // Descargada por usuario
  CANCELLED = 'cancelled',                 // Cancelada
  
  // ⚠️ Eventos de error
  VALIDATION_ERROR = 'validation_error',   // Error de validación
  PAC_ERROR = 'pac_error',                // Error del PAC
  NETWORK_ERROR = 'network_error',         // Error de red
  PDF_ERROR = 'pdf_error',                // Error al generar PDF
  EMAIL_ERROR = 'email_error',            // Error al enviar email
  CALCULATION_ERROR = 'calculation_error', // Error en cálculos
  
  // 🔄 Eventos de sistema
  RETRY_ATTEMPT = 'retry_attempt',         // Intento de reenvío
  QUEUED = 'queued',                      // En cola de procesamiento
  PROCESSING = 'processing',               // En procesamiento
  WEBHOOK_SENT = 'webhook_sent',           // Webhook enviado
  WEBHOOK_ERROR = 'webhook_error',         // Error en webhook
  
  // 👤 Eventos de usuario
  MANUAL_TRIGGER = 'manual_trigger',       // Generación manual
  AUTO_TRIGGER = 'auto_trigger',           // Generación automática
  USER_CANCELLED = 'user_cancelled',       // Cancelada por usuario
  ADMIN_OVERRIDE = 'admin_override'        // Intervención admin
}

// 🎯 Nivel de severidad del evento
export enum EventSeverity {
  INFO = 'info',           // Información general
  SUCCESS = 'success',     // Operación exitosa
  WARNING = 'warning',     // Advertencia
  ERROR = 'error',         // Error
  CRITICAL = 'critical'    // Error crítico
}

// 🔍 Schema para metadatos del evento
const EventMetadataSchema = new mongoose.Schema({
  // 📡 Información de red
  ip: { type: String },
  userAgent: { type: String },
  
  // 🔐 PAC específico
  pacProvider: { type: String },
  pacTransactionId: { type: String },
  pacResponse: { type: mongoose.Schema.Types.Mixed },
  
  // 📄 Información del documento
  xmlSize: { type: Number },
  pdfSize: { type: Number },
  
  // ⏱️ Tiempos de procesamiento
  processingTimeMs: { type: Number },
  
  // 💰 Información financiera
  amount: { type: Number },
  currency: { type: String },
  exchangeRate: { type: Number },
  
  // 🔄 Información de reintento
  attemptNumber: { type: Number },
  maxAttempts: { type: Number },
  nextRetryAt: { type: Date },
  
  // 📧 Información de email
  emailRecipients: [String],
  emailSubject: { type: String },
  
  // 🌐 Configuración utilizada
  settingsSnapshot: { type: mongoose.Schema.Types.Mixed },
  
  // 📊 Datos adicionales
  additionalData: { type: mongoose.Schema.Types.Mixed }
}, { _id: false });

// 📋 Schema principal de InvoiceLog
const InvoiceLogSchema = new mongoose.Schema({
  // 🔗 Referencias
  invoiceId: { type: mongoose.Schema.Types.ObjectId, ref: 'InvoiceFase28', required: true },
  organizacionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true },
  usuarioId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // Null para eventos automáticos
  
  // 📊 Información del evento
  tipo: { type: String, enum: Object.values(InvoiceEventType), required: true },
  severidad: { type: String, enum: Object.values(EventSeverity), required: true },
  
  // 📝 Descripción del evento
  mensaje: { type: String, required: true },
  descripcionDetallada: { type: String },
  
  // ❌ Información de error (si aplica)
  error: {
    codigo: { type: String },
    mensaje: { type: String },
    stack: { type: String },
    detalles: { type: mongoose.Schema.Types.Mixed }
  },
  
  // 📄 Referencias a documentos
  factura: {
    folio: { type: String },
    uuid: { type: String },
    serie: { type: String },
    total: { type: Number },
    moneda: { type: String },
    status: { type: String }
  },
  
  // 🔍 Metadatos del evento
  metadata: { type: EventMetadataSchema, default: () => ({}) },
  
  // 🏷️ Etiquetas para búsqueda
  tags: [String],
  
  // 📅 Información temporal
  timestamp: { type: Date, default: Date.now },
  fechaEvento: { type: Date, default: Date.now },
  
  // 🔄 Estado del procesamiento
  resuelto: { type: Boolean, default: false },
  fechaResolucion: { type: Date },
  resolucionComentarios: { type: String },
  
  // 📊 Contexto del evento
  contexto: {
    origen: { type: String }, // 'api', 'cron', 'webhook', 'manual'
    modulo: { type: String }, // 'invoice_service', 'email_service', etc.
    version: { type: String },
    ambiente: { type: String, default: 'production' } // 'production', 'development', 'testing'
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// 🔍 Índices para optimización
InvoiceLogSchema.index({ invoiceId: 1, timestamp: -1 });
InvoiceLogSchema.index({ organizacionId: 1, timestamp: -1 });
InvoiceLogSchema.index({ tipo: 1, timestamp: -1 });
InvoiceLogSchema.index({ severidad: 1, timestamp: -1 });
InvoiceLogSchema.index({ 'factura.folio': 1 });
InvoiceLogSchema.index({ 'factura.uuid': 1 });
InvoiceLogSchema.index({ usuarioId: 1, timestamp: -1 });
InvoiceLogSchema.index({ resuelto: 1, severidad: 1 });
InvoiceLogSchema.index({ tags: 1 });
InvoiceLogSchema.index({ timestamp: -1 }); // Para limpieza automática

// ✨ Métodos virtuales
InvoiceLogSchema.virtual('esError').get(function() {
  return ['error', 'critical'].includes(this.severidad);
});

InvoiceLogSchema.virtual('esExitoso').get(function() {
  return this.severidad === 'success';
});

InvoiceLogSchema.virtual('requiereAtencion').get(function() {
  return this.severidad === 'critical' && !this.resuelto;
});

InvoiceLogSchema.virtual('tiempoTranscurrido').get(function() {
  return Date.now() - this.timestamp.getTime();
});

InvoiceLogSchema.virtual('descripcionCompleta').get(function() {
  let descripcion = this.mensaje;
  if (this.descripcionDetallada) {
    descripcion += ` - ${this.descripcionDetallada}`;
  }
  if (this.error && this.error.mensaje) {
    descripcion += ` (Error: ${this.error.mensaje})`;
  }
  return descripcion;
});

// 🛠️ Métodos de instancia
InvoiceLogSchema.methods.marcarComoResuelto = function(comentarios?: string) {
  this.resuelto = true;
  this.fechaResolucion = new Date();
  if (comentarios) {
    this.resolucionComentarios = comentarios;
  }
  return this.save();
};

InvoiceLogSchema.methods.agregarTag = function(tag: string) {
  if (!this.tags.includes(tag)) {
    this.tags.push(tag);
  }
  return this;
};

InvoiceLogSchema.methods.actualizarMetadata = function(nuevaMetadata: any) {
  this.metadata = { ...this.metadata.toObject(), ...nuevaMetadata };
  return this;
};

// 📊 Métodos estáticos
InvoiceLogSchema.statics.crearLog = async function(data: {
  invoiceId: string;
  organizacionId: string;
  usuarioId?: string;
  tipo: InvoiceEventType;
  severidad: EventSeverity;
  mensaje: string;
  descripcionDetallada?: string;
  error?: any;
  metadata?: any;
  tags?: string[];
}) {
  const log = new this({
    invoiceId: data.invoiceId,
    organizacionId: data.organizacionId,
    usuarioId: data.usuarioId,
    tipo: data.tipo,
    severidad: data.severidad,
    mensaje: data.mensaje,
    descripcionDetallada: data.descripcionDetallada,
    error: data.error,
    metadata: data.metadata || {},
    tags: data.tags || [],
    contexto: {
      origen: 'api',
      modulo: 'invoice_service',
      version: '1.0.0',
      ambiente: process.env.NODE_ENV || 'development'
    }
  });

  return log.save();
};

InvoiceLogSchema.statics.obtenerLogsPorFactura = async function(invoiceId: string, limit: number = 50) {
  return this.find({ invoiceId })
    .sort({ timestamp: -1 })
    .limit(limit)
    .populate('usuarioId', 'nombre email')
    .exec();
};

InvoiceLogSchema.statics.obtenerErroresNoResueltos = async function(organizacionId?: string) {
  const filtro: any = {
    severidad: { $in: ['error', 'critical'] },
    resuelto: false
  };

  if (organizacionId) {
    filtro.organizacionId = organizacionId;
  }

  return this.find(filtro)
    .sort({ timestamp: -1 })
    .populate('invoiceId', 'folio uuid')
    .populate('usuarioId', 'nombre email')
    .exec();
};

InvoiceLogSchema.statics.obtenerEstadisticas = async function(
  organizacionId: string,
  fechaInicio: Date,
  fechaFin: Date
) {
  const estadisticas = await this.aggregate([
    {
      $match: {
        organizacionId: new mongoose.Types.ObjectId(organizacionId),
        timestamp: { $gte: fechaInicio, $lte: fechaFin }
      }
    },
    {
      $group: {
        _id: {
          tipo: '$tipo',
          severidad: '$severidad'
        },
        count: { $sum: 1 },
        ultimoEvento: { $max: '$timestamp' }
      }
    },
    {
      $group: {
        _id: '$_id.tipo',
        eventos: {
          $push: {
            severidad: '$_id.severidad',
            count: '$count',
            ultimoEvento: '$ultimoEvento'
          }
        },
        totalEventos: { $sum: '$count' }
      }
    }
  ]);

  return estadisticas;
};

InvoiceLogSchema.statics.limpiarLogsAntiguos = async function(diasRetencion: number = 365) {
  const fechaLimite = new Date();
  fechaLimite.setDate(fechaLimite.getDate() - diasRetencion);

  // Solo eliminar logs de info y success antiguos, mantener errores
  const resultado = await this.deleteMany({
    timestamp: { $lt: fechaLimite },
    severidad: { $in: ['info', 'success'] },
    resuelto: true
  });

  return resultado;
};

InvoiceLogSchema.statics.obtenerMetricasRendimiento = async function(
  organizacionId: string,
  fechaInicio: Date,
  fechaFin: Date
) {
  const metricas = await this.aggregate([
    {
      $match: {
        organizacionId: new mongoose.Types.ObjectId(organizacionId),
        timestamp: { $gte: fechaInicio, $lte: fechaFin },
        'metadata.processingTimeMs': { $exists: true }
      }
    },
    {
      $group: {
        _id: '$tipo',
        tiempoPromedio: { $avg: '$metadata.processingTimeMs' },
        tiempoMinimo: { $min: '$metadata.processingTimeMs' },
        tiempoMaximo: { $max: '$metadata.processingTimeMs' },
        totalEventos: { $sum: 1 }
      }
    }
  ]);

  return metricas;
};

// 🏷️ Crear y exportar el modelo
const InvoiceLog = mongoose.models.InvoiceLog || mongoose.model('InvoiceLog', InvoiceLogSchema);

export default InvoiceLog;
