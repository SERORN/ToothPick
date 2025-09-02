import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import rewardStoreService from '@/lib/services/RewardStoreService'
import RewardService from '@/lib/services/RewardService'

// POST /api/reward-store/claim - Reclamar una recompensa
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Usuario no autenticado' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { rewardId, metadata } = body

    if (!rewardId) {
      return NextResponse.json(
        { error: 'ID de recompensa requerido' },
        { status: 400 }
      )
    }

    // Obtener puntos actuales del usuario
    const userStats = await RewardService.getUserRewardStats(session.user.id)
    const currentPoints = userStats.totalPoints

    // Intentar reclamar la recompensa
    const result = await rewardStoreService.claimReward({
      userId: session.user.id,
      rewardId,
      userRole: session.user.role || 'client',
      currentPoints,
      metadata
    })

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      )
    }

    // TODO: Deducir puntos del usuario usando RewardService
    // await RewardService.deductPoints(session.user.id, result.claim.pointsDeducted)

    return NextResponse.json({
      success: true,
      claim: result.claim,
      message: 'Recompensa reclamada exitosamente'
    })

  } catch (error) {
    console.error('Error claiming reward:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
