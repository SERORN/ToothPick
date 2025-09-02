'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  BarChart3, 
  Users, 
  Clock, 
  AlertTriangle, 
  CheckCircle,
  TrendingUp,
  Filter,
  Search,
  MoreVertical,
  UserCheck,
  MessageSquare,
  Calendar,
  FileText
} from 'lucide-react';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import { es } from 'date-fns/locale';

import TicketList from './TicketList';
import TicketView from './TicketView';

interface Statistics {
  general: {
    totalTickets: number;
    openTickets: number;
    inProgressTickets: number;
    closedTickets: number;
    avgResponseTime: number;
    overdueTickets: number;
    highPriorityTickets: number;
    unassignedTickets: number;
  };
  categories: Array<{
    _id: string;
    count: number;
    avgResponseTime: number;
  }>;
  agents: Array<{
    _id: string;
    agentName: string;
    totalTickets: number;
    closedTickets: number;
    resolutionRate: number;
    avgResponseTime: number;
  }>;
  trends: Array<{
    _id: string;
    ticketsCreated: number;
    ticketsClosed: number;
  }>;
}

interface Agent {
  _id: string;
  name: string;
  email: string;
  role: string;
}

export default function AdminSupportDashboard() {
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedTicket, setSelectedTicket] = useState<string | null>(null);
  const [statistics, setStatistics] = useState<Statistics | null>(null);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Filtros para estadísticas
  const [statsFilters, setStatsFilters] = useState({
    startDate: format(subDays(new Date(), 30), 'yyyy-MM-dd'),
    endDate: format(new Date(), 'yyyy-MM-dd'),
    userRole: '',
    category: '',
    agentId: ''
  });

  // Filtros para operaciones masivas
  const [selectedTickets, setSelectedTickets] = useState<string[]>([]);
  const [bulkAction, setBulkAction] = useState('');

  const loadStatistics = async () => {
    try {
      const params = new URLSearchParams();
      if (statsFilters.startDate) params.append('startDate', statsFilters.startDate);
      if (statsFilters.endDate) params.append('endDate', statsFilters.endDate);
      if (statsFilters.userRole) params.append('userRole', statsFilters.userRole);
      if (statsFilters.category) params.append('category', statsFilters.category);
      if (statsFilters.agentId) params.append('agentId', statsFilters.agentId);

      const response = await fetch(`/api/admin/support/statistics?${params}`);
      
      if (response.ok) {
        const data = await response.json();
        setStatistics(data);
      }
    } catch (error) {
      console.error('Error cargando estadísticas:', error);
    }
  };

  const loadAgents = async () => {
    try {
      const response = await fetch('/api/admin/users?role=support,admin');
      
      if (response.ok) {
        const data = await response.json();
        setAgents(data.users || []);
      }
    } catch (error) {
      console.error('Error cargando agentes:', error);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([
        loadStatistics(),
        loadAgents()
      ]);
      setLoading(false);
    };

    loadData();
  }, [statsFilters, refreshTrigger]);

  const handleTicketSelect = (ticket: any) => {
    setSelectedTicket(ticket._id);
    setActiveTab('tickets');
  };

  const handleTicketUpdate = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  const handleBackToList = () => {
    setSelectedTicket(null);
  };

  const handleBulkAction = async () => {
    if (!bulkAction || selectedTickets.length === 0) return;

    try {
      const response = await fetch('/api/admin/support/tickets', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: bulkAction,
          ticketIds: selectedTickets,
          status: bulkAction === 'bulk_update_status' ? 'closed' : undefined,
          agentId: bulkAction === 'bulk_assign' ? statsFilters.agentId : undefined
        })
      });

      if (response.ok) {
        setSelectedTickets([]);
        setBulkAction('');
        setRefreshTrigger(prev => prev + 1);
      }
    } catch (error) {
      console.error('Error en acción masiva:', error);
    }
  };

  const formatTime = (minutes: number) => {
    if (minutes < 60) {
      return `${Math.round(minutes)}m`;
    }
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    return `${hours}h ${mins}m`;
  };

  const categories = [
    { value: 'facturacion', label: 'Facturación' },
    { value: 'envios', label: 'Envíos y Logística' },
    { value: 'soporte_tecnico', label: 'Soporte Técnico' },
    { value: 'toothpay', label: 'ToothPay' },
    { value: 'marketplace', label: 'Marketplace' },
    { value: 'suscripciones', label: 'Suscripciones' },
    { value: 'otros', label: 'Otros' }
  ];

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
                  <div className="h-8 bg-gray-200 rounded w-1/3"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Panel de Soporte</h1>
          <p className="text-gray-600">Gestión de tickets y estadísticas de soporte</p>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setRefreshTrigger(prev => prev + 1)}
          >
            Actualizar
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Resumen</TabsTrigger>
          <TabsTrigger value="tickets">Tickets</TabsTrigger>
          <TabsTrigger value="analytics">Analíticas</TabsTrigger>
        </TabsList>

        {/* Tab: Resumen */}
        <TabsContent value="overview" className="space-y-6">
          {/* Filtros de estadísticas */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Filter className="h-5 w-5" />
                Filtros de estadísticas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <div>
                  <label className="text-sm font-medium">Fecha inicio</label>
                  <Input
                    type="date"
                    value={statsFilters.startDate}
                    onChange={(e) => setStatsFilters(prev => ({ ...prev, startDate: e.target.value }))}
                  />
                </div>
                
                <div>
                  <label className="text-sm font-medium">Fecha fin</label>
                  <Input
                    type="date"
                    value={statsFilters.endDate}
                    onChange={(e) => setStatsFilters(prev => ({ ...prev, endDate: e.target.value }))}
                  />
                </div>

                <div>
                  <label className="text-sm font-medium">Tipo de usuario</label>
                  <Select
                    value={statsFilters.userRole}
                    onValueChange={(value) => setStatsFilters(prev => ({ ...prev, userRole: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Todos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Todos</SelectItem>
                      <SelectItem value="dentist">Dentistas</SelectItem>
                      <SelectItem value="distributor">Distribuidores</SelectItem>
                      <SelectItem value="customer">Clientes</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium">Categoría</label>
                  <Select
                    value={statsFilters.category}
                    onValueChange={(value) => setStatsFilters(prev => ({ ...prev, category: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Todas" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Todas</SelectItem>
                      {categories.map(category => (
                        <SelectItem key={category.value} value={category.value}>
                          {category.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium">Agente</label>
                  <Select
                    value={statsFilters.agentId}
                    onValueChange={(value) => setStatsFilters(prev => ({ ...prev, agentId: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Todos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Todos</SelectItem>
                      {agents.map(agent => (
                        <SelectItem key={agent._id} value={agent._id}>
                          {agent.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Métricas principales */}
          {statistics && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Total Tickets</p>
                        <p className="text-2xl font-bold">{statistics.general.totalTickets}</p>
                      </div>
                      <FileText className="h-8 w-8 text-blue-600" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Abiertos</p>
                        <p className="text-2xl font-bold text-blue-600">{statistics.general.openTickets}</p>
                      </div>
                      <Clock className="h-8 w-8 text-blue-600" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">En Proceso</p>
                        <p className="text-2xl font-bold text-yellow-600">{statistics.general.inProgressTickets}</p>
                      </div>
                      <Users className="h-8 w-8 text-yellow-600" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Cerrados</p>
                        <p className="text-2xl font-bold text-green-600">{statistics.general.closedTickets}</p>
                      </div>
                      <CheckCircle className="h-8 w-8 text-green-600" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Tiempo Respuesta Promedio</p>
                        <p className="text-2xl font-bold">{formatTime(statistics.general.avgResponseTime || 0)}</p>
                      </div>
                      <TrendingUp className="h-8 w-8 text-purple-600" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Vencidos</p>
                        <p className="text-2xl font-bold text-red-600">{statistics.general.overdueTickets}</p>
                      </div>
                      <AlertTriangle className="h-8 w-8 text-red-600" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Alta Prioridad</p>
                        <p className="text-2xl font-bold text-red-600">{statistics.general.highPriorityTickets}</p>
                      </div>
                      <AlertTriangle className="h-8 w-8 text-red-600" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Sin Asignar</p>
                        <p className="text-2xl font-bold text-orange-600">{statistics.general.unassignedTickets}</p>
                      </div>
                      <UserCheck className="h-8 w-8 text-orange-600" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Estadísticas por categoría */}
              <Card>
                <CardHeader>
                  <CardTitle>Tickets por Categoría</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {statistics.categories.map((category) => {
                      const categoryInfo = categories.find(c => c.value === category._id);
                      return (
                        <div key={category._id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div>
                            <p className="font-medium">{categoryInfo?.label || category._id}</p>
                            <p className="text-sm text-gray-600">
                              {category.count} ticket{category.count !== 1 ? 's' : ''}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm text-gray-600">Tiempo promedio</p>
                            <p className="font-medium">{formatTime(category.avgResponseTime || 0)}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              {/* Rendimiento de agentes */}
              <Card>
                <CardHeader>
                  <CardTitle>Rendimiento de Agentes</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {statistics.agents.map((agent) => (
                      <div key={agent._id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                          <p className="font-medium">{agent.agentName}</p>
                          <p className="text-sm text-gray-600">
                            {agent.totalTickets} ticket{agent.totalTickets !== 1 ? 's' : ''} total
                          </p>
                        </div>
                        <div className="text-right space-y-1">
                          <div className="flex items-center gap-4">
                            <div>
                              <p className="text-xs text-gray-600">Tasa resolución</p>
                              <p className="font-medium">{Math.round(agent.resolutionRate)}%</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-600">Tiempo promedio</p>
                              <p className="font-medium">{formatTime(agent.avgResponseTime || 0)}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        {/* Tab: Tickets */}
        <TabsContent value="tickets" className="space-y-6">
          {selectedTicket ? (
            <TicketView
              ticketId={selectedTicket}
              userRole="admin"
              onBack={handleBackToList}
              onTicketUpdate={handleTicketUpdate}
            />
          ) : (
            <>
              {/* Acciones masivas */}
              {selectedTickets.length > 0 && (
                <Card>
                  <CardContent className="py-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <span className="text-sm font-medium">
                          {selectedTickets.length} ticket{selectedTickets.length !== 1 ? 's' : ''} seleccionado{selectedTickets.length !== 1 ? 's' : ''}
                        </span>
                        
                        <Select value={bulkAction} onValueChange={setBulkAction}>
                          <SelectTrigger className="w-48">
                            <SelectValue placeholder="Seleccionar acción" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="bulk_update_status">Cerrar tickets</SelectItem>
                            <SelectItem value="bulk_assign">Asignar a agente</SelectItem>
                          </SelectContent>
                        </Select>

                        {bulkAction === 'bulk_assign' && (
                          <Select 
                            value={statsFilters.agentId} 
                            onValueChange={(value) => setStatsFilters(prev => ({ ...prev, agentId: value }))}
                          >
                            <SelectTrigger className="w-48">
                              <SelectValue placeholder="Seleccionar agente" />
                            </SelectTrigger>
                            <SelectContent>
                              {agents.map(agent => (
                                <SelectItem key={agent._id} value={agent._id}>
                                  {agent.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      </div>

                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          onClick={() => setSelectedTickets([])}
                        >
                          Cancelar
                        </Button>
                        <Button
                          onClick={handleBulkAction}
                          disabled={!bulkAction || (bulkAction === 'bulk_assign' && !statsFilters.agentId)}
                        >
                          Aplicar acción
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              <TicketList
                userRole="admin"
                onTicketSelect={handleTicketSelect}
                refreshTrigger={refreshTrigger}
              />
            </>
          )}
        </TabsContent>

        {/* Tab: Analíticas */}
        <TabsContent value="analytics" className="space-y-6">
          {statistics && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Tendencias (Últimos 7 días)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {statistics.trends.map((trend) => (
                    <div key={trend._id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium">{format(new Date(trend._id), 'dd/MM/yyyy', { locale: es })}</p>
                      </div>
                      <div className="flex gap-6 text-sm">
                        <div className="text-center">
                          <p className="text-gray-600">Creados</p>
                          <p className="font-bold text-blue-600">{trend.ticketsCreated}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-gray-600">Cerrados</p>
                          <p className="font-bold text-green-600">{trend.ticketsClosed}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
