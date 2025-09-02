// 🏭 FASE 28: Servicio Principal de Facturación Internacional
// ✅ Generación, timbrado, cancelación y gestión completa de facturas

import InvoiceFase28, { InvoiceType, InvoiceStatus, Currency } from '@/lib/models/InvoiceFase28';
import InvoiceSettings from '@/lib/models/InvoiceSettings';
import InvoiceLog, { InvoiceEventType, EventSeverity } from '@/lib/models/InvoiceLog';
import { FacturamaService } from '@/lib/services/FacturamaService';
import { CurrencyConversionService } from '@/lib/services/CurrencyConversionService';
import { EmailService } from '@/lib/services/EmailService';
import { PDFGeneratorService } from '@/lib/services/PDFGeneratorService';

// 📋 Interface para datos de creación de factura
export interface CreateInvoiceData {
  organizacionId: string;
  usuarioId: string;
  pacienteId?: string;
  ordenId?: string;
  
  // Tipo y configuración
  tipo: InvoiceType;
  moneda: Currency;
  
  // Datos del receptor
  receptor: {
    rfc: string;
    nombre: string;
    email?: string;
    usoCFDI?: string;
    codigoPostal: string;
    direccion?: any;
  };
  
  // Conceptos/productos
  conceptos: Array<{
    descripcion: string;
    cantidad: number;
    valorUnitario: number;
    claveProdServ?: string;
    claveUnidad?: string;
    descuento?: number;
  }>;
  
  // Configuración adicional
  metodoPago?: string;
  formaPago?: string;
  condicionesDePago?: string;
  notas?: string;
  
  // Opciones de procesamiento
  enviarAutomaticamente?: boolean;
  generarPDF?: boolean;
  esAutomatica?: boolean;
}

// 🎯 Resultado de operación de facturación
export interface InvoiceOperationResult {
  success: boolean;
  invoice?: any;
  error?: string;
  details?: any;
  warnings?: string[];
}

export class InvoiceService {
  private facturamaService: FacturamaService;
  private currencyService: CurrencyConversionService;
  private emailService: EmailService;
  private pdfService: PDFGeneratorService;

  constructor() {
    this.facturamaService = new FacturamaService();
    this.currencyService = new CurrencyConversionService();
    this.emailService = new EmailService();
    this.pdfService = new PDFGeneratorService();
  }

