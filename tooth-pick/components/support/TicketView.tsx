'use client';

import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarInitials } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  ArrowLeft, 
  Send, 
  Clock, 
  User, 
  Calendar,
  MessageCircle,
  AlertTriangle,
  CheckCircle,
  PlayCircle,
  FileText,
  Download,
  Paperclip
} from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { es } from 'date-fns/locale';

interface Message {
  _id: string;
  sender: 'user' | 'support';
  message: string;
  senderName: string;
  senderId: string;
  timestamp: string;
  attachments?: string[];
}

interface TicketData {
  _id: string;
  ticketNumber: string;
  subject: string;
  description: string;
  status: 'open' | 'in_progress' | 'closed';
  priority: 'low' | 'medium' | 'high';
  category: string;
  userRole: string;
  createdAt: string;
  updatedAt: string;
  closedAt?: string;
  user: {
    _id: string;
    name: string;
    email: string;
  };
  assignedAgent?: {
    _id: string;
    name: string;
    email: string;
  };
  messages: Message[];
  isOverdue: boolean;
  firstResponseTime?: number;
}

interface TicketViewProps {
  ticketId: string;
  userRole?: 'user' | 'admin' | 'support';
  onBack?: () => void;
  onTicketUpdate?: (ticket: TicketData) => void;
}

const statusIcons = {
  open: <Clock className="h-4 w-4" />,
  in_progress: <PlayCircle className="h-4 w-4" />,
  closed: <CheckCircle className="h-4 w-4" />
};

const statusColors = {
  open: 'bg-blue-100 text-blue-800',
  in_progress: 'bg-yellow-100 text-yellow-800',
  closed: 'bg-green-100 text-green-800'
};

const priorityColors = {
  low: 'bg-gray-100 text-gray-800',
  medium: 'bg-orange-100 text-orange-800',
  high: 'bg-red-100 text-red-800'
};

const statusLabels = {
  open: 'Abierto',
  in_progress: 'En Proceso',
  closed: 'Cerrado'
};

const priorityLabels = {
  low: 'Baja',
  medium: 'Media',
  high: 'Alta'
};

