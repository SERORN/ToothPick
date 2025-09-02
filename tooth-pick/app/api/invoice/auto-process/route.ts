import { NextRequest, NextResponse } from 'next/server';
import { AutoInvoicingService } from '@/lib/services/AutoInvoicingService';

/**
 * POST /api/invoice/auto-process
 * Ejecuta el proceso de facturación automática
 */
export async function POST(request: NextRequest) {
  try {
    // Verificar autorización (en producción, usar API key o autenticación)
    const authHeader = request.headers.get('authorization');
    const expectedToken = process.env.AUTO_INVOICING_TOKEN || 'dev-token-123';
    
    if (authHeader !== `Bearer ${expectedToken}`) {
      return NextResponse.json({
        error: 'No autorizado'
      }, { status: 401 });
    }

    console.log('🔄 Starting automatic invoicing process...');
    
    const result = await AutoInvoicingService.processAutomaticInvoicing();
    
    // Log de resultados
    console.log('📊 Automatic invoicing results:', result);
    
    // Si hay errores, loggear detalles
    if (result.failed > 0) {
      console.error('❌ Invoicing errors:', result.errors);
    }
    
    return NextResponse.json({
      success: true,
      message: `Procesamiento completado: ${result.successful} exitosas, ${result.failed} fallidas`,
      results: {
        processed: result.processed,
        successful: result.successful,
        failed: result.failed,
        successRate: result.processed > 0 ? (result.successful / result.processed * 100).toFixed(2) + '%' : '0%'
      },
      errors: result.errors,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('❌ Error in automatic invoicing process:', error);
    
    return NextResponse.json({
      error: 'Error interno del servidor',
      details: error.message,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

/**
 * GET /api/invoice/auto-process/stats
 * Obtiene estadísticas de facturación automática
 */
export async function GET(request: NextRequest) {
  try {
    const stats = await AutoInvoicingService.getAutoInvoicingStats();
    
    return NextResponse.json({
      success: true,
      statistics: {
        ...stats,
        autoInvoicingRate: stats.totalSubscriptions > 0 ? 
          (stats.autoInvoicingEnabled / stats.totalSubscriptions * 100).toFixed(2) + '%' : 
          '0%',
        averageRevenuePerInvoice: stats.invoicedThisMonth > 0 ? 
          Math.round(stats.totalRevenue / stats.invoicedThisMonth) : 
          0
      },
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('Error getting auto invoicing stats:', error);
    
    return NextResponse.json({
      error: 'Error interno del servidor',
      details: error.message
    }, { status: 500 });
  }
}
