// 📊 FASE 39: API para exportar datos analíticos
// GET /api/analytics/export - Exportar datos en formato CSV/JSON

import { NextRequest, NextResponse } from 'next/server';
import AnalyticsService, { ExportOptions } from '@/lib/services/AnalyticsService';
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

    // Solo admins y providers pueden exportar datos
    if (!['admin', 'provider'].includes(session.user.role)) {
      return NextResponse.json(
        { error: 'Forbidden - Insufficient permissions' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format') || 'csv';
    const period = searchParams.get('period') || 'daily';
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const userRole = searchParams.get('userRole');

    // Validar fechas requeridas
    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: 'Start date and end date are required' },
        { status: 400 }
      );
    }

    // Preparar opciones de exportación
    const exportOptions: ExportOptions = {
      format: format as any,
      period: period as any,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      includeMetadata: true,
      filters: {
        userRole: userRole as any
      }
    };

    if (format === 'csv') {
      // Exportar como CSV
      const csvData = await AnalyticsService.exportToCSV(exportOptions);
      
      return new NextResponse(csvData, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="analytics-${period}-${startDate}-${endDate}.csv"`
        }
      });
    } else {
      // Exportar como JSON
      const jsonData = await AnalyticsService.getSystemStats();
      
      return NextResponse.json({
        success: true,
        data: jsonData,
        exportOptions,
        timestamp: new Date().toISOString()
      });
    }

  } catch (error) {
    console.error('Error exporting analytics data:', error);
    return NextResponse.json(
      { error: 'Failed to export analytics data' },
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

    // Solo admins pueden limpiar datos antiguos
    if (session.user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Forbidden - Admin access required' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { action, daysToKeep = 730 } = body;

    if (action === 'cleanup') {
      // Limpiar eventos antiguos
      const deletedCount = await AnalyticsService.cleanupOldEvents(daysToKeep);

      return NextResponse.json({
        success: true,
        deletedCount,
        message: `Cleaned up ${deletedCount} old analytics events`
      });
    }

    return NextResponse.json(
      { error: 'Invalid action' },
      { status: 400 }
    );

  } catch (error) {
    console.error('Error performing analytics maintenance:', error);
    return NextResponse.json(
      { error: 'Failed to perform analytics maintenance' },
      { status: 500 }
    );
  }
}
