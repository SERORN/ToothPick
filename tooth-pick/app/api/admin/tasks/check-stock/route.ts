import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Product from '@/lib/models/Product';
import Notification from '@/lib/models/Notification';
import NotificationService from '@/lib/services/NotificationService';

export async function POST(req: Request) {
  try {
    // Verificar que sea una llamada interna o de sistema
    const { authorization } = Object.fromEntries(req.headers);
    
    // Configurar un token secreto para tareas internas
    const internalToken = process.env.INTERNAL_TASK_TOKEN || 'tooth-pick-internal-2024';
    
    if (authorization !== `Bearer ${internalToken}`) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    await dbConnect();

    // Buscar productos con stock bajo (menos de 5 unidades)
    const lowStockProducts = await Product.find({
      stock: { $lt: 5 },
      isActive: true
    }).populate('providerId', 'name email');

    let notificationsCreated = 0;

    for (const product of lowStockProducts) {
      try {
        // Verificar si ya se envió una notificación de stock bajo en las últimas 24 horas
        const recentNotification = await Notification.findOne({
          userId: product.providerId._id,
          type: 'stock',
          productId: product._id,
          createdAt: { 
            $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // últimas 24 horas
          }
        });

        // Solo crear notificación si no hay una reciente
        if (!recentNotification) {
          await NotificationService.notifyLowStock(
            product._id.toString(),
            product.providerId._id.toString(),
            product.name,
            product.stock
          );
          notificationsCreated++;
        }
      } catch (error) {
        console.error(`Error creating notification for product ${product._id}:`, error);
      }
    }

    return NextResponse.json({
      success: true,
      lowStockProducts: lowStockProducts.length,
      notificationsCreated,
      message: `Verificación completada. ${lowStockProducts.length} productos con stock bajo, ${notificationsCreated} notificaciones nuevas enviadas.`
    }, { status: 200 });

  } catch (error) {
    console.error('Error in stock check task:', error);
    return NextResponse.json({ error: 'Error en verificación de stock' }, { status: 500 });
  }
}

// Endpoint para verificación manual (solo admins)
export async function GET(req: Request) {
  try {
    await dbConnect();

    const lowStockProducts = await Product.find({
      stock: { $lt: 5 },
      isActive: true
    }).populate('providerId', 'name email')
      .select('name stock providerId')
      .sort({ stock: 1 });

    return NextResponse.json({
      lowStockProducts,
      count: lowStockProducts.length
    }, { status: 200 });

  } catch (error) {
    console.error('Error checking stock:', error);
    return NextResponse.json({ error: 'Error al verificar stock' }, { status: 500 });
  }
}
