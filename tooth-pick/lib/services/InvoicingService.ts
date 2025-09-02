import facturamaClient from '@/lib/facturama';
import Invoice from '@/lib/models/Invoice';
import { CFDIGenerator, CFDIData } from '@/lib/cfdiGenerator';
import connectDB from '@/lib/db';

export interface InvoiceResult {
  success: boolean;
  invoice?: any;
  cfdi?: any;
  error?: string;
  details?: any;
}

/**
 * Servicio principal de facturación CFDI
 */
export class InvoicingService {
  
  /**
   * Crear y timbrar una factura completa
   */
  static async createAndIssueInvoice(cfdiData: CFDIData): Promise<InvoiceResult> {
    try {
      await connectDB();
      
      // 1. Validar datos
      const validation = CFDIGenerator.validateCFDIData(cfdiData);
      if (!validation.valid) {
        return {
          success: false,
          error: 'Datos inválidos para CFDI',
          details: validation.errors
        };
      }
      
      // 2. Generar CFDI según el tipo
      let cfdiBody;
      
      switch (cfdiData.type) {
        case 'saas':
          // Asumir estructura para SaaS
          cfdiBody = CFDIGenerator.generateSaaSCFDI(
            {
              rfc: cfdiData.receiver.rfc,
              nombreFiscal: cfdiData.receiver.name,
              email: cfdiData.receiver.email,
              cpFiscal: cfdiData.receiver.zipCode
            },
            {
              nombre: cfdiData.items[0]?.description || 'Plan SaaS',
              precio: (cfdiData.items[0]?.unitPrice || 0) * 1.16,
              descripcion: cfdiData.observations
            },
            cfdiData.relatedEntityId
          );
          break;
          
        default:
          cfdiBody = this.generateGenericCFDI(cfdiData);
          break;
      }
      
      // 3. Enviar a Facturama para timbrado
      const facturamaResponse = await facturamaClient.post('/api-lite/cfdi', cfdiBody);
      
      if (!facturamaResponse.data) {
        return {
          success: false,
          error: 'Error en respuesta de Facturama',
          details: facturamaResponse
        };
      }
      
      const cfdi = facturamaResponse.data;
      
      // 4. Guardar en base de datos
      const { serie, folio } = await Invoice.generateSerieAndFolio(cfdiData.type);
      
      const invoice = new Invoice({
        uuid: cfdi.Complement?.TaxStamp?.Uuid || `temp-${Date.now()}`,
        serie: serie,
        folio: folio,
        type: cfdiData.type,
        
        // Emisor (ToothPick)
        emitterRfc: cfdi.Issuer?.Rfc || process.env.TOOTHPICK_RFC,
        emitterName: cfdi.Issuer?.Name || process.env.TOOTHPICK_RAZON_SOCIAL,
        
        // Receptor
        receiverRfc: cfdiData.receiver.rfc,
        receiverName: cfdiData.receiver.name,
        receiverEmail: cfdiData.receiver.email,
        usoCfdi: cfdiData.receiver.usoCfdi || 'G03',
        regimenFiscal: cfdiData.receiver.regimenFiscal || '612',
        
        // Financiero
        subtotal: cfdi.Subtotal || 0,
        iva: (cfdi.Total || 0) - (cfdi.Subtotal || 0),
        total: cfdi.Total || 0,
        currency: cfdi.Currency || 'MXN',
        
        // Archivos
        xmlUrl: cfdi.Links?.Xml,
        pdfUrl: cfdi.Links?.Pdf,
        xmlContent: cfdi.XmlContent,
        
        // Estado
        status: cfdi.Status === 'sent' ? 'sent' : 'active',
        
        // Referencias
        relatedEntityId: cfdiData.relatedEntityId,
        relatedEntityType: cfdiData.relatedEntityType,
        
        // Facturama
        facturamaId: cfdi.Id,
        timbreFiscalDigital: cfdi.Complement?.TaxStamp ? {
          uuid: cfdi.Complement.TaxStamp.Uuid,
          fechaTimbrado: new Date(cfdi.Complement.TaxStamp.Date),
          selloCfd: cfdi.Complement.TaxStamp.CfdSeal,
          noCertificadoSat: cfdi.Complement.TaxStamp.NoCertificadoSat,
          selloSat: cfdi.Complement.TaxStamp.SatSeal
        } : undefined,
        
        // Conceptos
        items: cfdiData.items.map(item => ({
          productCode: item.productCode || '81112500',
          description: item.description,
          unit: item.unit || 'Servicio',
          unitCode: item.unitCode || 'E48',
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          subtotal: item.quantity * item.unitPrice,
          taxes: [{
            name: 'IVA',
            rate: item.taxRate || 0.16,
            amount: (item.quantity * item.unitPrice) * (item.taxRate || 0.16),
            isRetention: false
          }]
        })),
        
        // Pago
        paymentForm: cfdiData.paymentForm || '03',
        paymentMethod: cfdiData.paymentMethod || 'PUE',
        
        // Notas
        observations: cfdiData.observations,
        
        // Fecha
        issueDate: new Date()
      });
      
      // Calcular totales automáticamente
      invoice.calculateTotals();
      
      // Guardar factura
      const savedInvoice = await invoice.save();
      
      return {
        success: true,
        invoice: savedInvoice,
        cfdi: cfdi
      };
      
    } catch (error: any) {
      console.error('Error creating invoice:', error);
      
      return {
        success: false,
        error: error.message || 'Error interno al crear factura',
        details: error.response?.data || error
      };
    }
  }
  
