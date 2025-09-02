import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]/route';
import DentistMarketplaceService from '@/lib/services/DentistMarketplaceService';

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

    // Obtener estadísticas del marketplace
    const stats = await DentistMarketplaceService.getDentistMarketplaceStats(dentistId);

    // Verificar límites de productos
    const productLimits = await DentistMarketplaceService.canCreateProduct(dentistId);

    return NextResponse.json({
      stats,
      limits: productLimits
    });

  } catch (error) {
    console.error('Error obteniendo estadísticas del marketplace:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
