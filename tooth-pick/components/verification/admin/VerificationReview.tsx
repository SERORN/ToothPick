'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  CheckCircle, 
  XCircle, 
  FileText, 
  User, 
  Building, 
  Mail, 
  Phone, 
  MapPin, 
  Calendar,
  Star,
  Download,
  Eye,
  MessageSquare,
  AlertTriangle,
  ArrowLeft,
  Loader2
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

interface VerificationDocument {
  fieldName: string;
  originalName: string;
  mimeType: string;
  size: number;
  uploadedAt: string;
  verified?: boolean;
  notes?: string;
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
  documents: VerificationDocument[];
  user: {
    _id: string;
    name: string;
    email: string;
  };
}

interface VerificationReviewProps {
  request: VerificationRequest;
  onBack: () => void;
  onRequestUpdated: () => void;
}

export default function VerificationReview({ request, onBack, onRequestUpdated }: VerificationReviewProps) {
  const [loading, setLoading] = useState(false);
  const [adminNotes, setAdminNotes] = useState(request.adminNotes || '');
  const [rejectionReason, setRejectionReason] = useState(request.rejectionReason || '');
  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [showDocumentsDialog, setShowDocumentsDialog] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleApprove = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/admin/verification/approve/${request._id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          adminNotes: adminNotes.trim() || undefined
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Error al aprobar solicitud');
      }

      setShowApproveDialog(false);
      onRequestUpdated();
      onBack();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    if (!rejectionReason.trim()) {
      setError('El motivo de rechazo es obligatorio');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/admin/verification/reject/${request._id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          rejectionReason: rejectionReason.trim(),
          adminNotes: adminNotes.trim() || undefined
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Error al rechazar solicitud');
      }

      setShowRejectDialog(false);
      onRequestUpdated();
      onBack();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  };

  const handleRequestDocuments = async () => {
    if (!adminNotes.trim()) {
      setError('Las instrucciones para documentos adicionales son obligatorias');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/admin/verification/request-documents/${request._id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          adminNotes: adminNotes.trim()
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Error al solicitar documentos');
      }

      setShowDocumentsDialog(false);
      onRequestUpdated();
      onBack();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
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

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getStatusBadge = (status: string) => {
    const config = {
      pending: { label: 'Pendiente', variant: 'secondary' as const },
      in_review: { label: 'En Revisión', variant: 'default' as const },
      documents_required: { label: 'Docs. Requeridos', variant: 'outline' as const },
      approved: { label: 'Aprobado', variant: 'default' as const },
      rejected: { label: 'Rechazado', variant: 'destructive' as const }
    };
    
    const { label, variant } = config[status as keyof typeof config] || config.pending;
    return <Badge variant={variant}>{label}</Badge>;
  };

  const getDocumentDisplayName = (fieldName: string) => {
    const names: Record<string, string> = {
      identificacion: 'Identificación Oficial',
      rfc_document: 'Constancia de RFC',
      comprobante_domicilio: 'Comprobante de Domicilio',
      acta_constitutiva: 'Acta Constitutiva',
      poder_legal: 'Poder Legal',
      cedula_profesional: 'Cédula Profesional',
      otros_documentos: 'Otros Documentos'
    };
    return names[fieldName] || fieldName;
  };

  const canApprove = ['pending', 'in_review', 'documents_required'].includes(request.status);
  const canReject = ['pending', 'in_review', 'documents_required'].includes(request.status);

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="sm" onClick={onBack}>
                <ArrowLeft className="w-4 h-4" />
              </Button>
              <div className="flex items-center gap-2">
                {request.companyType === 'persona_fisica' ? (
                  <User className="w-6 h-6" />
                ) : (
                  <Building className="w-6 h-6" />
                )}
                <div>
                  <CardTitle>{request.businessName}</CardTitle>
                  <CardDescription>ID: {request._id}</CardDescription>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {getStatusBadge(request.status)}
              {request.verificationScore !== undefined && (
                <div className="flex items-center gap-1">
                  <Star className="w-4 h-4 text-yellow-500" />
                  <span className={`font-medium ${
                    request.verificationScore >= 80 ? 'text-green-600' :
                    request.verificationScore >= 60 ? 'text-yellow-600' :
                    'text-red-600'
                  }`}>
                    {request.verificationScore}/100
                  </span>
                </div>
              )}
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Información del Solicitante */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Información del Usuario</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-gray-500" />
              <span className="font-medium">Nombre:</span>
              <span>{request.user.name}</span>
            </div>
            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-gray-500" />
              <span className="font-medium">Email:</span>
              <span>{request.user.email}</span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-gray-500" />
              <span className="font-medium">Enviado:</span>
              <span>{formatDate(request.submittedAt)}</span>
            </div>
            {request.reviewedAt && (
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-gray-500" />
                <span className="font-medium">Revisado:</span>
                <span>{formatDate(request.reviewedAt)}</span>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Información de Contacto</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-gray-500" />
              <span className="font-medium">Email de Contacto:</span>
              <span>{request.contactEmail}</span>
            </div>
            <div className="flex items-center gap-2">
              <Phone className="w-4 h-4 text-gray-500" />
              <span className="font-medium">Teléfono:</span>
              <span>{request.phoneNumber}</span>
            </div>
            <div className="flex items-start gap-2">
              <MapPin className="w-4 h-4 text-gray-500 mt-0.5" />
              <div>
                <span className="font-medium">Dirección:</span>
                <p className="text-sm text-gray-600">
                  {request.address.street}<br />
                  {request.address.colony}, {request.address.city}<br />
                  {request.address.state} {request.address.postalCode}<br />
                  {request.address.country}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Información del Negocio */}
      <Card>
        <CardHeader>
          <CardTitle>Información del Negocio</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <span className="font-medium">Tipo de Empresa:</span>
              <p className="text-sm text-gray-600">
                {request.companyType === 'persona_fisica' ? 'Persona Física' : 'Persona Moral'}
              </p>
            </div>
            <div>
              <span className="font-medium">RFC:</span>
              <p className="text-sm text-gray-600 font-mono">{request.rfc}</p>
            </div>
            <div>
              <span className="font-medium">Años en el Negocio:</span>
              <p className="text-sm text-gray-600">{request.yearsInBusiness} años</p>
            </div>
            <div>
              <span className="font-medium">Volumen Mensual Estimado:</span>
              <p className="text-sm text-gray-600">{request.estimatedMonthlyVolume}</p>
            </div>
          </div>

          <div>
            <span className="font-medium">Descripción del Negocio:</span>
            <p className="text-sm text-gray-600 mt-1">{request.businessDescription}</p>
          </div>

          <div>
            <span className="font-medium">Tienda Física:</span>
            <p className="text-sm text-gray-600">
              {request.hasPhysicalStore ? 'Sí' : 'No'}
            </p>
            {request.hasPhysicalStore && request.storeAddress && (
              <p className="text-sm text-gray-600 mt-1">
                <span className="font-medium">Dirección:</span> {request.storeAddress}
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Documentos */}
      <Card>
        <CardHeader>
          <CardTitle>Documentos Subidos ({request.documents.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {request.documents.map((doc, index) => (
              <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <FileText className="w-5 h-5 text-gray-500" />
                  <div>
                    <h4 className="font-medium">{getDocumentDisplayName(doc.fieldName)}</h4>
                    <p className="text-sm text-gray-600">
                      {doc.originalName} • {formatFileSize(doc.size)} • {formatDate(doc.uploadedAt)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {doc.verified && (
                    <Badge variant="default" className="bg-green-500">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Verificado
                    </Badge>
                  )}
                  <Button variant="outline" size="sm">
                    <Eye className="w-4 h-4 mr-1" />
                    Ver
                  </Button>
                  <Button variant="outline" size="sm">
                    <Download className="w-4 h-4 mr-1" />
                    Descargar
                  </Button>
                </div>
              </div>
            ))}
            {request.documents.length === 0 && (
              <p className="text-center text-gray-500 py-4">No hay documentos subidos</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Notas Administrativas */}
      <Card>
        <CardHeader>
          <CardTitle>Notas Administrativas</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              Notas del Administrador
            </label>
            <Textarea
              value={adminNotes}
              onChange={(e) => setAdminNotes(e.target.value)}
              placeholder="Agregar notas sobre la solicitud..."
              rows={4}
            />
          </div>

          {request.rejectionReason && (
            <div>
              <label className="block text-sm font-medium mb-2">
                Motivo de Rechazo Anterior
              </label>
              <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-sm text-red-800">{request.rejectionReason}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Acciones */}
      {(canApprove || canReject) && (
        <Card>
          <CardHeader>
            <CardTitle>Acciones de Revisión</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              {canApprove && (
                <Dialog open={showApproveDialog} onOpenChange={setShowApproveDialog}>
                  <DialogTrigger asChild>
                    <Button className="bg-green-600 hover:bg-green-700">
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Aprobar Solicitud
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Aprobar Solicitud de Verificación</DialogTitle>
                      <DialogDescription>
                        ¿Estás seguro de que quieres aprobar esta solicitud? El usuario podrá vender productos en la plataforma.
                      </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setShowApproveDialog(false)}>
                        Cancelar
                      </Button>
                      <Button 
                        onClick={handleApprove} 
                        disabled={loading}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                        Aprobar
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              )}

              {canReject && (
                <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
                  <DialogTrigger asChild>
                    <Button variant="destructive">
                      <XCircle className="w-4 h-4 mr-2" />
                      Rechazar Solicitud
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Rechazar Solicitud de Verificación</DialogTitle>
                      <DialogDescription>
                        Especifica el motivo del rechazo. El usuario será notificado.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium mb-2">
                          Motivo del Rechazo *
                        </label>
                        <Textarea
                          value={rejectionReason}
                          onChange={(e) => setRejectionReason(e.target.value)}
                          placeholder="Explica detalladamente por qué se rechaza la solicitud..."
                          rows={4}
                          required
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setShowRejectDialog(false)}>
                        Cancelar
                      </Button>
                      <Button 
                        variant="destructive" 
                        onClick={handleReject} 
                        disabled={loading || !rejectionReason.trim()}
                      >
                        {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                        Rechazar
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              )}

              <Dialog open={showDocumentsDialog} onOpenChange={setShowDocumentsDialog}>
                <DialogTrigger asChild>
                  <Button variant="outline">
                    <FileText className="w-4 h-4 mr-2" />
                    Solicitar Documentos
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Solicitar Documentos Adicionales</DialogTitle>
                    <DialogDescription>
                      Especifica qué documentos adicionales necesitas del usuario.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Instrucciones para el Usuario *
                      </label>
                      <Textarea
                        value={adminNotes}
                        onChange={(e) => setAdminNotes(e.target.value)}
                        placeholder="Especifica qué documentos necesitas y por qué..."
                        rows={4}
                        required
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setShowDocumentsDialog(false)}>
                      Cancelar
                    </Button>
                    <Button 
                      onClick={handleRequestDocuments} 
                      disabled={loading || !adminNotes.trim()}
                    >
                      {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                      Solicitar Documentos
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Error */}
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
    </div>
  );
}
