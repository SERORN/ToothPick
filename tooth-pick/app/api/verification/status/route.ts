import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import VerificationService from '@/lib/services/VerificationService';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }
    
    // Solo proveedores y distribuidores pueden verificar estado
    if (!['provider', 'distributor'].includes(session.user.role)) {
      return NextResponse.json(
        { error: 'Solo proveedores y distribuidores pueden consultar verificación' },
        { status: 403 }
      );
    }
    
    // Obtener estado de verificación
    const status = await VerificationService.getVerificationStatus(session.user.id);
    
    // Obtener historial si hay una solicitud
    let history = null;
    if (status.request?._id) {
      const historyData = await VerificationService.getRequestHistory(status.request._id);
      history = historyData.logs;
    }
    
    return NextResponse.json({
      success: true,
      data: {
        ...status,
        history
      }
    });
    
  } catch (error) {
    console.error('Error getting verification status:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
