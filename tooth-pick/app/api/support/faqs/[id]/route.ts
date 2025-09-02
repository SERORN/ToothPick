import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import FAQService from '@/lib/services/FAQService';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    const faqId = params.id;
    
    // Incrementar vista solo si no es admin
    const incrementView = !session || session.user.role !== 'admin';
    
    const faq = await FAQService.getFAQById(faqId, incrementView);
    
    if (!faq) {
      return NextResponse.json(
        { error: 'FAQ no encontrado' },
        { status: 404 }
      );
    }
    
    // Verificar si el usuario puede ver este FAQ
    const userRole = session?.user?.role || 'all';
    const mappedRole = userRole === 'customer' || userRole === 'dentist' || userRole === 'patient' ? 'clinic' : userRole;
    
    if (!faq.isPublished && (!session || session.user.role !== 'admin')) {
      return NextResponse.json(
        { error: 'FAQ no disponible' },
        { status: 404 }
      );
    }
    
    if (!faq.rolesVisibleTo.includes('all') && !faq.rolesVisibleTo.includes(mappedRole as any)) {
      return NextResponse.json(
        { error: 'No autorizado para ver este FAQ' },
        { status: 403 }
      );
    }
    
    // Obtener FAQs relacionadas
    const relatedFAQs = await FAQService.getRelatedFAQs(faqId, mappedRole, 5);
    
    return NextResponse.json({
      success: true,
      data: {
        faq,
        related: relatedFAQs
      }
    });
    
  } catch (error) {
    console.error('Error getting FAQ:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

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
    
    // Solo admins pueden editar FAQs
    if (session.user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Solo administradores pueden editar FAQs' },
        { status: 403 }
      );
    }
    
    const faqId = params.id;
    const body = await request.json();
    
    // Verificar que el FAQ existe
    const existingFAQ = await FAQService.getFAQById(faqId);
    
    if (!existingFAQ) {
      return NextResponse.json(
        { error: 'FAQ no encontrado' },
        { status: 404 }
      );
    }
    
    // Validar roles visibles si se proporcionan
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
    
    // Preparar datos de actualización
    const updateData: any = {
      lastUpdatedBy: session.user.id
    };
    
    // Campos que se pueden actualizar
    const allowedFields = ['question', 'answer', 'category', 'rolesVisibleTo', 'tags', 'order', 'isPublished'];
    
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateData[field] = field === 'question' || field === 'answer' || field === 'category'
          ? body[field].trim()
          : body[field];
      }
    }
    
    const updatedFAQ = await FAQService.updateFAQ(faqId, updateData);
    
    return NextResponse.json({
      success: true,
      data: updatedFAQ
    });
    
  } catch (error) {
    console.error('Error updating FAQ:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

export async function DELETE(
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
    
    // Solo admins pueden eliminar FAQs
    if (session.user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Solo administradores pueden eliminar FAQs' },
        { status: 403 }
      );
    }
    
    const faqId = params.id;
    
    const deleted = await FAQService.deleteFAQ(faqId);
    
    if (!deleted) {
      return NextResponse.json(
        { error: 'FAQ no encontrado' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      message: 'FAQ eliminado correctamente'
    });
    
  } catch (error) {
    console.error('Error deleting FAQ:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
