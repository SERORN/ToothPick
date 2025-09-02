import { NextRequest, NextResponse } from 'next/server';
import { InvoicingService } from '@/lib/services/InvoicingService';
import ClinicSubscription from '@/lib/models/ClinicSubscription';
import { SubscriptionPlanUtils } from '@/lib/config/subscription-plans';
import connectDB from '@/lib/db';

/**
 * POST /api/invoice/saas
 * Genera factura CFDI para suscripción SaaS
 */
export async function POST(request: NextRequest) {
  try {
    const { 
      subscriptionId, 
      clinicData, 
      planId,
      paymentReference,
      observations 
    } = await request.json();

    // Validación básica
    if (!subscriptionId || !clinicData || !planId) {
      return NextResponse.json({
        error: 'Datos requeridos: subscriptionId, clinicData, planId'
      }, { status: 400 });
    }

    await connectDB();

    // Obtener suscripción
    const subscription = await ClinicSubscription.findById(subscriptionId);
    if (!subscription) {
      return NextResponse.json({
        error: 'Suscripción no encontrada'
      }, { status: 404 });
    }

    // Obtener detalles del plan
    const plan = SubscriptionPlanUtils.getPlanById(planId);
    if (!plan) {
      return NextResponse.json({
        error: 'Plan no encontrado'
      }, { status: 404 });
    }

    // Validar que se requiera facturación (planes de pago)
    if (plan.price.monthly === 0) {
      return NextResponse.json({
        error: 'El plan gratuito no requiere facturación'
      }, { status: 400 });
    }

    // Validar datos fiscales del cliente
    if (!clinicData.rfc || !clinicData.nombreFiscal || !clinicData.cpFiscal) {
      return NextResponse.json({
        error: 'Datos fiscales incompletos: rfc, nombreFiscal, cpFiscal requeridos'
      }, { status: 400 });
    }

    // Preparar datos para CFDI
    const cfdiData = {
      type: 'saas' as const,
      receiver: {
        rfc: clinicData.rfc,
        name: clinicData.nombreFiscal,
        email: clinicData.email || clinicData.contactEmail,
        zipCode: clinicData.cpFiscal,
        usoCfdi: 'G03', // Gastos en general
        regimenFiscal: clinicData.regimenFiscal || '612' // Persona física con actividades empresariales
      },
      items: [{
        description: `Suscripción ToothPick - Plan ${plan.name}`,
        quantity: 1,
        unitPrice: plan.price.monthly / 1.16, // Sin IVA
        productCode: '81112500', // Servicios de acceso a software
        unitCode: 'E48', // Unidad de servicio
        unit: 'Servicio',
        taxRate: 0.16
      }],
      paymentForm: '03', // Transferencia electrónica
      paymentMethod: 'PUE', // Pago en una exhibición
      observations: observations || `Suscripción mensual ToothPick Plan ${plan.name}. Ref: ${paymentReference || 'N/A'}`,
      relatedEntityId: subscriptionId,
      relatedEntityType: 'subscription'
    };

    // Generar factura
    const result = await InvoicingService.createAndIssueInvoice(cfdiData);

    if (!result.success) {
      return NextResponse.json({
        error: 'Error al generar factura',
        details: result.error,
        validationErrors: result.details
      }, { status: 500 });
    }

    // Actualizar suscripción con referencia de factura
    if (result.invoice) {
      subscription.billing = subscription.billing || {};
      subscription.billing.invoices = subscription.billing.invoices || [];
      subscription.billing.invoices.push(result.invoice._id);
      
      subscription.billing.lastInvoiceDate = new Date();
      subscription.billing.lastInvoiceAmount = plan.price.monthly;
      
      await subscription.save();
    }

    return NextResponse.json({
      success: true,
      message: 'Factura generada exitosamente',
      invoice: {
        id: result.invoice._id,
        uuid: result.invoice.uuid,
        serie: result.invoice.serie,
        folio: result.invoice.folio,
        total: result.invoice.total,
        xmlUrl: result.invoice.xmlUrl,
        pdfUrl: result.invoice.pdfUrl,
        status: result.invoice.status,
        issueDate: result.invoice.issueDate
      },
      cfdi: result.cfdi ? {
        uuid: result.cfdi.Complement?.TaxStamp?.Uuid,
        total: result.cfdi.Total,
        xmlUrl: result.cfdi.Links?.Xml,
        pdfUrl: result.cfdi.Links?.Pdf
      } : undefined
    });

  } catch (error: any) {
    console.error('Error in SaaS invoice API:', error);
    
    return NextResponse.json({
      error: 'Error interno del servidor',
      details: error.message
    }, { status: 500 });
  }
}

/**
 * GET /api/invoice/saas?subscriptionId=xxx
 * Obtiene facturas de una suscripción específica
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const subscriptionId = searchParams.get('subscriptionId');
    const rfc = searchParams.get('rfc');

    if (!subscriptionId && !rfc) {
      return NextResponse.json({
        error: 'subscriptionId o rfc requerido'
      }, { status: 400 });
    }

    await connectDB();

    let invoices;

    if (subscriptionId) {
      // Buscar por suscripción específica
      const Invoice = (await import('@/lib/models/Invoice')).default;
      invoices = await Invoice.find({
        relatedEntityId: subscriptionId,
        relatedEntityType: 'subscription',
        type: 'saas'
      }).sort({ issueDate: -1 });
    } else if (rfc) {
      // Buscar por RFC
      const result = await InvoicingService.getInvoicesByRfc(rfc);
      if (!result.success) {
        return NextResponse.json({
          error: result.error
        }, { status: 500 });
      }
      invoices = result.invoice.filter((inv: any) => inv.type === 'saas');
    }

    return NextResponse.json({
      success: true,
      invoices: invoices.map((invoice: any) => ({
        id: invoice._id,
        uuid: invoice.uuid,
        serie: invoice.serie,
        folio: invoice.folio,
        total: invoice.total,
        status: invoice.status,
        issueDate: invoice.issueDate,
        xmlUrl: invoice.xmlUrl,
        pdfUrl: invoice.pdfUrl,
        receiverRfc: invoice.receiverRfc,
        receiverName: invoice.receiverName
      }))
    });

  } catch (error: any) {
    console.error('Error getting SaaS invoices:', error);
    
    return NextResponse.json({
      error: 'Error interno del servidor',
      details: error.message
    }, { status: 500 });
  }
}
