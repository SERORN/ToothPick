'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import VerificationList from '@/components/verification/admin/VerificationList';
import VerificationReview from '@/components/verification/admin/VerificationReview';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  FileText, 
  BarChart3, 
  Users, 
  Clock, 
  CheckCircle,
  XCircle,
  RefreshCw,
  AlertCircle,
  Loader2
} from 'lucide-react';

interface VerificationStats {
  total: number;
  pending: number;
  inReview: number;
  approved: number;
  rejected: number;
  documentsRequired: number;
  averageProcessingDays: number;
  approvalRate: number;
  pendingOlderThan5Days: number;
}

interface VerificationRequest {
  _id: string;
  businessName: string;
  companyType: 'persona_fisica' | 'persona_moral';
  rfc: string;
  status: 'pending' | 'in_review' | 'approved' | 'rejected' | 'documents_required';
  submittedAt: string;
  reviewedAt?: string;
  verificationScore?: number;
  contactEmail: string;
  phoneNumber: string;
  address: {
    street: string;
    colony: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
  businessDescription: string;
  estimatedMonthlyVolume: string;
  hasPhysicalStore: boolean;
  storeAddress?: string;
  yearsInBusiness: number;
  adminNotes?: string;
  rejectionReason?: string;
  documents: Array<{
    fieldName: string;
    originalName: string;
    mimeType: string;
    size: number;
    uploadedAt: string;
    verified?: boolean;
    notes?: string;
  }>;
  user: {
    _id: string;
    name: string;
    email: string;
  };
  daysSinceSubmission: number;
  urgentReview?: boolean;
  documentsCount: number;
}

export default function AdminVerificationDashboard() {
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedRequest, setSelectedRequest] = useState<VerificationRequest | null>(null);
  const [stats, setStats] = useState<VerificationStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const fetchStats = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/admin/verification/stats');
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Error al obtener estadísticas');
      }
      
      setStats(result.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, [refreshKey]);

  const handleSelectRequest = (request: VerificationRequest) => {
    setSelectedRequest(request);
    setActiveTab('review');
  };

  const handleBackToList = () => {
    setSelectedRequest(null);
    setActiveTab('list');
    setRefreshKey(prev => prev + 1); // Trigger refresh
  };

  const handleRequestUpdated = () => {
    setRefreshKey(prev => prev + 1); // Trigger refresh
  };

  if (loading && !stats) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-8 h-8 animate-spin" />
        <span className="ml-2">Cargando dashboard...</span>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Dashboard de Verificaciones</h1>
        <p className="text-gray-600">
          Gestiona las solicitudes de verificación de proveedores y distribuidores
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Resumen</TabsTrigger>
          <TabsTrigger value="list">
            Solicitudes
            {stats && stats.pending > 0 && (
              <Badge variant="destructive" className="ml-2">
                {stats.pending}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="review">
            {selectedRequest ? 'Revisar Solicitud' : 'Seleccionar Solicitud'}
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {error}
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setRefreshKey(prev => prev + 1)}
                  className="ml-2"
                >
                  <RefreshCw className="w-4 h-4 mr-1" />
                  Reintentar
                </Button>
              </AlertDescription>
            </Alert>
          )}

          {stats && (
            <>
              {/* Estadísticas Principales */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total de Solicitudes</CardTitle>
                    <FileText className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats.total}</div>
                    <p className="text-xs text-muted-foreground">
                      Todas las solicitudes registradas
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Pendientes de Revisión</CardTitle>
                    <Clock className="h-4 w-4 text-yellow-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-yellow-600">
                      {stats.pending + stats.inReview + stats.documentsRequired}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Requieren atención inmediata
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Tasa de Aprobación</CardTitle>
                    <BarChart3 className="h-4 w-4 text-green-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-green-600">
                      {stats.approvalRate.toFixed(1)}%
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Solicitudes aprobadas vs rechazadas
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Tiempo Promedio</CardTitle>
                    <Clock className="h-4 w-4 text-blue-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-blue-600">
                      {stats.averageProcessingDays.toFixed(1)}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Días promedio de procesamiento
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Estadísticas Detalladas */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Estado de Solicitudes</CardTitle>
                    <CardDescription>Distribución actual por estado</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-yellow-500" />
                        <span>Pendientes</span>
                      </div>
                      <Badge variant="secondary">{stats.pending}</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-blue-500" />
                        <span>En Revisión</span>
                      </div>
                      <Badge variant="default">{stats.inReview}</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-purple-500" />
                        <span>Docs. Requeridos</span>
                      </div>
                      <Badge variant="outline">{stats.documentsRequired}</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-500" />
                        <span>Aprobadas</span>
                      </div>
                      <Badge variant="default" className="bg-green-500">{stats.approved}</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <XCircle className="w-4 h-4 text-red-500" />
                        <span>Rechazadas</span>
                      </div>
                      <Badge variant="destructive">{stats.rejected}</Badge>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Alertas de Gestión</CardTitle>
                    <CardDescription>Situaciones que requieren atención</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {stats.pendingOlderThan5Days > 0 && (
                      <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                          <strong>{stats.pendingOlderThan5Days}</strong> solicitudes llevan más de 5 días sin revisar
                        </AlertDescription>
                      </Alert>
                    )}

                    {stats.pending > 10 && (
                      <Alert>
                        <Clock className="h-4 w-4" />
                        <AlertDescription>
                          Alto volumen de solicitudes pendientes: <strong>{stats.pending}</strong>
                        </AlertDescription>
                      </Alert>
                    )}

                    {stats.approvalRate < 70 && stats.total > 10 && (
                      <Alert>
                        <BarChart3 className="h-4 w-4" />
                        <AlertDescription>
                          Tasa de aprobación baja: <strong>{stats.approvalRate.toFixed(1)}%</strong>
                        </AlertDescription>
                      </Alert>
                    )}

                    {stats.averageProcessingDays > 7 && (
                      <Alert>
                        <Clock className="h-4 w-4" />
                        <AlertDescription>
                          Tiempo de procesamiento alto: <strong>{stats.averageProcessingDays.toFixed(1)} días</strong>
                        </AlertDescription>
                      </Alert>
                    )}

                    {stats.pendingOlderThan5Days === 0 && stats.pending <= 10 && stats.approvalRate >= 70 && stats.averageProcessingDays <= 7 && (
                      <Alert className="border-green-500 bg-green-50">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <AlertDescription className="text-green-800">
                          ¡Todo funciona correctamente! No hay alertas pendientes.
                        </AlertDescription>
                      </Alert>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Acciones Rápidas */}
              <Card>
                <CardHeader>
                  <CardTitle>Acciones Rápidas</CardTitle>
                  <CardDescription>Operaciones frecuentes del dashboard</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-3">
                    <Button 
                      onClick={() => setActiveTab('list')}
                      disabled={stats.pending === 0}
                    >
                      <Clock className="w-4 h-4 mr-2" />
                      Ver Pendientes ({stats.pending})
                    </Button>
                    <Button 
                      variant="outline"
                      onClick={() => setRefreshKey(prev => prev + 1)}
                    >
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Actualizar Datos
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        {/* List Tab */}
        <TabsContent value="list" className="space-y-6">
          <VerificationList onSelectRequest={handleSelectRequest} />
        </TabsContent>

        {/* Review Tab */}
        <TabsContent value="review" className="space-y-6">
          {selectedRequest ? (
            <VerificationReview 
              request={selectedRequest}
              onBack={handleBackToList}
              onRequestUpdated={handleRequestUpdated}
            />
          ) : (
            <Card>
              <CardContent className="text-center py-8">
                <FileText className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-semibold mb-2">Selecciona una Solicitud</h3>
                <p className="text-gray-600">
                  Ve a la pestaña "Solicitudes" y selecciona una solicitud para revisar.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
