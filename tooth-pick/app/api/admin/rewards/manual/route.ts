import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import dbConnect from '@/lib/db'
import RewardService from '@/lib/services/RewardService'

// POST /api/admin/rewards/manual - Agregar puntos manualmente
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Acceso denegado' },
        { status: 403 }
      )
    }

    const { userId, points, description } = await request.json()

    if (!userId || !points || !description) {
      return NextResponse.json(
        { error: 'Usuario, puntos y descripción son requeridos' },
        { status: 400 }
      )
    }

    if (typeof points !== 'number' || points === 0) {
      return NextResponse.json(
        { error: 'Los puntos deben ser un número diferente de cero' },
        { status: 400 }
      )
    }

    await dbConnect()

    await RewardService.addManualPoints(
      userId,
      points,
      description,
      session.user.id
    )

    return NextResponse.json({
      success: true,
      message: `${points > 0 ? 'Agregados' : 'Deducidos'} ${Math.abs(points)} puntos exitosamente`
    })

  } catch (error: any) {
    console.error('Error agregando puntos manuales:', error)
    return NextResponse.json(
      { error: error.message || 'Error interno del servidor' },
      { status: 400 }
    )
  }
}