  // 🏗️ Crear una nueva factura
  async crearFactura(data: CreateInvoiceData): Promise<InvoiceOperationResult> {
    try {
      // 1. Obtener configuración de la organización
      const configuracion = await InvoiceSettings.obtenerPorOrganizacion(data.organizacionId);
      if (!configuracion) {
        return {
          success: false,
          error: 'Configuración de facturación no encontrada'
        };
      }

      // 2. Validar configuración
      const erroresConfig = configuracion.validarConfiguracion();
      if (erroresConfig.length > 0) {
        return {
          success: false,
          error: 'Configuración incompleta',
          details: erroresConfig
        };
      }

      // 3. Generar folio
      const folio = configuracion.obtenerSiguienteFolio();

      // 4. Convertir moneda si es necesario
      let tipoCambio = 1;
      if (data.moneda !== configuracion.monedas.monedaPrincipal) {
        tipoCambio = await this.currencyService.obtenerTipoCambio(
          data.moneda,
          configuracion.monedas.monedaPrincipal
        );
      }

      // 5. Calcular importes
      const calculoImportes = this.calcularImportes(data.conceptos, configuracion);

      // 6. Crear factura en base de datos
      const nuevaFactura = new InvoiceFase28({
        // Identificadores
        folio,
        serie: configuracion.series.factura,
        numeroOrden: data.ordenId,
        
        // Información básica
        tipo: data.tipo,
        status: InvoiceStatus.DRAFT,
        moneda: data.moneda,
        tipoCambio,
        
        // Importes
        subtotal: calculoImportes.subtotal,
        descuento: calculoImportes.descuento,
        impuestos: {
          totalImpuestosTrasladados: calculoImportes.iva,
          totalImpuestosRetenidos: calculoImportes.retenciones
        },
        total: calculoImportes.total,
        
        // CFDI específicos
        metodoPago: data.metodoPago,
        formaPago: data.formaPago,
        condicionesDePago: data.condicionesDePago,
        
        // Partes involucradas
        emisor: this.construirDatosEmisor(configuracion),
        receptor: this.construirDatosReceptor(data.receptor, configuracion),
        
        // Conceptos
        conceptos: this.construirConceptos(data.conceptos, configuracion),
        
        // Referencias
        organizacionId: data.organizacionId,
        usuarioId: data.usuarioId,
        ordenId: data.ordenId,
        pacienteId: data.pacienteId,
        
        // Metadatos
        pais: configuracion.pais,
        notas: data.notas,
        esAutomatica: data.esAutomatica || false,
        
        // Timestamps
        fechaEmision: new Date()
      });

      await nuevaFactura.save();

      // 7. Crear log del evento
      await InvoiceLog.crearLog({
        invoiceId: nuevaFactura._id.toString(),
        organizacionId: data.organizacionId,
        usuarioId: data.usuarioId,
        tipo: InvoiceEventType.CREATED,
        severidad: EventSeverity.SUCCESS,
        mensaje: `Factura ${nuevaFactura.folioCompleto} creada exitosamente`,
        metadata: {
          amount: nuevaFactura.total,
          currency: nuevaFactura.moneda,
          exchangeRate: tipoCambio
        }
      });

      // 8. Procesar factura (timbrar si es CFDI)
      if (nuevaFactura.esCFDI) {
        return await this.procesarCFDI(nuevaFactura, configuracion, data);
      } else {
        return await this.procesarFacturaInternacional(nuevaFactura, configuracion, data);
      }

    } catch (error: any) {
      console.error('Error al crear factura:', error);
      
      await InvoiceLog.crearLog({
        invoiceId: 'unknown',
        organizacionId: data.organizacionId,
        usuarioId: data.usuarioId,
        tipo: InvoiceEventType.VALIDATION_ERROR,
        severidad: EventSeverity.ERROR,
        mensaje: 'Error al crear factura',
        error: {
          mensaje: error.message,
          stack: error.stack
        }
      });

      return {
        success: false,
        error: 'Error interno al crear factura',
        details: error.message
      };
    }
  }

