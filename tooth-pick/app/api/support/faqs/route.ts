import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import FAQService from '@/lib/services/FAQService';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Los FAQs pueden ser vistos sin autenticación, pero con filtros por rol si está autenticado
    const session = await getServerSession(authOptions);
    const userRole = session?.user?.role || 'all';
    
    const filters: any = {
      page: searchParams.get('page') ? parseInt(searchParams.get('page')!) : 1,
      limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 50,
      sortBy: searchParams.get('sortBy') || 'order',
      sortOrder: searchParams.get('sortOrder') || 'asc',
      role: userRole
    };
    
    // Filtros específicos
    if (searchParams.get('category')) filters.category = searchParams.get('category');
    if (searchParams.get('search')) filters.search = searchParams.get('search');
    if (searchParams.get('tags')) {
      filters.tags = searchParams.get('tags')!.split(',');
    }
    
    // Solo mostrar FAQs publicadas para usuarios no admin
    if (!session || session.user.role !== 'admin') {
      filters.isPublished = true;
    } else if (searchParams.get('published') !== null) {
      filters.isPublished = searchParams.get('published') === 'true';
    }
    
    const result = await FAQService.getFAQs(filters);
    
    return NextResponse.json({
      success: true,
      data: result
    });
    
  } catch (error) {
    console.error('Error getting FAQs:', error);
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
    
    // Solo admins pueden crear FAQs
    if (session.user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Solo administradores pueden crear FAQs' },
        { status: 403 }
      );
    }
    
    const body = await request.json();
    
    // Validar datos requeridos
    if (!body.question || !body.answer || !body.category) {
      return NextResponse.json(
        { error: 'Faltan campos requeridos: question, answer, category' },
        { status: 400 }
      );
    }
    
    // Validar roles visibles
    if (body.rolesVisibleTo && Array.isArray(body.rolesVisibleTo)) {
      const validRoles = ['provider', 'distributor', 'clinic', 'admin', 'all'];
      const invalidRoles = body.rolesVisibleTo.filter((role: string) => !validRoles.includes(role));
      
      if (invalidRoles.length > 0) {
        return NextResponse.json(
          { error: `Roles inválidos: ${invalidRoles.join(', ')}` },
          { status: 400 }
        );
      }
    }
    
    // Preparar datos del FAQ
    const faqData = {
      question: body.question.trim(),
      answer: body.answer.trim(),
      category: body.category.trim(),
      rolesVisibleTo: body.rolesVisibleTo || ['all'],
      tags: body.tags || [],
      order: body.order || 0,
      isPublished: body.isPublished !== false, // Por defecto true
      lastUpdatedBy: session.user.id
    };
    
    const faq = await FAQService.createFAQ(faqData);
    
    return NextResponse.json({
      success: true,
      data: faq
    }, { status: 201 });
    
  } catch (error) {
    console.error('Error creating FAQ:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
