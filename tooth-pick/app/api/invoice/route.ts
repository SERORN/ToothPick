import { NextRequest, NextResponse } from 'next/server';
import { InvoicingService } from '@/lib/services/InvoicingService';
import connectDB from '@/lib/db';

/**
 * GET /api/invoice?rfc=xxx&type=xxx&startDate=xxx&endDate=xxx&status=xxx
 * Busca facturas con filtros
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const rfc = searchParams.get('rfc');
    const type = searchParams.get('type');
    const status = searchParams.get('status');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const sortBy = searchParams.get('sortBy') || 'issueDate';
    const sortOrder = searchParams.get('sortOrder') === 'asc' ? 1 : -1;

    await connectDB();

    const Invoice = (await import('@/lib/models/Invoice')).default;
    
    // Construir query
    let query: any = {};

    if (rfc) {
      query.receiverRfc = rfc;
    }

    if (type && ['saas', 'tratamiento', 'marketplace', 'toothpay'].includes(type)) {
      query.type = type;
    }

    if (status && ['draft', 'sent', 'active', 'cancelled'].includes(status)) {
      query.status = status;
    }

    if (startDate || endDate) {
      query.issueDate = {};
      if (startDate) query.issueDate.$gte = new Date(startDate);
      if (endDate) query.issueDate.$lte = new Date(endDate);
    }

    // Ejecutar query con paginación
    const skip = (page - 1) * limit;
    const sortCriteria: any = {};
    sortCriteria[sortBy] = sortOrder;

    const [invoices, totalCount] = await Promise.all([
      Invoice.find(query)
        .sort(sortCriteria)
        .skip(skip)
        .limit(limit)
        .lean(),
      Invoice.countDocuments(query)
    ]);

    // Calcular totales para estadísticas
    const [stats] = await Invoice.aggregate([
      { $match: query },
      {
        $group: {
          _id: null,
          totalAmount: { $sum: '$total' },
          subtotalAmount: { $sum: '$subtotal' },
          ivaAmount: { $sum: '$iva' },
          activeCount: {
            $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] }
          },
          cancelledCount: {
            $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] }
          }
        }
      }
    ]);

    const totalPages = Math.ceil(totalCount / limit);

    return NextResponse.json({
      success: true,
      invoices: invoices.map((invoice: any) => ({
        id: invoice._id,
        uuid: invoice.uuid,
        serie: invoice.serie,
        folio: invoice.folio,
        fullNumber: `${invoice.serie}-${invoice.folio}`,
        type: invoice.type,
        
        // Receptor
        receiverRfc: invoice.receiverRfc,
        receiverName: invoice.receiverName,
        receiverEmail: invoice.receiverEmail,
        
        // Financiero
        subtotal: invoice.subtotal,
        iva: invoice.iva,
        total: invoice.total,
        currency: invoice.currency,
        
        // Estado
        status: invoice.status,
        isCancelled: invoice.status === 'cancelled',
        isValid: ['sent', 'active'].includes(invoice.status),
        
        // Archivos
        xmlUrl: invoice.xmlUrl,
        pdfUrl: invoice.pdfUrl,
        
        // Fechas
        issueDate: invoice.issueDate,
        createdAt: invoice.createdAt,
        
        // Referencias
        relatedEntityType: invoice.relatedEntityType,
        
        // Resumen de conceptos
        itemsCount: invoice.items?.length || 0,
        firstItemDescription: invoice.items?.[0]?.description || ''
      })),
      
      // Metadata de paginación
      pagination: {
        currentPage: page,
        totalPages,
        totalItems: totalCount,
        itemsPerPage: limit,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      },
      
      // Estadísticas
      statistics: stats ? {
        totalAmount: stats.totalAmount || 0,
        subtotalAmount: stats.subtotalAmount || 0,
        ivaAmount: stats.ivaAmount || 0,
        activeCount: stats.activeCount || 0,
        cancelledCount: stats.cancelledCount || 0,
        totalCount
      } : {
        totalAmount: 0,
        subtotalAmount: 0,
        ivaAmount: 0,
        activeCount: 0,
        cancelledCount: 0,
        totalCount: 0
      },
      
      // Filtros aplicados
      filters: {
        rfc,
        type,
        status,
        startDate,
        endDate
      }
    });

  } catch (error: any) {
    console.error('Error searching invoices:', error);
    
    return NextResponse.json({
      error: 'Error interno del servidor',
      details: error.message
    }, { status: 500 });
  }
}

/**
 * POST /api/invoice/bulk-operations
 * Operaciones en lote para facturas
 */
export async function POST(request: NextRequest) {
  try {
    const { operation, invoiceIds, data } = await request.json();

    if (!operation || !invoiceIds || !Array.isArray(invoiceIds)) {
      return NextResponse.json({
        error: 'Operación y array de IDs de facturas requeridos'
      }, { status: 400 });
    }

    await connectDB();

    let results: any[] = [];

    switch (operation) {
      case 'cancel':
        if (!data.reason) {
          return NextResponse.json({
            error: 'Motivo de cancelación requerido'
          }, { status: 400 });
        }

        for (const invoiceId of invoiceIds) {
          const result = await InvoicingService.cancelInvoice(invoiceId, data.reason);
          results.push({
            invoiceId,
            success: result.success,
            error: result.error
          });
        }
        break;

      case 'resend':
        if (!data.email) {
          return NextResponse.json({
            error: 'Email requerido para reenvío'
          }, { status: 400 });
        }

        for (const invoiceId of invoiceIds) {
          const result = await InvoicingService.resendInvoice(invoiceId, data.email);
          results.push({
            invoiceId,
            success: result.success,
            error: result.error
          });
        }
        break;

      default:
        return NextResponse.json({
          error: 'Operación no válida. Operaciones disponibles: cancel, resend'
        }, { status: 400 });
    }

    const successCount = results.filter(r => r.success).length;
    const errorCount = results.filter(r => !r.success).length;

    return NextResponse.json({
      success: true,
      message: `Operación completada. ${successCount} exitosas, ${errorCount} con errores`,
      results,
      summary: {
        total: results.length,
        successful: successCount,
        failed: errorCount
      }
    });

  } catch (error: any) {
    console.error('Error in bulk operations:', error);
    
    return NextResponse.json({
      error: 'Error interno del servidor',
      details: error.message
    }, { status: 500 });
  }
}
