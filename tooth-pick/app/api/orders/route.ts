import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Order from '@/lib/models/Order';
import User from '@/lib/models/User';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import NotificationService from '@/lib/services/NotificationService';
import EmailService from '@/lib/services/EmailService';
import { createPaymentIntent } from '@/lib/stripe';
import { calculatePlatformFee } from '@/lib/config/fees';

export async function POST(req: Request) {
  await dbConnect();
  const session = await getServerSession(authOptions);

  if (!session || session.user.role !== 'distributor') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { items, shippingInfo } = body;

    // Validaciones básicas
    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'Items requeridos' }, { status: 400 });
    }

    if (!shippingInfo || !shippingInfo.fullName || !shippingInfo.address) {
      return NextResponse.json({ error: 'Información de envío incompleta' }, { status: 400 });
    }

    // Agrupar items por proveedor y crear órdenes separadas
    const ordersByProvider = new Map();
    
    items.forEach(item => {
      const providerId = item.provider.id;
      if (!ordersByProvider.has(providerId)) {
        ordersByProvider.set(providerId, {
          providerId,
          providerName: item.provider.name,
          items: [],
          subtotal: 0
        });
      }
      
      const itemSubtotal = item.price * item.quantity;
      ordersByProvider.get(providerId).items.push({
        ...item,
        subtotal: itemSubtotal
      });
      ordersByProvider.get(providerId).subtotal += itemSubtotal;
    });

    const createdOrders = [];

    // Crear una orden por cada proveedor
    for (const [providerId, orderData] of ordersByProvider) {
      const subtotal = orderData.subtotal;
      
      // 💰 NUEVA LÓGICA DE COMISIONES
      // B2B: 5.5% (distribuidor comprando a proveedor)
      // B2C: 8.5% (cliente final comprando a distribuidor - futuro)
      const orderType = 'b2b'; // Por ahora solo B2B, expandir en el futuro
      const platformFee = calculatePlatformFee(subtotal, orderType);
      const total = subtotal + platformFee;

      // 💳 VERIFICAR CUENTA STRIPE DEL PROVEEDOR
      const providerUser = await User.findById(providerId);
      if (!providerUser || !providerUser.stripeAccountId || !providerUser.stripeOnboardingCompleted) {
        return NextResponse.json({ 
          error: `El proveedor ${orderData.providerName} no ha completado la configuración de pagos`,
          providerId,
          missingStripe: true
        }, { status: 400 });
      }

      // 💳 CREAR PAYMENT INTENT CON STRIPE CONNECT
      let paymentIntentId = null;
      try {
        const paymentIntent = await createPaymentIntent(
          Math.round(total * 100), // Stripe maneja centavos
          'mxn', // Moneda
          providerUser.stripeAccountId,
          Math.round(platformFee * 100), // Comisión ToothPick en centavos
          {
            order_id: 'temp_order_id', // Se actualizará después
            buyer_id: session.user.id,
            seller_id: providerId
          },
          `${process.env.NEXTAUTH_URL}/orders/success`,
          `${process.env.NEXTAUTH_URL}/orders/cancel`
        );
        paymentIntentId = paymentIntent.id;
      } catch (stripeError) {
        console.error('Error creando Payment Intent:', stripeError);
        return NextResponse.json({ 
          error: 'Error procesando el pago',
          stripeError: stripeError instanceof Error ? stripeError.message : 'Error desconocido'
        }, { status: 500 });
      }

      const order = await Order.create({
        buyerId: session.user.id, // distribuidor comprador
        sellerId: providerId, // proveedor vendedor
        items: orderData.items,
        shipping: shippingInfo,
        subtotal,
        platformFee,
        total,
        currency: items[0].currency || 'MXN',
        status: 'pending',
        orderType, // 💰 Nuevo campo para tipo de orden
        paymentIntentId, // 💳 ID del Payment Intent
        stripeAccountId: providerUser.stripeAccountId // 💳 Cuenta del proveedor
      });

      // Poblar información para la respuesta
      await order.populate([
        { path: 'buyerId', select: 'name email' },
        { path: 'sellerId', select: 'name email' }
      ]);

      createdOrders.push(order);

      // ✨ CREAR NOTIFICACIONES Y EMAILS AUTOMÁTICOS
      try {
        const orderNumber = order._id.toString().slice(-8);

        // Notificación para el distribuidor (comprador)
        await NotificationService.notifyOrderCreated(
          order._id.toString(),
          session.user.id,
          total,
          orderNumber
        );

        // Notificación para el proveedor (vendedor)
        await NotificationService.notifyNewOrderReceived(
          order._id.toString(),
          providerId,
          total,
          orderNumber,
          session.user.name || 'Cliente'
        );

        // 📧 ENVIAR EMAILS DE CONFIRMACIÓN
        const buyerInfo = order.buyerId;
        const sellerInfo = order.sellerId;

        // Email al distribuidor confirmando la orden
        if (buyerInfo.email) {
          await EmailService.sendOrderConfirmation(
            buyerInfo.email,
            buyerInfo.name,
            orderNumber,
            total,
            orderData.items
          );
        }

        // Email al proveedor notificando nueva orden
        if (sellerInfo.email) {
          await EmailService.sendNewOrderNotification(
            sellerInfo.email,
            sellerInfo.name,
            buyerInfo.name,
            orderNumber,
            total,
            orderData.items,
            orderType // 💰 Incluir tipo de orden para comisiones correctas
          );
        }
      } catch (notificationError) {
        console.error('Error creating notifications/emails:', notificationError);
        // No fallar la orden si las notificaciones/emails fallan
      }
    }

    return NextResponse.json({ 
      message: `${createdOrders.length} orden(es) creada(s) exitosamente`,
      orders: createdOrders 
    }, { status: 201 });
  } catch (error) {
    console.error('Error creando orden:', error);
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 });
  }
}

export async function GET(req: Request) {
  await dbConnect();
  const session = await getServerSession(authOptions);

  if (!session || !['distributor', 'provider'].includes(session.user.role)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  try {
    let orders;
    
    if (session.user.role === 'distributor') {
      // Distribuidor ve sus compras (órdenes donde es el comprador)
      orders = await Order.find({ buyerId: session.user.id })
        .populate('sellerId', 'name email')
        .populate('buyerId', 'name email')
        .sort({ createdAt: -1 });
    } else if (session.user.role === 'provider') {
      // Proveedor ve sus ventas (órdenes donde es el vendedor)
      orders = await Order.find({ sellerId: session.user.id })
        .populate('sellerId', 'name email')
        .populate('buyerId', 'name email')
        .sort({ createdAt: -1 });
    }

    return NextResponse.json(orders, { status: 200 });
  } catch (error) {
    console.error('Error obteniendo órdenes:', error);
    return NextResponse.json({ error: 'Error al obtener las órdenes' }, { status: 500 });
  }
}
