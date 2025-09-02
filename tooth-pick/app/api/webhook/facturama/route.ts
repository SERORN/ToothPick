import { NextRequest, NextResponse } from 'next/server';
import { IInvoice } from '@/lib/models/Invoice';
import connectDB from '@/lib/db';
import { InvoicingService } from '@/lib/services/InvoicingService';
import mongoose from 'mongoose';

// Obtener el modelo de Invoice
const Invoice = mongoose.model<IInvoice>('Invoice');

/**
 * POST /api/webhook/facturama
 * Maneja webhooks de Facturama para actualizar estados de facturas
 */
export async function POST(request: NextRequest) {
  try {
    // Verificar que el webhook viene de Facturama
    const facturamaSecret = process.env.FACTURAMA_WEBHOOK_SECRET;
    const signature = request.headers.get('x-facturama-signature');
    
    if (!facturamaSecret || !signature) {
      console.error('❌ Missing webhook authentication');
      return NextResponse.json({
        error: 'No autorizado'
      }, { status: 401 });
    }

    const body = await request.text();
    const webhookData = JSON.parse(body);
    
    // Validar signature (implementar según documentación de Facturama)
    // const expectedSignature = crypto.createHmac('sha256', facturamaSecret).update(body).digest('hex');
    // if (signature !== expectedSignature) {
    //   return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    // }

    console.log('📨 Received Facturama webhook:', webhookData.type);

    await connectDB();

    switch (webhookData.type) {
      case 'invoice.timbrado':
        await handleInvoiceTimbrado(webhookData.data);
        break;
        
      case 'invoice.cancelado':
        await handleInvoiceCancelado(webhookData.data);
        break;
        
      case 'invoice.error':
        await handleInvoiceError(webhookData.data);
        break;
        
      case 'invoice.enviado':
        await handleInvoiceEnviado(webhookData.data);
        break;
        
      default:
        console.log('ℹ️ Unknown webhook type:', webhookData.type);
    }

    return NextResponse.json({
      success: true,
      message: 'Webhook procesado correctamente',
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('❌ Error processing Facturama webhook:', error);
    
    return NextResponse.json({
      error: 'Error procesando webhook',
      details: error.message
    }, { status: 500 });
  }
}

/**
 * Maneja el evento de timbrado exitoso
 */
async function handleInvoiceTimbrado(data: any) {
  try {
    const { Id: facturamaId, Folio, Serie, UUID, TimbreFiscalDigital } = data;
    
    const invoice = await Invoice.findOne({ 
      $or: [
        { facturamaId },
        { 'cfdi.serie': Serie, 'cfdi.folio': Folio }
      ]
    });

    if (!invoice) {
      console.error('❌ Invoice not found for timbrado:', { facturamaId, Serie, Folio });
      return;
    }

    // Actualizar con datos del timbrado
    invoice.status = 'active';
    invoice.cfdi.uuid = UUID;
    invoice.cfdi.timbreFiscalDigital = TimbreFiscalDigital;
    invoice.facturamaId = facturamaId;
    invoice.updatedAt = new Date();

    await invoice.save();

    console.log('✅ Invoice timbrado updated:', invoice.invoiceNumber);

  } catch (error) {
    console.error('❌ Error handling invoice timbrado:', error);
  }
}

/**
 * Maneja el evento de cancelación
 */
async function handleInvoiceCancelado(data: any) {
  try {
    const { Id: facturamaId, UUID, Motivo, Folio } = data;
    
    const invoice = await Invoice.findOne({ 
      $or: [
        { facturamaId },
        { 'cfdi.uuid': UUID }
      ]
    });

    if (!invoice) {
      console.error('❌ Invoice not found for cancellation:', { facturamaId, UUID });
      return;
    }

    // Actualizar estado de cancelación
    invoice.status = 'cancelled';
    invoice.cancellation = {
      cancelledAt: new Date(),
      reason: Motivo || 'Cancelado por SAT',
      facturamaResponse: data
    };
    invoice.updatedAt = new Date();

    await invoice.save();

    console.log('✅ Invoice cancellation updated:', invoice.invoiceNumber);

  } catch (error) {
    console.error('❌ Error handling invoice cancellation:', error);
  }
}

/**
 * Maneja errores de procesamiento
 */
async function handleInvoiceError(data: any) {
  try {
    const { Id: facturamaId, Error, Folio } = data;
    
    const invoice = await Invoice.findOne({ facturamaId });

    if (!invoice) {
      console.error('❌ Invoice not found for error:', facturamaId);
      return;
    }

    // Actualizar con error
    invoice.status = 'error';
    invoice.errorDetails = {
      message: Error.Mensaje || 'Error en Facturama',
      code: Error.Codigo,
      details: data,
      occurredAt: new Date()
    };
    invoice.updatedAt = new Date();

    await invoice.save();

    console.log('❌ Invoice error updated:', invoice.invoiceNumber);

  } catch (error) {
    console.error('❌ Error handling invoice error:', error);
  }
}

/**
 * Maneja el evento de envío por email
 */
async function handleInvoiceEnviado(data: any) {
  try {
    const { Id: facturamaId, Email, FechaEnvio } = data;
    
    const invoice = await Invoice.findOne({ facturamaId });

    if (!invoice) {
      console.error('❌ Invoice not found for sent event:', facturamaId);
      return;
    }

    // Actualizar información de envío
    if (!invoice.emailHistory) {
      invoice.emailHistory = [];
    }

    invoice.emailHistory.push({
      sentAt: new Date(FechaEnvio),
      sentTo: Email,
      status: 'sent',
      provider: 'facturama'
    });

    invoice.updatedAt = new Date();
    await invoice.save();

    console.log('📧 Invoice email sent updated:', invoice.invoiceNumber);

  } catch (error) {
    console.error('❌ Error handling invoice sent event:', error);
  }
}

/**
 * GET /api/webhook/facturama/test
 * Endpoint para probar la configuración del webhook
 */
export async function GET() {
  return NextResponse.json({
    message: 'Facturama webhook endpoint is active',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV
  });
}
