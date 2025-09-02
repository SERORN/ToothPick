'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Search,
  Filter,
  RefreshCw,
  Download,
  Eye,
  Info,
  XCircle,
  Activity,
  FileText,
  Calendar,
  ChevronLeft,
  ChevronRight,
  ExternalLink
} from 'lucide-react';

interface IntegrationLog {
  id: string;
  integrationId: string;
  integrationName: string;
  systemName: string;
  operation: 'SYNC' | 'TEST_CONNECTION' | 'WEBHOOK' | 'MANUAL_SYNC';
  operationType: 'CREATE' | 'UPDATE' | 'DELETE' | 'READ';
  status: 'SUCCESS' | 'ERROR' | 'WARNING' | 'PENDING';
  entityType?: string;
  recordCount?: number;
  errorMessage?: string;
  responseData?: any;
  executionTime?: number;
  createdAt: string;
  metadata?: {
    userAgent?: string;
    ipAddress?: string;
    userId?: string;
    triggeredBy?: 'MANUAL' | 'SCHEDULED' | 'WEBHOOK';
  };
}

interface LogsResponse {
  logs: IntegrationLog[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    itemsPerPage: number;
  };
}

interface IntegrationLogsProps {
  organizationId?: string;
  providerId?: string;
  integrationId?: string;
  maxHeight?: string;
}

const STATUS_COLORS = {
  SUCCESS: 'bg-green-100 text-green-800',
  ERROR: 'bg-red-100 text-red-800',
  WARNING: 'bg-yellow-100 text-yellow-800',
  PENDING: 'bg-blue-100 text-blue-800'
};

const STATUS_ICONS = {
  SUCCESS: CheckCircle,
  ERROR: XCircle,
  WARNING: AlertTriangle,
  PENDING: Clock
};

const OPERATION_LABELS = {
  SYNC: 'Sincronización',
  TEST_CONNECTION: 'Prueba de Conexión',
  WEBHOOK: 'Webhook',
  MANUAL_SYNC: 'Sync Manual'
};

const OPERATION_TYPE_LABELS = {
  CREATE: 'Crear',
  UPDATE: 'Actualizar',
  DELETE: 'Eliminar',
  READ: 'Leer'
};

