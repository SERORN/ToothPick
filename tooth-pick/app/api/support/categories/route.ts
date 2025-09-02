import { NextRequest, NextResponse } from 'next/server';
import SupportTicketService from '@/lib/services/SupportTicketService';

export async function GET(request: NextRequest) {
  try {
    const categories = SupportTicketService.getAvailableCategories();
    
    return NextResponse.json({ categories });

  } catch (error) {
    console.error('Error obteniendo categorías:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
