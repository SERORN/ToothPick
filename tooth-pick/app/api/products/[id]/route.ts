import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import dbConnect from '@/lib/db'
import Product from '@/lib/models/Product'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  await dbConnect()
  const session = await getServerSession(authOptions)

  if (!session) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  }

  if (session.user.role !== 'provider') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }

  const productId = params.id

  try {
    const product = await Product.findById(productId)

    if (!product) {
      return NextResponse.json({ error: 'Producto no encontrado' }, { status: 404 })
    }

    // Verificar que el producto pertenezca al proveedor actual
    if (product.providerId.toString() !== session.user.id) {
      return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })
    }

    return NextResponse.json(product, { status: 200 })
  } catch (error) {
    console.error('Error al obtener producto:', error)
    return NextResponse.json({ error: 'Error al cargar producto' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  await dbConnect()
  const session = await getServerSession(authOptions)

  if (!session) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  }

  if (session.user.role !== 'provider') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }

  const productId = params.id
  
  try {
    const data = await req.json()
    
    const product = await Product.findById(productId)

    if (!product) {
      return NextResponse.json({ error: 'Producto no encontrado' }, { status: 404 })
    }

    if (product.providerId.toString() !== session.user.id) {
      return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })
    }

    // Filtrar campos que se pueden actualizar
    const allowedFields = ['name', 'brand', 'category', 'description', 'price', 'currency', 'stock', 'images', 'isActive']
    const updateData: any = {}
    
    for (const field of allowedFields) {
      if (data[field] !== undefined) {
        updateData[field] = data[field]
      }
    }

    // Filtrar imágenes vacías si se envían
    if (updateData.images) {
      updateData.images = updateData.images.filter((img: string) => img.trim() !== '')
    }

    // Actualizar el producto
    const updatedProduct = await Product.findByIdAndUpdate(
      productId,
      updateData,
      { new: true, runValidators: true }
    )

    return NextResponse.json(updatedProduct, { status: 200 })
  } catch (error) {
    console.error('Error al editar producto:', error)
    return NextResponse.json({ error: 'Error al actualizar producto' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  await dbConnect()
  const session = await getServerSession(authOptions)

  if (!session) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  }

  if (session.user.role !== 'provider') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }

  const productId = params.id

  try {
    const product = await Product.findById(productId)

    if (!product) {
      return NextResponse.json({ error: 'Producto no encontrado' }, { status: 404 })
    }

    if (product.providerId.toString() !== session.user.id) {
      return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })
    }

    await Product.findByIdAndDelete(productId)

    return NextResponse.json({ message: 'Producto eliminado exitosamente' }, { status: 200 })
  } catch (error) {
    console.error('Error al eliminar producto:', error)
    return NextResponse.json({ error: 'Error al eliminar producto' }, { status: 500 })
  }
}
