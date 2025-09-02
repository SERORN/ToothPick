import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import dbConnect from '@/lib/db'
import RewardPoint from '@/lib/models/RewardPoint'
import User from '@/lib/models/User'
import RewardService from '@/lib/services/RewardService'

// GET /api/admin/rewards - Obtener estadísticas de recompensas de todos los usuarios
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Acceso denegado' },
        { status: 403 }
      )
    }

    await dbConnect()

    // Obtener todos los usuarios que son clientes
    const customers = await User.find({ role: 'customer' }, '_id name email createdAt')

    // Obtener estadísticas de recompensas para cada usuario
    const usersWithRewards = await Promise.all(
      customers.map(async (user) => {
        const totalPoints = await RewardPoint.getUserTotalPoints(user._id.toString())
        
        // Calcular puntos ganados (positivos)
        const earnedResult = await RewardPoint.aggregate([
          { $match: { userId: user._id, points: { $gt: 0 } } },
          { $group: { _id: null, total: { $sum: '$points' } } }
        ])
        const totalEarned = earnedResult[0]?.total || 0

        // Calcular puntos redimidos (negativos)
        const redeemedResult = await RewardPoint.aggregate([
          { $match: { userId: user._id, points: { $lt: 0 } } },
          { $group: { _id: null, total: { $sum: '$points' } } }
        ])
        const totalRedeemed = Math.abs(redeemedResult[0]?.total || 0)

        // Obtener última actividad
        const lastActivity = await RewardPoint.findOne(
          { userId: user._id },
          {},
          { sort: { createdAt: -1 } }
        )

        // Calcular nivel de lealtad
        const loyaltyLevel = RewardService.calculateLoyaltyLevel(totalPoints)

        return {
          _id: user._id,
          name: user.name,
          email: user.email,
          totalPoints,
          totalEarned,
          totalRedeemed,
          loyaltyLevel,
          lastActivity: lastActivity?.createdAt || user.createdAt
        }
      })
    )

    // Ordenar por puntos totales (descendente)
    usersWithRewards.sort((a, b) => b.totalPoints - a.totalPoints)

    return NextResponse.json(usersWithRewards)

  } catch (error) {
    console.error('Error obteniendo estadísticas de recompensas:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
