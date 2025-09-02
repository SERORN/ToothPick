import { NextRequest, NextResponse } from 'next/server';
import GamificationService from '@/lib/services/GamificationService';
import dbConnect from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    await dbConnect();
    
    const { searchParams } = new URL(request.url);
    const role = searchParams.get('role');
    const category = searchParams.get('category');
    const includeSecret = searchParams.get('includeSecret') === 'true';
    const userId = searchParams.get('userId');

    let badges;

    if (category) {
      const Badge = (await import('@/lib/models/Badge')).default;
      badges = await (Badge as any).getBadgesByCategory(category);
    } else {
      badges = await GamificationService.getAllBadges(role || undefined, includeSecret);
    }

    // Si se proporciona userId, marcar cuáles badges tiene el usuario
    if (userId) {
      const UserGamification = (await import('@/lib/models/UserGamification')).default;
      const userGamification = await UserGamification.findOne({ userId });
      const userBadges = userGamification?.badges || [];

      badges = badges.map((badge: any) => ({
        ...badge.toObject(),
        earned: userBadges.includes(badge.id),
        earnedAt: userGamification?.achievements
          .find((achievement: any) => achievement.badgeId === badge.id)?.earnedAt
      }));
    }

    // Filtrar información sensible para badges secretos no obtenidos
    const filteredBadges = badges.map((badge: any) => {
      if (badge.isSecret && (!userId || !badge.earned)) {
        return {
          id: badge.id,
          title: '???',
          description: 'Insignia secreta - Descúbrela completando acciones especiales',
          iconEmoji: '🔒',
          category: badge.category,
          rarity: badge.rarity,
          isSecret: true,
          earned: false
        };
      }
      return badge;
    });

    return NextResponse.json({
      success: true,
      badges: filteredBadges,
      filters: {
        role: role || 'all',
        category: category || 'all',
        includeSecret,
        userId: userId || null
      }
    });
  } catch (error) {
    console.error('Error en /api/gamification/badges:', error);
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
    const { userId, badgeId, manual = false } = body;

    if (!userId || !badgeId) {
      return NextResponse.json({
        success: false,
        message: 'ID de usuario e ID de insignia requeridos'
      }, { status: 400 });
    }

    // Solo permitir otorgamiento manual desde admin o con permisos especiales
    if (manual) {
      // Aquí se podría agregar verificación de permisos de admin
      // Por ahora permitiremos otorgamiento manual para testing
    }

    const Badge = (await import('@/lib/models/Badge')).default;
    const badge = await Badge.findOne({ id: badgeId });

    if (!badge) {
      return NextResponse.json({
        success: false,
        message: 'Insignia no encontrada'
      }, { status: 404 });
    }

    const result = await badge.awardToUser(userId);

    if (result.success) {
      // Registrar evento de otorgamiento manual
      if (manual) {
        const UserEventLog = (await import('@/lib/models/UserEventLog')).default;
        await UserEventLog.create({
          userId,
          eventType: 'manual_badge_award',
          pointsEarned: badge.pointsReward || 0,
          badgeEarned: badgeId,
          metadata: { manual: true, badgeTitle: badge.title },
          source: 'manual'
        });
      }

      return NextResponse.json({
        success: true,
        message: `Insignia "${badge.title}" otorgada exitosamente`,
        badge: badge.toObject(),
        pointsAwarded: result.pointsAwarded || 0
      });
    } else {
      return NextResponse.json({
        success: false,
        message: result.reason || 'No se pudo otorgar la insignia'
      }, { status: 400 });
    }
  } catch (error) {
    console.error('Error otorgando insignia:', error);
    return NextResponse.json({
      success: false,
      message: 'Error interno del servidor',
      error: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 });
  }
}