  // 🇲🇽 Procesar CFDI con PAC
  private async procesarCFDI(
    factura: any,
    configuracion: any,
    data: CreateInvoiceData
  ): Promise<InvoiceOperationResult> {
    try {
      // 1. Actualizar estado
      factura.status = InvoiceStatus.PENDING;
      await factura.save();

      await InvoiceLog.crearLog({
        invoiceId: factura._id.toString(),
        organizacionId: factura.organizacionId.toString(),
        usuarioId: data.usuarioId,
        tipo: InvoiceEventType.SENT_TO_PAC,
        severidad: EventSeverity.INFO,
        mensaje: `Enviando factura ${factura.folioCompleto} al PAC`
      });

      // 2. Configurar servicio de PAC
      this.facturamaService.configurar(configuracion.pac);

      // 3. Timbrar con Facturama
      const resultadoTimbrado = await this.facturamaService.timbrarFactura(factura);

      if (resultadoTimbrado.success) {
        // Timbrado exitoso
        factura.status = InvoiceStatus.TIMBRADA;
        factura.uuid = resultadoTimbrado.uuid;
        factura.xmlContent = resultadoTimbrado.xml;
        factura.pac = resultadoTimbrado.pacData;
        factura.fechaTimbrado = new Date();

        await factura.save();

        await InvoiceLog.crearLog({
          invoiceId: factura._id.toString(),
          organizacionId: factura.organizacionId.toString(),
          usuarioId: data.usuarioId,
          tipo: InvoiceEventType.STAMPED,
          severidad: EventSeverity.SUCCESS,
          mensaje: `Factura ${factura.folioCompleto} timbrada exitosamente`,
          metadata: {
            uuid: resultadoTimbrado.uuid,
            pacProvider: configuracion.pac.proveedor,
            processingTimeMs: resultadoTimbrado.processingTime
          }
        });

        // 4. Generar PDF y enviar email
        return await this.completarProcesamiento(factura, configuracion, data);

      } else {
        // Error en timbrado
        factura.status = InvoiceStatus.ERROR;
        await factura.save();

        await InvoiceLog.crearLog({
          invoiceId: factura._id.toString(),
          organizacionId: factura.organizacionId.toString(),
          usuarioId: data.usuarioId,
          tipo: InvoiceEventType.PAC_ERROR,
          severidad: EventSeverity.ERROR,
          mensaje: `Error al timbrar factura ${factura.folioCompleto}`,
          error: {
            codigo: resultadoTimbrado.errorCode,
            mensaje: resultadoTimbrado.error
          }
        });

        return {
          success: false,
          error: 'Error al timbrar factura',
          details: resultadoTimbrado.error
        };
      }

    } catch (error: any) {
      factura.status = InvoiceStatus.ERROR;
      await factura.save();

      await InvoiceLog.crearLog({
        invoiceId: factura._id.toString(),
        organizacionId: factura.organizacionId.toString(),
        usuarioId: data.usuarioId,
        tipo: InvoiceEventType.PAC_ERROR,
        severidad: EventSeverity.CRITICAL,
        mensaje: `Error crítico al procesar CFDI ${factura.folioCompleto}`,
        error: {
          mensaje: error.message,
          stack: error.stack
        }
      });

      return {
        success: false,
        error: 'Error crítico en procesamiento de CFDI',
        details: error.message
      };
    }
  }

  // 🌍 Procesar factura internacional
  private async procesarFacturaInternacional(
    factura: any,
    configuracion: any,
    data: CreateInvoiceData
  ): Promise<InvoiceOperationResult> {
    try {
      // 1. Actualizar estado
      factura.status = InvoiceStatus.ISSUED;
      await factura.save();

      await InvoiceLog.crearLog({
        invoiceId: factura._id.toString(),
        organizacionId: factura.organizacionId.toString(),
        usuarioId: data.usuarioId,
        tipo: InvoiceEventType.VALIDATED,
        severidad: EventSeverity.SUCCESS,
        mensaje: `Factura internacional ${factura.folioCompleto} emitida exitosamente`
      });

      // 2. Completar procesamiento (PDF + email)
      return await this.completarProcesamiento(factura, configuracion, data);

    } catch (error: any) {
      factura.status = InvoiceStatus.ERROR;
      await factura.save();

      await InvoiceLog.crearLog({
        invoiceId: factura._id.toString(),
        organizacionId: factura.organizacionId.toString(),
        usuarioId: data.usuarioId,
        tipo: InvoiceEventType.VALIDATION_ERROR,
        severidad: EventSeverity.ERROR,
        mensaje: `Error al procesar factura internacional ${factura.folioCompleto}`,
        error: {
          mensaje: error.message,
          stack: error.stack
        }
      });

      return {
        success: false,
        error: 'Error al procesar factura internacional',
        details: error.message
      };
    }
  }

