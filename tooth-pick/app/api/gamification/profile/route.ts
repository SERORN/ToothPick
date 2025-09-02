import { NextRequest, NextResponse } from 'next/server';
import GamificationService from '@/lib/services/GamificationService';
import dbConnect from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    await dbConnect();
    
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({
        success: false,
        message: 'ID de usuario requerido'
      }, { status: 400 });
    }

    const profile = await GamificationService.getUserProfile(userId);

    return NextResponse.json({
      success: true,
      profile
    });
  } catch (error) {
    console.error('Error en /api/gamification/profile:', error);
    return NextResponse.json({
      success: false,
      message: 'Error interno del servidor',
      error: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await dbConnect();
    
    const body = await request.json();
    const { userId, preferences } = body;

    if (!userId) {
      return NextResponse.json({
        success: false,
        message: 'ID de usuario requerido'
      }, { status: 400 });
    }

    // Actualizar preferencias de gamificación
    const UserGamification = (await import('@/lib/models/UserGamification')).default;
    const userGamification = await UserGamification.findOne({ userId });

    if (!userGamification) {
      return NextResponse.json({
        success: false,
        message: 'Perfil de gamificación no encontrado'
      }, { status: 404 });
    }

    if (preferences) {
      userGamification.preferences = {
        ...userGamification.preferences,
        ...preferences
      };
      await userGamification.save();
    }

    return NextResponse.json({
      success: true,
      message: 'Preferencias actualizadas correctamente',
      preferences: userGamification.preferences
    });
  } catch (error) {
    console.error('Error actualizando preferencias:', error);
    return NextResponse.json({
      success: false,
      message: 'Error interno del servidor',
      error: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 });
  }
}
