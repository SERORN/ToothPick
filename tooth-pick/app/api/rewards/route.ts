import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import dbConnect from '@/lib/db'
import RewardService from '@/lib/services/RewardService'

// GET /api/rewards - Obtener puntos y estadísticas del usuario
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      )
    }

    if (session.user.role !== 'customer') {
      return NextResponse.json(
        { error: 'Solo clientes pueden acceder a recompensas' },
        { status: 403 }
      )
    }

    await dbConnect()

    const stats = await RewardService.getUserRewardStats(session.user.id)

    return NextResponse.json({
      ...stats,
      redemptionRules: {
        minRedemption: RewardService.REDEMPTION_CONFIG.MIN_REDEMPTION,
        pointsToMxn: RewardService.REDEMPTION_CONFIG.POINTS_TO_PESOS,
        maxDiscountPercent: RewardService.REDEMPTION_CONFIG.MAX_DISCOUNT_PERCENT
      }
    })

  } catch (error) {
    console.error('Error obteniendo recompensas:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

// POST /api/rewards - Redimir puntos (simulación)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== 'customer') {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      )
    }

    const { pointsToRedeem, orderTotal } = await request.json()

    if (!pointsToRedeem || !orderTotal) {
      return NextResponse.json(
        { error: 'Puntos y total de orden requeridos' },
        { status: 400 }
      )
    }

    await dbConnect()

    const result = await RewardService.redeemPointsForDiscount(
      session.user.id,
      pointsToRedeem,
      orderTotal
    )

    return NextResponse.json({
      success: true,
      discount: result.discount,
      pointsUsed: result.pointsUsed,
      message: `Descuento de $${result.discount.toFixed(2)} MXN aplicado usando ${result.pointsUsed} puntos`
    })

  } catch (error: any) {
    console.error('Error redimiendo puntos:', error)
    return NextResponse.json(
      { error: error.message || 'Error interno del servidor' },
      { status: 400 }
    )
  }
}
