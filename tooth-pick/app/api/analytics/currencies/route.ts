// 🎯 FASE 30: API Endpoint - Analytics de Monedas
// ✅ Endpoint para análisis de distribución por monedas

import { NextRequest, NextResponse } from 'next/server';
import { AnalyticsService } from '@/lib/services/AnalyticsService';

export async function GET(request: NextRequest) {
  try {
    // Autenticación básica (en producción usar JWT real)
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Token de autorización requerido' },
        { status: 401 }
      );
    }

    // Extraer parámetros de consulta
    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get('organizationId');
    const baseCurrency = searchParams.get('baseCurrency') || 'USD';
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    // Validar organizationId
    if (!organizationId) {
      return NextResponse.json(
        { error: 'ID de organización requerido' },
        { status: 400 }
      );
    }

    // Obtener datos del servicio de analytics
    const analyticsService = new AnalyticsService();
    
    const currencyData = await analyticsService.getCurrencyBreakdown({
      organizationId,
      currency: baseCurrency,
      ...(startDate && { dateFrom: new Date(startDate) }),
      ...(endDate && { dateTo: new Date(endDate) })
    });

    return NextResponse.json({
      success: true,
      data: currencyData,
      metadata: {
        baseCurrency,
        totalCurrencies: currencyData.length,
        dateRange: {
          startDate: startDate || 'all',
          endDate: endDate || 'all'
        }
      }
    });

  } catch (error) {
    console.error('Error en /api/analytics/currencies:', error);
    return NextResponse.json(
      { 
        error: 'Error interno del servidor',
        details: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Autenticación
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Token de autorización requerido' },
        { status: 401 }
      );
    }

    // Obtener datos del cuerpo de la solicitud
    const body = await request.json();
    const {
      organizationId,
      baseCurrency = 'USD',
      startDate,
      endDate,
      includeTrends = true
    } = body;

    // Validaciones
    if (!organizationId) {
      return NextResponse.json(
        { error: 'ID de organización requerido' },
        { status: 400 }
      );
    }

    // Obtener datos del servicio
    const analyticsService = new AnalyticsService();
    
    const currencyData = await analyticsService.getCurrencyBreakdown({
      organizationId,
      currency: baseCurrency,
      ...(startDate && { dateFrom: new Date(startDate) }),
      ...(endDate && { dateTo: new Date(endDate) })
    });

    // Calcular estadísticas adicionales
    const totalRevenue = currencyData.reduce((sum, item) => sum + item.convertedToBase, 0);
    const totalTransactions = currencyData.reduce((sum, item) => sum + item.transactionCount, 0);

    const statistics = {
      totalRevenue,
      totalTransactions,
      totalCurrencies: currencyData.length,
      dominantCurrency: currencyData.length > 0 
        ? currencyData.reduce((prev, current) => 
            prev.convertedToBase > current.convertedToBase ? prev : current
          ).currency
        : null
    };

    return NextResponse.json({
      success: true,
      data: currencyData,
      statistics,
      metadata: {
        baseCurrency,
        dateRange: { startDate, endDate },
        includeTrends,
        generatedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Error en POST /api/analytics/currencies:', error);
    return NextResponse.json(
      { 
        error: 'Error procesando la solicitud',
        details: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    );
  }
}
