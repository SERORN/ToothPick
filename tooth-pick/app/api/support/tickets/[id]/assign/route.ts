import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import SupportService from '@/lib/services/SupportService';

export async function PATCH(
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
    
    // Solo admins pueden asignar tickets
    if (session.user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Permisos insuficientes' },
        { status: 403 }
      );
    }
    
    const ticketId = params.id;
    const body = await request.json();
    
    // Validar que se proporcione el adminId
    if (!body.adminId) {
      return NextResponse.json(
        { error: 'El adminId es requerido' },
        { status: 400 }
      );
    }
    
    const ticket = await SupportService.assignTicket(ticketId, body.adminId, session.user.id);
    
    if (!ticket) {
      return NextResponse.json(
        { error: 'Ticket no encontrado' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      data: ticket
    });
    
  } catch (error) {
    console.error('Error assigning ticket:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
