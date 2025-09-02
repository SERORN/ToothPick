'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  CheckCircle, 
  Clock, 
  XCircle, 
  FileText, 
  AlertCircle, 
  Loader2,
  RefreshCw,
  Eye
} from 'lucide-react';

interface VerificationStatus {
  hasRequest: boolean;
  request?: {
    _id: string;
    status: 'pending' | 'in_review' | 'approved' | 'rejected' | 'documents_required';
    submittedAt: string;
    reviewedAt?: string;
    rejectionReason?: string;
    adminNotes?: string;
    verificationScore?: number;
    businessName: string;
    companyType: string;
    displayStatus: string;
    daysSinceSubmission: number;
  };
  canSubmit: boolean;
  rejectionCount: number;
  history?: Array<{
    action: string;
    timestamp: string;
    actionDescription: string;
    details: {
      reason?: string;
      notes?: string;
    };
  }>;
}

interface VerificationStatusProps {
  onRequestSubmit?: () => void;
}

export default function VerificationStatus({ onRequestSubmit }: VerificationStatusProps) {
  const [status, setStatus] = useState<VerificationStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);

  const fetchStatus = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/verification/status');
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Error al obtener estado');
      }
      
      setStatus(result.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const getStatusIcon = (statusValue: string) => {
    switch (statusValue) {
      case 'approved':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'rejected':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'pending':
      case 'in_review':
        return <Clock className="w-5 h-5 text-yellow-500" />;
      case 'documents_required':
        return <FileText className="w-5 h-5 text-blue-500" />;
      default:
        return <AlertCircle className="w-5 h-5 text-gray-500" />;
    }
  };

  const getStatusVariant = (statusValue: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (statusValue) {
      case 'approved':
        return 'default';
      case 'rejected':
        return 'destructive';
      case 'pending':
      case 'in_review':
        return 'secondary';
      case 'documents_required':
        return 'outline';
      default:
        return 'secondary';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-8 h-8 animate-spin" />
        <span className="ml-2">Cargando estado de verificación...</span>
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
            onClick={fetchStatus}
            className="ml-2"
          >
            <RefreshCw className="w-4 h-4 mr-1" />
            Reintentar
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  if (!status) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>No se pudo obtener el estado de verificación.</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Estado Principal */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="w-6 h-6" />
              Estado de Verificación
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={fetchStatus}
            >
              <RefreshCw className="w-4 h-4 mr-1" />
              Actualizar
            </Button>
          </CardTitle>
          <CardDescription>
            Estado actual de tu solicitud de verificación como proveedor/distribuidor
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {!status.hasRequest ? (
            // Sin solicitud
            <div className="text-center py-8">
              <FileText className="w-16 h-16 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-semibold mb-2">Sin Solicitud de Verificación</h3>
              <p className="text-gray-600 mb-4">
                Aún no has enviado una solicitud de verificación. Para poder vender productos en la plataforma, necesitas verificar tu cuenta.
              </p>
              {status.canSubmit ? (
                <Button onClick={onRequestSubmit}>
                  <FileText className="w-4 h-4 mr-2" />
                  Enviar Solicitud de Verificación
                </Button>
              ) : (
                <Alert variant="destructive" className="mt-4">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Has alcanzado el límite máximo de solicitudes de verificación ({status.rejectionCount}/3).
                    Contacta al soporte para más información.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          ) : (
            // Con solicitud
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  {getStatusIcon(status.request!.status)}
                  <div>
                    <h3 className="font-semibold">{status.request!.businessName}</h3>
                    <p className="text-sm text-gray-600">
                      {status.request!.companyType === 'persona_fisica' ? 'Persona Física' : 'Persona Moral'}
                    </p>
                  </div>
                </div>
                <Badge variant={getStatusVariant(status.request!.status)}>
                  {status.request!.displayStatus}
                </Badge>
              </div>

              {/* Información de la Solicitud */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <Label className="text-sm font-medium">Fecha de Envío</Label>
                  <p className="text-sm text-gray-600">
                    {formatDate(status.request!.submittedAt)} 
                    <span className="ml-2 text-xs">
                      (hace {status.request!.daysSinceSubmission} días)
                    </span>
                  </p>
                </div>

                {status.request!.reviewedAt && (
                  <div>
                    <Label className="text-sm font-medium">Fecha de Revisión</Label>
                    <p className="text-sm text-gray-600">
                      {formatDate(status.request!.reviewedAt)}
                    </p>
                  </div>
                )}

                {status.request!.verificationScore && (
                  <div>
                    <Label className="text-sm font-medium">Puntuación de Verificación</Label>
                    <p className="text-sm">
                      <span className={`font-medium ${
                        status.request!.verificationScore >= 80 ? 'text-green-600' :
                        status.request!.verificationScore >= 60 ? 'text-yellow-600' :
                        'text-red-600'
                      }`}>
                        {status.request!.verificationScore}/100
                      </span>
                    </p>
                  </div>
                )}

                <div>
                  <Label className="text-sm font-medium">ID de Solicitud</Label>
                  <p className="text-sm text-gray-600 font-mono">
                    {status.request!._id}
                  </p>
                </div>
              </div>

              {/* Mensajes Específicos por Estado */}
              {status.request!.status === 'approved' && (
                <Alert className="border-green-500 bg-green-50">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-800">
                    ¡Felicidades! Tu solicitud ha sido aprobada. Ahora puedes vender productos en la plataforma.
                  </AlertDescription>
                </Alert>
              )}

              {status.request!.status === 'rejected' && (
                <Alert variant="destructive">
                  <XCircle className="h-4 w-4" />
                  <AlertDescription>
                    <div>
                      <p className="font-medium mb-1">Solicitud Rechazada</p>
                      {status.request!.rejectionReason && (
                        <p className="text-sm mb-2">
                          <strong>Motivo:</strong> {status.request!.rejectionReason}
                        </p>
                      )}
                      {status.canSubmit && (
                        <p className="text-sm">
                          Puedes enviar una nueva solicitud corrigiendo los problemas indicados.
                        </p>
                      )}
                    </div>
                  </AlertDescription>
                </Alert>
              )}

              {status.request!.status === 'documents_required' && (
                <Alert className="border-blue-500 bg-blue-50">
                  <FileText className="h-4 w-4 text-blue-600" />
                  <AlertDescription className="text-blue-800">
                    Se requieren documentos adicionales para completar tu verificación. 
                    Revisa las instrucciones y sube los documentos solicitados.
                  </AlertDescription>
                </Alert>
              )}

              {['pending', 'in_review'].includes(status.request!.status) && (
                <Alert className="border-yellow-500 bg-yellow-50">
                  <Clock className="h-4 w-4 text-yellow-600" />
                  <AlertDescription className="text-yellow-800">
                    Tu solicitud está en proceso de revisión. Te notificaremos sobre cualquier actualización.
                    Tiempo promedio de procesamiento: 2-5 días hábiles.
                  </AlertDescription>
                </Alert>
              )}

              {/* Notas del Administrador */}
              {status.request!.adminNotes && (
                <div className="mt-4">
                  <Label className="text-sm font-medium">Notas del Administrador</Label>
                  <div className="mt-1 p-3 bg-gray-50 rounded-md">
                    <p className="text-sm text-gray-700">{status.request!.adminNotes}</p>
                  </div>
                </div>
              )}

              {/* Botones de Acción */}
              <div className="flex justify-between items-center mt-6">
                {status.history && status.history.length > 0 && (
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setShowHistory(!showHistory)}
                  >
                    <Eye className="w-4 h-4 mr-1" />
                    {showHistory ? 'Ocultar' : 'Ver'} Historial
                  </Button>
                )}

                {status.request!.status === 'rejected' && status.canSubmit && (
                  <Button onClick={onRequestSubmit}>
                    <FileText className="w-4 h-4 mr-2" />
                    Enviar Nueva Solicitud
                  </Button>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Historial */}
      {showHistory && status.history && status.history.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Historial de la Solicitud</CardTitle>
            <CardDescription>
              Registro completo de todas las acciones realizadas en tu solicitud
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {status.history.map((entry, index) => (
                <div key={index} className="flex items-start gap-3 p-3 border rounded-lg">
                  {getStatusIcon(entry.action)}
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium">{entry.actionDescription}</h4>
                      <span className="text-xs text-gray-500">
                        {formatDate(entry.timestamp)}
                      </span>
                    </div>
                    {entry.details.reason && (
                      <p className="text-sm text-gray-600 mt-1">
                        <strong>Motivo:</strong> {entry.details.reason}
                      </p>
                    )}
                    {entry.details.notes && (
                      <p className="text-sm text-gray-600 mt-1">
                        <strong>Notas:</strong> {entry.details.notes}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Componente auxiliar para etiquetas
function Label({ children, className }: { children: React.ReactNode; className?: string }) {
  return <label className={`block text-sm font-medium text-gray-700 ${className || ''}`}>{children}</label>;
}
