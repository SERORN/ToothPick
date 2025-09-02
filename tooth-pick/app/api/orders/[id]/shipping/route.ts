import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import dbConnect from '@/lib/db';
import Order from '@/lib/models/Order';
import User from '@/lib/models/User';
import { ShippingService } from '@/lib/services/ShippingService';

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  await dbConnect();

  try {
    const session = await getServerSession();
    
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });
    }

    const user = await User.findOne({ email: session.user.email });
    if (!user) {
      return NextResponse.json({ error: 'Usuario no encontrado.' }, { status: 404 });
    }

    const {
      shippingMethod,
      shippingProvider,
      trackingNumber,
      shippingCost,
      pickupLocation,
      status,
      estimatedDelivery
    } = await req.json();

    const order = await Order.findById(params.id)
      .populate('buyerId', 'name email')
      .populate('sellerId', 'name email');

    if (!order) {
      return NextResponse.json({ error: 'Orden no encontrada.' }, { status: 404 });
    }

    // Verificar permisos: solo admin, vendedor o comprador pueden actualizar
    const canUpdate = user.role === 'admin' || 
                     order.sellerId._id.toString() === user._id.toString() ||
                     order.buyerId._id.toString() === user._id.toString();

    if (!canUpdate) {
      return NextResponse.json({ 
        error: 'No tienes permisos para actualizar esta orden.' 
      }, { status: 403 });
    }

    // Preparar datos de actualización
    const updateData: any = {};

    if (shippingMethod) {
      updateData.shippingMethod = shippingMethod;
    }

    if (shippingProvider) {
      updateData.shippingProvider = shippingProvider;
    }

    if (shippingCost !== undefined) {
      updateData.shippingCost = shippingCost;
      // Actualizar total si se agrega costo de envío
      updateData.total = order.subtotal + order.platformFee + shippingCost;
    }

    if (trackingNumber) {
      updateData.trackingNumber = trackingNumber;
      
      // Generar URL de tracking automáticamente
      if (shippingProvider) {
        const trackingUrl = await ShippingService.generateTrackingUrl(
          shippingProvider, 
          trackingNumber
        );
        if (trackingUrl) {
          updateData.trackingUrl = trackingUrl;
        }
      }
      
      // Si se agrega número de tracking, marcar como enviado
      if (!order.shippedAt) {
        updateData.status = 'shipped';
        updateData.shippedAt = new Date();
        
        // Calcular fecha estimada de entrega si no se proporciona
        if (!estimatedDelivery && shippingProvider) {
          // Usar tiempos estándar por proveedor
          const deliveryDays = getDeliveryDaysByProvider(shippingProvider);
          const estimated = new Date();
          estimated.setDate(estimated.getDate() + deliveryDays);
          updateData.estimatedDelivery = estimated;
        }
      }
    }

    if (pickupLocation) {
      updateData.pickupLocation = pickupLocation;
    }

    if (status && ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'].includes(status)) {
      updateData.status = status;
      
      // Actualizar timestamps según el estado
      const now = new Date();
      switch (status) {
        case 'confirmed':
          if (!order.confirmedAt) updateData.confirmedAt = now;
          break;
        case 'processing':
          if (!order.processingAt) updateData.processingAt = now;
          break;
        case 'shipped':
          if (!order.shippedAt) updateData.shippedAt = now;
          break;
        case 'delivered':
          if (!order.deliveredAt) {
            updateData.deliveredAt = now;
            updateData.actualDelivery = now;
          }
          break;
        case 'cancelled':
          if (!order.cancelledAt) updateData.cancelledAt = now;
          break;
      }
    }

    if (estimatedDelivery) {
      updateData.estimatedDelivery = new Date(estimatedDelivery);
    }

    // Actualizar la orden
    const updatedOrder = await Order.findByIdAndUpdate(
      params.id,
      updateData,
      { new: true, runValidators: true }
    ).populate([
      { path: 'buyerId', select: 'name email' },
      { path: 'sellerId', select: 'name email' }
    ]);

    // TODO: Enviar notificación al cliente sobre actualización de envío
    // NotificationService.sendShippingUpdate(updatedOrder)

    return NextResponse.json({
      message: 'Información de envío actualizada exitosamente.',
      order: updatedOrder
    });

  } catch (error) {
    console.error('Error updating shipping info:', error);
    return NextResponse.json({ 
      error: 'Error interno del servidor.' 
    }, { status: 500 });
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  await dbConnect();

  try {
    const session = await getServerSession();
    
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });
    }

    const user = await User.findOne({ email: session.user.email });
    if (!user) {
      return NextResponse.json({ error: 'Usuario no encontrado.' }, { status: 404 });
    }

    const order = await Order.findById(params.id)
      .populate('buyerId', 'name email')
      .populate('sellerId', 'name email');

    if (!order) {
      return NextResponse.json({ error: 'Orden no encontrada.' }, { status: 404 });
    }

    // Verificar permisos para ver la orden
    const canView = user.role === 'admin' || 
                   order.sellerId._id.toString() === user._id.toString() ||
                   order.buyerId._id.toString() === user._id.toString();

    if (!canView) {
      return NextResponse.json({ 
        error: 'No tienes permisos para ver esta orden.' 
      }, { status: 403 });
    }

    // Preparar información de envío
    const shippingInfo = {
      orderId: order._id,
      orderNumber: order.orderNumber,
      status: order.status,
      shippingMethod: order.shippingMethod,
      shippingProvider: order.shippingProvider,
      shippingCost: order.shippingCost,
      trackingNumber: order.trackingNumber,
      trackingUrl: order.trackingUrl,
      pickupLocation: order.pickupLocation,
      estimatedDelivery: order.estimatedDelivery,
      actualDelivery: order.actualDelivery,
      timeline: {
        created: order.createdAt,
        confirmed: order.confirmedAt,
        processing: order.processingAt,
        shipped: order.shippedAt,
        delivered: order.deliveredAt,
        cancelled: order.cancelledAt
      },
      buyer: {
        name: order.buyerId.name,
        email: order.buyerId.email
      },
      seller: {
        name: order.sellerId.name,
        email: order.sellerId.email
      }
    };

    return NextResponse.json({ shippingInfo });

  } catch (error) {
    console.error('Error fetching shipping info:', error);
    return NextResponse.json({ 
      error: 'Error interno del servidor.' 
    }, { status: 500 });
  }
}

// Helper function para obtener días de entrega por proveedor
function getDeliveryDaysByProvider(provider: string): number {
  const providerDays: Record<string, number> = {
    'dhl': 2,
    'fedex': 2,
    'ups': 3,
    'estafeta': 4,
    '99minutos': 1,
    'correos': 7,
    'paquete express': 3
  };

  const providerKey = provider.toLowerCase();
  return providerDays[providerKey] || 5; // Por defecto 5 días
}
