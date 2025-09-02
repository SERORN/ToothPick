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

    const ticket = await SupportTicketService.getTicketById(
      id,
      session.user.id,
      isSupport
    );

    return NextResponse.json({ ticket });

  } catch (error) {
    console.error('Error obteniendo ticket:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Error interno del servidor';
    let statusCode = 500;
    
    if (errorMessage.includes('no encontrado')) {
      statusCode = 404;
    } else if (errorMessage.includes('permisos')) {
      statusCode = 403;
    }
    
    return NextResponse.json({ error: errorMessage }, { status: statusCode });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { id } = params;
    const body = await request.json();
    const { action, message, status, resolutionMessage, attachments } = body;

    const isSupport = session.user.role === 'admin' || session.user.role === 'support';

    if (action === 'add_message') {
      // Agregar mensaje al ticket
      if (!message) {
        return NextResponse.json(
          { error: 'El mensaje es requerido' },
          { status: 400 }
        );
      }

      if (message.length > 5000) {
        return NextResponse.json(
          { error: 'El mensaje no puede exceder 5000 caracteres' },
          { status: 400 }
        );
      }

      const sender = isSupport ? 'support' : 'user';
      const senderInfo = {
        id: session.user.id,
        name: session.user.name || 'Usuario'
      };

      const ticket = await SupportTicketService.addMessageToTicket(
        id,
        message,
        sender,
        senderInfo,
        attachments
      );

      return NextResponse.json({
        message: 'Mensaje agregado exitosamente',
        ticket
      });

    } else if (action === 'update_status') {
      // Solo soporte puede cambiar estados
      if (!isSupport) {
        return NextResponse.json(
          { error: 'No tienes permisos para cambiar el estado' },
          { status: 403 }
        );
      }

      if (!status) {
        return NextResponse.json(
          { error: 'El estado es requerido' },
          { status: 400 }
        );
      }

      const validStatuses = ['open', 'in_progress', 'closed'];
      if (!validStatuses.includes(status)) {
        return NextResponse.json(
          { error: 'Estado no válido' },
          { status: 400 }
        );
      }

      const ticket = await SupportTicketService.updateTicketStatus(
        id,
        status,
        session.user.id,
        resolutionMessage
      );

      return NextResponse.json({
        message: 'Estado actualizado exitosamente',
        ticket
      });

    } else if (action === 'assign') {
      // Solo soporte puede asignar tickets
      if (!isSupport) {
        return NextResponse.json(
          { error: 'No tienes permisos para asignar tickets' },
          { status: 403 }
        );
      }

      const { agentId } = body;
      if (!agentId) {
        return NextResponse.json(
          { error: 'ID del agente es requerido' },
          { status: 400 }
        );
      }

      const ticket = await SupportTicketService.assignTicket(id, agentId);

      return NextResponse.json({
        message: 'Ticket asignado exitosamente',
        ticket
      });

    } else {
      return NextResponse.json(
        { error: 'Acción no válida' },
        { status: 400 }
      );
    }

  } catch (error) {
    console.error('Error actualizando ticket:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Error interno del servidor';
    let statusCode = 500;
    
    if (errorMessage.includes('no encontrado')) {
      statusCode = 404;
    } else if (errorMessage.includes('permisos')) {
      statusCode = 403;
    }
    
    return NextResponse.json({ error: errorMessage }, { status: statusCode });
  }
}
