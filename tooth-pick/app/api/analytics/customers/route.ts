// 🎯 FASE 30: API Endpoint - Analytics de Clientes
// ✅ Endpoint para análisis de comportamiento de clientes

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
    const sortBy = searchParams.get('sortBy') || 'totalSpent';
    const type = searchParams.get('type');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const limit = parseInt(searchParams.get('limit') || '50');

    // Validar organizationId
    if (!organizationId) {
      return NextResponse.json(
        { error: 'ID de organización requerido' },
        { status: 400 }
      );
    }

    // Obtener datos del servicio de analytics
    const analyticsService = new AnalyticsService();
    
    const customerData = await analyticsService.getCustomerAnalytics({
      organizationId,
      currency,
      ...(startDate && { dateFrom: new Date(startDate) }),
      ...(endDate && { dateTo: new Date(endDate) })
    });

    // Mock data para clientes (en producción vendría de la BD)
    const mockCustomers = [
      {
        id: '1',
        name: 'Dr. Juan Pérez',
        email: 'juan.perez@dental.com',
        type: 'dentist' as const,
        totalSpent: 15420,
        orderCount: 12,
        averageOrderValue: 1285,
        lastPurchase: '2024-01-15',
        loyaltyScore: 85,
        status: 'active' as const,
        lifetimeValue: 18500,
        preferredPaymentMethod: 'credit_card',
        currency: 'USD'
      },
      {
        id: '2',
        name: 'Clínica Dental Salud',
        email: 'admin@clinicasalud.com',
        type: 'clinic' as const,
        totalSpent: 45680,
        orderCount: 28,
        averageOrderValue: 1631,
        lastPurchase: '2024-01-20',
        loyaltyScore: 92,
        status: 'active' as const,
        lifetimeValue: 52000,
        preferredPaymentMethod: 'bank_transfer',
        currency: 'USD'
      },
      {
        id: '3',
        name: 'Distribuidora Dental Norte',
        email: 'ventas@dentalnorte.com',
        type: 'distributor' as const,
        totalSpent: 128950,
        orderCount: 85,
        averageOrderValue: 1517,
        lastPurchase: '2024-01-22',
        loyaltyScore: 78,
        status: 'active' as const,
        lifetimeValue: 145000,
        preferredPaymentMethod: 'invoice',
        currency: 'USD'
      },
      {
        id: '4',
        name: 'Dr. María González',
        email: 'maria.gonzalez@mail.com',
        type: 'dentist' as const,
        totalSpent: 8750,
        orderCount: 6,
        averageOrderValue: 1458,
        lastPurchase: '2023-12-10',
        loyaltyScore: 65,
        status: 'at_risk' as const,
        lifetimeValue: 9200,
        preferredPaymentMethod: 'credit_card',
        currency: 'USD'
      },
      {
        id: '5',
        name: 'Dental Center Plaza',
        email: 'info@dentalplaza.com',
        type: 'clinic' as const,
        totalSpent: 32100,
        orderCount: 19,
        averageOrderValue: 1689,
        lastPurchase: '2024-01-18',
        loyaltyScore: 88,
        status: 'active' as const,
        lifetimeValue: 38000,
        preferredPaymentMethod: 'credit_card',
        currency: 'USD'
      }
    ];

    // Filtrar por tipo si se especifica
    let filteredCustomers = mockCustomers;
    if (type && type !== 'all') {
      filteredCustomers = mockCustomers.filter(customer => customer.type === type);
    }

    // Ordenar según criterio
    filteredCustomers.sort((a, b) => {
      switch (sortBy) {
        case 'totalSpent':
          return b.totalSpent - a.totalSpent;
        case 'orderCount':
          return b.orderCount - a.orderCount;
        case 'lastPurchase':
          return new Date(b.lastPurchase).getTime() - new Date(a.lastPurchase).getTime();
        case 'loyaltyScore':
          return b.loyaltyScore - a.loyaltyScore;
        default:
          return b.totalSpent - a.totalSpent;
      }
    });

    // Limitar resultados
    filteredCustomers = filteredCustomers.slice(0, limit);

    // Generar segmentos mock
    const segments = [
      {
        segment: 'Clientes VIP',
        count: 8,
        totalValue: 245600,
        averageValue: 30700,
        color: '#3B82F6'
      },
      {
        segment: 'Clientes Regulares',
        count: 15,
        totalValue: 128450,
        averageValue: 8563,
        color: '#10B981'
      },
      {
        segment: 'Clientes Nuevos',
        count: 12,
        totalValue: 45800,
        averageValue: 3817,
        color: '#F59E0B'
      },
      {
        segment: 'En Riesgo',
        count: 5,
        totalValue: 12300,
        averageValue: 2460,
        color: '#EF4444'
      }
    ];

    return NextResponse.json({
      success: true,
      data: {
        customers: filteredCustomers,
        segments: segments
      },
      metadata: {
        currency,
        sortBy,
        type: type || 'all',
        totalResults: filteredCustomers.length,
        dateRange: {
          startDate: startDate || 'all',
          endDate: endDate || 'all'
        }
      }
    });

  } catch (error) {
    console.error('Error en /api/analytics/customers:', error);
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
      segmentBy = 'value',
      includeDetails = true
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
    
    const customerData = await analyticsService.getCustomerAnalytics({
      organizationId,
      currency,
      ...(startDate && { dateFrom: new Date(startDate) }),
      ...(endDate && { dateTo: new Date(endDate) })
    });

    // En producción, esto vendría de la base de datos
    const mockData = {
      totalCustomers: 45,
      activeCustomers: 38,
      newCustomers: 12,
      churnRate: 8.5,
      averageLifetimeValue: 12450,
      topCustomers: [
        { name: 'Distribuidora Dental Norte', value: 128950 },
        { name: 'Clínica Dental Salud', value: 45680 },
        { name: 'Dental Center Plaza', value: 32100 }
      ]
    };

    return NextResponse.json({
      success: true,
      data: mockData,
      metadata: {
        currency,
        segmentBy,
        includeDetails,
        dateRange: { startDate, endDate },
        generatedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Error en POST /api/analytics/customers:', error);
    return NextResponse.json(
      { 
        error: 'Error procesando la solicitud',
        details: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    );
  }
}
