import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { connectToDatabase } from '@/lib/db'
import Review from '@/lib/models/Review'

// PATCH /api/admin/reviews/[id] - Moderar reseña (aprobar/rechazar)
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Acceso denegado' },
        { status: 403 }
      )
    }

    const { action, moderatedBy } = await request.json()
    
    if (!['approve', 'reject'].includes(action)) {
      return NextResponse.json(
        { error: 'Acción inválida' },
        { status: 400 }
      )
    }

    await connectToDatabase()

    const review = await Review.findByIdAndUpdate(
      params.id,
      {
        isModerated: true,
        isApproved: action === 'approve',
        moderatedBy,
        moderatedAt: new Date()
      },
      { new: true }
    )

    if (!review) {
      return NextResponse.json(
        { error: 'Reseña no encontrada' },
        { status: 404 }
      )
    }

    return NextResponse.json(review)

  } catch (error) {
    console.error('Error al moderar reseña:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

// DELETE /api/admin/reviews/[id] - Eliminar reseña
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Acceso denegado' },
        { status: 403 }
      )
    }

    await connectToDatabase()

    const review = await Review.findByIdAndDelete(params.id)

    if (!review) {
      return NextResponse.json(
        { error: 'Reseña no encontrada' },
        { status: 404 }
      )
    }

    return NextResponse.json({ message: 'Reseña eliminada exitosamente' })

  } catch (error) {
    console.error('Error al eliminar reseña:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
