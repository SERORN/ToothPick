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
    documentation: 'https://help.sap.com/docs/SAP_S4HANA_CLOUD/0f69f8fb28ac4bf48d2b57b9637e81fa/1c60c999d8004b249bdb3ac26b6b7e78.html'
  },
  ODOO: {
    type: 'ERP' as const,
    icon: Database,
    color: 'bg-purple-100 text-purple-800',
    description: 'Suite de aplicaciones empresariales Odoo',
    requiredFields: ['apiEndpoint', 'username', 'password'],
    supportedEntities: ['products', 'orders', 'inventory', 'quotes', 'customers'],
    documentation: 'https://www.odoo.com/documentation/16.0/developer/reference/external_api.html'
  },
  ORACLE: {
    type: 'ERP' as const,
    icon: Database,
    color: 'bg-red-100 text-red-800',
    description: 'Oracle Cloud ERP para gestión empresarial',
    requiredFields: ['apiEndpoint', 'username', 'password', 'tenantId'],
    supportedEntities: ['products', 'orders', 'inventory', 'quotes'],
    documentation: 'https://docs.oracle.com/en/cloud/saas/applications-common/22a/farca/index.html'
  },
  SALESFORCE: {
    type: 'CRM' as const,
    icon: Activity,
    color: 'bg-blue-100 text-blue-800',
    description: 'CRM líder para gestión de relaciones con clientes',
    requiredFields: ['instanceUrl', 'clientId', 'clientSecret', 'username', 'password'],
    supportedEntities: ['customers', 'quotes', 'orders'],
    documentation: 'https://developer.salesforce.com/docs/atlas.en-us.api_rest.meta/api_rest/'
  },
  HUBSPOT: {
    type: 'CRM' as const,
    icon: Activity,
    color: 'bg-orange-100 text-orange-800',
    description: 'Plataforma CRM todo-en-uno HubSpot',
    requiredFields: ['apiKey'],
    supportedEntities: ['customers', 'quotes'],
    documentation: 'https://developers.hubspot.com/docs/api/overview'
  },
  ZOHO: {
    type: 'CRM' as const,
    icon: Activity,
    color: 'bg-green-100 text-green-800',
    description: 'Suite CRM Zoho para empresas',
    requiredFields: ['apiEndpoint', 'clientId', 'clientSecret'],
    supportedEntities: ['customers', 'quotes', 'orders'],
    documentation: 'https://www.zoho.com/crm/developer/docs/api/v2/'
  },
  PIPEDRIVE: {
    type: 'CRM' as const,
    icon: Activity,
    color: 'bg-pink-100 text-pink-800',
    description: 'CRM centrado en ventas Pipedrive',
    requiredFields: ['apiKey'],
    supportedEntities: ['customers', 'quotes'],
    documentation: 'https://developers.pipedrive.com/docs/api/v1'
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
  
  const router = useRouter();
  
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      connectionName: '',
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
      },
      webhookSettings: {
        enabled: false,
        retryAttempts: 3
      }
    }
  });

  const selectedSystem = form.watch('systemName');
  const systemConfig = selectedSystem ? SYSTEM_CONFIGS[selectedSystem] : null;
  
  // Auto-set integration type when system is selected
  React.useEffect(() => {
    if (systemConfig) {
      form.setValue('integrationType', systemConfig.type);
    }
  }, [selectedSystem, systemConfig, form]);

  const testConnection = async () => {
    try {
      setIsTestingConnection(true);
      setConnectionTestResult(null);
      
      const formData = form.getValues();
      
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

  const onSubmit = async (data: FormData) => {
    try {
      setIsLoading(true);
      
      const response = await fetch('/api/integrations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...data,
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
      }
      
      // Redirect or close modal
      if (!onSuccess && !onCancel) {
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
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              
              {/* Basic Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Información Básica</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="connectionName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nombre de Conexión</FormLabel>
                        <FormControl>
                          <Input placeholder="Ej: SAP Producción" {...field} />
                        </FormControl>
                        <FormDescription>
                          Nombre descriptivo para identificar esta integración
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="systemName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Sistema</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecciona un sistema" />
                            </SelectTrigger>
                          </FormControl>
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
                        <FormMessage />
                      </FormItem>
                    )}
                  />
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
                
                <FormField
                  control={form.control}
                  name="apiEndpoint"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>URL de API</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="https://api.example.com/v1" 
                          {...field} 
                        />
                      </FormControl>
                      <FormDescription>
                        URL base de la API del sistema
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
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
                    <FormField
                      control={form.control}
                      name="credentials.apiKey"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>API Key</FormLabel>
                          <FormControl>
                            <Input 
                              type={showCredentials ? 'text' : 'password'}
                              placeholder="sk-..."
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                  
                  {systemConfig?.requiredFields.includes('clientId') && (
                    <FormField
                      control={form.control}
                      name="credentials.clientId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Client ID</FormLabel>
                          <FormControl>
                            <Input 
                              type={showCredentials ? 'text' : 'password'}
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                  
                  {systemConfig?.requiredFields.includes('clientSecret') && (
                    <FormField
                      control={form.control}
                      name="credentials.clientSecret"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Client Secret</FormLabel>
                          <FormControl>
                            <Input 
                              type={showCredentials ? 'text' : 'password'}
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                  
                  {systemConfig?.requiredFields.includes('username') && (
                    <FormField
                      control={form.control}
                      name="credentials.username"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Usuario</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                  
                  {systemConfig?.requiredFields.includes('password') && (
                    <FormField
                      control={form.control}
                      name="credentials.password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Contraseña</FormLabel>
                          <FormControl>
                            <Input 
                              type={showCredentials ? 'text' : 'password'}
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                  
                  {systemConfig?.requiredFields.includes('tenantId') && (
                    <FormField
                      control={form.control}
                      name="credentials.tenantId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Tenant ID</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                  
                  {systemConfig?.requiredFields.includes('instanceUrl') && (
                    <FormField
                      control={form.control}
                      name="credentials.instanceUrl"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Instance URL</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="https://yourinstance.salesforce.com"
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                </div>
                
                {/* Test Connection */}
                <div className="space-y-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={testConnection}
                    disabled={isTestingConnection || !selectedSystem}
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
                      <FormField
                        key={entity}
                        control={form.control}
                        name={`enabledEntities.${entity}` as any}
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                            <div className="space-y-0.5">
                              <FormLabel className="text-base">
                                {ENTITY_LABELS[entity as keyof typeof ENTITY_LABELS]}
                              </FormLabel>
                            </div>
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    ))}
                  </div>
                </div>
              )}
              
              {/* Sync Settings */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Configuración de Sincronización</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="syncSchedule.intervalHours"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Intervalo de Sincronización (horas)</FormLabel>
                        <Select onValueChange={(value) => field.onChange(parseInt(value))} defaultValue={field.value.toString()}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="1">Cada hora</SelectItem>
                            <SelectItem value="3">Cada 3 horas</SelectItem>
                            <SelectItem value="6">Cada 6 horas</SelectItem>
                            <SelectItem value="12">Cada 12 horas</SelectItem>
                            <SelectItem value="24">Cada 24 horas</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="syncSchedule.syncDirection"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Dirección de Sincronización</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="BIDIRECTIONAL">Bidireccional</SelectItem>
                            <SelectItem value="TO_TOOTHPICK">Solo hacia ToothPick</SelectItem>
                            <SelectItem value="FROM_TOOTHPICK">Solo desde ToothPick</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          Controla la dirección del flujo de datos entre sistemas
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <FormField
                  control={form.control}
                  name="syncSchedule.autoResolveConflicts"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">
                          Resolver Conflictos Automáticamente
                        </FormLabel>
                        <FormDescription>
                          Los datos más recientes sobrescribirán los antiguos en caso de conflicto
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
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
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}

export default ConnectIntegrationForm;
