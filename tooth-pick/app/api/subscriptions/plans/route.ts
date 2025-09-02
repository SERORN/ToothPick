// 🎯 FASE 31: API - Obtener Planes de Suscripción
// ✅ Endpoint para listar planes disponibles según rol del usuario

import { NextRequest, NextResponse } from 'next/server';
import { SubscriptionService } from '@/lib/services/SubscriptionService';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }
    
    const { searchParams } = new URL(request.url);
    const currency = searchParams.get('currency') || 'USD';
    const userRole = searchParams.get('role') || session.user.role || 'clinic';
    
    const plans = await SubscriptionService.getAvailablePlans(userRole, currency);
    
    return NextResponse.json({
      success: true,
      data: {
        plans,
        currency,
        userRole
      }
    });
    
  } catch (error: any) {
    console.error('Error al obtener planes:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Error interno del servidor',
        details: error.message 
      },
      { status: 500 }
    );
  }
}
