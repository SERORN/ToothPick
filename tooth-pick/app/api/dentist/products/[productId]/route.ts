import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../auth/[...nextauth]/route';
import DentistMarketplaceService from '@/lib/services/DentistMarketplaceService';

export async function GET(
  request: NextRequest,
  { params }: { params: { productId: string } }
) {
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
    const { productId } = params;

    const product = await DentistProduct.findOne({
      _id: productId,
      owner: dentistId
    }).populate('dentist', 'name clinicName profilePicture');

    if (!product) {
      return NextResponse.json(
        { error: 'Producto no encontrado' },
        { status: 404 }
      );
    }

    return NextResponse.json({ product });

  } catch (error) {
    console.error('Error obteniendo producto:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { productId: string } }
) {
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
    const { productId } = params;
    const updateData = await request.json();

    // Validaciones básicas
    if (updateData.price !== undefined && updateData.price < 0) {
      return NextResponse.json(
        { error: 'El precio debe ser mayor a 0' },
        { status: 400 }
      );
    }

    if (updateData.stock !== undefined && updateData.stock < 0) {
      return NextResponse.json(
        { error: 'El stock no puede ser negativo' },
        { status: 400 }
      );
    }

    const product = await DentistMarketplaceService.updateProduct(
      dentistId,
      productId,
      updateData
    );

    return NextResponse.json({
      message: 'Producto actualizado exitosamente',
      product
    });

  } catch (error) {
    console.error('Error actualizando producto:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Error interno del servidor';
    const statusCode = errorMessage === 'Producto no encontrado' ? 404 : 500;
    
    return NextResponse.json({ error: errorMessage }, { status: statusCode });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { productId: string } }
) {
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
    const { productId } = params;

    await DentistMarketplaceService.deleteProduct(dentistId, productId);

    return NextResponse.json({
      message: 'Producto eliminado exitosamente'
    });

  } catch (error) {
    console.error('Error eliminando producto:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Error interno del servidor';
    const statusCode = errorMessage === 'Producto no encontrado' ? 404 : 500;
    
    return NextResponse.json({ error: errorMessage }, { status: statusCode });
  }
}
