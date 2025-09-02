import { NextRequest, NextResponse } from 'next/server';
import { createDefaultTracks } from '@/lib/services/createDefaultTracks';
import dbConnect from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    await dbConnect();
    
    const success = await createDefaultTracks();
    
    if (success) {
      return NextResponse.json({
        success: true,
        message: 'Tracks por defecto creados exitosamente'
      });
    } else {
      return NextResponse.json({
        success: false,
        message: 'Error creando tracks por defecto'
      }, { status: 500 });
    }
  } catch (error) {
    console.error('Error en /api/onboarding/initialize:', error);
    return NextResponse.json({
      success: false,
      message: 'Error interno del servidor',
      error: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Endpoint para inicializar tracks por defecto',
    method: 'POST'
  });
}