export function IntegrationLogs({ organizationId, providerId, integrationId, maxHeight = "600px" }: IntegrationLogsProps) {
  const [logs, setLogs] = useState<IntegrationLog[]>([]);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    itemsPerPage: 10
  });
  const [isLoading, setIsLoading] = useState(false);
  const [selectedLog, setSelectedLog] = useState<IntegrationLog | null>(null);
  
  // Filters
  const [filters, setFilters] = useState({
    search: '',
    status: '',
    operation: '',
    systemName: '',
    startDate: '',
    endDate: ''
  });

  useEffect(() => {
    fetchLogs();
  }, [organizationId, providerId, integrationId, pagination.currentPage, filters]);

  const fetchLogs = async () => {
    try {
      setIsLoading(true);
      
      const params = new URLSearchParams();
      if (organizationId) params.append('organizationId', organizationId);
      if (providerId) params.append('providerId', providerId);
      if (integrationId) params.append('integrationId', integrationId);
      
      params.append('page', pagination.currentPage.toString());
      params.append('limit', pagination.itemsPerPage.toString());
      
      // Add filters
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value);
      });
      
      const response = await fetch(`/api/integrations/logs?${params}`);
      if (!response.ok) {
        throw new Error('Error cargando logs');
      }
      
      const data: LogsResponse = await response.json();
      setLogs(data.logs);
      setPagination(data.pagination);
      
    } catch (error) {
      console.error('Error cargando logs:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
    setPagination(prev => ({ ...prev, currentPage: 1 }));
  };

  const clearFilters = () => {
    setFilters({
      search: '',
      status: '',
      operation: '',
      systemName: '',
      startDate: '',
      endDate: ''
    });
  };

  const handlePageChange = (newPage: number) => {
    setPagination(prev => ({ ...prev, currentPage: newPage }));
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('es-ES', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const formatExecutionTime = (ms?: number) => {
    if (!ms) return 'N/A';
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  const exportLogs = async () => {
    try {
      const params = new URLSearchParams();
      if (organizationId) params.append('organizationId', organizationId);
      if (providerId) params.append('providerId', providerId);
      if (integrationId) params.append('integrationId', integrationId);
      params.append('export', 'true');
      
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value);
      });
      
      const response = await fetch(`/api/integrations/logs?${params}`);
      if (!response.ok) throw new Error('Error exportando logs');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `integration-logs-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error exportando logs:', error);
      alert('Error al exportar logs');
    }
  };

  const getStatusIcon = (status: string) => {
    const Icon = STATUS_ICONS[status as keyof typeof STATUS_ICONS] || Info;
    return <Icon className="h-4 w-4" />;
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Logs de Integración
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={exportLogs}
                disabled={isLoading}
              >
                <Download className="h-4 w-4 mr-2" />
                Exportar
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={fetchLogs}
                disabled={isLoading}
              >
                <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          
          {/* Filters */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4" />
              <span className="font-medium">Filtros</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="ml-auto"
              >
                Limpiar
              </Button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
              <div className="space-y-2">
                <Label htmlFor="search">Buscar</Label>
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-500" />
                  <Input
                    id="search"
                    placeholder="Buscar en logs..."
                    className="pl-8"
                    value={filters.search}
                    onChange={(e) => handleFilterChange('search', e.target.value)}
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>Estado</Label>
                <Select value={filters.status} onValueChange={(value) => handleFilterChange('status', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Todos</SelectItem>
                    <SelectItem value="SUCCESS">Éxito</SelectItem>
                    <SelectItem value="ERROR">Error</SelectItem>
                    <SelectItem value="WARNING">Advertencia</SelectItem>
                    <SelectItem value="PENDING">Pendiente</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label>Operación</Label>
                <Select value={filters.operation} onValueChange={(value) => handleFilterChange('operation', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Todas</SelectItem>
                    <SelectItem value="SYNC">Sincronización</SelectItem>
                    <SelectItem value="TEST_CONNECTION">Prueba Conexión</SelectItem>
                    <SelectItem value="WEBHOOK">Webhook</SelectItem>
                    <SelectItem value="MANUAL_SYNC">Sync Manual</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label>Sistema</Label>
                <Input
                  placeholder="Ej: SAP, Salesforce"
                  value={filters.systemName}
                  onChange={(e) => handleFilterChange('systemName', e.target.value)}
                />
              </div>
              
              <div className="space-y-2">
                <Label>Fecha Inicio</Label>
                <Input
                  type="date"
                  value={filters.startDate}
                  onChange={(e) => handleFilterChange('startDate', e.target.value)}
                />
              </div>
              
              <div className="space-y-2">
                <Label>Fecha Fin</Label>
                <Input
                  type="date"
                  value={filters.endDate}
                  onChange={(e) => handleFilterChange('endDate', e.target.value)}
                />
              </div>
            </div>
          </div>
          
          {/* Logs List */}
          <div 
            className="space-y-2 overflow-auto"
            style={{ maxHeight }}
          >
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="h-6 w-6 animate-spin mr-2" />
                <span>Cargando logs...</span>
              </div>
            ) : logs.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No se encontraron logs</p>
                <p className="text-sm">Ajusta los filtros para ver más resultados</p>
              </div>
            ) : (
              logs.map((log) => (
                <div
                  key={log.id}
                  className="flex items-center space-x-4 p-4 border rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
                  onClick={() => setSelectedLog(log)}
                >
                  {/* Status Icon */}
                  <div className={`p-2 rounded-full ${STATUS_COLORS[log.status]}`}>
                    {getStatusIcon(log.status)}
                  </div>
                  
                  {/* Log Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium text-gray-900 truncate">
                        {log.integrationName}
                      </h4>
                      <Badge variant="outline">
                        {log.systemName}
                      </Badge>
                      <Badge className={STATUS_COLORS[log.status]}>
                        {log.status}
                      </Badge>
                    </div>
                    
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <span>{OPERATION_LABELS[log.operation]}</span>
                      {log.operationType && (
                        <span>• {OPERATION_TYPE_LABELS[log.operationType]}</span>
                      )}
                      {log.entityType && (
                        <span>• {log.entityType}</span>
                      )}
                      {log.recordCount && (
                        <span>• {log.recordCount} registros</span>
                      )}
                    </div>
                    
                    {log.errorMessage && (
                      <p className="text-sm text-red-600 mt-1 truncate">
                        {log.errorMessage}
                      </p>
                    )}
                  </div>
                  
                  {/* Timing & Date */}
                  <div className="text-right text-sm text-gray-500">
                    <div className="flex items-center gap-1 mb-1">
                      <Clock className="h-3 w-3" />
                      <span>{formatExecutionTime(log.executionTime)}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      <span>{formatDate(log.createdAt)}</span>
                    </div>
                  </div>
                  
                  {/* View Details */}
                  <Button variant="ghost" size="sm">
                    <Eye className="h-4 w-4" />
                  </Button>
                </div>
              ))
            )}
          </div>
          
          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between border-t pt-4">
              <div className="text-sm text-gray-600">
                Mostrando {((pagination.currentPage - 1) * pagination.itemsPerPage) + 1} - {Math.min(pagination.currentPage * pagination.itemsPerPage, pagination.totalItems)} de {pagination.totalItems} resultados
              </div>
              
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(pagination.currentPage - 1)}
                  disabled={pagination.currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Anterior
                </Button>
                
                <span className="text-sm">
                  Página {pagination.currentPage} de {pagination.totalPages}
                </span>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(pagination.currentPage + 1)}
                  disabled={pagination.currentPage === pagination.totalPages}
                >
                  Siguiente
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Log Detail Modal */}
      {selectedLog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-4xl max-h-[90vh] overflow-auto">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                {getStatusIcon(selectedLog.status)}
                Detalle del Log
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedLog(null)}
              >
                ✕
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              
              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="font-medium">Integración</Label>
                  <p>{selectedLog.integrationName}</p>
                </div>
                <div>
                  <Label className="font-medium">Sistema</Label>
                  <p>{selectedLog.systemName}</p>
                </div>
                <div>
                  <Label className="font-medium">Operación</Label>
                  <p>{OPERATION_LABELS[selectedLog.operation]}</p>
                </div>
                <div>
                  <Label className="font-medium">Estado</Label>
                  <Badge className={STATUS_COLORS[selectedLog.status]}>
                    {selectedLog.status}
                  </Badge>
                </div>
                <div>
                  <Label className="font-medium">Fecha</Label>
                  <p>{formatDate(selectedLog.createdAt)}</p>
                </div>
                <div>
                  <Label className="font-medium">Tiempo de Ejecución</Label>
                  <p>{formatExecutionTime(selectedLog.executionTime)}</p>
                </div>
              </div>
              
              {/* Error Message */}
              {selectedLog.errorMessage && (
                <Alert className="border-red-200">
                  <XCircle className="h-4 w-4 text-red-600" />
                  <AlertDescription>
                    <div className="space-y-1">
                      <p className="font-medium text-red-800">Error</p>
                      <p className="text-red-700">{selectedLog.errorMessage}</p>
                    </div>
                  </AlertDescription>
                </Alert>
              )}
              
              {/* Response Data */}
              {selectedLog.responseData && (
                <div className="space-y-2">
                  <Label className="font-medium">Datos de Respuesta</Label>
                  <pre className="bg-gray-50 p-4 rounded text-xs overflow-auto max-h-64">
                    {JSON.stringify(selectedLog.responseData, null, 2)}
                  </pre>
                </div>
              )}
              
              {/* Metadata */}
              {selectedLog.metadata && (
                <div className="space-y-2">
                  <Label className="font-medium">Metadatos</Label>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    {selectedLog.metadata.triggeredBy && (
                      <div>
                        <Label className="text-xs font-medium text-gray-600">Disparado por</Label>
                        <p>{selectedLog.metadata.triggeredBy}</p>
                      </div>
                    )}
                    {selectedLog.metadata.userId && (
                      <div>
                        <Label className="text-xs font-medium text-gray-600">Usuario</Label>
                        <p>{selectedLog.metadata.userId}</p>
                      </div>
                    )}
                    {selectedLog.metadata.ipAddress && (
                      <div>
                        <Label className="text-xs font-medium text-gray-600">IP</Label>
                        <p>{selectedLog.metadata.ipAddress}</p>
                      </div>
                    )}
                    {selectedLog.metadata.userAgent && (
                      <div>
                        <Label className="text-xs font-medium text-gray-600">User Agent</Label>
                        <p className="truncate">{selectedLog.metadata.userAgent}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
              
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

export default IntegrationLogs;
