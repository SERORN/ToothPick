import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import SupportService from '@/lib/services/SupportService';

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
    
    const ticketId = params.id;
    const body = await request.json();
    
    // Validar datos requeridos
    if (!body.message || !body.message.trim()) {
      return NextResponse.json(
        { error: 'El mensaje es requerido' },
        { status: 400 }
      );
    }
    
    // Verificar que el ticket existe y el usuario tiene permisos
    const ticket = await SupportService.getTicketById(ticketId);
    
    if (!ticket) {
      return NextResponse.json(
        { error: 'Ticket no encontrado' },
        { status: 404 }
      );
    }
    
    // Verificar permisos
    const isOwner = ticket.userId.toString() === session.user.id;
    const isAdmin = session.user.role === 'admin';
    
    if (!isOwner && !isAdmin) {
      return NextResponse.json(
        { error: 'No autorizado para responder a este ticket' },
        { status: 403 }
      );
    }
    
    // No permitir respuestas en tickets cerrados
    if (ticket.status === 'closed') {
      return NextResponse.json(
        { error: 'No se pueden agregar respuestas a tickets cerrados' },
        { status: 400 }
      );
    }
    
    // Preparar datos de la respuesta
    const replyData = {
      ticketId,
      authorId: session.user.id,
      authorRole: session.user.role as any,
      message: body.message.trim(),
      attachments: body.attachments || [],
      isInternal: body.isInternal && isAdmin // Solo admins pueden crear notas internas
    };
    
    const reply = await SupportService.createReply(replyData);
    
    return NextResponse.json({
      success: true,
      data: reply
    }, { status: 201 });
    
  } catch (error) {
    console.error('Error creating reply:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
