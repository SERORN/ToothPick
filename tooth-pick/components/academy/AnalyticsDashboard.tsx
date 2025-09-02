'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  TrendingUp,
  Users,
  BookOpen,
  Award,
  Clock,
  Target,
  BarChart3,
  PieChart,
  Calendar,
  Download,
  Filter,
  RefreshCw
} from 'lucide-react';

interface AnalyticsData {
  overview: {
    totalUsers: number;
    activeUsers: number;
    completedTracks: number;
    avgCompletionTime: number;
    totalCertificates: number;
  };
  trackStats: Array<{
    trackId: string;
    title: string;
    targetRole: string;
    totalEnrollments: number;
    completions: number;
    avgTimeSpent: number;
    completionRate: number;
    avgScore: number;
  }>;
  userEngagement: {
    dailyActive: number;
    weeklyActive: number;
    monthlyActive: number;
    avgSessionTime: number;
    dropoffRate: number;
  };
  roleDistribution: Array<{
    role: string;
    count: number;
    completionRate: number;
  }>;
  timeSeriesData: Array<{
    date: string;
    enrollments: number;
    completions: number;
    activeUsers: number;
  }>;
}

interface AnalyticsDashboardProps {
  userId: string;
  userRole: string;
  className?: string;
}

export default function AnalyticsDashboard({
  userId,
  userRole,
  className = ''
}: AnalyticsDashboardProps) {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('30d');
  const [selectedRole, setSelectedRole] = useState('all');

  useEffect(() => {
    loadAnalyticsData();
  }, [timeRange, selectedRole]);

  const loadAnalyticsData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        timeRange,
        role: selectedRole,
        userId
      });

      const response = await fetch(`/api/onboarding/analytics?${params}`);
      if (response.ok) {
        const analyticsData = await response.json();
        setData(analyticsData);
      }
    } catch (error) {
      console.error('Error cargando analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('es-ES').format(num);
  };

  const formatPercentage = (num: number) => {
    return `${Math.round(num)}%`;
  };

  const formatTime = (minutes: number) => {
    if (minutes < 60) {
      return `${minutes} min`;
    }
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'patient': return 'bg-blue-100 text-blue-800';
      case 'dentist': return 'bg-green-100 text-green-800';
      case 'distributor': return 'bg-purple-100 text-purple-800';
      case 'admin': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'patient': return 'Pacientes';
      case 'dentist': return 'Dentistas';
      case 'distributor': return 'Distribuidores';
      case 'admin': return 'Administradores';
      default: return role;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-gray-600">Cargando analytics...</div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">No se pudieron cargar los datos de analytics</p>
        <Button onClick={loadAnalyticsData} className="mt-4">
          <RefreshCw className="h-4 w-4 mr-2" />
          Reintentar
        </Button>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Analytics de Onboarding</h2>
          <p className="text-gray-600">Seguimiento del progreso educativo</p>
        </div>
        
        <div className="flex gap-2">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="border rounded-lg px-3 py-2"
          >
            <option value="7d">Últimos 7 días</option>
            <option value="30d">Últimos 30 días</option>
            <option value="90d">Últimos 90 días</option>
            <option value="1y">Último año</option>
          </select>
          
          <select
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value)}
            className="border rounded-lg px-3 py-2"
          >
            <option value="all">Todos los roles</option>
            <option value="patient">Pacientes</option>
            <option value="dentist">Dentistas</option>
            <option value="distributor">Distribuidores</option>
          </select>
          
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Exportar
          </Button>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Usuarios Totales</p>
                <p className="text-2xl font-bold">{formatNumber(data.overview.totalUsers)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-green-100 rounded-lg">
                <TrendingUp className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Usuarios Activos</p>
                <p className="text-2xl font-bold">{formatNumber(data.overview.activeUsers)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-purple-100 rounded-lg">
                <BookOpen className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Tracks Completados</p>
                <p className="text-2xl font-bold">{formatNumber(data.overview.completedTracks)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Clock className="h-6 w-6 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Tiempo Promedio</p>
                <p className="text-2xl font-bold">{formatTime(data.overview.avgCompletionTime)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-orange-100 rounded-lg">
                <Award className="h-6 w-6 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Certificados</p>
                <p className="text-2xl font-bold">{formatNumber(data.overview.totalCertificates)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Track Performance */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Rendimiento por Track
            </CardTitle>
            <CardDescription>
              Estadísticas de inscripciones y completaciones
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {data.trackStats.map((track) => (
                <div key={track.trackId} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold">{track.title}</h4>
                    <Badge className={getRoleColor(track.targetRole)}>
                      {getRoleLabel(track.targetRole)}
                    </Badge>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Inscripciones:</span>
                      <span className="font-medium ml-2">{formatNumber(track.totalEnrollments)}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Completaciones:</span>
                      <span className="font-medium ml-2">{formatNumber(track.completions)}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Tasa de Finalización:</span>
                      <span className="font-medium ml-2">{formatPercentage(track.completionRate)}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Puntuación Promedio:</span>
                      <span className="font-medium ml-2">{track.avgScore?.toFixed(1) || 'N/A'}</span>
                    </div>
                  </div>
                  
                  <div className="mt-3">
                    <div className="flex justify-between text-xs text-gray-600 mb-1">
                      <span>Progreso</span>
                      <span>{formatPercentage(track.completionRate)}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${track.completionRate}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* User Engagement */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Engagement de Usuarios
            </CardTitle>
            <CardDescription>
              Métricas de actividad y retención
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* Actividad por período */}
              <div>
                <h4 className="font-semibold mb-3">Usuarios Activos</h4>
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">
                      {formatNumber(data.userEngagement.dailyActive)}
                    </div>
                    <div className="text-xs text-gray-600">Diario</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {formatNumber(data.userEngagement.weeklyActive)}
                    </div>
                    <div className="text-xs text-gray-600">Semanal</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600">
                      {formatNumber(data.userEngagement.monthlyActive)}
                    </div>
                    <div className="text-xs text-gray-600">Mensual</div>
                  </div>
                </div>
              </div>

              {/* Métricas adicionales */}
              <div className="border-t pt-4">
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Tiempo de Sesión Promedio:</span>
                    <span className="font-medium">{formatTime(data.userEngagement.avgSessionTime)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Tasa de Abandono:</span>
                    <span className="font-medium">{formatPercentage(data.userEngagement.dropoffRate)}</span>
                  </div>
                </div>
              </div>

              {/* Distribución por rol */}
              <div className="border-t pt-4">
                <h4 className="font-semibold mb-3">Distribución por Rol</h4>
                <div className="space-y-2">
                  {data.roleDistribution.map((role) => (
                    <div key={role.role} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className={getRoleColor(role.role)}>
                          {getRoleLabel(role.role)}
                        </Badge>
                        <span className="text-sm">{formatNumber(role.count)} usuarios</span>
                      </div>
                      <span className="text-sm font-medium">
                        {formatPercentage(role.completionRate)} completado
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Time Series Chart Placeholder */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Tendencias Temporales
          </CardTitle>
          <CardDescription>
            Evolución de inscripciones y completaciones en el tiempo
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center border border-dashed border-gray-300 rounded-lg">
            <div className="text-center text-gray-500">
              <PieChart className="h-12 w-12 mx-auto mb-2" />
              <p>Gráfico de tendencias</p>
              <p className="text-sm">Se implementará con librería de gráficos</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
