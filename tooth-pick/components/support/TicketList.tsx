'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Search, 
  Filter, 
  Ticket, 
  Clock, 
  MessageCircle, 
  AlertTriangle,
  CheckCircle,
  PlayCircle,
  XCircle,
  Calendar,
  User
} from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { es } from 'date-fns/locale';

interface TicketItem {
  _id: string;
  ticketNumber: string;
  subject: string;
  status: 'open' | 'in_progress' | 'closed';
  priority: 'low' | 'medium' | 'high';
  category: string;
  createdAt: string;
  updatedAt: string;
  user: {
    name: string;
    email: string;
  };
  assignedAgent?: {
    name: string;
  };
  messages: any[];
  isOverdue: boolean;
}

interface TicketListProps {
  userRole?: 'user' | 'admin' | 'support';
  onTicketSelect?: (ticket: TicketItem) => void;
  refreshTrigger?: number;
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

export default function TicketList({
  userRole = 'user',
  onTicketSelect,
  refreshTrigger = 0
}: TicketListProps) {
  const [tickets, setTickets] = useState<TicketItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    pages: 0
  });

  const [categories] = useState([
    { value: 'facturacion', label: 'Facturación' },
    { value: 'envios', label: 'Envíos y Logística' },
    { value: 'soporte_tecnico', label: 'Soporte Técnico' },
    { value: 'toothpay', label: 'ToothPay' },
    { value: 'marketplace', label: 'Marketplace' },
    { value: 'suscripciones', label: 'Suscripciones' },
    { value: 'otros', label: 'Otros' }
  ]);

  const loadTickets = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString()
      });

      if (searchTerm) params.append('search', searchTerm);
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (priorityFilter !== 'all') params.append('priority', priorityFilter);
      if (categoryFilter !== 'all') params.append('category', categoryFilter);

      const endpoint = userRole === 'user' 
        ? '/api/support/tickets'
        : '/api/admin/support/tickets';

      const response = await fetch(`${endpoint}?${params}`);
      
      if (!response.ok) {
        throw new Error('Error cargando tickets');
      }

      const data = await response.json();
      setTickets(data.tickets || []);
      setPagination(prev => ({
        ...prev,
        total: data.total || 0,
        pages: data.pages || 0
      }));

    } catch (error) {
      console.error('Error cargando tickets:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTickets();
  }, [pagination.page, refreshTrigger]);

  useEffect(() => {
    // Resetear página cuando cambian los filtros
    setPagination(prev => ({ ...prev, page: 1 }));
  }, [searchTerm, statusFilter, priorityFilter, categoryFilter]);

  useEffect(() => {
    // Cargar tickets cuando cambia la página o filtros
    const timer = setTimeout(() => {
      if (pagination.page === 1) {
        loadTickets();
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm, statusFilter, priorityFilter, categoryFilter]);

  const handleTicketClick = (ticket: TicketItem) => {
    if (onTicketSelect) {
      onTicketSelect(ticket);
    }
  };

  const getLastMessageTime = (ticket: TicketItem) => {
    if (ticket.messages && ticket.messages.length > 0) {
      const lastMessage = ticket.messages[ticket.messages.length - 1];
      return new Date(lastMessage.timestamp);
    }
    return new Date(ticket.updatedAt);
  };

  if (loading && tickets.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Cargando tickets...</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header y filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Ticket className="h-5 w-5" />
            {userRole === 'user' ? 'Mis Tickets' : 'Panel de Tickets'}
          </CardTitle>
          <CardDescription>
            {userRole === 'user' 
              ? 'Lista de todos tus tickets de soporte'
              : 'Gestión de tickets del sistema de soporte'
            }
          </CardDescription>
        </CardHeader>

        <CardContent>
          <div className="space-y-4">
            {/* Búsqueda */}
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Buscar por asunto, descripción o número de ticket..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Filtros */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Estado" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los estados</SelectItem>
                    <SelectItem value="open">Abierto</SelectItem>
                    <SelectItem value="in_progress">En Proceso</SelectItem>
                    <SelectItem value="closed">Cerrado</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Prioridad" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas las prioridades</SelectItem>
                    <SelectItem value="high">Alta</SelectItem>
                    <SelectItem value="medium">Media</SelectItem>
                    <SelectItem value="low">Baja</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Categoría" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas las categorías</SelectItem>
                    {categories.map(category => (
                      <SelectItem key={category.value} value={category.value}>
                        {category.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button 
                variant="outline" 
                onClick={() => {
                  setSearchTerm('');
                  setStatusFilter('all');
                  setPriorityFilter('all');
                  setCategoryFilter('all');
                }}
              >
                <Filter className="h-4 w-4 mr-2" />
                Limpiar filtros
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lista de tickets */}
      <div className="space-y-4">
        {tickets.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center">
              <Ticket className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-lg font-medium text-gray-900 mb-2">
                No hay tickets
              </p>
              <p className="text-gray-500">
                {searchTerm || statusFilter !== 'all' || priorityFilter !== 'all' || categoryFilter !== 'all'
                  ? 'No se encontraron tickets con los filtros aplicados'
                  : userRole === 'user' 
                    ? 'Aún no has creado ningún ticket de soporte'
                    : 'No hay tickets en el sistema'
                }
              </p>
            </CardContent>
          </Card>
        ) : (
          tickets.map((ticket) => (
            <Card 
              key={ticket._id}
              className={`cursor-pointer transition-all duration-200 hover:shadow-md ${
                ticket.isOverdue ? 'border-red-200 bg-red-50' : ''
              }`}
              onClick={() => handleTicketClick(ticket)}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    {/* Header */}
                    <div className="flex items-center gap-2 mb-2">
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

                    {/* Título */}
                    <h3 className="font-semibold text-gray-900 mb-2 truncate">
                      {ticket.subject}
                    </h3>

                    {/* Metadatos */}
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <div className="flex items-center gap-1">
                        <User className="h-4 w-4" />
                        {userRole === 'user' ? ticket.user.name : ticket.user.email}
                      </div>

                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        {formatDistanceToNow(new Date(ticket.createdAt), { 
                          addSuffix: true, 
                          locale: es 
                        })}
                      </div>

                      {ticket.messages.length > 0 && (
                        <div className="flex items-center gap-1">
                          <MessageCircle className="h-4 w-4" />
                          {ticket.messages.length} mensaje{ticket.messages.length !== 1 ? 's' : ''}
                        </div>
                      )}

                      {ticket.assignedAgent && (
                        <div className="flex items-center gap-1">
                          <span>Asignado a: {ticket.assignedAgent.name}</span>
                        </div>
                      )}
                    </div>

                    {/* Categoría */}
                    <div className="mt-2">
                      <Badge variant="secondary">
                        {categories.find(c => c.value === ticket.category)?.label || ticket.category}
                      </Badge>
                    </div>
                  </div>

                  {/* Última actividad */}
                  <div className="text-right text-sm text-gray-500 ml-4">
                    <div>Actualizado</div>
                    <div>{format(getLastMessageTime(ticket), 'dd/MM/yyyy HH:mm')}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Paginación */}
      {pagination.pages > 1 && (
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-500">
                Mostrando {tickets.length} de {pagination.total} tickets
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPagination(prev => ({ ...prev, page: Math.max(1, prev.page - 1) }))}
                  disabled={pagination.page === 1 || loading}
                >
                  Anterior
                </Button>

                <span className="text-sm">
                  Página {pagination.page} de {pagination.pages}
                </span>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPagination(prev => ({ ...prev, page: Math.min(prev.pages, prev.page + 1) }))}
                  disabled={pagination.page === pagination.pages || loading}
                >
                  Siguiente
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
