import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Product from '@/lib/models/Product';
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
    const status = url.searchParams.get('status');
    const category = url.searchParams.get('category');
    const search = url.searchParams.get('search');
    
    // Construir filtros
    let filter: any = {};
    if (status && status !== 'all') {
      filter.isActive = status === 'active';
    }
    if (category && category !== 'all') {
      filter.category = category;
    }
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    // Obtener productos con información del proveedor
    const products = await Product.find(filter)
      .populate('providerId', 'name email')
      .sort({ createdAt: -1 });

    // Obtener estadísticas de ventas para cada producto
    const productsWithStats = await Promise.all(
      products.map(async (product) => {
        const salesStats = await Order.aggregate([
          { $unwind: '$items' },
          { $match: { 'items.productId': product._id } },
          {
            $group: {
              _id: null,
              totalSold: { $sum: '$items.quantity' },
              totalRevenue: { $sum: { $multiply: ['$items.quantity', '$items.price'] } }
            }
          }
        ]);

        return {
          _id: product._id,
          name: product.name,
          description: product.description,
          price: product.price,
          category: product.category,
          stock: product.stock,
          isActive: product.isActive,
          images: product.images,
          provider: product.providerId,
          createdAt: product.createdAt,
          updatedAt: product.updatedAt,
          stats: {
            totalSold: salesStats[0]?.totalSold || 0,
            totalRevenue: salesStats[0]?.totalRevenue || 0
          }
        };
      })
    );

    return NextResponse.json(productsWithStats, { status: 200 });
  } catch (error) {
    console.error('Error obteniendo productos:', error);
    return NextResponse.json({ error: 'Error al obtener productos' }, { status: 500 });
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
    const { productId, updates } = await req.json();

    if (!productId) {
      return NextResponse.json({ error: 'ID de producto requerido' }, { status: 400 });
    }

    // Campos permitidos para actualizar por admin
    const allowedFields = ['isActive', 'featured', 'category'];
    const updateData: any = {};
    
    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        updateData[field] = updates[field];
      }
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No hay campos válidos para actualizar' }, { status: 400 });
    }

    const updatedProduct = await Product.findByIdAndUpdate(
      productId,
      updateData,
      { new: true, runValidators: true }
    ).populate('providerId', 'name email');

    if (!updatedProduct) {
      return NextResponse.json({ error: 'Producto no encontrado' }, { status: 404 });
    }

    return NextResponse.json(updatedProduct, { status: 200 });
  } catch (error) {
    console.error('Error actualizando producto:', error);
    return NextResponse.json({ error: 'Error al actualizar producto' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  await dbConnect();
  const session = await getServerSession(authOptions);

  // Verificar que el usuario sea admin
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Acceso denegado - Solo administradores' }, { status: 403 });
  }

  try {
    const { productId } = await req.json();

    if (!productId) {
      return NextResponse.json({ error: 'ID de producto requerido' }, { status: 400 });
    }

    // Verificar si el producto tiene órdenes pendientes
    const pendingOrders = await Order.findOne({
      'items.productId': productId,
      status: { $in: ['pending', 'processing'] }
    });

    if (pendingOrders) {
      return NextResponse.json({ 
        error: 'No se puede eliminar el producto porque tiene órdenes pendientes' 
      }, { status: 400 });
    }

    // Soft delete: marcar como inactivo en lugar de eliminar
    const updatedProduct = await Product.findByIdAndUpdate(
      productId,
      { isActive: false, deletedAt: new Date() },
      { new: true }
    );

    if (!updatedProduct) {
      return NextResponse.json({ error: 'Producto no encontrado' }, { status: 404 });
    }

    return NextResponse.json({ 
      message: 'Producto desactivado exitosamente',
      product: updatedProduct 
    }, { status: 200 });
  } catch (error) {
    console.error('Error eliminando producto:', error);
    return NextResponse.json({ error: 'Error al eliminar producto' }, { status: 500 });
  }
}
