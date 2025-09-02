'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Trophy, 
  Star, 
  Calendar, 
  ShoppingCart, 
  Users, 
  BookOpen, 
  Award,
  Clock,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface GameEvent {
  id: string;
  eventType: string;
  pointsEarned: number;
  badgeEarned?: string;
  streakUpdated?: boolean;
  levelUp?: boolean;
  metadata?: {
    eventTitle?: string;
    description?: string;
    [key: string]: any;
  };
  createdAt: string;
  source?: string;
}

interface GamificationEventFeedProps {
  events: GameEvent[];
  limit?: number;
  showExpanded?: boolean;
  className?: string;
}

export default function GamificationEventFeed({
  events,
  limit = 10,
  showExpanded = false,
  className
}: GamificationEventFeedProps) {
  const [expanded, setExpanded] = useState(showExpanded);
  const displayEvents = expanded ? events : events.slice(0, limit);

  const groupEventsByDate = (events: GameEvent[]) => {
    const grouped: { [key: string]: GameEvent[] } = {};
    
    events.forEach(event => {
      const date = new Date(event.createdAt);
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      
      let dateKey: string;
      if (date.toDateString() === today.toDateString()) {
        dateKey = 'Hoy';
      } else if (date.toDateString() === yesterday.toDateString()) {
        dateKey = 'Ayer';
      } else {
        dateKey = date.toLocaleDateString('es-ES', { 
          weekday: 'long', 
          month: 'short', 
          day: 'numeric' 
        });
      }
      
      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      grouped[dateKey].push(event);
    });
    
    return grouped;
  };

  const groupedEvents = groupEventsByDate(displayEvents);

  if (events.length === 0) {
    return (
      <Card className={cn("p-6 text-center", className)}>
        <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-medium text-muted-foreground mb-2">
          No hay actividad reciente
        </h3>
        <p className="text-sm text-muted-foreground">
          Comienza a usar la plataforma para ver tu progreso aquí
        </p>
      </Card>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      <ScrollArea className="h-full max-h-96">
        <div className="space-y-4">
          {Object.entries(groupedEvents).map(([date, dayEvents]) => (
            <div key={date}>
              <h4 className="text-sm font-medium text-muted-foreground mb-3 sticky top-0 bg-background/80 backdrop-blur-sm py-1">
                {date}
              </h4>
              <div className="space-y-2">
                {dayEvents.map((event, index) => (
                  <EventItem key={`${event.id}-${index}`} event={event} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
      
      {events.length > limit && (
        <div className="flex justify-center pt-2 border-t">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setExpanded(!expanded)}
            className="text-muted-foreground hover:text-foreground"
          >
            {expanded ? (
              <>
                <ChevronUp className="h-4 w-4 mr-1" />
                Mostrar menos
              </>
            ) : (
              <>
                <ChevronDown className="h-4 w-4 mr-1" />
                Ver todos ({events.length - limit} más)
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}

function EventItem({ event }: { event: GameEvent }) {
  const icon = getEventIcon(event.eventType);
  const color = getEventColor(event.eventType);
  const description = getEventDescription(event);
  const time = new Date(event.createdAt).toLocaleTimeString('es-ES', {
    hour: '2-digit',
    minute: '2-digit'
  });

  return (
    <Card className="p-3 hover:shadow-md transition-shadow duration-200">
      <div className="flex items-start gap-3">
        {/* Icono del evento */}
        <div className={cn(
          "flex items-center justify-center w-10 h-10 rounded-full shrink-0",
          color.bg
        )}>
          <div className={cn("h-5 w-5", color.text)}>
            {icon}
          </div>
        </div>
        
        {/* Contenido del evento */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <h5 className="text-sm font-medium truncate">
              {event.metadata?.eventTitle || formatEventType(event.eventType)}
            </h5>
            <time className="text-xs text-muted-foreground shrink-0 ml-2">
              {time}
            </time>
          </div>
          
          <p className="text-xs text-muted-foreground mb-2">
            {description}
          </p>
          
          {/* Recompensas */}
          <div className="flex items-center gap-2 flex-wrap">
            {event.pointsEarned > 0 && (
              <Badge variant="secondary" className="text-xs">
                <Star className="h-3 w-3 mr-1 text-yellow-500" />
                +{event.pointsEarned} puntos
              </Badge>
            )}
            
            {event.badgeEarned && (
              <Badge variant="secondary" className="text-xs">
                <Trophy className="h-3 w-3 mr-1 text-blue-500" />
                Nueva insignia
              </Badge>
            )}
            
            {event.levelUp && (
              <Badge variant="secondary" className="text-xs bg-purple-100 text-purple-700">
                <Award className="h-3 w-3 mr-1" />
                ¡Subiste de nivel!
              </Badge>
            )}
            
            {event.streakUpdated && (
              <Badge variant="secondary" className="text-xs bg-orange-100 text-orange-700">
                🔥 Racha actualizada
              </Badge>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}

function getEventIcon(eventType: string) {
  const iconMap: { [key: string]: React.ReactNode } = {
    'daily_login': <Calendar className="h-5 w-5" />,
    'profile_completed': <Users className="h-5 w-5" />,
    'lesson_completed': <BookOpen className="h-5 w-5" />,
    'track_completed': <BookOpen className="h-5 w-5" />,
    'appointment_booked': <Calendar className="h-5 w-5" />,
    'appointment_attended': <Calendar className="h-5 w-5" />,
    'order_placed': <ShoppingCart className="h-5 w-5" />,
    'first_order': <ShoppingCart className="h-5 w-5" />,
    'review_written': <Star className="h-5 w-5" />,
    'referral_sent': <Users className="h-5 w-5" />,
    'referral_joined': <Users className="h-5 w-5" />
  };
  
  return iconMap[eventType] || <Star className="h-5 w-5" />;
}

function getEventColor(eventType: string) {
  const colorMap: { [key: string]: { bg: string; text: string } } = {
    'daily_login': { bg: 'bg-blue-100', text: 'text-blue-600' },
    'profile_completed': { bg: 'bg-green-100', text: 'text-green-600' },
    'lesson_completed': { bg: 'bg-purple-100', text: 'text-purple-600' },
    'track_completed': { bg: 'bg-purple-100', text: 'text-purple-600' },
    'appointment_booked': { bg: 'bg-indigo-100', text: 'text-indigo-600' },
    'appointment_attended': { bg: 'bg-indigo-100', text: 'text-indigo-600' },
    'order_placed': { bg: 'bg-orange-100', text: 'text-orange-600' },
    'first_order': { bg: 'bg-orange-100', text: 'text-orange-600' },
    'review_written': { bg: 'bg-yellow-100', text: 'text-yellow-600' },
    'referral_sent': { bg: 'bg-pink-100', text: 'text-pink-600' },
    'referral_joined': { bg: 'bg-pink-100', text: 'text-pink-600' }
  };
  
  return colorMap[eventType] || { bg: 'bg-gray-100', text: 'text-gray-600' };
}

function getEventDescription(event: GameEvent): string {
  const descriptions: { [key: string]: string } = {
    'daily_login': 'Iniciaste sesión en la plataforma',
    'profile_completed': 'Completaste tu perfil personal',
    'lesson_completed': 'Completaste una lección de la academia',
    'track_completed': 'Terminaste un track completo de onboarding',
    'appointment_booked': 'Agendaste una nueva cita dental',
    'appointment_attended': 'Asististe a tu cita dental',
    'order_placed': 'Realizaste un pedido en el marketplace',
    'first_order': 'Hiciste tu primera compra',
    'review_written': 'Escribiste una reseña de producto',
    'referral_sent': 'Enviaste una invitación de referido',
    'referral_joined': 'Un usuario se registró con tu código'
  };
  
  return event.metadata?.description || 
         descriptions[event.eventType] || 
         'Completaste una actividad en la plataforma';
}

function formatEventType(eventType: string): string {
  return eventType
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}
