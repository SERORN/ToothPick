import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import dbConnect from '@/lib/db'
import Order from '@/lib/models/Order'

export async function GET(req: NextRequest) {
  await dbConnect()
  const session = await getServerSession(authOptions)

  if (!session) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  }

  try {
    let orders

    if (session.user.role === 'customer') {
      // Clientes solo ven sus propias órdenes B2C
      orders = await Order.find({ 
        buyerId: session.user.id,
        orderType: 'b2c'
      })
      .populate('buyerId', 'name email')
      .populate('sellerId', 'name email') // distribuidor
      .sort({ createdAt: -1 })
    } else if (session.user.role === 'distributor') {
      // Distribuidores ven órdenes B2C donde ellos son el vendedor
      orders = await Order.find({ 
        sellerId: session.user.id,
        orderType: 'b2c'
      })
      .populate('buyerId', 'name email') // cliente
      .populate('sellerId', 'name email')
      .sort({ createdAt: -1 })
    } else if (session.user.role === 'admin') {
      // Admins ven todas las órdenes B2C
      orders = await Order.find({ orderType: 'b2c' })
        .populate('buyerId', 'name email')
        .populate('sellerId', 'name email')
        .sort({ createdAt: -1 })
    } else {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    return NextResponse.json(orders, { status: 200 })
  } catch (error) {
    console.error('Error al obtener órdenes B2C:', error)
    return NextResponse.json({ error: 'Error al cargar órdenes' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  await dbConnect()
  const session = await getServerSession(authOptions)

  if (!session || session.user.role !== 'customer') {
    return NextResponse.json({ error: 'Solo clientes pueden crear órdenes B2C' }, { status: 401 })
  }

  try {
    const {
      items,
      shipping,
      distributorId,
      subtotal,
      platformFee,
      total,
      currency = 'MXN'
    } = await req.json()

    // Validaciones básicas
    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'Items requeridos' }, { status: 400 })
    }

    if (!shipping || !shipping.fullName || !shipping.address) {
      return NextResponse.json({ error: 'Información de envío requerida' }, { status: 400 })
    }

    if (!distributorId) {
      return NextResponse.json({ error: 'Distribuidor requerido' }, { status: 400 })
    }

    // Crear la orden B2C
    const newOrder = new Order({
      buyerId: session.user.id, // cliente
      sellerId: distributorId,   // distribuidor
      items,
      shipping,
      subtotal,
      platformFee,
      total,
      currency,
      orderType: 'b2c',
      status: 'pending',
      paymentStatus: 'pending'
    })

    await newOrder.save()

    // Poblar la información de usuario
    await newOrder.populate('buyerId', 'name email')
    await newOrder.populate('sellerId', 'name email')

    return NextResponse.json({
      success: true,
      message: 'Orden B2C creada exitosamente',
      order: newOrder
    }, { status: 201 })

  } catch (error) {
    console.error('Error al crear orden B2C:', error)
    return NextResponse.json({ error: 'Error al crear orden' }, { status: 500 })
  }
}
