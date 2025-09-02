import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import User from '@/lib/models/User';
import Order from '@/lib/models/Order';
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
    const url = new URL(req.url);
    const role = url.searchParams.get('role');
    const search = url.searchParams.get('search');
    
    // Construir filtros
    let filter: any = {};
    if (role && role !== 'all') {
      filter.role = role;
    }
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    // Obtener usuarios con información adicional
    const users = await User.find(filter)
      .select('name email role createdAt updatedAt')
      .sort({ createdAt: -1 });

    // Obtener estadísticas de órdenes para cada usuario
    const usersWithStats = await Promise.all(
      users.map(async (user) => {
        let orderStats = { totalOrders: 0, totalSpent: 0, totalEarned: 0 };
        
        if (user.role === 'distributor') {
          // Para distribuidores: órdenes como comprador
          const distributorStats = await Order.aggregate([
            { $match: { buyerId: user._id } },
            {
              $group: {
                _id: null,
                totalOrders: { $sum: 1 },
                totalSpent: { $sum: '$total' }
              }
            }
          ]);
          orderStats.totalOrders = distributorStats[0]?.totalOrders || 0;
          orderStats.totalSpent = distributorStats[0]?.totalSpent || 0;
        } else if (user.role === 'provider') {
          // Para proveedores: órdenes como vendedor
          const providerStats = await Order.aggregate([
            { $match: { sellerId: user._id } },
            {
              $group: {
                _id: null,
                totalOrders: { $sum: 1 },
                totalEarned: { $sum: '$subtotal' }
              }
            }
          ]);
          orderStats.totalOrders = providerStats[0]?.totalOrders || 0;
          orderStats.totalEarned = providerStats[0]?.totalEarned || 0;
        }

        return {
          _id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
          stats: orderStats
        };
      })
    );

    return NextResponse.json(usersWithStats, { status: 200 });
  } catch (error) {
    console.error('Error obteniendo usuarios:', error);
    return NextResponse.json({ error: 'Error al obtener usuarios' }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  await dbConnect();
  const session = await getServerSession(authOptions);

  // Verificar que el usuario sea admin
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Acceso denegado - Solo administradores' }, { status: 403 });
  }

  try {
    const { userId, updates } = await req.json();

    if (!userId) {
      return NextResponse.json({ error: 'ID de usuario requerido' }, { status: 400 });
    }

    // Campos permitidos para actualizar
    const allowedFields = ['role', 'isActive'];
    const updateData: any = {};
    
    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        updateData[field] = updates[field];
      }
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No hay campos válidos para actualizar' }, { status: 400 });
    }

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      updateData,
      { new: true, runValidators: true }
    ).select('name email role isActive createdAt updatedAt');

    if (!updatedUser) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }

    return NextResponse.json(updatedUser, { status: 200 });
  } catch (error) {
    console.error('Error actualizando usuario:', error);
    return NextResponse.json({ error: 'Error al actualizar usuario' }, { status: 500 });
  }
}
