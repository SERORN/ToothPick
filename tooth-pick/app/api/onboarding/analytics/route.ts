import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import OnboardingService from '@/lib/services/OnboardingService';

export async function GET(request: NextRequest) {
  try {
    await dbConnect();
    
    const { searchParams } = new URL(request.url);
    const timeRange = searchParams.get('timeRange') || '30d';
    const role = searchParams.get('role') || 'all';
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({
        success: false,
        message: 'ID de usuario requerido'
      }, { status: 400 });
    }

    // Calcular fechas según el rango
    const now = new Date();
    let startDate = new Date();
    
    switch (timeRange) {
      case '7d':
        startDate.setDate(now.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(now.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(now.getDate() - 90);
        break;
      case '1y':
        startDate.setFullYear(now.getFullYear() - 1);
        break;
      default:
        startDate.setDate(now.getDate() - 30);
    }

    const analytics = await OnboardingService.getAnalyticsDashboard(userId, {
      startDate,
      endDate: now,
      role: role !== 'all' ? role : undefined
    });

    return NextResponse.json(analytics);
  } catch (error) {
    console.error('Error en /api/onboarding/analytics:', error);
    return NextResponse.json({
      success: false,
      message: 'Error interno del servidor',
      error: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 });
  }
}