export default function TicketView({
  ticketId,
  userRole = 'user',
  onBack,
  onTicketUpdate
}: TicketViewProps) {
  const [ticket, setTicket] = useState<TicketData | null>(null);
  const [loading, setLoading] = useState(true);
  const [newMessage, setNewMessage] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadTicket = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/support/tickets/${ticketId}`);
      
      if (!response.ok) {
        throw new Error('Error cargando ticket');
      }

      const data = await response.json();
      setTicket(data.ticket);

      if (onTicketUpdate) {
        onTicketUpdate(data.ticket);
      }

    } catch (error) {
      console.error('Error cargando ticket:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (ticketId) {
      loadTicket();
    }
  }, [ticketId]);

  useEffect(() => {
    scrollToBottom();
  }, [ticket?.messages]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !ticket) return;

    setSendingMessage(true);
    try {
      const response = await fetch(`/api/support/tickets/${ticketId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'add_message',
          message: newMessage.trim()
        })
      });

      if (!response.ok) {
        throw new Error('Error enviando mensaje');
      }

      const data = await response.json();
      setTicket(data.ticket);
      setNewMessage('');

      if (onTicketUpdate) {
        onTicketUpdate(data.ticket);
      }

    } catch (error) {
      console.error('Error enviando mensaje:', error);
      alert('Error enviando mensaje. Inténtalo de nuevo.');
    } finally {
      setSendingMessage(false);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!ticket || userRole === 'user') return;

    setUpdatingStatus(true);
    try {
      const response = await fetch(`/api/support/tickets/${ticketId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'update_status',
          status: newStatus
        })
      });

      if (!response.ok) {
        throw new Error('Error actualizando estado');
      }

      const data = await response.json();
      setTicket(data.ticket);

      if (onTicketUpdate) {
        onTicketUpdate(data.ticket);
      }

    } catch (error) {
      console.error('Error actualizando estado:', error);
      alert('Error actualizando estado. Inténtalo de nuevo.');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const getUserInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const getCategoryLabel = (category: string) => {
    const categories = {
      'facturacion': 'Facturación',
      'envios': 'Envíos y Logística',
      'soporte_tecnico': 'Soporte Técnico',
      'toothpay': 'ToothPay',
      'marketplace': 'Marketplace',
      'suscripciones': 'Suscripciones',
      'otros': 'Otros'
    };
    return categories[category as keyof typeof categories] || category;
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <div className="animate-pulse">
            <div className="h-6 bg-gray-200 rounded w-1/3 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-20 bg-gray-200 rounded"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!ticket) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <p className="text-gray-500">Ticket no encontrado</p>
          {onBack && (
            <Button variant="outline" onClick={onBack} className="mt-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Volver
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                {onBack && (
                  <Button variant="ghost" size="sm" onClick={onBack}>
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                )}
                <span className="font-mono text-sm text-gray-500">
                  #{ticket.ticketNumber}
                </span>
                
                <Badge className={statusColors[ticket.status]}>
                  {statusIcons[ticket.status]}
                  <span className="ml-1">{statusLabels[ticket.status]}</span>
                </Badge>

                <Badge variant="outline" className={priorityColors[ticket.priority]}>
                  {priorityLabels[ticket.priority]}
                </Badge>

                {ticket.isOverdue && (
                  <Badge variant="destructive">
                    <AlertTriangle className="h-3 w-3 mr-1" />
                    Vencido
                  </Badge>
                )}
              </div>

              <CardTitle className="text-xl mb-2">{ticket.subject}</CardTitle>
              
              <CardDescription className="space-y-2">
                <div className="flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-1">
                    <User className="h-4 w-4" />
                    {ticket.user.name} ({ticket.user.email})
                  </div>
                  
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    Creado {formatDistanceToNow(new Date(ticket.createdAt), { 
                      addSuffix: true, 
                      locale: es 
                    })}
                  </div>

                  {ticket.assignedAgent && (
                    <div className="flex items-center gap-1">
                      <span>Asignado a: {ticket.assignedAgent.name}</span>
                    </div>
                  )}
                </div>

                <div>
                  <Badge variant="secondary">
                    {getCategoryLabel(ticket.category)}
                  </Badge>
                </div>
              </CardDescription>
            </div>

            {/* Controles de estado (solo para admin/support) */}
            {userRole !== 'user' && (
              <div className="flex gap-2">
                <Select
                  value={ticket.status}
                  onValueChange={handleStatusChange}
                  disabled={updatingStatus}
                >
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="open">Abierto</SelectItem>
                    <SelectItem value="in_progress">En Proceso</SelectItem>
                    <SelectItem value="closed">Cerrado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </CardHeader>

        <CardContent>
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-medium mb-2">Descripción inicial:</h4>
            <p className="text-gray-700 whitespace-pre-wrap">{ticket.description}</p>
          </div>
        </CardContent>
      </Card>

      {/* Conversación */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5" />
            Conversación ({ticket.messages.length} mensaje{ticket.messages.length !== 1 ? 's' : ''})
          </CardTitle>
        </CardHeader>

        <CardContent>
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {ticket.messages.length === 0 ? (
              <p className="text-gray-500 text-center py-8">
                No hay mensajes aún. ¡Inicia la conversación!
              </p>
            ) : (
              ticket.messages.map((message, index) => (
                <div key={message._id || index} className="space-y-2">
                  <div className={`flex gap-3 ${message.sender === 'user' ? 'justify-start' : 'justify-end'}`}>
                    <div className={`flex gap-3 max-w-[80%] ${message.sender === 'support' ? 'flex-row-reverse' : ''}`}>
                      <Avatar className="h-8 w-8">
                        <AvatarFallback>
                          {getUserInitials(message.senderName)}
                        </AvatarFallback>
                      </Avatar>

                      <div className={`p-3 rounded-lg ${
                        message.sender === 'user' 
                          ? 'bg-blue-50 border border-blue-200' 
                          : 'bg-green-50 border border-green-200'
                      }`}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium text-sm">
                            {message.senderName}
                            {message.sender === 'support' && (
                              <Badge variant="secondary" className="ml-2 text-xs">
                                Soporte
                              </Badge>
                            )}
                          </span>
                          <span className="text-xs text-gray-500">
                            {format(new Date(message.timestamp), 'dd/MM/yyyy HH:mm')}
                          </span>
                        </div>
                        
                        <p className="text-gray-700 whitespace-pre-wrap">
                          {message.message}
                        </p>

                        {message.attachments && message.attachments.length > 0 && (
                          <div className="mt-2 space-y-1">
                            {message.attachments.map((attachment, idx) => (
                              <div key={idx} className="flex items-center gap-2 text-sm">
                                <Paperclip className="h-4 w-4" />
                                <a 
                                  href={attachment} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="text-blue-600 hover:text-blue-800 underline"
                                >
                                  Adjunto {idx + 1}
                                </a>
                                <Download className="h-4 w-4 text-gray-400" />
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {index < ticket.messages.length - 1 && (
                    <Separator className="my-4" />
                  )}
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Formulario para nuevo mensaje */}
          {ticket.status !== 'closed' && (
            <div className="mt-6 pt-4 border-t">
              <div className="space-y-3">
                <Textarea
                  placeholder="Escribe tu mensaje..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  rows={3}
                  disabled={sendingMessage}
                />
                
                <div className="flex justify-end">
                  <Button
                    onClick={handleSendMessage}
                    disabled={!newMessage.trim() || sendingMessage}
                  >
                    <Send className="h-4 w-4 mr-2" />
                    {sendingMessage ? 'Enviando...' : 'Enviar mensaje'}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {ticket.status === 'closed' && (
            <div className="mt-6 pt-4 border-t">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                <CheckCircle className="h-6 w-6 text-green-600 mx-auto mb-2" />
                <p className="text-green-800 font-medium">Ticket cerrado</p>
                <p className="text-green-600 text-sm">
                  Este ticket fue resuelto el {format(new Date(ticket.closedAt || ticket.updatedAt), 'dd/MM/yyyy HH:mm')}
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Información adicional */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Información del ticket
          </CardTitle>
        </CardHeader>

        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium">Número de ticket:</span>
              <span className="ml-2 font-mono">{ticket.ticketNumber}</span>
            </div>

            <div>
              <span className="font-medium">Estado:</span>
              <Badge className={`ml-2 ${statusColors[ticket.status]}`}>
                {statusLabels[ticket.status]}
              </Badge>
            </div>

            <div>
              <span className="font-medium">Prioridad:</span>
              <Badge variant="outline" className={`ml-2 ${priorityColors[ticket.priority]}`}>
                {priorityLabels[ticket.priority]}
              </Badge>
            </div>

            <div>
              <span className="font-medium">Categoría:</span>
              <span className="ml-2">{getCategoryLabel(ticket.category)}</span>
            </div>

            <div>
              <span className="font-medium">Usuario:</span>
              <span className="ml-2">{ticket.userRole}</span>
            </div>

            <div>
              <span className="font-medium">Creado:</span>
              <span className="ml-2">{format(new Date(ticket.createdAt), 'dd/MM/yyyy HH:mm')}</span>
            </div>

            {ticket.firstResponseTime && (
              <div>
                <span className="font-medium">Tiempo de primera respuesta:</span>
                <span className="ml-2">{Math.round(ticket.firstResponseTime / 60)} minutos</span>
              </div>
            )}

            {ticket.assignedAgent && (
              <div>
                <span className="font-medium">Agente asignado:</span>
                <span className="ml-2">{ticket.assignedAgent.name}</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
