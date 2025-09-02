import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import VerificationService from '@/lib/services/VerificationService';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }
    
    // Solo administradores pueden rechazar
    if (session.user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Acceso denegado. Solo administradores.' },
        { status: 403 }
      );
    }
    
    const requestId = params.id;
    
    if (!requestId) {
      return NextResponse.json(
        { error: 'ID de solicitud requerido' },
        { status: 400 }
      );
    }
    
    // Obtener datos de la request
    const body = await request.json();
    
    // Validar que se proporcione una razón
    if (!body.reason || body.reason.trim().length === 0) {
      return NextResponse.json(
        { error: 'La razón de rechazo es requerida' },
        { status: 400 }
      );
    }
    
    const reviewData = {
      action: 'reject' as const,
      reason: body.reason,
      adminNotes: body.adminNotes || '',
      escalationLevel: body.escalationLevel || 1
    };
    
    // Obtener metadata
    const metadata = {
      ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown'
    };
    
    // Rechazar verificación
    const result = await VerificationService.rejectVerification(
      requestId,
      session.user.id,
      reviewData,
      metadata
    );
    
    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }
    
    return NextResponse.json({
      success: true,
      message: 'Verificación rechazada exitosamente'
    });
    
  } catch (error) {
    console.error('Error rejecting verification:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
