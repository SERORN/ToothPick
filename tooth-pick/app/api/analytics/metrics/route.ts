// 📊 FASE 39: API para obtener métricas y dashboard analytics
// GET /api/analytics/metrics - Obtener métricas por rol

import { NextRequest, NextResponse } from 'next/server';
import AnalyticsService from '@/lib/services/AnalyticsService';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';

export async function GET(request: NextRequest) {
  try {
    // Verificar autenticación
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const userRole = session.user.role;
    const userId = searchParams.get('userId') || session.user.id;
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    // Validar parámetros de fecha
    let dateRange;
    if (startDate && endDate) {
      dateRange = {
        startDate: new Date(startDate),
        endDate: new Date(endDate)
      };
    }

    // Obtener métricas por rol
    const metrics = await AnalyticsService.getMetricsByRole(
      userRole as any,
      userId,
      dateRange
    );

    return NextResponse.json({
      success: true,
      data: metrics
    });

  } catch (error) {
    console.error('Error getting analytics metrics:', error);
    return NextResponse.json(
      { error: 'Failed to get analytics metrics' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Verificar autenticación
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Solo admins pueden generar snapshots manualmente
    if (session.user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Forbidden - Admin access required' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { period, startDate, endDate, userRole, entityType } = body;

    // Validar campos requeridos
    if (!period || !startDate || !endDate) {
      return NextResponse.json(
        { error: 'Period, startDate, and endDate are required' },
        { status: 400 }
      );
    }

    // Generar snapshot
    const snapshot = await AnalyticsService.generateSnapshot(
      period,
      new Date(startDate),
      new Date(endDate),
      { userRole, entityType }
    );

    return NextResponse.json({
      success: true,
      data: snapshot,
      message: 'Analytics snapshot generated successfully'
    });

  } catch (error) {
    console.error('Error generating analytics snapshot:', error);
    return NextResponse.json(
      { error: 'Failed to generate analytics snapshot' },
      { status: 500 }
    );
  }
}
