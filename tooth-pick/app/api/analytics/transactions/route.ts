// 📊 FASE 30: API Transacciones Analytics
// ✅ Endpoint para análisis de transacciones por períodos

import { NextRequest, NextResponse } from 'next/server';
import AnalyticsService from '@/lib/services/AnalyticsService';
import { getUserFromRequest, getUserOrganization, hasPermission } from '@/lib/utils/auth';

// Función auxiliar para restar meses
function subMonths(date: Date, months: number): Date {
  const result = new Date(date);
  result.setMonth(result.getMonth() - months);
  return result;
}

/**
 * 💳 GET /api/analytics/transactions
 * Obtener análisis de transacciones por método de pago y series temporales
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json(
        { error: 'Usuario no autenticado' },
        { status: 401 }
      );
    }

    if (!hasPermission(user, 'analytics:read')) {
      return NextResponse.json(
        { error: 'Sin permisos para ver analytics' },
        { status: 403 }
      );
    }

    const organization = await getUserOrganization(user.id);
    if (!organization) {
      return NextResponse.json(
        { error: 'Organización no encontrada' },
        { status: 404 }
      );
    }

    const { searchParams } = new URL(request.url);
    
    const currency = searchParams.get('currency') || 'USD';
    const groupBy = searchParams.get('groupBy') as 'day' | 'week' | 'month' || 'day';
    const startDate = searchParams.get('startDate') 
      ? new Date(searchParams.get('startDate')!) 
      : subMonths(new Date(), 1);
    const endDate = searchParams.get('endDate') 
      ? new Date(searchParams.get('endDate')!) 
      : new Date();

    const filters = {
      organizationId: organization.id,
      dateFrom: startDate,
      dateTo: endDate,
      ...(searchParams.get('paymentMethod') && { paymentMethod: searchParams.get('paymentMethod')! }),
      ...(searchParams.get('status') && { status: searchParams.get('status')! }),
      ...(searchParams.get('country') && { country: searchParams.get('country')! })
    };

    const analyticsService = new AnalyticsService();

    // Obtener datos en paralelo
    const [paymentMethodAnalytics, timeSeriesData] = await Promise.all([
      analyticsService.getPaymentMethodAnalytics(filters, currency),
      analyticsService.getTimeSeriesData(filters, groupBy, currency)
    ]);

    return NextResponse.json({
      success: true,
      data: {
        paymentMethods: paymentMethodAnalytics,
        timeSeries: timeSeriesData,
        summary: {
          totalMethods: paymentMethodAnalytics.length,
          totalDataPoints: timeSeriesData.length,
          dateRange: {
            start: startDate.toISOString(),
            end: endDate.toISOString()
          },
          groupBy,
          currency
        }
      }
    });

  } catch (error) {
    console.error('Error getting transaction analytics:', error);
    return NextResponse.json(
      { 
        error: 'Error obteniendo analytics de transacciones',
        details: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    );
  }
}

/**
 * 📈 POST /api/analytics/transactions/compare
 * Comparar transacciones entre diferentes períodos o segmentos
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json(
        { error: 'Usuario no autenticado' },
        { status: 401 }
      );
    }

    if (!hasPermission(user, 'analytics:read')) {
      return NextResponse.json(
        { error: 'Sin permisos para ver analytics' },
        { status: 403 }
      );
    }

    const organization = await getUserOrganization(user.id);
    if (!organization) {
      return NextResponse.json(
        { error: 'Organización no encontrada' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const {
      periods,  // Array de objetos { label, startDate, endDate }
      currency = 'USD',
      groupBy = 'day',
      compareBy = 'paymentMethod' // 'paymentMethod' | 'currency' | 'country'
    } = body;

    if (!periods || !Array.isArray(periods) || periods.length === 0) {
      return NextResponse.json(
        { error: 'Se requiere al menos un período para comparar' },
        { status: 400 }
      );
    }

    const analyticsService = new AnalyticsService();
    const comparisonData = [];

    for (const period of periods) {
      const filters = {
        organizationId: organization.id,
        dateFrom: new Date(period.startDate),
        dateTo: new Date(period.endDate)
      };

      let data;
      switch (compareBy) {
        case 'paymentMethod':
          data = await analyticsService.getPaymentMethodAnalytics(filters, currency);
          break;
        case 'currency':
          data = await analyticsService.getCurrencyBreakdown(filters, currency);
          break;
        case 'country':
          data = await analyticsService.getGeographicAnalytics(filters, currency);
          break;
        default:
          data = await analyticsService.getPaymentMethodAnalytics(filters, currency);
      }

      comparisonData.push({
        period: period.label || `${period.startDate} to ${period.endDate}`,
        startDate: period.startDate,
        endDate: period.endDate,
        data
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        comparison: comparisonData,
        compareBy,
        currency,
        totalPeriods: periods.length
      }
    });

  } catch (error) {
    console.error('Error comparing transaction analytics:', error);
    return NextResponse.json(
      { 
        error: 'Error comparando analytics de transacciones',
        details: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    );
  }
}
