import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Order from '@/lib/models/Order';
import Product from '@/lib/models/Product';
import User from '@/lib/models/User';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

export async function GET(req: Request) {
  await dbConnect();
  const session = await getServerSession(authOptions);

  // Verificar que el usuario sea admin
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Acceso denegado - Solo administradores' }, { status: 403 });
  }

  try {
    // Estadísticas generales
    const totalUsers = await User.countDocuments();
    const totalProviders = await User.countDocuments({ role: 'provider' });
    const totalDistributors = await User.countDocuments({ role: 'distributor' });
    const totalClients = await User.countDocuments({ role: 'client' });
    
    const totalProducts = await Product.countDocuments();
    const activeProducts = await Product.countDocuments({ isActive: true });
    const inactiveProducts = await Product.countDocuments({ isActive: false });
    
    const totalOrders = await Order.countDocuments();
    const pendingOrders = await Order.countDocuments({ status: 'pending' });
    const deliveredOrders = await Order.countDocuments({ status: 'delivered' });

    // Ventas totales y comisiones
    const salesStats = await Order.aggregate([
      {
        $group: {
          _id: null,
          totalSales: { $sum: '$subtotal' },
          totalCommissions: { $sum: '$platformFee' },
          totalRevenue: { $sum: '$total' }
        }
      }
    ]);

    // Ventas por mes (últimos 6 meses)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const monthlySales = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: sixMonthsAgo },
          status: { $in: ['confirmed', 'processing', 'shipped', 'delivered'] }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          totalSales: { $sum: '$subtotal' },
          totalCommissions: { $sum: '$platformFee' },
          orderCount: { $sum: 1 }
        }
      },
      {
        $sort: { '_id.year': 1, '_id.month': 1 }
      }
    ]);

    // Top 5 proveedores por ventas
    const topProviders = await Order.aggregate([
      {
        $group: {
          _id: '$sellerId',
          totalSales: { $sum: '$subtotal' },
          orderCount: { $sum: 1 }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'provider'
        }
      },
      {
        $unwind: '$provider'
      },
      {
        $project: {
          _id: 1,
          name: '$provider.name',
          email: '$provider.email',
          totalSales: 1,
          orderCount: 1
        }
      },
      {
        $sort: { totalSales: -1 }
      },
      {
        $limit: 5
      }
    ]);

    // Top 5 distribuidores más activos
    const topDistributors = await Order.aggregate([
      {
        $group: {
          _id: '$buyerId',
          totalSpent: { $sum: '$total' },
          orderCount: { $sum: 1 }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'distributor'
        }
      },
      {
        $unwind: '$distributor'
      },
      {
        $project: {
          _id: 1,
          name: '$distributor.name',
          email: '$distributor.email',
          totalSpent: 1,
          orderCount: 1
        }
      },
      {
        $sort: { totalSpent: -1 }
      },
      {
        $limit: 5
      }
    ]);

    // Productos más vendidos
    const topProducts = await Order.aggregate([
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.productId',
          name: { $first: '$items.name' },
          brand: { $first: '$items.brand' },
          totalQuantity: { $sum: '$items.quantity' },
          totalRevenue: { $sum: '$items.subtotal' }
        }
      },
      {
        $sort: { totalQuantity: -1 }
      },
      {
        $limit: 5
      }
    ]);

    const stats = {
      overview: {
        totalUsers,
        totalProviders,
        totalDistributors,
        totalClients,
        totalProducts,
        activeProducts,
        inactiveProducts,
        totalOrders,
        pendingOrders,
        deliveredOrders
      },
      financial: {
        totalSales: salesStats[0]?.totalSales || 0,
        totalCommissions: salesStats[0]?.totalCommissions || 0,
        totalRevenue: salesStats[0]?.totalRevenue || 0
      },
      monthlySales,
      topProviders,
      topDistributors,
      topProducts
    };

    return NextResponse.json(stats, { status: 200 });
  } catch (error) {
    console.error('Error obteniendo estadísticas admin:', error);
    return NextResponse.json({ error: 'Error al obtener estadísticas' }, { status: 500 });
  }
}
