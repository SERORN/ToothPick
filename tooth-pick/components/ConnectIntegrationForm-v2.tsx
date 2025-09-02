'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  AlertTriangle, 
  CheckCircle, 
  Database, 
  Activity, 
  Loader2, 
  Eye, 
  EyeOff,
  Info,
  Lock,
  Globe,
  Key
} from 'lucide-react';

interface FormData {
  connectionName: string;
  systemName: 'SAP' | 'ODOO' | 'ORACLE' | 'SALESFORCE' | 'HUBSPOT' | 'ZOHO' | 'PIPEDRIVE' | '';
  integrationType: 'ERP' | 'CRM';
  apiEndpoint: string;
  credentials: {
    apiKey?: string;
    clientId?: string;
    clientSecret?: string;
    username?: string;
    password?: string;
    tenantId?: string;
    instanceUrl?: string;
  };
  syncSchedule: {
    enabled: boolean;
    intervalHours: number;
    autoResolveConflicts: boolean;
    syncDirection: 'BIDIRECTIONAL' | 'TO_TOOTHPICK' | 'FROM_TOOTHPICK';
  };
  enabledEntities: {
    products: boolean;
    orders: boolean;
    inventory: boolean;
    quotes: boolean;
    customers: boolean;
  };
}

interface ConnectIntegrationFormProps {
  organizationId?: string;
  providerId?: string;
  onSuccess?: (integration: any) => void;
  onCancel?: () => void;
}

const SYSTEM_CONFIGS = {
  SAP: {
    type: 'ERP' as const,
    icon: Database,
    color: 'bg-blue-100 text-blue-800',
    description: 'Sistema empresarial SAP para gestión de recursos',
    requiredFields: ['apiEndpoint', 'username', 'password', 'clientId'],
    supportedEntities: ['products', 'orders', 'inventory', 'quotes', 'customers'],
    documentation: 'https://help.sap.com/docs'
  },
  ODOO: {
    type: 'ERP' as const,
    icon: Database,
    color: 'bg-purple-100 text-purple-800',
    description: 'Suite de aplicaciones empresariales Odoo',
    requiredFields: ['apiEndpoint', 'username', 'password'],
    supportedEntities: ['products', 'orders', 'inventory', 'quotes', 'customers'],
    documentation: 'https://www.odoo.com/documentation'
  },
  ORACLE: {
    type: 'ERP' as const,
    icon: Database,
    color: 'bg-red-100 text-red-800',
    description: 'Oracle Cloud ERP para gestión empresarial',
    requiredFields: ['apiEndpoint', 'username', 'password', 'tenantId'],
    supportedEntities: ['products', 'orders', 'inventory', 'quotes'],
    documentation: 'https://docs.oracle.com/en/cloud/saas/'
  },
  SALESFORCE: {
    type: 'CRM' as const,
    icon: Activity,
    color: 'bg-blue-100 text-blue-800',
    description: 'CRM líder para gestión de relaciones con clientes',
    requiredFields: ['instanceUrl', 'clientId', 'clientSecret', 'username', 'password'],
    supportedEntities: ['customers', 'quotes', 'orders'],
    documentation: 'https://developer.salesforce.com/docs/'
  },
  HUBSPOT: {
    type: 'CRM' as const,
    icon: Activity,
    color: 'bg-orange-100 text-orange-800',
    description: 'Plataforma CRM todo-en-uno HubSpot',
    requiredFields: ['apiKey'],
    supportedEntities: ['customers', 'quotes'],
    documentation: 'https://developers.hubspot.com/docs/'
  },
  ZOHO: {
    type: 'CRM' as const,
    icon: Activity,
    color: 'bg-green-100 text-green-800',
    description: 'Suite CRM Zoho para empresas',
    requiredFields: ['apiEndpoint', 'clientId', 'clientSecret'],
    supportedEntities: ['customers', 'quotes', 'orders'],
    documentation: 'https://www.zoho.com/crm/developer/'
  },
  PIPEDRIVE: {
    type: 'CRM' as const,
    icon: Activity,
    color: 'bg-pink-100 text-pink-800',
    description: 'CRM centrado en ventas Pipedrive',
    requiredFields: ['apiKey'],
    supportedEntities: ['customers', 'quotes'],
    documentation: 'https://developers.pipedrive.com/docs/'
  }
};

