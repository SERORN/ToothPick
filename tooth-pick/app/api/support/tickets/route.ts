import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]/route';
import SupportService from '@/lib/services/SupportService';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }
    
    const searchParams = request.nextUrl.searchParams;
    
    const filters = {
      status: searchParams.get('status') || undefined,
      priority: searchParams.get('priority') || undefined,
      category: searchParams.get('category') || undefined,
      assignedTo: searchParams.get('assignedTo') || undefined,
      userRole: session.user.role,
      userId: session.user.id,
    };
    
    const options = {
      page: parseInt(searchParams.get('page') || '1'),
      limit: parseInt(searchParams.get('limit') || '10'),
      sortBy: searchParams.get('sortBy') || 'createdAt',
      sortOrder: (searchParams.get('sortOrder') as 'asc' | 'desc') || 'desc',
    };
    
    const result = await SupportService.getTickets(filters);
    
    return NextResponse.json({
      success: true,
      data: result.tickets,
      pagination: result.pagination
    });
    
  } catch (error) {
    console.error('Error fetching tickets:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }
    
    const body = await request.json();
    
    // Validaciones
    if (!body.subject || !body.description || !body.category) {
      return NextResponse.json(
        { error: 'Subject, description y category son requeridos' },
        { status: 400 }
      );
    }
    
    if (body.subject.length < 5 || body.subject.length > 200) {
      return NextResponse.json(
        { error: 'El subject debe tener entre 5 y 200 caracteres' },
        { status: 400 }
      );
    }
    
    if (body.description.length < 10 || body.description.length > 2000) {
      return NextResponse.json(
        { error: 'La description debe tener entre 10 y 2000 caracteres' },
        { status: 400 }
      );
    }
    
    const validCategories = ['technical', 'billing', 'general', 'product', 'account'];
    if (!validCategories.includes(body.category)) {
      return NextResponse.json(
        { error: 'Categoría inválida' },
        { status: 400 }
      );
    }
    
    const validPriorities = ['low', 'medium', 'high', 'urgent'];
    if (body.priority && !validPriorities.includes(body.priority)) {
      return NextResponse.json(
        { error: 'Prioridad inválida' },
        { status: 400 }
      );
    }
    
    // Mapear el rol del usuario
    const userRole = session.user.role;
    const mappedRole = (userRole === 'customer' || userRole === 'dentist' || userRole === 'patient') ? 'clinic' : userRole;
    
    const ticketData = {
      subject: body.subject.trim(),
      description: body.description.trim(),
      category: body.category,
      priority: body.priority || 'medium',
      role: mappedRole as 'provider' | 'distributor' | 'clinic' | 'admin',
      userId: session.user.id,
      userEmail: session.user.email || '',
      attachments: body.attachments || [],
    };
    
    const ticket = await SupportService.createTicket(ticketData);
    
    return NextResponse.json({
      success: true,
      data: ticket
    }, { status: 201 });
    
  } catch (error) {
    console.error('Error creating ticket:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
