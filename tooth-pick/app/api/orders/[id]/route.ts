import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import dbConnect from '@/lib/db'
import Order from '@/lib/models/Order'
import NotificationService from '@/lib/services/NotificationService'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  await dbConnect()
  const session = await getServerSession(authOptions)

  if (!session) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  }

  const orderId = params.id

  try {
    const order = await Order.findById(orderId)
      .populate('buyerId', 'name email')
      .populate('sellerId', 'name email')

    if (!order) {
      return NextResponse.json({ error: 'Orden no encontrada' }, { status: 404 })
    }

    // Verificar permisos: solo el comprador o vendedor pueden ver la orden
    if (order.buyerId._id.toString() !== session.user.id && 
        order.sellerId._id.toString() !== session.user.id) {
      return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })
    }

    return NextResponse.json(order, { status: 200 })
  } catch (error) {
    console.error('Error al obtener orden:', error)
    return NextResponse.json({ error: 'Error al cargar orden' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  await dbConnect()
  const session = await getServerSession(authOptions)

  if (!session) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  }

  const orderId = params.id

  try {
    const data = await req.json()
    const order = await Order.findById(orderId)
      .populate('buyerId', 'name email')
      .populate('sellerId', 'name email')

    if (!order) {
      return NextResponse.json({ error: 'Orden no encontrada' }, { status: 404 })
    }

    // Solo el proveedor (vendedor) o admin pueden actualizar el estado de la orden
    const isAuthorized = 
      session.user.role === 'admin' ||
      (order.sellerId._id.toString() === session.user.id && session.user.role === 'provider');

    if (!isAuthorized) {
      return NextResponse.json({ 
        error: 'Solo el proveedor asignado puede actualizar esta orden' 
      }, { status: 403 })
    }

    // 📦 CAMPOS EXPANDIDOS PARA TRACKING DETALLADO
    const allowedFields = [
      'status', 
      'trackingNumber', 
      'shippingProvider',
      'trackingUrl',
      'estimatedDelivery',
      'providerNotes'
    ];
    
    // Admin puede actualizar campos adicionales
    if (session.user.role === 'admin') {
      allowedFields.push('internalNotes', 'cancelReason');
    }

    const updateData: any = {}
    const previousStatus = order.status;

    for (const field of allowedFields) {
      if (data[field] !== undefined) {
        updateData[field] = data[field]
      }
    }

    // 📅 TIMESTAMPS AUTOMÁTICOS POR ESTADO
    if (data.status && data.status !== previousStatus) {
      const now = new Date();
      switch (data.status) {
        case 'confirmed':
          updateData.confirmedAt = now;
          break;
        case 'processing':
          updateData.processingAt = now;
          break;
        case 'shipped':
          updateData.shippedAt = now;
          break;
        case 'delivered':
          updateData.deliveredAt = now;
          updateData.actualDelivery = now;
          break;
        case 'cancelled':
          updateData.cancelledAt = now;
          break;
      }
    }

    // Actualizar la orden
    const updatedOrder = await Order.findByIdAndUpdate(
      orderId,
      updateData,
      { new: true, runValidators: true }
    ).populate('buyerId', 'name email')
     .populate('sellerId', 'name email')

    // 🔔 NOTIFICACIONES EXPANDIDAS
    try {
      const orderNumber = orderId.slice(-8);
      const buyerInfo = updatedOrder.buyerId;
      const sellerInfo = updatedOrder.sellerId;

      // Notificación de cambio de estado
      if (data.status && data.status !== previousStatus) {
        await NotificationService.notifyOrderStatusChanged(
          orderId,
          buyerInfo._id.toString(),
          data.status,
          orderNumber,
          sellerInfo.name
        );
      }

      // Notificación específica para tracking number
      if (data.trackingNumber && !order.trackingNumber) {
        await NotificationService.notifyTrackingNumberAdded(
          orderId,
          buyerInfo._id.toString(),
          data.trackingNumber,
          data.shippingProvider || 'Paquetería',
          orderNumber
        );
      }

    } catch (notificationError) {
      console.error('Error creating notifications:', notificationError);
      // No fallar la actualización si las notificaciones fallan
    }

    return NextResponse.json({
      success: true,
      message: 'Orden actualizada exitosamente',
      order: updatedOrder
    }, { status: 200 })

  } catch (error) {
    console.error('Error al actualizar orden:', error)
    return NextResponse.json({ error: 'Error al actualizar orden' }, { status: 500 })
  }
}
