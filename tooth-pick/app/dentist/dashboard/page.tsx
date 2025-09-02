import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { GamificationProvider } from '@/lib/contexts/GamificationContext';
import { GamificationIntegrator } from '@/components/gamification/GamificationIntegrator';
import GamificationMiniDashboard from '@/components/gamification/GamificationMiniDashboard';
import { 
  Calendar,
  Clock,
  User,
  DollarSign,
  TrendingUp,
  Phone,
  Mail,
  MapPin,
  CheckCircle,
  AlertCircle,
  XCircle,
  Eye,
  Edit,
  Plus
} from 'lucide-react';

interface Appointment {
  id: string;
  appointmentNumber: string;
  patient: {
    name: string;
    email: string;
    phone: string;
    age?: number;
  };
  date: string;
  time: string;
  service: string;
  estimatedCost: number;
  status: 'confirmed' | 'pending' | 'completed' | 'cancelled';
  reasonForVisit: string;
  symptoms: string[];
  notes?: string;
  financing?: {
    amount: number;
    status: string;
  };
  reminderStatus?: 'pending' | 'sent' | 'failed' | 'not_needed';
  reminderType?: 'email' | 'sms' | 'whatsapp';
  reminderTimestamp?: string;
}

interface DashboardStats {
  todayAppointments: number;
  weekAppointments: number;
  monthRevenue: number;
  pendingFinancing: number;
  averageRating: number;
  totalPatients: number;
  remindersSent: number;
  remindersFailed: number;
}

interface TimeSlot {
  id: string;
  startTime: string;
  endTime: string;
  dayOfWeek: number;
  isAvailable: boolean;
  service: string;
  duration: number;
  price: number;
}

