import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import dbConnect from '@/lib/db'
import User from '@/lib/models/User'

export async function GET(req: NextRequest) {
  await dbConnect()
  const session = await getServerSession(authOptions)

  // Solo admins pueden ver todos los usuarios, o consulta pública de distribuidores
  const { searchParams } = new URL(req.url)
  const role = searchParams.get('role')

  try {
    let query: any = { isActive: true }

    // Si se especifica un rol, filtrar por él
    if (role) {
      query.role = role
    }

    // Si no es admin y no está pidiendo distribuidores públicamente, denegar acceso
    if (!session?.user || (session.user.role !== 'admin' && role !== 'distributor')) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const users = await User.find(query)
      .select('name email role createdAt isActive')
      .sort({ createdAt: -1 })

    return NextResponse.json(users, { status: 200 })
  } catch (error) {
    console.error('Error al obtener usuarios:', error)
    return NextResponse.json({ error: 'Error al cargar usuarios' }, { status: 500 })
  }
}
