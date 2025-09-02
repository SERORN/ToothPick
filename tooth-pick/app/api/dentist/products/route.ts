import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]/route';
import DentistMarketplaceService from '@/lib/services/DentistMarketplaceService';
import DentistProduct from '@/lib/models/DentistProduct';
import { validateSubscriptionAccess } from '@/lib/middleware/subscription';

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
    const category = searchParams.get('category');
    const type = searchParams.get('type');
    const active = searchParams.get('active');
    const search = searchParams.get('search');

    // Construir filtros
    const filters: any = { owner: dentistId };
    
    if (category) filters.category = category;
    if (type) filters.type = type;
    if (active !== null) filters.active = active === 'true';
    
    let products;
    
    if (search) {
      // Búsqueda por texto
      products = await DentistProduct.find({
        ...filters,
        $text: { $search: search }
      })
      .populate('dentist', 'name clinicName profilePicture')
      .sort({ score: { $meta: 'textScore' }, createdAt: -1 })
      .limit(limit)
      .skip((page - 1) * limit);
    } else {
      // Obtener productos normales
      products = await DentistProduct.find(filters)
        .populate('dentist', 'name clinicName profilePicture')
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip((page - 1) * limit);
    }

    const total = await DentistProduct.countDocuments(filters);

    return NextResponse.json({
      products,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Error obteniendo productos del dentista:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Verificar que sea dentista
    if (session.user.role !== 'dentist') {
      return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
    }

    // Verificar acceso por suscripción (Pro o Elite)
    const hasAccess = await validateSubscriptionAccess(session.user.id, ['pro', 'elite']);
    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Necesitas una suscripción Pro o Elite para acceder al marketplace' },
        { status: 403 }
      );
    }

    const dentistId = session.user.id;
    const productData = await request.json();

    // Validaciones básicas
    if (!productData.name || !productData.description || !productData.price) {
      return NextResponse.json(
        { error: 'Nombre, descripción y precio son requeridos' },
        { status: 400 }
      );
    }

    if (productData.price < 0) {
      return NextResponse.json(
        { error: 'El precio debe ser mayor a 0' },
        { status: 400 }
      );
    }

    // Crear producto usando el servicio
    const product = await DentistMarketplaceService.createProduct(dentistId, productData);

    return NextResponse.json({
      message: 'Producto creado exitosamente',
      product
    }, { status: 201 });

  } catch (error) {
    console.error('Error creando producto:', error);
    
    if (error.message.includes('límite') || error.message.includes('Límite')) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