  /**
   * Generar CFDI genérico
   */
  private static generateGenericCFDI(cfdiData: CFDIData) {
    // Implementación básica para otros tipos
    const subtotal = cfdiData.items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
    const taxes = subtotal * 0.16;
    const total = subtotal + taxes;
    
    return {
      Serie: cfdiData.type.toUpperCase(),
      Folio: `${Date.now()}`.slice(-6),
      Currency: 'MXN',
      Date: new Date().toISOString(),
      ExpeditionPlace: process.env.TOOTHPICK_CP || '64000',
      PaymentConditions: 'CONTADO',
      Subtotal: Math.round(subtotal * 100) / 100,
      Total: Math.round(total * 100) / 100,
      
      Receiver: {
        Rfc: cfdiData.receiver.rfc,
        Name: cfdiData.receiver.name,
        CfdiUse: cfdiData.receiver.usoCfdi || 'G03',
        FiscalRegime: cfdiData.receiver.regimenFiscal || '612',
        TaxZipCode: cfdiData.receiver.zipCode,
        Email: cfdiData.receiver.email
      },
      
      Items: cfdiData.items.map(item => ({
        ProductCode: item.productCode || '81112500',
        Description: item.description,
        Unit: item.unit || 'Servicio',
        UnitCode: item.unitCode || 'E48',
        Quantity: item.quantity,
        UnitPrice: Math.round(item.unitPrice * 100) / 100,
        Subtotal: Math.round((item.quantity * item.unitPrice) * 100) / 100,
        Total: Math.round((item.quantity * item.unitPrice * 1.16) * 100) / 100,
        Taxes: [{
          Total: Math.round((item.quantity * item.unitPrice * 0.16) * 100) / 100,
          Name: 'IVA',
          Base: Math.round((item.quantity * item.unitPrice) * 100) / 100,
          Rate: 0.16,
          IsRetention: false
        }]
      })),
      
      PaymentForm: cfdiData.paymentForm || '03',
      PaymentMethod: cfdiData.paymentMethod || 'PUE',
      Observations: cfdiData.observations
    };
  }
  
  /**
   * Cancelar una factura
   */
  static async cancelInvoice(invoiceId: string, reason: string): Promise<InvoiceResult> {
    try {
      await connectDB();
      
      const invoice = await Invoice.findById(invoiceId);
      
      if (!invoice) {
        return {
          success: false,
          error: 'Factura no encontrada'
        };
      }
      
      if (invoice.status === 'cancelled') {
        return {
          success: false,
          error: 'La factura ya está cancelada'
        };
      }
      
      // Cancelar en Facturama
      if (invoice.facturamaId) {
        try {
          await facturamaClient.delete(`/api-lite/cfdi/${invoice.facturamaId}`);
        } catch (facturamaError) {
          console.error('Error cancelling in Facturama:', facturamaError);
          // Continuar con cancelación local aunque falle en Facturama
        }
      }
      
      // Cancelar localmente
      await invoice.cancel(reason);
      
      return {
        success: true,
        invoice: invoice
      };
      
    } catch (error: any) {
      console.error('Error cancelling invoice:', error);
      
      return {
        success: false,
        error: error.message || 'Error interno al cancelar factura'
      };
    }
  }
  
  /**
   * Obtener facturas por RFC
   */
  static async getInvoicesByRfc(
    rfc: string, 
    startDate?: Date, 
    endDate?: Date
  ): Promise<InvoiceResult> {
    try {
      await connectDB();
      
      const invoices = await Invoice.findByRfc(rfc, startDate, endDate);
      
      return {
        success: true,
        invoice: invoices
      };
      
    } catch (error: any) {
      console.error('Error getting invoices:', error);
      
      return {
        success: false,
        error: error.message || 'Error interno al obtener facturas'
      };
    }
  }
  
  /**
   * Obtener detalles de una factura
   */
  static async getInvoiceDetails(invoiceId: string): Promise<InvoiceResult> {
    try {
      await connectDB();
      
      const invoice = await Invoice.findById(invoiceId);
      
      if (!invoice) {
        return {
          success: false,
          error: 'Factura no encontrada'
        };
      }
      
      return {
        success: true,
        invoice: invoice
      };
      
    } catch (error: any) {
      console.error('Error getting invoice details:', error);
      
      return {
        success: false,
        error: error.message || 'Error interno al obtener detalles de factura'
      };
    }
  }
  
  /**
   * Reenviar factura por email
   */
  static async resendInvoice(invoiceId: string, email: string): Promise<InvoiceResult> {
    try {
      await connectDB();
      
      const invoice = await Invoice.findById(invoiceId);
      
      if (!invoice) {
        return {
          success: false,
          error: 'Factura no encontrada'
        };
      }
      
      if (!invoice.facturamaId) {
        return {
          success: false,
          error: 'Factura no tiene ID de Facturama'
        };
      }
      
      // Reenviar a través de Facturama
      await facturamaClient.post(`/api-lite/cfdi/${invoice.facturamaId}/email`, {
        Email: email
      });
      
      return {
        success: true,
        invoice: invoice
      };
      
    } catch (error: any) {
      console.error('Error resending invoice:', error);
      
      return {
        success: false,
        error: error.message || 'Error interno al reenviar factura'
      };
    }
  }
}
