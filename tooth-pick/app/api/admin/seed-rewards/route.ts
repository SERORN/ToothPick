import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { seedRewards, clearRewards } from '@/lib/seeds/rewardSeeder'

// POST /api/admin/seed-rewards - Seed initial rewards data
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Usuario no autenticado' },
        { status: 401 }
      )
    }

    // Verificar que el usuario sea admin
    if (session.user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Solo administradores pueden ejecutar seeding' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { action } = body

    if (action === 'seed') {
      const result = await seedRewards()
      return NextResponse.json({
        success: true,
        message: `Se crearon ${result.count} recompensas exitosamente`,
        data: result
      })
    } else if (action === 'clear') {
      const result = await clearRewards()
      return NextResponse.json({
        success: true,
        message: `Se eliminaron ${result.deletedCount} recompensas`,
        data: result
      })
    } else {
      return NextResponse.json(
        { error: 'Acción no válida. Use "seed" o "clear"' },
        { status: 400 }
      )
    }

  } catch (error) {
    console.error('Error in seed rewards:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
