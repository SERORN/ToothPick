import { NextRequest, NextResponse } from 'next/server';
import { InvoicingService } from '@/lib/services/InvoicingService';
import connectDB from '@/lib/db';

/**
 * POST /api/invoice/treatment
 * Genera factura CFDI para tratamiento dental
 */
export async function POST(request: NextRequest) {
  try {
    const { 
      appointmentId,
      patientData,
      treatmentData,
      clinicData,
      paymentData,
      observations 
    } = await request.json();

    // Validación básica
    if (!patientData || !treatmentData || !clinicData) {
      return NextResponse.json({
        error: 'Datos requeridos: patientData, treatmentData, clinicData'
      }, { status: 400 });
    }

    // Validar datos fiscales del paciente
    if (!patientData.rfc || !patientData.nombreCompleto) {
      return NextResponse.json({
        error: 'RFC y nombre completo del paciente son requeridos'
      }, { status: 400 });
    }

    // Validar datos del tratamiento
    if (!treatmentData.descripcion || !treatmentData.costo || treatmentData.costo <= 0) {
      return NextResponse.json({
        error: 'Descripción y costo del tratamiento son requeridos'
      }, { status: 400 });
    }

    await connectDB();

    // Preparar datos para CFDI
    const cfdiData = {
      type: 'tratamiento' as const,
      receiver: {
        rfc: patientData.rfc,
        name: patientData.nombreCompleto,
        email: patientData.email,
        zipCode: patientData.codigoPostal || '01000', // Default CDMX si no se proporciona
        usoCfdi: patientData.usoCfdi || 'G03', // Gastos en general por defecto
        regimenFiscal: patientData.regimenFiscal || '605' // Sueldos y salarios por defecto
      },
      items: [{
        description: `Servicio odontológico: ${treatmentData.descripcion} - ${clinicData.nombre || 'Clínica Dental'}`,
        quantity: treatmentData.cantidad || 1,
        unitPrice: treatmentData.costo / (treatmentData.cantidad || 1) / 1.16, // Sin IVA
        productCode: '86121600', // Servicios de salud dental
        unitCode: 'E48', // Unidad de servicio
        unit: 'Servicio',
        taxRate: 0.16
      }],
      paymentForm: paymentData?.formaPago || '04', // Tarjeta de crédito/débito por defecto
      paymentMethod: 'PUE', // Pago en una exhibición
      observations: observations || `Tratamiento dental realizado en ${clinicData.nombre || 'clínica dental'}. ${treatmentData.notas || ''}`.trim(),
      relatedEntityId: appointmentId,
      relatedEntityType: 'appointment'
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

    // Si hay appointmentId, actualizar la cita con la referencia de factura
    if (appointmentId && result.invoice) {
      try {
        const Appointment = (await import('@/lib/models/Appointment')).default;
        await Appointment.findByIdAndUpdate(appointmentId, {
          $set: {
            'billing.invoiceId': result.invoice._id,
            'billing.invoiceUuid': result.invoice.uuid,
            'billing.invoiceTotal': result.invoice.total,
            'billing.invoiceDate': result.invoice.issueDate,
            'billing.invoiceStatus': result.invoice.status
          }
        });
      } catch (appointmentError) {
        console.error('Error updating appointment with invoice:', appointmentError);
        // No fallar la facturación por esto
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Factura de tratamiento generada exitosamente',
      invoice: {
        id: result.invoice._id,
        uuid: result.invoice.uuid,
        serie: result.invoice.serie,
        folio: result.invoice.folio,
        total: result.invoice.total,
        xmlUrl: result.invoice.xmlUrl,
        pdfUrl: result.invoice.pdfUrl,
        status: result.invoice.status,
        issueDate: result.invoice.issueDate,
        patientRfc: result.invoice.receiverRfc,
        patientName: result.invoice.receiverName
      },
      cfdi: result.cfdi ? {
        uuid: result.cfdi.Complement?.TaxStamp?.Uuid,
        total: result.cfdi.Total,
        xmlUrl: result.cfdi.Links?.Xml,
        pdfUrl: result.cfdi.Links?.Pdf
      } : undefined
    });

  } catch (error: any) {
    console.error('Error in treatment invoice API:', error);
    
    return NextResponse.json({
      error: 'Error interno del servidor',
      details: error.message
    }, { status: 500 });
  }
}

/**
 * GET /api/invoice/treatment?appointmentId=xxx&rfc=xxx&clinicId=xxx
 * Obtiene facturas de tratamientos
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const appointmentId = searchParams.get('appointmentId');
    const rfc = searchParams.get('rfc');
    const clinicId = searchParams.get('clinicId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    await connectDB();

    const Invoice = (await import('@/lib/models/Invoice')).default;
    let query: any = { type: 'tratamiento' };

    // Filtros
    if (appointmentId) {
      query.relatedEntityId = appointmentId;
      query.relatedEntityType = 'appointment';
    }

    if (rfc) {
      query.receiverRfc = rfc;
    }

    if (clinicId) {
      // Si se busca por clínica, buscar en las notas o agregar campo clinicId al modelo
      query.internalNotes = new RegExp(clinicId, 'i');
    }

    if (startDate || endDate) {
      query.issueDate = {};
      if (startDate) query.issueDate.$gte = new Date(startDate);
      if (endDate) query.issueDate.$lte = new Date(endDate);
    }

    const invoices = await Invoice.find(query)
      .sort({ issueDate: -1 })
      .limit(100); // Limitar resultados

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
        patientRfc: invoice.receiverRfc,
        patientName: invoice.receiverName,
        treatmentDescription: invoice.items[0]?.description,
        appointmentId: invoice.relatedEntityId
      })),
      totalCount: invoices.length
    });

  } catch (error: any) {
    console.error('Error getting treatment invoices:', error);
    
    return NextResponse.json({
      error: 'Error interno del servidor',
      details: error.message
    }, { status: 500 });
  }
}
