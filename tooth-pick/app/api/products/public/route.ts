import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Product from '@/lib/models/Product';

export async function GET(req: Request) {
  await dbConnect();

  try {
    // 🌐 API PÚBLICA - Accesible sin autenticación para catálogo B2C
    // Obtener productos activos con información de proveedor y distribuidor
    const products = await Product.find({ 
      isActive: true
    })
    .populate('providerId', 'name email')
    .populate('distributorId', 'name email') // Para productos B2C
    .sort({ createdAt: -1 });

    // Formatear la respuesta incluyendo estadísticas de reseñas
    const formattedProducts = await Promise.all(products.map(async (product) => {
      // Obtener estadísticas de reseñas
      const reviewStats = await product.getReviewStats();
      
      return {
        _id: product._id,
        name: product.name,
        brand: product.brand,
        category: product.category,
        description: product.description,
        price: product.price,
        currency: product.currency,
        stock: product.stock,
        image: product.images?.[0], // Primera imagen
        images: product.images,
        isActive: product.isActive,
        providerId: {
          _id: product.providerId._id,
          name: product.providerId.name
        },
        // 🏪 INFORMACIÓN DEL DISTRIBUIDOR PARA B2C
        distributorId: product.distributorId ? {
          _id: product.distributorId._id,
          name: product.distributorId.name
        } : null,
        // ⭐ ESTADÍSTICAS DE RESEÑAS
        reviewStats: reviewStats.count > 0 ? reviewStats : null,
        createdAt: product.createdAt,
        updatedAt: product.updatedAt
      };
    }));

    return NextResponse.json(formattedProducts, { status: 200 });
  } catch (error) {
    console.error('Error obteniendo catálogo público:', error);
    return NextResponse.json({ error: 'Error al obtener el catálogo' }, { status: 500 });
  }
}
