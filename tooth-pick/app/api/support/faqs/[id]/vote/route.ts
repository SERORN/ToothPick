import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import FAQService from '@/lib/services/FAQService';

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
    
    const faqId = params.id;
    const body = await request.json();
    
    // Validar voto
    if (typeof body.isHelpful !== 'boolean') {
      return NextResponse.json(
        { error: 'El campo isHelpful es requerido y debe ser boolean' },
        { status: 400 }
      );
    }
    
    // Verificar que el FAQ existe
    const faq = await FAQService.getFAQById(faqId);
    
    if (!faq) {
      return NextResponse.json(
        { error: 'FAQ no encontrado' },
        { status: 404 }
      );
    }
    
    // Verificar permisos de visualización
    const userRole = session.user.role;
    const mappedRole = userRole === 'customer' || userRole === 'dentist' || userRole === 'patient' ? 'clinic' : userRole;
    
    if (!faq.isPublished || (!faq.rolesVisibleTo.includes('all') && !faq.rolesVisibleTo.includes(mappedRole as any))) {
      return NextResponse.json(
        { error: 'No autorizado para votar en este FAQ' },
        { status: 403 }
      );
    }
    
    const updatedFAQ = await FAQService.voteFAQ(faqId, body.isHelpful);
    
    return NextResponse.json({
      success: true,
      data: {
        isHelpful: updatedFAQ?.isHelpful,
        isNotHelpful: updatedFAQ?.isNotHelpful
      }
    });
    
  } catch (error) {
    console.error('Error voting FAQ:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
