import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import NotificationService from '@/lib/services/NotificationService';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const unreadCount = await NotificationService.getUnreadCount(session.user.id);

    return NextResponse.json({ count: unreadCount }, { status: 200 });
  } catch (error) {
    console.error('Error fetching unread count:', error);
    return NextResponse.json({ error: 'Error al obtener contador' }, { status: 500 });
  }
}
