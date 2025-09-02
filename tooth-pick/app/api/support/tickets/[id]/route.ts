import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../auth/[...nextauth]/route';
import SupportService from '@/lib/services/SupportService';

export async function GET(
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
    
    const ticketId = params.id;
    
    const ticket = await SupportService.getTicketById(ticketId, session.user.id);
    
    if (!ticket) {
      return NextResponse.json(
        { error: 'Ticket no encontrado' },
        { status: 404 }
      );
    }
    
    // Verificar permisos
    if (session.user.role !== 'admin' && ticket.userId._id.toString() !== session.user.id) {
      return NextResponse.json(
        { error: 'No autorizado para ver este ticket' },
        { status: 403 }
      );
    }
    
    // Obtener respuestas del ticket
    const includeInternal = session.user.role === 'admin';
    const replies = await SupportService.getReplies(ticketId, includeInternal);
    
    // Marcar respuestas como leídas si es el dueño del ticket
    if (ticket.userId._id.toString() === session.user.id) {
      await SupportService.markRepliesAsRead(ticketId, session.user.id);
    }
    
    return NextResponse.json({
      success: true,
      data: {
        ticket,
        replies
      }
    });
    
  } catch (error) {
    console.error('Error getting ticket:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
