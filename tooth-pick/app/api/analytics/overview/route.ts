// 📊 FASE 30: API Overview Analytics
// ✅ Endpoint principal para métricas generales

import { NextRequest, NextResponse } from 'next/server';
import AnalyticsService from '@/lib/services/AnalyticsService';
import { getUserFromRequest, getUserOrganization, hasPermission } from '@/lib/utils/auth';

// Funciones auxiliares para manejo de fechas
function subDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() - days);
  return result;
}

function subWeeks(date: Date, weeks: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() - (weeks * 7));
  return result;
}

function subMonths(date: Date, months: number): Date {
  const result = new Date(date);
  result.setMonth(result.getMonth() - months);
  return result;
}

/**
 * 📈 GET /api/analytics/overview
 * Obtener métricas generales de overview
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

    // Verificar permisos de analytics
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
    
    // Parámetros de filtro
    const period = searchParams.get('period') || 'month'; // day, week, month, year
    const currency = searchParams.get('currency') || 'USD';
    const paymentMethod = searchParams.get('paymentMethod');
    const status = searchParams.get('status');
    const country = searchParams.get('country');
    
    // Calcular fechas según período
    const endDate = new Date();
    let startDate: Date;
    
    switch (period) {
      case 'day':
        startDate = subDays(endDate, 1);
        break;
      case 'week':
        startDate = subWeeks(endDate, 1);
        break;
      case 'month':
        startDate = subMonths(endDate, 1);
        break;
      case 'quarter':
        startDate = subMonths(endDate, 3);
        break;
      case 'year':
        startDate = subMonths(endDate, 12);
        break;
      default:
        startDate = subMonths(endDate, 1);
    }

    // Fechas personalizadas si se proporcionan
    const customStartDate = searchParams.get('startDate');
    const customEndDate = searchParams.get('endDate');
    
    if (customStartDate) {
      startDate = new Date(customStartDate);
    }
    if (customEndDate) {
      endDate.setTime(new Date(customEndDate).getTime());
    }

    const filters = {
      organizationId: organization.id,
      dateFrom: startDate,
      dateTo: endDate,
      ...(paymentMethod && { paymentMethod }),
      ...(status && { status }),
      ...(country && { country })
    };

    const analyticsService = new AnalyticsService();
    const overview = await analyticsService.getOverviewMetrics(filters, currency);

    return NextResponse.json({
      success: true,
      data: overview,
      filters: {
        period,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        currency,
        organizationId: organization.id,
        ...(paymentMethod && { paymentMethod }),
        ...(status && { status }),
        ...(country && { country })
      }
    });

  } catch (error) {
    console.error('Error getting overview analytics:', error);
    return NextResponse.json(
      { 
        error: 'Error obteniendo métricas de overview',
        details: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    );
  }
}

/**
 * 📊 POST /api/analytics/overview
 * Obtener métricas con filtros complejos
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
      dateFrom,
      dateTo,
      currency = 'USD',
      paymentMethod,
      status,
      country,
      compareWithPrevious = false
    } = body;

    // Validar fechas
    if (!dateFrom || !dateTo) {
      return NextResponse.json(
        { error: 'dateFrom y dateTo son requeridos' },
        { status: 400 }
      );
    }

    const startDate = new Date(dateFrom);
    const endDate = new Date(dateTo);

    if (startDate >= endDate) {
      return NextResponse.json(
        { error: 'La fecha de inicio debe ser anterior a la fecha de fin' },
        { status: 400 }
      );
    }

    const filters = {
      organizationId: organization.id,
      dateFrom: startDate,
      dateTo: endDate,
      ...(paymentMethod && { paymentMethod }),
      ...(status && { status }),
      ...(country && { country })
    };

    const analyticsService = new AnalyticsService();
    
    let result: any = {
      current: await analyticsService.getOverviewMetrics(filters, currency)
    };

    // Si se solicita comparación con período anterior
    if (compareWithPrevious) {
      const periodDuration = endDate.getTime() - startDate.getTime();
      const previousEndDate = new Date(startDate.getTime() - 1);
      const previousStartDate = new Date(previousEndDate.getTime() - periodDuration);

      const previousFilters = {
        ...filters,
        dateFrom: previousStartDate,
        dateTo: previousEndDate
      };

      result.previous = await analyticsService.getOverviewMetrics(previousFilters, currency);
      
      // Calcular diferencias
      result.comparison = {
        revenueChange: result.current.totalRevenue - result.previous.totalRevenue,
        revenueChangePercent: result.previous.totalRevenue > 0 
          ? ((result.current.totalRevenue - result.previous.totalRevenue) / result.previous.totalRevenue) * 100 
          : 0,
        transactionChange: result.current.totalTransactions - result.previous.totalTransactions,
        transactionChangePercent: result.previous.totalTransactions > 0
          ? ((result.current.totalTransactions - result.previous.totalTransactions) / result.previous.totalTransactions) * 100
          : 0,
        conversionRateChange: result.current.conversionRate - result.previous.conversionRate
      };
    }

    return NextResponse.json({
      success: true,
      data: result,
      filters: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        currency,
        organizationId: organization.id,
        ...(paymentMethod && { paymentMethod }),
        ...(status && { status }),
        ...(country && { country })
      }
    });

  } catch (error) {
    console.error('Error getting overview analytics (POST):', error);
    return NextResponse.json(
      { 
        error: 'Error obteniendo métricas de overview',
        details: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    );
  }
}
