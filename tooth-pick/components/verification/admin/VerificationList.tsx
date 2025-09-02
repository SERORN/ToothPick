'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Search, 
  Filter, 
  Eye, 
  Clock, 
  FileText, 
  Building, 
  User,
  Calendar,
  AlertCircle,
  Loader2,
  RefreshCw
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

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
  daysSinceSubmission: number;
  urgentReview?: boolean;
  documentsCount: number;
  user: {
    _id: string;
    name: string;
    email: string;
  };
}

interface VerificationListProps {
  onSelectRequest: (request: VerificationRequest) => void;
}

export default function VerificationList({ onSelectRequest }: VerificationListProps) {
  const [requests, setRequests] = useState<VerificationRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [companyTypeFilter, setCompanyTypeFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('newest');

  const fetchRequests = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/admin/verification/pending');
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Error al obtener solicitudes');
      }
      
      setRequests(result.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const getStatusBadge = (status: string) => {
    const config = {
      pending: { label: 'Pendiente', variant: 'secondary' as const, icon: Clock },
      in_review: { label: 'En Revisión', variant: 'default' as const, icon: Eye },
      documents_required: { label: 'Docs. Requeridos', variant: 'outline' as const, icon: FileText },
      approved: { label: 'Aprobado', variant: 'default' as const, icon: Clock },
      rejected: { label: 'Rechazado', variant: 'destructive' as const, icon: Clock }
    };
    
    const { label, variant, icon: Icon } = config[status as keyof typeof config] || config.pending;
    
    return (
      <Badge variant={variant} className="flex items-center gap-1">
        <Icon className="w-3 h-3" />
        {label}
      </Badge>
    );
  };

  const getUrgencyIndicator = (request: VerificationRequest) => {
    if (request.urgentReview) {
      return (
        <div title="Revisión Urgente">
          <AlertCircle className="w-4 h-4 text-red-500" />
        </div>
      );
    }
    if (request.daysSinceSubmission > 5) {
      return (
        <div title="Revisión Pendiente Hace Más de 5 Días">
          <Clock className="w-4 h-4 text-yellow-500" />
        </div>
      );
    }
    return null;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const filteredAndSortedRequests = () => {
    let filtered = requests.filter(request => {
      const matchesSearch = searchTerm === '' || 
        request.businessName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        request.user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        request.user.email.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = statusFilter === 'all' || request.status === statusFilter;
      const matchesCompanyType = companyTypeFilter === 'all' || request.companyType === companyTypeFilter;
      
      return matchesSearch && matchesStatus && matchesCompanyType;
    });

    // Ordenar
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime();
        case 'oldest':
          return new Date(a.submittedAt).getTime() - new Date(b.submittedAt).getTime();
        case 'business_name':
          return a.businessName.localeCompare(b.businessName);
        case 'score':
          return (b.verificationScore || 0) - (a.verificationScore || 0);
        case 'urgent':
          if (a.urgentReview && !b.urgentReview) return -1;
          if (!a.urgentReview && b.urgentReview) return 1;
          return b.daysSinceSubmission - a.daysSinceSubmission;
        default:
          return 0;
      }
    });

    return filtered;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-8 h-8 animate-spin" />
        <span className="ml-2">Cargando solicitudes...</span>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          {error}
          <Button 
            variant="outline" 
            size="sm" 
            onClick={fetchRequests}
            className="ml-2"
          >
            <RefreshCw className="w-4 h-4 mr-1" />
            Reintentar
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  const filteredRequests = filteredAndSortedRequests();

  return (
    <div className="space-y-6">
      {/* Encabezado y Controles */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="w-6 h-6" />
              Solicitudes de Verificación
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline">
                {filteredRequests.length} de {requests.length}
              </Badge>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={fetchRequests}
              >
                <RefreshCw className="w-4 h-4 mr-1" />
                Actualizar
              </Button>
            </div>
          </CardTitle>
        </CardHeader>

        <CardContent>
          {/* Filtros y Búsqueda */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
            <div className="lg:col-span-2">
              <div className="relative">
                <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Buscar por empresa, usuario o email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los Estados</SelectItem>
                <SelectItem value="pending">Pendiente</SelectItem>
                <SelectItem value="in_review">En Revisión</SelectItem>
                <SelectItem value="documents_required">Docs. Requeridos</SelectItem>
                <SelectItem value="approved">Aprobado</SelectItem>
                <SelectItem value="rejected">Rechazado</SelectItem>
              </SelectContent>
            </Select>

            <Select value={companyTypeFilter} onValueChange={setCompanyTypeFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los Tipos</SelectItem>
                <SelectItem value="persona_fisica">Persona Física</SelectItem>
                <SelectItem value="persona_moral">Persona Moral</SelectItem>
              </SelectContent>
            </Select>

            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger>
                <SelectValue placeholder="Ordenar por" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Más Reciente</SelectItem>
                <SelectItem value="oldest">Más Antiguo</SelectItem>
                <SelectItem value="business_name">Nombre Empresa</SelectItem>
                <SelectItem value="score">Puntuación</SelectItem>
                <SelectItem value="urgent">Urgencia</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Estadísticas Rápidas */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="text-center p-3 bg-yellow-50 rounded-lg">
              <div className="text-2xl font-bold text-yellow-600">
                {requests.filter(r => r.status === 'pending').length}
              </div>
              <div className="text-sm text-yellow-700">Pendientes</div>
            </div>
            <div className="text-center p-3 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">
                {requests.filter(r => r.status === 'in_review').length}
              </div>
              <div className="text-sm text-blue-700">En Revisión</div>
            </div>
            <div className="text-center p-3 bg-red-50 rounded-lg">
              <div className="text-2xl font-bold text-red-600">
                {requests.filter(r => r.urgentReview || r.daysSinceSubmission > 5).length}
              </div>
              <div className="text-sm text-red-700">Urgentes</div>
            </div>
            <div className="text-center p-3 bg-purple-50 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">
                {requests.filter(r => r.status === 'documents_required').length}
              </div>
              <div className="text-sm text-purple-700">Docs. Pendientes</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lista de Solicitudes */}
      {filteredRequests.length === 0 ? (
        <Card>
          <CardContent className="text-center py-8">
            <FileText className="w-16 h-16 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold mb-2">No hay solicitudes</h3>
            <p className="text-gray-600">
              {requests.length === 0 
                ? 'No hay solicitudes de verificación en el sistema.'
                : 'No hay solicitudes que coincidan con los filtros aplicados.'
              }
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredRequests.map((request) => (
            <Card key={request._id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      {getUrgencyIndicator(request)}
                      <div className="flex items-center gap-2">
                        {request.companyType === 'persona_fisica' ? (
                          <User className="w-4 h-4 text-gray-500" />
                        ) : (
                          <Building className="w-4 h-4 text-gray-500" />
                        )}
                        <h3 className="font-semibold text-lg">{request.businessName}</h3>
                      </div>
                      {getStatusBadge(request.status)}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
                      <div>
                        <span className="font-medium">Usuario:</span> {request.user.name}
                        <br />
                        <span className="font-medium">Email:</span> {request.user.email}
                      </div>
                      <div>
                        <span className="font-medium">Contacto:</span> {request.contactEmail}
                        <br />
                        <span className="font-medium">Teléfono:</span> {request.phoneNumber}
                      </div>
                      <div>
                        <span className="font-medium">Enviado:</span> {formatDate(request.submittedAt)}
                        <br />
                        <span className="font-medium">Hace:</span> {request.daysSinceSubmission} días
                      </div>
                    </div>

                    <div className="flex items-center justify-between mt-4">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1">
                          <FileText className="w-4 h-4 text-gray-400" />
                          <span className="text-sm text-gray-600">
                            {request.documentsCount} documentos
                          </span>
                        </div>
                        {request.verificationScore !== undefined && (
                          <div className="flex items-center gap-1">
                            <span className="text-sm text-gray-600">Puntuación:</span>
                            <span className={`text-sm font-medium ${
                              request.verificationScore >= 80 ? 'text-green-600' :
                              request.verificationScore >= 60 ? 'text-yellow-600' :
                              'text-red-600'
                            }`}>
                              {request.verificationScore}/100
                            </span>
                          </div>
                        )}
                      </div>

                      <Button 
                        onClick={() => onSelectRequest(request)}
                        variant="outline"
                        size="sm"
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        Revisar
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
