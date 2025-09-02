'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { 
  RefreshCw, 
  Play, 
  CheckCircle, 
  AlertTriangle, 
  Clock,
  Database,
  Activity,
  Settings,
  Loader2,
  Info
} from 'lucide-react';

interface SyncOptions {
  entities: string[];
  syncDirection: 'BIDIRECTIONAL' | 'TO_TOOTHPICK' | 'FROM_TOOTHPICK';
  conflictResolution: 'AUTO' | 'MANUAL' | 'SKIP';
  fullSync: boolean;
  dryRun: boolean;
}

interface Integration {
  id: string;
  connectionName: string;
  systemName: string;
  integrationType: 'ERP' | 'CRM';
  isConnected: boolean;
  enabledEntities: {
    products: boolean;
    orders: boolean;
    inventory: boolean;
    quotes: boolean;
    customers: boolean;
  };
  lastSyncAt?: string;
  syncInProgress?: boolean;
}

interface SyncResult {
  success: boolean;
  message: string;
  stats?: {
    totalRecords: number;
    successCount: number;
    errorCount: number;
    skippedCount: number;
    executionTime: number;
  };
  errors?: string[];
  warnings?: string[];
}

interface ManualSyncButtonProps {
  integration: Integration;
  onSyncComplete?: (result: SyncResult) => void;
  size?: 'sm' | 'default' | 'lg';
  variant?: 'default' | 'outline' | 'secondary';
  showDetails?: boolean;
}

const ENTITY_LABELS = {
  products: 'Productos',
  orders: 'Órdenes',
  inventory: 'Inventario',
  quotes: 'Cotizaciones',
  customers: 'Clientes'
};

const DIRECTION_LABELS = {
  BIDIRECTIONAL: 'Bidireccional',
  TO_TOOTHPICK: 'Solo hacia ToothPick',
  FROM_TOOTHPICK: 'Solo desde ToothPick'
};

const CONFLICT_RESOLUTION_LABELS = {
  AUTO: 'Automática (más reciente gana)',
  MANUAL: 'Manual (requiere revisión)',
  SKIP: 'Omitir conflictos'
};

