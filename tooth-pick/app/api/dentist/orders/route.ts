import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]/route';
import DentistMarketplaceService from '@/lib/services/DentistMarketplaceService';
import Order from '@/lib/models/Order';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Verificar que sea dentista
    if (session.user.role !== 'dentist') {
      return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
    }

    const dentistId = session.user.id;
    const { searchParams } = new URL(request.url);
    
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const status = searchParams.get('status');

    // Construir filtros
    const filters: any = {
      sellerId: dentistId,
      orderType: 'dentist_marketplace'
    };
    
    if (status) {
      filters.status = status;
    }

    // Obtener órdenes
    const orders = await Order.find(filters)
      .populate('buyerId', 'name email phone profilePicture')
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip((page - 1) * limit);

    const total = await Order.countDocuments(filters);

    return NextResponse.json({
      orders,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Error obteniendo órdenes del dentista:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Verificar que sea dentista
    if (session.user.role !== 'dentist') {
      return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
    }

    const dentistId = session.user.id;
    const { orderId, status, notes } = await request.json();

    if (!orderId || !status) {
      return NextResponse.json(
        { error: 'ID de orden y estado son requeridos' },
        { status: 400 }
      );
    }

    // Verificar que la orden pertenece al dentista
    const order = await Order.findOne({
      _id: orderId,
      sellerId: dentistId,
      orderType: 'dentist_marketplace'
    });

    if (!order) {
      return NextResponse.json(
        { error: 'Orden no encontrada' },
        { status: 404 }
      );
    }

    // Validar transiciones de estado válidas
    const validTransitions: { [key: string]: string[] } = {
      'pending': ['confirmed', 'cancelled'],
      'confirmed': ['processing', 'cancelled'],
      'processing': ['shipped', 'delivered', 'cancelled'],
      'shipped': ['delivered'],
      'delivered': [],
      'cancelled': []
    };

    if (!validTransitions[order.status]?.includes(status)) {
      return NextResponse.json(
        { error: 'Transición de estado no válida' },
        { status: 400 }
      );
    }

    // Actualizar orden
    order.status = status;
    if (notes) {
      order.providerNotes = notes;
    }

    // Actualizar timestamps según el estado
    const now = new Date();
    switch (status) {
      case 'confirmed':
        order.confirmedAt = now;
        break;
      case 'processing':
        order.processingAt = now;
        break;
      case 'shipped':
        order.shippedAt = now;
        break;
      case 'delivered':
        order.deliveredAt = now;
        order.actualDelivery = now;
        break;
      case 'cancelled':
        order.cancelledAt = now;
        break;
    }

    await order.save();

    // Enviar notificación al cliente
    // TODO: Implementar notificación

    return NextResponse.json({
      message: 'Estado de orden actualizado exitosamente',
      order
    });

  } catch (error) {
    console.error('Error actualizando orden:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
