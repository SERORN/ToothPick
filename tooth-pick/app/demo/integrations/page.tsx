import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';

import IntegrationStatusCard from '@/components/IntegrationStatusCard';
import ConnectIntegrationForm from '@/components/ConnectIntegrationForm-v2';
import IntegrationLogs from '@/components/IntegrationLogs';
import ManualSyncButton from '@/components/ManualSyncButton';

import { 
  Database, 
  Activity, 
  Settings, 
  Plus, 
  Monitor,
  FileText,
  Info,
  CheckCircle,
  RefreshCw
} from 'lucide-react';

export default function IntegrationsDemo() {
  // Mock data for demo
  const mockIntegration = {
    id: 'int_demo_123',
    connectionName: 'SAP Producción',
    systemName: 'SAP',
    integrationType: 'ERP' as const,
    isConnected: true,
    enabledEntities: {
      products: true,
      orders: true,
      inventory: true,
      quotes: false,
      customers: true
    },
    lastSyncAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
    syncInProgress: false
  };

  const handleSyncComplete = (result: any) => {
    console.log('Sync completed:', result);
    // In a real app, you might refresh the status or show a notification
  };

  const handleIntegrationCreated = (integration: any) => {
    console.log('Integration created:', integration);
    // In a real app, you might navigate to the integrations list or refresh data
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Sistema de Integraciones ERP/CRM</h1>
        <p className="text-gray-600">
          FASE 33: Demostración del sistema avanzado de integración con sistemas externos
        </p>
        
        <Alert className="border-blue-200">
          <Info className="h-4 w-4 text-blue-600" />
          <AlertDescription>
            Esta es una página de demostración que muestra la funcionalidad completa del sistema de integraciones.
            En producción, esta funcionalidad estaría integrada en el dashboard principal de proveedores.
          </AlertDescription>
        </Alert>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <Monitor className="h-4 w-4" />
            Vista General
          </TabsTrigger>
          <TabsTrigger value="connect" className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Conectar Sistema
          </TabsTrigger>
          <TabsTrigger value="sync" className="flex items-center gap-2">
            <RefreshCw className="h-4 w-4" />
            Sincronización
          </TabsTrigger>
          <TabsTrigger value="logs" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Logs & Auditoría
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Estado de Integraciones
                </CardTitle>
                <CardDescription>
                  Monitoreo en tiempo real del estado de todas las integraciones configuradas
                </CardDescription>
              </CardHeader>
              <CardContent>
                <IntegrationStatusCard 
                  organizationId="org_demo_123"
                  providerId="prov_demo_456"
                />
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Database className="h-5 w-5 text-blue-500" />
                    Sistemas ERP
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <h4 className="font-medium">Sistemas Soportados</h4>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="outline">SAP</Badge>
                      <Badge variant="outline">Odoo</Badge>
                      <Badge variant="outline">Oracle ERP</Badge>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <h4 className="font-medium">Entidades Sincronizables</h4>
                    <ul className="text-sm text-gray-600 space-y-1">
                      <li>• Productos y catálogos</li>
                      <li>• Órdenes de compra</li>
                      <li>• Gestión de inventario</li>
                      <li>• Cotizaciones</li>
                      <li>• Datos de clientes</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="h-5 w-5 text-green-500" />
                    Sistemas CRM
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <h4 className="font-medium">Sistemas Soportados</h4>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="outline">Salesforce</Badge>
                      <Badge variant="outline">HubSpot</Badge>
                      <Badge variant="outline">Zoho</Badge>
                      <Badge variant="outline">Pipedrive</Badge>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <h4 className="font-medium">Entidades Sincronizables</h4>
                    <ul className="text-sm text-gray-600 space-y-1">
                      <li>• Contactos y cuentas</li>
                      <li>• Oportunidades de venta</li>
                      <li>• Cotizaciones</li>
                      <li>• Actividades y notas</li>
                      <li>• Pipeline de ventas</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* Connect System Tab */}
        <TabsContent value="connect" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5" />
                Conectar Nuevo Sistema
              </CardTitle>
              <CardDescription>
                Configura una nueva integración con tu sistema ERP o CRM
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ConnectIntegrationForm
                organizationId="org_demo_123"
                providerId="prov_demo_456"
                onSuccess={handleIntegrationCreated}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Sync Tab */}
        <TabsContent value="sync" className="space-y-6">
          <div className="grid gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <RefreshCw className="h-5 w-5" />
                  Control de Sincronización
                </CardTitle>
                <CardDescription>
                  Ejecuta sincronizaciones manuales y configura opciones avanzadas
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                
                {/* Demo Integration */}
                <div className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <Database className="h-8 w-8 text-blue-500" />
                      <div>
                        <h3 className="font-medium">{mockIntegration.connectionName}</h3>
                        <p className="text-sm text-gray-600">
                          {mockIntegration.systemName} • {mockIntegration.integrationType}
                        </p>
                      </div>
                    </div>
                    <Badge className="bg-green-100 text-green-800">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Conectado
                    </Badge>
                  </div>
                  
                  <ManualSyncButton
                    integration={mockIntegration}
                    onSyncComplete={handleSyncComplete}
                    showDetails={true}
                  />
                </div>

                {/* Sync Features */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card>
                    <CardContent className="p-4">
                      <h4 className="font-medium mb-2">Sincronización Programada</h4>
                      <p className="text-sm text-gray-600 mb-3">
                        Las sincronizaciones se ejecutan automáticamente cada 6 horas
                      </p>
                      <div className="flex items-center gap-2 text-sm">
                        <Clock className="h-4 w-4 text-gray-500" />
                        <span>Próxima ejecución: En 4 horas</span>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-4">
                      <h4 className="font-medium mb-2">Resolución de Conflictos</h4>
                      <p className="text-sm text-gray-600 mb-3">
                        Los conflictos se resuelven automáticamente usando el timestamp más reciente
                      </p>
                      <div className="flex items-center gap-2 text-sm">
                        <Settings className="h-4 w-4 text-gray-500" />
                        <span>Configuración: Automática</span>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Logs Tab */}
        <TabsContent value="logs" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Logs y Auditoría
              </CardTitle>
              <CardDescription>
                Historial completo de todas las operaciones de integración
              </CardDescription>
            </CardHeader>
            <CardContent>
              <IntegrationLogs
                organizationId="org_demo_123"
                providerId="prov_demo_456"
                maxHeight="500px"
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Technical Implementation Notes */}
      <Card className="border-orange-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-orange-800">
            <Info className="h-5 w-5" />
            Notas de Implementación Técnica
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-2 text-orange-700">
          <p><strong>Seguridad:</strong> Credenciales encriptadas con AES-256, verificación de webhooks con HMAC</p>
          <p><strong>Escalabilidad:</strong> Cola de trabajos con Redis, procesamiento asíncrono, reintentos automáticos</p>
          <p><strong>Monitoreo:</strong> Logs completos, métricas de rendimiento, alertas automáticas</p>
          <p><strong>Compatibilidad:</strong> Adaptadores modulares para múltiples sistemas ERP/CRM</p>
          <p><strong>Datos:</strong> Transformación automática de formatos, mapeo de campos, validación de datos</p>
        </CardContent>
      </Card>
    </div>
  );
}
