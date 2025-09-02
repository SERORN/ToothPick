import { NextResponse, NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import NotificationService from '@/lib/services/NotificationService';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    
    // Filtros avanzados FASE 38
    const category = searchParams.get('category') || undefined;
    const isRead = searchParams.get('isRead') ? searchParams.get('isRead') === 'true' : undefined;
    const priority = searchParams.get('priority') || undefined;
    const startDate = searchParams.get('startDate') ? new Date(searchParams.get('startDate')!) : undefined;
    const endDate = searchParams.get('endDate') ? new Date(searchParams.get('endDate')!) : undefined;
    
    // Opciones de paginación
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const sortOrder = (searchParams.get('sortOrder') || 'desc') as 'asc' | 'desc';
    
    // Compatibilidad con versión anterior
    const onlyUnread = searchParams.get('unread') === 'true';
    
    if (onlyUnread || isRead !== undefined || category || priority || startDate || endDate || page > 1) {
      // Usar método avanzado con filtros
      const filters = { category, isRead: onlyUnread ? false : isRead, priority, startDate, endDate };
      const options = { page, limit, sortBy, sortOrder };
      
      const result = await NotificationService.getUserNotificationsAdvanced(session.user.id, filters, options);
      
      return NextResponse.json({
        success: true,
        data: result
      }, { status: 200 });
    } else {
      // Usar método simple para compatibilidad
      const notifications = await NotificationService.getUserNotifications(
        session.user.id,
        { limit, onlyUnread: false }
      );

      return NextResponse.json({
        success: true,
        data: {
          notifications: notifications.map((n: any) => ({
            id: n._id?.toString() || n.id,
            title: n.title,
            message: n.message,
            type: n.type,
            category: n.category || 'system',
            priority: n.priority || 'medium',
            isRead: n.isRead || n.read,
            url: n.url,
            icon: n.icon,
            metadata: n.metadata,
            createdAt: n.createdAt,
            readAt: n.readAt,
            timeAgo: getTimeAgo(n.createdAt)
          }))
        }
      }, { status: 200 });
    }

  } catch (error) {
    console.error('Error fetching notifications:', error);
    return NextResponse.json({ error: 'Error al obtener notificaciones' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { action, notificationId, notificationIds } = await req.json();

    // Marcar una notificación como leída
    if (action === 'markAsRead' && notificationId) {
      const notification = await NotificationService.markAsRead(notificationId, session.user.id);
      
      if (!notification) {
        return NextResponse.json({ error: 'Notificación no encontrada' }, { status: 404 });
      }

      return NextResponse.json(notification, { status: 200 });
    }

    // Marcar múltiples notificaciones como leídas (FASE 38)
    if (action === 'markMultipleAsRead' && notificationIds && Array.isArray(notificationIds)) {
      const modifiedCount = await NotificationService.markNotificationsAsRead(session.user.id, notificationIds);
      
      return NextResponse.json({ 
        success: true, 
        modifiedCount 
      }, { status: 200 });
    }

    // Marcar todas como leídas
    if (action === 'markAllAsRead') {
      await NotificationService.markAllAsRead(session.user.id);
      return NextResponse.json({ success: true }, { status: 200 });
    }

    // Eliminar notificación (FASE 38)
    if (action === 'delete' && notificationId) {
      const deleted = await NotificationService.deleteNotification(session.user.id, notificationId);
      
      if (!deleted) {
        return NextResponse.json({ error: 'Notificación no encontrada' }, { status: 404 });
      }

      return NextResponse.json({ success: true }, { status: 200 });
    }

    return NextResponse.json({ error: 'Acción no válida' }, { status: 400 });
  } catch (error) {
    console.error('Error processing notification action:', error);
    return NextResponse.json({ error: 'Error al procesar la acción' }, { status: 500 });
  }
}

// Función auxiliar para tiempo relativo
function getTimeAgo(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - new Date(date).getTime();
  
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  
  if (minutes < 1) return 'Ahora mismo';
  if (minutes < 60) return `Hace ${minutes} minuto${minutes > 1 ? 's' : ''}`;
  if (hours < 24) return `Hace ${hours} hora${hours > 1 ? 's' : ''}`;
  if (days < 7) return `Hace ${days} día${days > 1 ? 's' : ''}`;
  
  return new Date(date).toLocaleDateString('es-ES', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}