  // ✅ Completar procesamiento (PDF + Email)
  private async completarProcesamiento(
    factura: any,
    configuracion: any,
    data: CreateInvoiceData
  ): Promise<InvoiceOperationResult> {
    const warnings: string[] = [];

    try {
      // 1. Generar PDF si se solicita
      if (data.generarPDF !== false) {
        try {
          const pdfResult = await this.pdfService.generarPDF(factura, configuracion);
          if (pdfResult.success) {
            factura.pdfPath = pdfResult.path;
            await factura.save();

            await InvoiceLog.crearLog({
              invoiceId: factura._id.toString(),
              organizacionId: factura.organizacionId.toString(),
              usuarioId: data.usuarioId,
              tipo: InvoiceEventType.PDF_GENERATED,
              severidad: EventSeverity.SUCCESS,
              mensaje: `PDF generado para factura ${factura.folioCompleto}`,
              metadata: {
                pdfSize: pdfResult.size
              }
            });
          } else {
            warnings.push('Error al generar PDF');
          }
        } catch (pdfError: any) {
          warnings.push(`Error en PDF: ${pdfError.message}`);
        }
      }

      // 2. Enviar email si se solicita
      if (data.enviarAutomaticamente !== false && factura.receptor.email) {
        try {
          const emailResult = await this.emailService.enviarFactura(factura, configuracion);
          if (emailResult.success) {
            factura.emailEnviado = true;
            factura.emailFecha = new Date();
            await factura.save();

            await InvoiceLog.crearLog({
              invoiceId: factura._id.toString(),
              organizacionId: factura.organizacionId.toString(),
              usuarioId: data.usuarioId,
              tipo: InvoiceEventType.EMAIL_SENT,
              severidad: EventSeverity.SUCCESS,
              mensaje: `Email enviado para factura ${factura.folioCompleto}`,
              metadata: {
                emailRecipients: [factura.receptor.email]
              }
            });
          } else {
            warnings.push('Error al enviar email');
          }
        } catch (emailError: any) {
          warnings.push(`Error en email: ${emailError.message}`);
        }
      }

      return {
        success: true,
        invoice: factura,
        warnings: warnings.length > 0 ? warnings : undefined
      };

    } catch (error: any) {
      return {
        success: true, // La factura se creó exitosamente
        invoice: factura,
        warnings: [`Error en procesamiento posterior: ${error.message}`]
      };
    }
  }

  // 🔧 Métodos utilitarios

  private calcularImportes(conceptos: any[], configuracion: any) {
    const subtotal = conceptos.reduce((sum, concepto) => {
      return sum + (concepto.cantidad * concepto.valorUnitario) - (concepto.descuento || 0);
    }, 0);

    const impuestosCalculados = configuracion.calcularImpuestos(subtotal);

    return {
      subtotal,
      descuento: conceptos.reduce((sum, concepto) => sum + (concepto.descuento || 0), 0),
      iva: impuestosCalculados.iva,
      retenciones: impuestosCalculados.retenciones,
      total: impuestosCalculados.total
    };
  }

  private construirDatosEmisor(configuracion: any) {
    return {
      rfc: configuracion.datosFiscales.rfc,
      nombre: configuracion.datosFiscales.razonSocial,
      regimenFiscal: configuracion.datosFiscales.regimenFiscal,
      codigoPostal: configuracion.datosFiscales.codigoPostal,
      direccion: configuracion.datosFiscales.direccion
    };
  }

  private construirDatosReceptor(receptor: any, configuracion: any) {
    return {
      rfc: receptor.rfc,
      nombre: receptor.nombre,
      codigoPostal: receptor.codigoPostal,
      usoCFDI: receptor.usoCFDI || 'G03',
      direccion: receptor.direccion,
      email: receptor.email
    };
  }

  private construirConceptos(conceptos: any[], configuracion: any) {
    return conceptos.map(concepto => {
      const importe = concepto.cantidad * concepto.valorUnitario;
      const impuestos = configuracion.calcularImpuestos(importe);

      return {
        descripcion: concepto.descripcion,
        cantidad: concepto.cantidad,
        valorUnitario: concepto.valorUnitario,
        importe,
        descuento: concepto.descuento || 0,
        claveProdServ: concepto.claveProdServ || '01010101',
        claveUnidad: concepto.claveUnidad || 'H87',
        unidad: 'Pieza',
        objetoImp: '02',
        impuestos: {
          traslados: impuestos.iva > 0 ? [{
            base: importe,
            impuesto: '002',
            tipoFactor: 'Tasa',
            tasaOCuota: '0.160000',
            importe: impuestos.iva
          }] : [],
          retenciones: []
        }
      };
    });
  }

