import { NextRequest, NextResponse } from 'next/server';
import { InvoicingService } from '@/lib/services/InvoicingService';
import connectDB from '@/lib/db';

/**
 * GET /api/invoice/[invoiceId]
 * Obtiene detalles de una factura específica
 */
export async function GET(
  request: NextRequest, 
  { params }: { params: { invoiceId: string } }
) {
  try {
    const { invoiceId } = params;

    if (!invoiceId) {
      return NextResponse.json({
        error: 'ID de factura requerido'
      }, { status: 400 });
    }

    const result = await InvoicingService.getInvoiceDetails(invoiceId);

    if (!result.success) {
      return NextResponse.json({
        error: result.error
      }, { status: result.error === 'Factura no encontrada' ? 404 : 500 });
    }

    const invoice = result.invoice;

    return NextResponse.json({
      success: true,
      invoice: {
        id: invoice._id,
        uuid: invoice.uuid,
        serie: invoice.serie,
        folio: invoice.folio,
        fullNumber: invoice.fullNumber,
        type: invoice.type,
        
        // Emisor
        emitterRfc: invoice.emitterRfc,
        emitterName: invoice.emitterName,
        
        // Receptor
        receiverRfc: invoice.receiverRfc,
        receiverName: invoice.receiverName,
        receiverEmail: invoice.receiverEmail,
        usoCfdi: invoice.usoCfdi,
        regimenFiscal: invoice.regimenFiscal,
        
        // Financiero
        subtotal: invoice.subtotal,
        iva: invoice.iva,
        total: invoice.total,
        currency: invoice.currency,
        
        // Archivos
        xmlUrl: invoice.xmlUrl,
        pdfUrl: invoice.pdfUrl,
        
        // Estado
        status: invoice.status,
        isCancelled: invoice.isCancelled,
        isValid: invoice.isValid,
        cancelReason: invoice.cancelReason,
        cancelDate: invoice.cancelDate,
        
        // Referencias
        relatedEntityId: invoice.relatedEntityId,
        relatedEntityType: invoice.relatedEntityType,
        
        // Conceptos
        items: invoice.items,
        
        // Pago
        paymentForm: invoice.paymentForm,
        paymentMethod: invoice.paymentMethod,
        paymentConditions: invoice.paymentConditions,
        
        // Fechas
        issueDate: invoice.issueDate,
        createdAt: invoice.createdAt,
        updatedAt: invoice.updatedAt,
        
        // Timbre fiscal
        timbreFiscalDigital: invoice.timbreFiscalDigital,
        
        // Notas
        observations: invoice.observations,
        internalNotes: invoice.internalNotes
      }
    });

  } catch (error: any) {
    console.error('Error getting invoice details:', error);
    
    return NextResponse.json({
      error: 'Error interno del servidor',
      details: error.message
    }, { status: 500 });
  }
}

/**
 * DELETE /api/invoice/[invoiceId]
 * Cancela una factura
 */
export async function DELETE(
  request: NextRequest, 
  { params }: { params: { invoiceId: string } }
) {
  try {
    const { invoiceId } = params;
    const { reason } = await request.json();

    if (!invoiceId) {
      return NextResponse.json({
        error: 'ID de factura requerido'
      }, { status: 400 });
    }

    if (!reason || reason.trim().length < 3) {
      return NextResponse.json({
        error: 'Motivo de cancelación requerido (mínimo 3 caracteres)'
      }, { status: 400 });
    }

    const result = await InvoicingService.cancelInvoice(invoiceId, reason);

    if (!result.success) {
      return NextResponse.json({
        error: result.error
      }, { status: result.error === 'Factura no encontrada' ? 404 : 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Factura cancelada exitosamente',
      invoice: {
        id: result.invoice._id,
        uuid: result.invoice.uuid,
        status: result.invoice.status,
        cancelReason: result.invoice.cancelReason,
        cancelDate: result.invoice.cancelDate
      }
    });

  } catch (error: any) {
    console.error('Error cancelling invoice:', error);
    
    return NextResponse.json({
      error: 'Error interno del servidor',
      details: error.message
    }, { status: 500 });
  }
}

/**
 * POST /api/invoice/[invoiceId]/resend
 * Reenvía una factura por email
 */
export async function POST(
  request: NextRequest, 
  { params }: { params: { invoiceId: string } }
) {
  try {
    const { invoiceId } = params;
    const { email } = await request.json();

    if (!invoiceId) {
      return NextResponse.json({
        error: 'ID de factura requerido'
      }, { status: 400 });
    }

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({
        error: 'Email válido requerido'
      }, { status: 400 });
    }

    const result = await InvoicingService.resendInvoice(invoiceId, email);

    if (!result.success) {
      return NextResponse.json({
        error: result.error
      }, { status: result.error === 'Factura no encontrada' ? 404 : 500 });
    }

    return NextResponse.json({
      success: true,
      message: `Factura reenviada exitosamente a ${email}`,
      invoice: {
        id: result.invoice._id,
        uuid: result.invoice.uuid,
        receiverEmail: email
      }
    });

  } catch (error: any) {
    console.error('Error resending invoice:', error);
    
    return NextResponse.json({
      error: 'Error interno del servidor',
      details: error.message
    }, { status: 500 });
  }
}