const ENTITY_LABELS = {
  products: 'Productos',
  orders: 'Órdenes',
  inventory: 'Inventario',
  quotes: 'Cotizaciones',
  customers: 'Clientes'
};

export function ConnectIntegrationForm({ organizationId, providerId, onSuccess, onCancel }: ConnectIntegrationFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [showCredentials, setShowCredentials] = useState(false);
  const [connectionTestResult, setConnectionTestResult] = useState<{
    success: boolean;
    message: string;
    details?: any;
  } | null>(null);
  
  const [formData, setFormData] = useState<FormData>({
    connectionName: '',
    systemName: '',
    integrationType: 'ERP',
    apiEndpoint: '',
    credentials: {},
    syncSchedule: {
      enabled: true,
      intervalHours: 6,
      autoResolveConflicts: true,
      syncDirection: 'BIDIRECTIONAL'
    },
    enabledEntities: {
      products: false,
      orders: false,
      inventory: false,
      quotes: false,
      customers: false
    }
  });
  
  const router = useRouter();
  
  const systemConfig = formData.systemName ? SYSTEM_CONFIGS[formData.systemName] : null;
  
  // Auto-set integration type when system is selected
  useEffect(() => {
    if (systemConfig) {
      setFormData(prev => ({
        ...prev,
        integrationType: systemConfig.type
      }));
    }
  }, [systemConfig]);

  const handleInputChange = (field: string, value: any) => {
    if (field.includes('.')) {
      const [parent, child] = field.split('.');
      setFormData(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent as keyof FormData],
          [child]: value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [field]: value
      }));
    }
  };

  const testConnection = async () => {
    try {
      setIsTestingConnection(true);
      setConnectionTestResult(null);
      
      const response = await fetch('/api/integrations/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          systemName: formData.systemName,
          apiEndpoint: formData.apiEndpoint,
          credentials: formData.credentials,
          organizationId,
          providerId
        }),
      });
      
      const result = await response.json();
      
      if (response.ok) {
        setConnectionTestResult({
          success: true,
          message: result.message || 'Conexión exitosa',
          details: result.connectionDetails
        });
      } else {
        setConnectionTestResult({
          success: false,
          message: result.error || 'Error de conexión',
          details: result.details
        });
      }
      
    } catch (error) {
      setConnectionTestResult({
        success: false,
        message: 'Error de red al probar la conexión'
      });
    } finally {
      setIsTestingConnection(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setIsLoading(true);
      
      const response = await fetch('/api/integrations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          organizationId,
          providerId
        }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Error al crear la integración');
      }
      
      const result = await response.json();
      
      if (onSuccess) {
        onSuccess(result.integration);
      } else {
        router.push('/dashboard/integrations');
      }
      
    } catch (error) {
      console.error('Error creando integración:', error);
      alert(error instanceof Error ? error.message : 'Error desconocido');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Conectar Nueva Integración
          </CardTitle>
          <CardDescription>
            Conecta tu sistema ERP o CRM para sincronizar datos automáticamente con ToothPick
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            
            {/* Basic Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Información Básica</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="connectionName">Nombre de Conexión</Label>
                  <Input
                    id="connectionName"
                    placeholder="Ej: SAP Producción"
                    value={formData.connectionName}
                    onChange={(e) => handleInputChange('connectionName', e.target.value)}
                    required
                  />
                  <p className="text-sm text-gray-600">
                    Nombre descriptivo para identificar esta integración
                  </p>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="systemName">Sistema</Label>
                  <Select 
                    value={formData.systemName} 
                    onValueChange={(value) => handleInputChange('systemName', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona un sistema" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(SYSTEM_CONFIGS).map(([key, config]) => {
                        const Icon = config.icon;
                        return (
                          <SelectItem key={key} value={key}>
                            <div className="flex items-center gap-2">
                              <Icon className="h-4 w-4" />
                              <span>{key}</span>
                              <Badge className={config.color} variant="secondary">
                                {config.type}
                              </Badge>
                            </div>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              {systemConfig && (
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    <div className="space-y-2">
                      <p>{systemConfig.description}</p>
                      <a 
                        href={systemConfig.documentation} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline text-sm"
                      >
                        Ver documentación oficial →
                      </a>
                    </div>
                  </AlertDescription>
                </Alert>
              )}
              
              <div className="space-y-2">
                <Label htmlFor="apiEndpoint">URL de API</Label>
                <Input
                  id="apiEndpoint"
                  type="url"
                  placeholder="https://api.example.com/v1"
                  value={formData.apiEndpoint}
                  onChange={(e) => handleInputChange('apiEndpoint', e.target.value)}
                  required
                />
                <p className="text-sm text-gray-600">
                  URL base de la API del sistema
                </p>
              </div>
            </div>
            
            {/* Credentials */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium flex items-center gap-2">
                  <Lock className="h-5 w-5" />
                  Credenciales
                </h3>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowCredentials(!showCredentials)}
                >
                  {showCredentials ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  {showCredentials ? 'Ocultar' : 'Mostrar'}
                </Button>
              </div>
              
              <Alert>
                <Lock className="h-4 w-4" />
                <AlertDescription>
                  Las credenciales se almacenan encriptadas con AES-256 y solo se usan para autenticación.
                </AlertDescription>
              </Alert>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {systemConfig?.requiredFields.includes('apiKey') && (
                  <div className="space-y-2">
                    <Label htmlFor="apiKey">API Key</Label>
                    <Input
                      id="apiKey"
                      type={showCredentials ? 'text' : 'password'}
                      placeholder="sk-..."
                      value={formData.credentials.apiKey || ''}
                      onChange={(e) => handleInputChange('credentials.apiKey', e.target.value)}
                      required
                    />
                  </div>
                )}
                
                {systemConfig?.requiredFields.includes('clientId') && (
                  <div className="space-y-2">
                    <Label htmlFor="clientId">Client ID</Label>
                    <Input
                      id="clientId"
                      type={showCredentials ? 'text' : 'password'}
                      value={formData.credentials.clientId || ''}
                      onChange={(e) => handleInputChange('credentials.clientId', e.target.value)}
                      required
                    />
                  </div>
                )}
                
                {systemConfig?.requiredFields.includes('clientSecret') && (
                  <div className="space-y-2">
                    <Label htmlFor="clientSecret">Client Secret</Label>
                    <Input
                      id="clientSecret"
                      type={showCredentials ? 'text' : 'password'}
                      value={formData.credentials.clientSecret || ''}
                      onChange={(e) => handleInputChange('credentials.clientSecret', e.target.value)}
                      required
                    />
                  </div>
                )}
                
                {systemConfig?.requiredFields.includes('username') && (
                  <div className="space-y-2">
                    <Label htmlFor="username">Usuario</Label>
                    <Input
                      id="username"
                      value={formData.credentials.username || ''}
                      onChange={(e) => handleInputChange('credentials.username', e.target.value)}
                      required
                    />
                  </div>
                )}
                
                {systemConfig?.requiredFields.includes('password') && (
                  <div className="space-y-2">
                    <Label htmlFor="password">Contraseña</Label>
                    <Input
                      id="password"
                      type={showCredentials ? 'text' : 'password'}
                      value={formData.credentials.password || ''}
                      onChange={(e) => handleInputChange('credentials.password', e.target.value)}
                      required
                    />
                  </div>
                )}
                
                {systemConfig?.requiredFields.includes('tenantId') && (
                  <div className="space-y-2">
                    <Label htmlFor="tenantId">Tenant ID</Label>
                    <Input
                      id="tenantId"
                      value={formData.credentials.tenantId || ''}
                      onChange={(e) => handleInputChange('credentials.tenantId', e.target.value)}
                      required
                    />
                  </div>
                )}
                
                {systemConfig?.requiredFields.includes('instanceUrl') && (
                  <div className="space-y-2">
                    <Label htmlFor="instanceUrl">Instance URL</Label>
                    <Input
                      id="instanceUrl"
                      placeholder="https://yourinstance.salesforce.com"
                      value={formData.credentials.instanceUrl || ''}
                      onChange={(e) => handleInputChange('credentials.instanceUrl', e.target.value)}
                      required
                    />
                  </div>
                )}
              </div>
              
              {/* Test Connection */}
              <div className="space-y-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={testConnection}
                  disabled={isTestingConnection || !formData.systemName}
                  className="w-full"
                >
                  {isTestingConnection ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Probando Conexión...
                    </>
                  ) : (
                    <>
                      <Key className="h-4 w-4 mr-2" />
                      Probar Conexión
                    </>
                  )}
                </Button>
                
                {connectionTestResult && (
                  <Alert className={connectionTestResult.success ? 'border-green-200' : 'border-red-200'}>
                    {connectionTestResult.success ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : (
                      <AlertTriangle className="h-4 w-4 text-red-600" />
                    )}
                    <AlertDescription>
                      <div className="space-y-1">
                        <p className={connectionTestResult.success ? 'text-green-800' : 'text-red-800'}>
                          {connectionTestResult.message}
                        </p>
                        {connectionTestResult.details && (
                          <pre className="text-xs bg-gray-50 p-2 rounded max-h-32 overflow-auto">
                            {JSON.stringify(connectionTestResult.details, null, 2)}
                          </pre>
                        )}
                      </div>
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </div>
            
            {/* Enabled Entities */}
            {systemConfig && (
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Entidades a Sincronizar</h3>
                <p className="text-sm text-gray-600">
                  Selecciona qué tipos de datos quieres sincronizar entre los sistemas
                </p>
                
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {systemConfig.supportedEntities.map((entity) => (
                    <div 
                      key={entity}
                      className="flex flex-row items-center justify-between rounded-lg border p-3"
                    >
                      <div className="space-y-0.5">
                        <Label className="text-base">
                          {ENTITY_LABELS[entity as keyof typeof ENTITY_LABELS]}
                        </Label>
                      </div>
                      <Switch
                        checked={formData.enabledEntities[entity as keyof typeof formData.enabledEntities]}
                        onCheckedChange={(checked) => 
                          handleInputChange(`enabledEntities.${entity}`, checked)
                        }
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Sync Settings */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Configuración de Sincronización</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="intervalHours">Intervalo de Sincronización (horas)</Label>
                  <Select 
                    value={formData.syncSchedule.intervalHours.toString()} 
                    onValueChange={(value) => handleInputChange('syncSchedule.intervalHours', parseInt(value))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">Cada hora</SelectItem>
                      <SelectItem value="3">Cada 3 horas</SelectItem>
                      <SelectItem value="6">Cada 6 horas</SelectItem>
                      <SelectItem value="12">Cada 12 horas</SelectItem>
                      <SelectItem value="24">Cada 24 horas</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="syncDirection">Dirección de Sincronización</Label>
                  <Select 
                    value={formData.syncSchedule.syncDirection} 
                    onValueChange={(value) => handleInputChange('syncSchedule.syncDirection', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="BIDIRECTIONAL">Bidireccional</SelectItem>
                      <SelectItem value="TO_TOOTHPICK">Solo hacia ToothPick</SelectItem>
                      <SelectItem value="FROM_TOOTHPICK">Solo desde ToothPick</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-gray-600">
                    Controla la dirección del flujo de datos entre sistemas
                  </p>
                </div>
              </div>
              
              <div className="flex flex-row items-center justify-between rounded-lg border p-3">
                <div className="space-y-0.5">
                  <Label className="text-base">
                    Resolver Conflictos Automáticamente
                  </Label>
                  <p className="text-sm text-gray-600">
                    Los datos más recientes sobrescribirán los antiguos en caso de conflicto
                  </p>
                </div>
                <Switch
                  checked={formData.syncSchedule.autoResolveConflicts}
                  onCheckedChange={(checked) => 
                    handleInputChange('syncSchedule.autoResolveConflicts', checked)
                  }
                />
              </div>
            </div>
            
            {/* Form Actions */}
            <div className="flex justify-end space-x-4 pt-6 border-t">
              {onCancel && (
                <Button type="button" variant="outline" onClick={onCancel}>
                  Cancelar
                </Button>
              )}
              <Button type="submit" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creando Integración...
                  </>
                ) : (
                  'Crear Integración'
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

export default ConnectIntegrationForm;
