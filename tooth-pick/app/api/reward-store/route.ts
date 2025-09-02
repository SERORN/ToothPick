import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import rewardStoreService from '@/lib/services/RewardStoreService'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Usuario no autenticado' },
        { status: 401 }
      )
    }

    const searchParams = request.nextUrl.searchParams
    const type = searchParams.get('type') || undefined
    const role = session.user.role || 'client'
    const minCost = searchParams.get('minCost') ? parseInt(searchParams.get('minCost')!) : undefined
    const maxCost = searchParams.get('maxCost') ? parseInt(searchParams.get('maxCost')!) : undefined
    const search = searchParams.get('search') || undefined
    const available = searchParams.get('available') === 'true'

    const rewards = await rewardStoreService.getAvailableRewards({
      type,
      role,
      minCost,
      maxCost,
      search,
      available
    })

    return NextResponse.json({
      success: true,
      rewards,
      total: rewards.length
    })

  } catch (error) {
    console.error('Error fetching rewards:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
