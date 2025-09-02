import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../auth/[...nextauth]/route';
import SupportTicketService from '@/lib/services/SupportTicketService';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Verificar permisos de administrador o soporte
    if (session.user.role !== 'admin' && session.user.role !== 'support') {
      return NextResponse.json(
        { error: 'No tienes permisos para acceder al panel de soporte' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    
    const filters = {
      status: searchParams.get('status') || undefined,
      priority: searchParams.get('priority') || undefined,
      category: searchParams.get('category') || undefined,
      userRole: searchParams.get('userRole') || undefined,
      assignedTo: searchParams.get('assignedTo') || undefined,
      search: searchParams.get('search') || undefined,
      page: parseInt(searchParams.get('page') || '1'),
      limit: parseInt(searchParams.get('limit') || '20')
    };

    const result = await SupportTicketService.getSupportTickets(filters);

    return NextResponse.json(result);

  } catch (error) {
    console.error('Error obteniendo tickets de soporte:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Verificar permisos de administrador o soporte
    if (session.user.role !== 'admin' && session.user.role !== 'support') {
      return NextResponse.json(
        { error: 'No tienes permisos para gestionar tickets' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { action, ticketIds, status, agentId, priority } = body;

    if (!action || !ticketIds || !Array.isArray(ticketIds)) {
      return NextResponse.json(
        { error: 'Acción y IDs de tickets son requeridos' },
        { status: 400 }
      );
    }

    const results = [];

    if (action === 'bulk_update_status') {
      if (!status) {
        return NextResponse.json(
          { error: 'Estado es requerido para actualización masiva' },
          { status: 400 }
        );
      }

      for (const ticketId of ticketIds) {
        try {
          const ticket = await SupportTicketService.updateTicketStatus(
            ticketId,
            status,
            session.user.id
          );
          results.push({ ticketId, success: true, ticket });
        } catch (error) {
          results.push({ 
            ticketId, 
            success: false, 
            error: error instanceof Error ? error.message : 'Error desconocido' 
          });
        }
      }

    } else if (action === 'bulk_assign') {
      if (!agentId) {
        return NextResponse.json(
          { error: 'ID del agente es requerido para asignación masiva' },
          { status: 400 }
        );
      }

      for (const ticketId of ticketIds) {
        try {
          const ticket = await SupportTicketService.assignTicket(ticketId, agentId);
          results.push({ ticketId, success: true, ticket });
        } catch (error) {
          results.push({ 
            ticketId, 
            success: false, 
            error: error instanceof Error ? error.message : 'Error desconocido' 
          });
        }
      }

    } else {
      return NextResponse.json(
        { error: 'Acción no válida' },
        { status: 400 }
      );
    }

    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;

    return NextResponse.json({
      message: `Operación completada: ${successful} exitosas, ${failed} fallidas`,
      results
    });

  } catch (error) {
    console.error('Error en operación masiva de tickets:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
