// 🎯 FASE 30: API Endpoint - Analytics Geográfico
// ✅ Endpoint para análisis de distribución geográfica

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
    const currency = searchParams.get('currency') || 'USD';
    const groupBy = searchParams.get('groupBy') || 'country';
    const sortBy = searchParams.get('sortBy') || 'totalRevenue';
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const limit = parseInt(searchParams.get('limit') || '20');

    // Validar organizationId
    if (!organizationId) {
      return NextResponse.json(
        { error: 'ID de organización requerido' },
        { status: 400 }
      );
    }

    // Obtener datos del servicio de analytics
    const analyticsService = new AnalyticsService();
    
    const geographicData = await analyticsService.getGeographicAnalytics({
      organizationId,
      currency,
      country: groupBy === 'country' ? undefined : undefined, // Se puede filtrar por país específico
      ...(startDate && { dateFrom: new Date(startDate) }),
      ...(endDate && { dateTo: new Date(endDate) })
    });

    // Mock data para análisis geográfico (en producción vendría de la BD)
    const mockGeographicData = [
      {
        country: 'Estados Unidos',
        countryCode: 'US',
        state: groupBy === 'state' ? 'California' : undefined,
        city: groupBy === 'city' ? 'Los Angeles' : undefined,
        totalRevenue: 245680,
        orderCount: 156,
        customerCount: 42,
        averageOrderValue: 1575,
        marketShare: 35.2,
        growth: 12.5,
        coordinates: { lat: 34.0522, lng: -118.2437 }
      },
      {
        country: 'México',
        countryCode: 'MX',
        state: groupBy === 'state' ? 'Ciudad de México' : undefined,
        city: groupBy === 'city' ? 'Ciudad de México' : undefined,
        totalRevenue: 128950,
        orderCount: 89,
        customerCount: 28,
        averageOrderValue: 1449,
        marketShare: 18.5,
        growth: 8.3,
        coordinates: { lat: 19.4326, lng: -99.1332 }
      },
      {
        country: 'España',
        countryCode: 'ES',
        state: groupBy === 'state' ? 'Madrid' : undefined,
        city: groupBy === 'city' ? 'Madrid' : undefined,
        totalRevenue: 95420,
        orderCount: 67,
        customerCount: 19,
        averageOrderValue: 1424,
        marketShare: 13.7,
        growth: 15.2,
        coordinates: { lat: 40.4168, lng: -3.7038 }
      },
      {
        country: 'Colombia',
        countryCode: 'CO',
        state: groupBy === 'state' ? 'Bogotá' : undefined,
        city: groupBy === 'city' ? 'Bogotá' : undefined,
        totalRevenue: 76800,
        orderCount: 54,
        customerCount: 16,
        averageOrderValue: 1422,
        marketShare: 11.0,
        growth: 6.8,
        coordinates: { lat: 4.7110, lng: -74.0721 }
      },
      {
        country: 'Argentina',
        countryCode: 'AR',
        state: groupBy === 'state' ? 'Buenos Aires' : undefined,
        city: groupBy === 'city' ? 'Buenos Aires' : undefined,
        totalRevenue: 54320,
        orderCount: 38,
        customerCount: 12,
        averageOrderValue: 1429,
        marketShare: 7.8,
        growth: 4.2,
        coordinates: { lat: -34.6118, lng: -58.3960 }
      },
      {
        country: 'Chile',
        countryCode: 'CL',
        state: groupBy === 'state' ? 'Santiago' : undefined,
        city: groupBy === 'city' ? 'Santiago' : undefined,
        totalRevenue: 42150,
        orderCount: 29,
        customerCount: 9,
        averageOrderValue: 1453,
        marketShare: 6.0,
        growth: 9.1,
        coordinates: { lat: -33.4489, lng: -70.6693 }
      },
      {
        country: 'Brasil',
        countryCode: 'BR',
        state: groupBy === 'state' ? 'São Paulo' : undefined,
        city: groupBy === 'city' ? 'São Paulo' : undefined,
        totalRevenue: 38900,
        orderCount: 26,
        customerCount: 8,
        averageOrderValue: 1496,
        marketShare: 5.6,
        growth: 11.3,
        coordinates: { lat: -23.5558, lng: -46.6396 }
      },
      {
        country: 'Perú',
        countryCode: 'PE',
        state: groupBy === 'state' ? 'Lima' : undefined,
        city: groupBy === 'city' ? 'Lima' : undefined,
        totalRevenue: 21600,
        orderCount: 18,
        customerCount: 6,
        averageOrderValue: 1200,
        marketShare: 3.1,
        growth: 7.5,
        coordinates: { lat: -12.0464, lng: -77.0428 }
      }
    ];

    // Ordenar según criterio
    mockGeographicData.sort((a, b) => {
      switch (sortBy) {
        case 'totalRevenue':
          return b.totalRevenue - a.totalRevenue;
        case 'orderCount':
          return b.orderCount - a.orderCount;
        case 'customerCount':
          return b.customerCount - a.customerCount;
        case 'growth':
          return b.growth - a.growth;
        default:
          return b.totalRevenue - a.totalRevenue;
      }
    });

    // Limitar resultados
    const limitedData = mockGeographicData.slice(0, limit);

    return NextResponse.json({
      success: true,
      data: limitedData,
      metadata: {
        currency,
        groupBy,
        sortBy,
        totalResults: limitedData.length,
        dateRange: {
          startDate: startDate || 'all',
          endDate: endDate || 'all'
        }
      }
    });

  } catch (error) {
    console.error('Error en /api/analytics/geographic:', error);
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
      currency = 'USD',
      startDate,
      endDate,
      groupBy = 'country',
      includeCoordinates = true,
      includeGrowthTrends = true
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
    
    const geographicData = await analyticsService.getGeographicAnalytics({
      organizationId,
      currency,
      ...(startDate && { dateFrom: new Date(startDate) }),
      ...(endDate && { dateTo: new Date(endDate) })
    });

    // En producción, esto vendría de la base de datos con agregaciones complejas
    const mockAnalysis = {
      totalMarkets: 15,
      dominantMarket: 'Estados Unidos',
      marketConcentration: 35.2, // % del mercado más grande
      internationalRevenue: 456780,
      domesticRevenue: 245680,
      growthMarkets: ['España', 'Brasil', 'Chile'], // Mercados con mayor crecimiento
      emergingMarkets: ['Perú', 'Ecuador', 'Uruguay'],
      coverageMetrics: {
        countries: 8,
        states: 12,
        cities: 25
      },
      seasonalityTrends: {
        'Q1': 245600,
        'Q2': 298200,
        'Q3': 267800,
        'Q4': 389400
      }
    };

    return NextResponse.json({
      success: true,
      data: mockAnalysis,
      metadata: {
        currency,
        groupBy,
        includeCoordinates,
        includeGrowthTrends,
        dateRange: { startDate, endDate },
        generatedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Error en POST /api/analytics/geographic:', error);
    return NextResponse.json(
      { 
        error: 'Error procesando la solicitud',
        details: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    );
  }
}
