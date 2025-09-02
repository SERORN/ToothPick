import { NextRequest, NextResponse } from 'next/server';
import { seedGamificationData } from '@/lib/seeds/gamificationSeed';

export async function POST(request: NextRequest) {
  try {
    // Solo permitir en desarrollo o con una clave especial
    const { searchParams } = new URL(request.url);
    const force = searchParams.get('force') === 'true';
    
    if (process.env.NODE_ENV === 'production' && !force) {
      return NextResponse.json({
        success: false,
        message: 'Seed solo disponible en desarrollo'
      }, { status: 403 });
    }

    const result = await seedGamificationData();
    
    return NextResponse.json({
      success: true,
      message: 'Datos de gamificación insertados exitosamente',
      ...result
    });
  } catch (error) {
    console.error('Error en seed:', error);
    return NextResponse.json({
      success: false,
      message: 'Error insertando datos de gamificación',
      error: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 });
  }
}
