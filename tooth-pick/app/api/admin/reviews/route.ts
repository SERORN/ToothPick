import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { connectToDatabase } from '@/lib/db'
import Review from '@/lib/models/Review'

// GET /api/admin/reviews - Obtener todas las reseñas para moderación
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Acceso denegado' },
        { status: 403 }
      )
    }

    await connectToDatabase()

    const reviews = await Review.find({})
      .populate('productId', 'name brand')
      .populate('userId', 'name email')
      .populate('moderatedBy', 'name')
      .sort({ createdAt: -1 })

    return NextResponse.json(reviews)

  } catch (error) {
    console.error('Error al obtener reseñas:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
