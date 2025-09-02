'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CalendarDays, Gift, Star, TrendingUp, Users, CreditCard, RefreshCw, Award } from 'lucide-react';
// import { formatDistanceToNow } from 'date-fns';
// import { es } from 'date-fns/locale';

interface LoyaltyEvent {
  _id: string;
  eventType: string;
  pointsAwarded: number;
  xpAwarded: number;
  description: string;
  eventDate: string;
  originalEventDate: string;
  tierAtTime: string;
  tierLevel: number;
  metadata: {
    sourceModule?: string;
    reason?: string;
    [key: string]: any;
  };
}

interface LoyaltyHistoryProps {
  userId: string;
  organizationId: string;
  maxEvents?: number;
}

const EVENT_ICONS = {
  'PAY_ON_TIME': CreditCard,
  'RENEW_SUBSCRIPTION': RefreshCw,
  'UPGRADE_SUBSCRIPTION': TrendingUp,
  'REFER_USER': Users,
  'PARTICIPATE_IN_CAMPAIGN': Star,
  'MILESTONE_ACHIEVED': Award,
  'WELCOME_BONUS': Gift,
  'SPEND_OVER_X': TrendingUp,
  'DEFAULT': Gift
};

const EVENT_COLORS = {
  'PAY_ON_TIME': 'bg-green-100 text-green-800',
  'RENEW_SUBSCRIPTION': 'bg-blue-100 text-blue-800',
  'UPGRADE_SUBSCRIPTION': 'bg-purple-100 text-purple-800',
  'REFER_USER': 'bg-yellow-100 text-yellow-800',
  'PARTICIPATE_IN_CAMPAIGN': 'bg-pink-100 text-pink-800',
  'MILESTONE_ACHIEVED': 'bg-orange-100 text-orange-800',
  'WELCOME_BONUS': 'bg-emerald-100 text-emerald-800',
  'SPEND_OVER_X': 'bg-indigo-100 text-indigo-800'
};

const EVENT_LABELS = {
  'PAY_ON_TIME': 'Pago Puntual',
  'RENEW_SUBSCRIPTION': 'Renovación',
  'UPGRADE_SUBSCRIPTION': 'Upgrade',
  'REFER_USER': 'Referencia',
  'PARTICIPATE_IN_CAMPAIGN': 'Campaña',
  'MILESTONE_ACHIEVED': 'Logro',
  'WELCOME_BONUS': 'Bienvenida',
  'SPEND_OVER_X': 'Alto Gasto'
};

export function LoyaltyHistory({ userId, organizationId, maxEvents = 10 }: LoyaltyHistoryProps) {
  const [events, setEvents] = useState<LoyaltyEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [totalPoints, setTotalPoints] = useState(0);

  useEffect(() => {
    fetchEvents();
  }, [userId, organizationId]);

  const fetchEvents = async (pageNum = 1) => {
    try {
      setIsLoading(true);
      const response = await fetch(
        `/api/loyalty/events?userId=${userId}&organizationId=${organizationId}&page=${pageNum}&limit=${maxEvents}`
      );
      
      if (!response.ok) {
        throw new Error('Error cargando historial');
      }
      
      const data = await response.json();
      
      if (pageNum === 1) {
        setEvents(data.events);
        setTotalPoints(data.summary?.totalPointsEarned || 0);
      } else {
        setEvents(prev => [...prev, ...data.events]);
      }
      
      setHasMore(data.hasMore);
      setPage(pageNum);
    } catch (error) {
      console.error('Error cargando eventos:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadMore = () => {
    if (!isLoading && hasMore) {
      fetchEvents(page + 1);
    }
  };

  const getEventIcon = (eventType: string) => {
    const IconComponent = EVENT_ICONS[eventType as keyof typeof EVENT_ICONS] || EVENT_ICONS.DEFAULT;
    return <IconComponent className="h-4 w-4" />;
  };

  const getEventColor = (eventType: string) => {
    return EVENT_COLORS[eventType as keyof typeof EVENT_COLORS] || 'bg-gray-100 text-gray-800';
  };

  const getEventLabel = (eventType: string) => {
    return EVENT_LABELS[eventType as keyof typeof EVENT_LABELS] || eventType;
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor(diffMs / (1000 * 60));

    if (diffDays > 0) {
      return `hace ${diffDays} día${diffDays > 1 ? 's' : ''}`;
    } else if (diffHours > 0) {
      return `hace ${diffHours} hora${diffHours > 1 ? 's' : ''}`;
    } else if (diffMinutes > 0) {
      return `hace ${diffMinutes} minuto${diffMinutes > 1 ? 's' : ''}`;
    } else {
      return 'hace un momento';
    }
  };

  if (isLoading && events.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5" />
            Historial de Fidelización
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="animate-pulse flex items-center space-x-4">
                <div className="rounded-full bg-gray-200 h-10 w-10"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5" />
            Historial de Fidelización
          </div>
          {totalPoints > 0 && (
            <Badge variant="secondary" className="text-sm">
              {totalPoints.toLocaleString()} puntos totales
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {events.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Gift className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No hay eventos de fidelización aún</p>
            <p className="text-sm">¡Empieza a ganar puntos con tus actividades!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {events.map((event) => (
              <div key={event._id} className="flex items-start space-x-4 p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                {/* Icono del evento */}
                <div className={`p-2 rounded-full ${getEventColor(event.eventType)}`}>
                  {getEventIcon(event.eventType)}
                </div>
                
                {/* Contenido del evento */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-medium text-gray-900">
                      {event.description}
                    </h4>
                    <div className="flex items-center gap-2 text-sm">
                      {event.pointsAwarded > 0 && (
                        <Badge variant="outline" className="text-green-600 border-green-200">
                          +{event.pointsAwarded} pts
                        </Badge>
                      )}
                      {event.xpAwarded > 0 && (
                        <Badge variant="outline" className="text-blue-600 border-blue-200">
                          +{event.xpAwarded} XP
                        </Badge>
                      )}
                    </div>
                  </div>
                  
                  {/* Detalles del evento */}
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <div className="flex items-center gap-3">
                      <Badge className={getEventColor(event.eventType)}>
                        {getEventLabel(event.eventType)}
                      </Badge>
                      <span>Tier: {event.tierAtTime}</span>
                      {event.metadata.sourceModule && (
                        <span>• {event.metadata.sourceModule}</span>
                      )}
                    </div>
                    <span>
                      {formatTimeAgo(event.eventDate)}
                    </span>
                  </div>
                  
                  {/* Metadata adicional */}
                  {event.metadata.reason && (
                    <p className="text-xs text-gray-600 mt-1">
                      {event.metadata.reason}
                    </p>
                  )}
                </div>
              </div>
            ))}
            
            {/* Botón cargar más */}
            {hasMore && (
              <div className="text-center pt-4">
                <Button
                  variant="outline"
                  onClick={loadMore}
                  disabled={isLoading}
                  className="w-full"
                >
                  {isLoading ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Cargando...
                    </>
                  ) : (
                    'Cargar más eventos'
                  )}
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default LoyaltyHistory;