  // 🗑️ Cancelar factura
  async cancelarFactura(
    facturaId: string,
    usuarioId: string,
    motivo: string,
    folioSustitucion?: string
  ): Promise<InvoiceOperationResult> {
    try {
      const factura = await InvoiceFase28.findById(facturaId);
      if (!factura) {
        return { success: false, error: 'Factura no encontrada' };
      }

      if (!factura.puedeSerCancelada()) {
        return { success: false, error: 'La factura no puede ser cancelada' };
      }

      const configuracion = await InvoiceSettings.obtenerPorOrganizacion(factura.organizacionId.toString());

      // Si es CFDI, cancelar en el PAC
      if (factura.esCFDI && configuracion) {
        this.facturamaService.configurar(configuracion.pac);
        const resultadoCancelacion = await this.facturamaService.cancelarFactura(factura.uuid);

        if (!resultadoCancelacion.success) {
          await InvoiceLog.crearLog({
            invoiceId: facturaId,
            organizacionId: factura.organizacionId.toString(),
            usuarioId,
            tipo: InvoiceEventType.PAC_ERROR,
            severidad: EventSeverity.ERROR,
            mensaje: `Error al cancelar CFDI ${factura.folioCompleto}`,
            error: { mensaje: resultadoCancelacion.error }
          });

          return {
            success: false,
            error: 'Error al cancelar CFDI en el PAC',
            details: resultadoCancelacion.error
          };
        }
      }

      // Marcar como cancelada
      factura.marcarComoCancelada(motivo, folioSustitucion);
      await factura.save();

      await InvoiceLog.crearLog({
        invoiceId: facturaId,
        organizacionId: factura.organizacionId.toString(),
        usuarioId,
        tipo: InvoiceEventType.CANCELLED,
        severidad: EventSeverity.SUCCESS,
        mensaje: `Factura ${factura.folioCompleto} cancelada exitosamente`,
        metadata: { motivo, folioSustitucion }
      });

      return { success: true, invoice: factura };

    } catch (error: any) {
      return {
        success: false,
        error: 'Error al cancelar factura',
        details: error.message
      };
    }
  }

  // 📊 Obtener facturas por organización
  async obtenerFacturas(
    organizacionId: string,
    filtros: any = {},
    paginacion: { page: number; limit: number } = { page: 1, limit: 20 }
  ) {
    try {
      const query = { organizacionId, ...filtros };
      const opciones = {
        sort: { fechaEmision: -1 },
        skip: (paginacion.page - 1) * paginacion.limit,
        limit: paginacion.limit,
        populate: [
          { path: 'usuarioId', select: 'nombre email' },
          { path: 'pacienteId', select: 'nombre email' },
          { path: 'ordenId', select: 'numero total' }
        ]
      };

      const facturas = await InvoiceFase28.find(query, null, opciones);
      const total = await InvoiceFase28.countDocuments(query);

      return {
        success: true,
        data: {
          facturas,
          pagination: {
            page: paginacion.page,
            limit: paginacion.limit,
            total,
            pages: Math.ceil(total / paginacion.limit)
          }
        }
      };

    } catch (error: any) {
      return {
        success: false,
        error: 'Error al obtener facturas',
        details: error.message
      };
    }
  }

  // 📈 Obtener estadísticas
  async obtenerEstadisticas(organizacionId: string, fechaInicio?: Date, fechaFin?: Date) {
    try {
      const estadisticas = await InvoiceFase28.obtenerEstadisticas(organizacionId, fechaInicio, fechaFin);
      return { success: true, data: estadisticas };
    } catch (error: any) {
      return {
        success: false,
        error: 'Error al obtener estadísticas',
        details: error.message
      };
    }
  }
}

export default InvoiceService;
