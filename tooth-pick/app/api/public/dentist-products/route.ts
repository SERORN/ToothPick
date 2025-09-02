import { NextRequest, NextResponse } from 'next/server';
import DentistMarketplaceService from '@/lib/services/DentistMarketplaceService';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Parámetros de filtrado
    const dentistId = searchParams.get('dentist');
    const category = searchParams.get('category');
    const type = searchParams.get('type');
    const city = searchParams.get('city');
    const state = searchParams.get('state');
    const search = searchParams.get('search');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    const filters = {
      dentistId: dentistId || undefined,
      category: category || undefined,
      type: type || undefined,
      city: city || undefined,
      state: state || undefined,
      search: search || undefined,
      page,
      limit
    };

    const products = await DentistMarketplaceService.getPublicProducts(filters);

    return NextResponse.json({
      products,
      pagination: {
        page,
        limit,
        total: products.length,
        hasMore: products.length === limit
      }
    });

  } catch (error) {
    console.error('Error obteniendo productos públicos:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { productId, quantity = 1, customerId, shippingInfo } = await request.json();

    if (!productId || !customerId) {
      return NextResponse.json(
        { error: 'ID de producto y cliente son requeridos' },
        { status: 400 }
      );
    }

    if (quantity < 1) {
      return NextResponse.json(
        { error: 'La cantidad debe ser mayor a 0' },
        { status: 400 }
      );
    }

    const result = await DentistMarketplaceService.processProductPurchase(
      customerId,
      productId,
      quantity,
      shippingInfo
    );

    return NextResponse.json({
      message: 'Compra procesada exitosamente',
      ...result
    }, { status: 201 });

  } catch (error) {
    console.error('Error procesando compra:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Error interno del servidor';
    let statusCode = 500;
    
    if (errorMessage.includes('no encontrado')) {
      statusCode = 404;
    } else if (errorMessage.includes('no disponible')) {
      statusCode = 400;
    }
    
    return NextResponse.json({ error: errorMessage }, { status: statusCode });
  }
}