export function ManualSyncButton({ 
  integration, 
  onSyncComplete, 
  size = 'default', 
  variant = 'default',
  showDetails = false 
}: ManualSyncButtonProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null);
  
  const [syncOptions, setSyncOptions] = useState<SyncOptions>({
    entities: Object.entries(integration.enabledEntities)
      .filter(([_, enabled]) => enabled)
      .map(([entity]) => entity),
    syncDirection: 'BIDIRECTIONAL',
    conflictResolution: 'AUTO',
    fullSync: false,
    dryRun: false
  });

  const handleQuickSync = async () => {
    if (!integration.isConnected) {
      alert('La integración no está conectada');
      return;
    }

    setIsSyncing(true);
    setSyncResult(null);

    try {
      const response = await fetch('/api/integrations/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          integrationId: integration.id,
          options: {
            entities: Object.entries(integration.enabledEntities)
              .filter(([_, enabled]) => enabled)
              .map(([entity]) => entity),
            syncDirection: 'BIDIRECTIONAL',
            conflictResolution: 'AUTO',
            fullSync: false,
            dryRun: false
          }
        }),
      });

      const result = await response.json();

      if (response.ok) {
        setSyncResult({
          success: true,
          message: result.message || 'Sincronización completada',
          stats: result.stats
        });
        
        if (onSyncComplete) {
          onSyncComplete({
            success: true,
            message: result.message,
            stats: result.stats
          });
        }
      } else {
        throw new Error(result.error || 'Error en la sincronización');
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      setSyncResult({
        success: false,
        message: errorMessage
      });
      
      if (onSyncComplete) {
        onSyncComplete({
          success: false,
          message: errorMessage
        });
      }
    } finally {
      setIsSyncing(false);
    }
  };

  const handleAdvancedSync = async () => {
    setIsSyncing(true);
    setSyncResult(null);

    try {
      const response = await fetch('/api/integrations/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          integrationId: integration.id,
          options: syncOptions
        }),
      });

      const result = await response.json();

      if (response.ok) {
        setSyncResult({
          success: true,
          message: result.message || 'Sincronización completada',
          stats: result.stats,
          warnings: result.warnings
        });
        
        if (onSyncComplete) {
          onSyncComplete({
            success: true,
            message: result.message,
            stats: result.stats,
            warnings: result.warnings
          });
        }
      } else {
        throw new Error(result.error || 'Error en la sincronización');
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      setSyncResult({
        success: false,
        message: errorMessage
      });
      
      if (onSyncComplete) {
        onSyncComplete({
          success: false,
          message: errorMessage
        });
      }
    } finally {
      setIsSyncing(false);
    }
  };

  const handleOptionChange = (key: keyof SyncOptions, value: any) => {
    setSyncOptions(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleEntityToggle = (entity: string, enabled: boolean) => {
    setSyncOptions(prev => ({
      ...prev,
      entities: enabled 
        ? [...prev.entities, entity]
        : prev.entities.filter(e => e !== entity)
    }));
  };

  const formatLastSync = (lastSync?: string) => {
    if (!lastSync) return 'Nunca';
    
    const diff = Date.now() - new Date(lastSync).getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);
    
    if (days > 0) return `Hace ${days} día${days > 1 ? 's' : ''}`;
    if (hours > 0) return `Hace ${hours} hora${hours > 1 ? 's' : ''}`;
    return 'Hace poco';
  };

  const availableEntities = Object.entries(integration.enabledEntities)
    .filter(([_, enabled]) => enabled)
    .map(([entity]) => entity);

  if (!showDetails) {
    // Simple button mode
    return (
      <Button
        variant={variant}
        size={size}
        onClick={handleQuickSync}
        disabled={isSyncing || !integration.isConnected || integration.syncInProgress}
      >
        {isSyncing || integration.syncInProgress ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Sincronizando...
          </>
        ) : (
          <>
            <RefreshCw className="h-4 w-4 mr-2" />
            Sincronizar
          </>
        )}
      </Button>
    );
  }

  // Full component with modal
  return (
    <>
      <div className="flex items-center gap-2">
        <Button
          variant={variant}
          size={size}
          onClick={handleQuickSync}
          disabled={isSyncing || !integration.isConnected || integration.syncInProgress}
        >
          {isSyncing || integration.syncInProgress ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Sincronizando...
            </>
          ) : (
            <>
              <RefreshCw className="h-4 w-4 mr-2" />
              Sync Rápido
            </>
          )}
        </Button>
        
        <Button
          variant="outline"
          size={size}
          onClick={() => setIsModalOpen(true)}
          disabled={!integration.isConnected}
        >
          <Settings className="h-4 w-4 mr-2" />
          Avanzado
        </Button>
      </div>

      {/* Sync Status */}
      {syncResult && (
        <Alert className={`mt-4 ${syncResult.success ? 'border-green-200' : 'border-red-200'}`}>
          {syncResult.success ? (
            <CheckCircle className="h-4 w-4 text-green-600" />
          ) : (
            <AlertTriangle className="h-4 w-4 text-red-600" />
          )}
          <AlertDescription>
            <div className="space-y-2">
              <p className={syncResult.success ? 'text-green-800' : 'text-red-800'}>
                {syncResult.message}
              </p>
              
              {syncResult.stats && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Total:</span> {syncResult.stats.totalRecords}
                  </div>
                  <div>
                    <span className="font-medium text-green-600">Exitosos:</span> {syncResult.stats.successCount}
                  </div>
                  <div>
                    <span className="font-medium text-red-600">Errores:</span> {syncResult.stats.errorCount}
                  </div>
                  <div>
                    <span className="font-medium text-yellow-600">Omitidos:</span> {syncResult.stats.skippedCount}
                  </div>
                </div>
              )}
              
              {syncResult.warnings && syncResult.warnings.length > 0 && (
                <div className="space-y-1">
                  <p className="font-medium text-yellow-800">Advertencias:</p>
                  <ul className="list-disc list-inside text-sm text-yellow-700">
                    {syncResult.warnings.map((warning, index) => (
                      <li key={index}>{warning}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Advanced Sync Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-auto">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="h-5 w-5" />
                    Sincronización Avanzada
                  </CardTitle>
                  <CardDescription>
                    {integration.connectionName} ({integration.systemName})
                  </CardDescription>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsModalOpen(false)}
                >
                  ✕
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              
              {/* Integration Status */}
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  {integration.integrationType === 'ERP' ? (
                    <Database className="h-6 w-6 text-blue-500" />
                  ) : (
                    <Activity className="h-6 w-6 text-green-500" />
                  )}
                  <div>
                    <p className="font-medium">{integration.connectionName}</p>
                    <p className="text-sm text-gray-600">
                      Última sync: {formatLastSync(integration.lastSyncAt)}
                    </p>
                  </div>
                </div>
                <Badge className={integration.isConnected ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                  {integration.isConnected ? 'Conectado' : 'Desconectado'}
                </Badge>
              </div>

              {/* Entities Selection */}
              <div className="space-y-3">
                <Label className="text-base font-medium">Entidades a Sincronizar</Label>
                <div className="grid grid-cols-2 gap-3">
                  {availableEntities.map((entity) => (
                    <div 
                      key={entity}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <Label className="text-sm">
                        {ENTITY_LABELS[entity as keyof typeof ENTITY_LABELS]}
                      </Label>
                      <Switch
                        checked={syncOptions.entities.includes(entity)}
                        onCheckedChange={(checked) => handleEntityToggle(entity, checked)}
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Sync Direction */}
              <div className="space-y-2">
                <Label className="text-base font-medium">Dirección de Sincronización</Label>
                <Select 
                  value={syncOptions.syncDirection} 
                  onValueChange={(value) => handleOptionChange('syncDirection', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(DIRECTION_LABELS).map(([key, label]) => (
                      <SelectItem key={key} value={key}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Conflict Resolution */}
              <div className="space-y-2">
                <Label className="text-base font-medium">Resolución de Conflictos</Label>
                <Select 
                  value={syncOptions.conflictResolution} 
                  onValueChange={(value) => handleOptionChange('conflictResolution', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(CONFLICT_RESOLUTION_LABELS).map(([key, label]) => (
                      <SelectItem key={key} value={key}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Sync Options */}
              <div className="space-y-4">
                <Label className="text-base font-medium">Opciones Adicionales</Label>
                
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <Label className="text-sm font-medium">Sincronización Completa</Label>
                    <p className="text-xs text-gray-600">
                      Sincronizar todos los registros en lugar de solo los cambios recientes
                    </p>
                  </div>
                  <Switch
                    checked={syncOptions.fullSync}
                    onCheckedChange={(checked) => handleOptionChange('fullSync', checked)}
                  />
                </div>
                
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <Label className="text-sm font-medium">Ejecutar Prueba (Dry Run)</Label>
                    <p className="text-xs text-gray-600">
                      Simular la sincronización sin realizar cambios reales
                    </p>
                  </div>
                  <Switch
                    checked={syncOptions.dryRun}
                    onCheckedChange={(checked) => handleOptionChange('dryRun', checked)}
                  />
                </div>
              </div>

              {/* Warning for Dry Run */}
              {syncOptions.dryRun && (
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    Modo de prueba activado. No se realizarán cambios reales en los sistemas.
                  </AlertDescription>
                </Alert>
              )}

              {/* Action Buttons */}
              <div className="flex justify-end space-x-3 pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => setIsModalOpen(false)}
                  disabled={isSyncing}
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleAdvancedSync}
                  disabled={isSyncing || syncOptions.entities.length === 0}
                >
                  {isSyncing ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Sincronizando...
                    </>
                  ) : (
                    <>
                      <Play className="h-4 w-4 mr-2" />
                      {syncOptions.dryRun ? 'Ejecutar Prueba' : 'Iniciar Sincronización'}
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
}

export default ManualSyncButton;