export default function DentistDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
      return;
    }
    
    if (session?.user && session.user.role !== 'dentist') {
      router.push('/patient/dashboard');
      return;
    }

    if (session?.user) {
      fetchDashboardData();
    }
  }, [session, status]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // Fetch appointments
      const appointmentsRes = await fetch('/api/dentist/appointments');
      if (appointmentsRes.ok) {
        const appointmentsData = await appointmentsRes.json();
        setAppointments(appointmentsData.appointments);
      }

      // Fetch stats
      const statsRes = await fetch('/api/dentist/stats');
      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData);
      }

      // Fetch available slots
      const slotsRes = await fetch('/api/dentist/slots');
      if (slotsRes.ok) {
        const slotsData = await slotsRes.json();
        setSlots(slotsData.slots);
      }

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAppointmentAction = async (appointmentId: string, action: string) => {
    try {
      const response = await fetch(`/api/dentist/appointments/${appointmentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
      });

      if (response.ok) {
        fetchDashboardData(); // Refresh data
      }
    } catch (error) {
      console.error('Error updating appointment:', error);
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'confirmed': return 'default';
      case 'pending': return 'secondary';
      case 'completed': return 'secondary';
      case 'cancelled': return 'destructive';
      default: return 'secondary';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'confirmed': return <CheckCircle className="h-4 w-4" />;
      case 'pending': return <AlertCircle className="h-4 w-4" />;
      case 'completed': return <CheckCircle className="h-4 w-4" />;
      case 'cancelled': return <XCircle className="h-4 w-4" />;
      default: return <AlertCircle className="h-4 w-4" />;
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(price);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-MX', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getTodayAppointments = () => {
    const today = new Date().toISOString().split('T')[0];
    return appointments.filter(apt => apt.date.split('T')[0] === today);
  };

  const getUpcomingAppointments = () => {
    const today = new Date();
    return appointments
      .filter(apt => new Date(apt.date) > today && apt.status !== 'cancelled')
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(0, 5);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-200 rounded w-1/3"></div>
            <div className="grid gap-6 md:grid-cols-4">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="h-32 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <GamificationProvider userId={session?.user?.id || ''}>
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">
              Dashboard - Dr. {session?.user?.name}
            </h1>
            <p className="text-gray-600 mt-1">
              Clínica Dental
            </p>
          </div>

          {/* Stats Cards */}
          {stats && (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Citas Hoy</p>
                      <p className="text-3xl font-bold">{stats.todayAppointments}</p>
                    </div>
                    <Calendar className="h-8 w-8 text-blue-600" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Esta Semana</p>
                      <p className="text-3xl font-bold">{stats.weekAppointments}</p>
                    </div>
                    <Clock className="h-8 w-8 text-green-600" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Ingresos del Mes</p>
                      <p className="text-2xl font-bold">{formatPrice(stats.monthRevenue)}</p>
                    </div>
                    <DollarSign className="h-8 w-8 text-emerald-600" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Total Pacientes</p>
                      <p className="text-3xl font-bold">{stats.totalPatients}</p>
                    </div>
                    <User className="h-8 w-8 text-purple-600" />
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Gamification Mini Dashboard - Debajo de métricas clínicas */}
          <div className="mb-8">
            <GamificationMiniDashboard
              userId={session?.user?.id || ''}
              role="dentist"
              showRacha={true}
              showNivel={true}
              showBadgesPreview={true}
              linkToFullProfile={true}
            />
          </div>

        {/* Main Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="overview">Resumen</TabsTrigger>
            <TabsTrigger value="appointments">Citas</TabsTrigger>
            <TabsTrigger value="schedule">Horarios</TabsTrigger>
            <TabsTrigger value="reminders">Recordatorios</TabsTrigger>
            <TabsTrigger value="financing">ToothPay</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Citas de hoy */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Citas de Hoy ({getTodayAppointments().length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {getTodayAppointments().length === 0 ? (
                  <p className="text-gray-500 text-center py-4">
                    No tienes citas programadas para hoy
                  </p>
                ) : (
                  <div className="space-y-3">
                    {getTodayAppointments().map((appointment) => (
                      <div
                        key={appointment.id}
                        className="flex items-center justify-between p-4 border rounded-lg"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                          <div>
                            <p className="font-medium">{appointment.patient.name}</p>
                            <p className="text-sm text-gray-600">
                              {appointment.time} • {appointment.service}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={getStatusBadgeVariant(appointment.status)}>
                            {getStatusIcon(appointment.status)}
                            <span className="ml-1 capitalize">{appointment.status}</span>
                          </Badge>
                          <Button size="sm" variant="outline">
                            <Eye className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Próximas citas */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Próximas Citas
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {getUpcomingAppointments().map((appointment) => (
                    <div
                      key={appointment.id}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div>
                        <p className="font-medium">{appointment.patient.name}</p>
                        <p className="text-sm text-gray-600">
                          {formatDate(appointment.date)} • {appointment.time}
                        </p>
                        <p className="text-sm text-gray-500">{appointment.service}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">{formatPrice(appointment.estimatedCost)}</p>
                        <Badge variant={getStatusBadgeVariant(appointment.status)} className="text-xs">
                          {appointment.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="appointments" className="space-y-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Todas las Citas</CardTitle>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Nueva Cita
                </Button>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {appointments.map((appointment) => (
                    <div
                      key={appointment.id}
                      className="border rounded-lg p-4 hover:bg-gray-50"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-medium">{appointment.patient.name}</h3>
                            <Badge variant={getStatusBadgeVariant(appointment.status)}>
                              {appointment.status}
                            </Badge>
                            {appointment.financing && (
                              <Badge variant="secondary" className="text-xs">
                                ToothPay
                              </Badge>
                            )}
                          </div>
                          
                          <div className="grid gap-1 text-sm text-gray-600">
                            <p>📅 {formatDate(appointment.date)} • {appointment.time}</p>
                            <p>🦷 {appointment.service}</p>
                            <p>💰 {formatPrice(appointment.estimatedCost)}</p>
                            <p>📞 {appointment.patient.phone}</p>
                            <p>✉️ {appointment.patient.email}</p>
                          </div>
                          
                          {appointment.reasonForVisit && (
                            <div className="mt-2">
                              <p className="text-sm font-medium text-gray-700">Motivo:</p>
                              <p className="text-sm text-gray-600">{appointment.reasonForVisit}</p>
                            </div>
                          )}
                          
                          {appointment.symptoms.length > 0 && (
                            <div className="mt-2">
                              <p className="text-sm font-medium text-gray-700">Síntomas:</p>
                              <p className="text-sm text-gray-600">{appointment.symptoms.join(', ')}</p>
                            </div>
                          )}
                        </div>
                        
                        <div className="flex flex-col gap-2 ml-4">
                          {appointment.status === 'pending' && (
                            <>
                              <Button
                                size="sm"
                                onClick={() => handleAppointmentAction(appointment.id, 'confirm')}
                              >
                                Confirmar
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleAppointmentAction(appointment.id, 'cancel')}
                              >
                                Cancelar
                              </Button>
                            </>
                          )}
                          
                          {appointment.status === 'confirmed' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleAppointmentAction(appointment.id, 'complete')}
                            >
                              Completar
                            </Button>
                          )}
                          
                          <Button size="sm" variant="ghost">
                            <Edit className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="schedule">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Gestión de Horarios
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 mb-4">
                  Configura tus horarios de disponibilidad para que los pacientes puedan reservar citas.
                </p>
                
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Agregar Horario
                </Button>
                
                <div className="mt-6 space-y-4">
                  {slots.map((slot) => (
                    <div key={slot.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">
                          {['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'][slot.dayOfWeek]}
                        </p>
                        <p className="text-sm text-gray-600">
                          {slot.startTime} - {slot.endTime} • {slot.service} • {formatPrice(slot.price)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={slot.isAvailable ? 'default' : 'secondary'}>
                          {slot.isAvailable ? 'Disponible' : 'No disponible'}
                        </Badge>
                        <Button size="sm" variant="ghost">
                          <Edit className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="reminders">
            <div className="space-y-6">
              {/* Estadísticas de recordatorios */}
              {stats && (
                <div className="grid gap-4 md:grid-cols-3">
                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-gray-600">Recordatorios Enviados</p>
                          <p className="text-2xl font-bold text-green-600">{stats.remindersSent || 0}</p>
                        </div>
                        <CheckCircle className="h-8 w-8 text-green-600" />
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-gray-600">Recordatorios Fallidos</p>
                          <p className="text-2xl font-bold text-red-600">{stats.remindersFailed || 0}</p>
                        </div>
                        <XCircle className="h-8 w-8 text-red-600" />
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-gray-600">Tasa de Éxito</p>
                          <p className="text-2xl font-bold text-blue-600">
                            {stats.remindersSent + stats.remindersFailed > 0 
                              ? Math.round((stats.remindersSent / (stats.remindersSent + stats.remindersFailed)) * 100)
                              : 100}%
                          </p>
                        </div>
                        <TrendingUp className="h-8 w-8 text-blue-600" />
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Estado de recordatorios por cita */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertCircle className="h-5 w-5" />
                    Estado de Recordatorios por Cita
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {appointments
                      .filter(apt => new Date(apt.date) > new Date()) // Solo citas futuras
                      .slice(0, 10) // Mostrar solo las primeras 10
                      .map((appointment) => (
                        <div
                          key={appointment.id}
                          className="flex items-center justify-between p-3 border rounded-lg"
                        >
                          <div>
                            <p className="font-medium">{appointment.patient.name}</p>
                            <p className="text-sm text-gray-600">
                              {formatDate(appointment.date)} • {appointment.time}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            {appointment.reminderStatus === 'sent' && (
                              <Badge variant="default" className="bg-green-100 text-green-800">
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Enviado
                              </Badge>
                            )}
                            {appointment.reminderStatus === 'failed' && (
                              <Badge variant="destructive">
                                <XCircle className="h-3 w-3 mr-1" />
                                Fallido
                              </Badge>
                            )}
                            {appointment.reminderStatus === 'pending' && (
                              <Badge variant="secondary">
                                <Clock className="h-3 w-3 mr-1" />
                                Pendiente
                              </Badge>
                            )}
                            <span className="text-xs text-gray-500">
                              {appointment.reminderType || 'email'}
                            </span>
                          </div>
                        </div>
                      ))}
                    
                    {appointments.filter(apt => new Date(apt.date) > new Date()).length === 0 && (
                      <p className="text-gray-500 text-center py-4">
                        No hay citas futuras programadas
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Configuración de recordatorios */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertCircle className="h-5 w-5" />
                    Configuración de Recordatorios
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <h4 className="font-medium text-blue-900 mb-2">📧 Sistema Automatizado</h4>
                      <p className="text-sm text-blue-700">
                        Los recordatorios se envían automáticamente 24 horas antes de cada cita confirmada.
                      </p>
                    </div>
                    
                    <div className="grid gap-4 md:grid-cols-3">
                      <div className="p-4 border rounded-lg">
                        <h4 className="font-medium mb-2">Email</h4>
                        <p className="text-sm text-gray-600">
                          Recordatorios por correo electrónico con detalles completos de la cita.
                        </p>
                      </div>
                      
                      <div className="p-4 border rounded-lg">
                        <h4 className="font-medium mb-2">SMS</h4>
                        <p className="text-sm text-gray-600">
                          Mensajes de texto cortos con información esencial.
                        </p>
                      </div>
                      
                      <div className="p-4 border rounded-lg">
                        <h4 className="font-medium mb-2">WhatsApp</h4>
                        <p className="text-sm text-gray-600">
                          Mensajes por WhatsApp con formato enriquecido.
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="financing">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  ToothPay - Financiamiento
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {appointments
                    .filter(apt => apt.financing)
                    .map((appointment) => (
                      <div key={appointment.id} className="border rounded-lg p-4">
                        <div className="flex items-start justify-between">
                          <div>
                            <h3 className="font-medium">{appointment.patient.name}</h3>
                            <p className="text-sm text-gray-600">
                              {appointment.service} • {formatDate(appointment.date)}
                            </p>
                            <p className="text-sm text-gray-500">
                              Monto: {formatPrice(appointment.financing!.amount)}
                            </p>
                          </div>
                          <Badge variant="secondary">
                            {appointment.financing!.status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  
                  {appointments.filter(apt => apt.financing).length === 0 && (
                    <p className="text-gray-500 text-center py-4">
                      No hay solicitudes de financiamiento pendientes
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
        
        {/* Integrador de Gamificación */}
        <GamificationIntegrator
          userId={session?.user?.id || ''}
          module="dashboard"
          showMiniDashboard={false}
          autoTrack={{ pageView: true, timeSpent: true }}
        />
      </div>
    </div>
    </GamificationProvider>
  );
}
