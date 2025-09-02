'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  Activity, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Database, 
  RefreshCw, 
  Settings,
  Wifi,
  WifiOff,
  XCircle
} from 'lucide-react';

interface IntegrationStatus {
  id: string;
  connectionName: string;
  systemName: string;
  integrationType: 'ERP' | 'CRM';
  isConnected: boolean;
  lastSyncAt?: string;
  nextSyncAt?: string;
  enabledEntities: {
    products: boolean;
    orders: boolean;
    inventory: boolean;
    quotes: boolean;
    customers: boolean;
  };
  apiCallsToday: number;
  apiCallsLimit: number;
}

interface StatusOverview {
  totalConnections: number;
  connectedSystems: number;
  disconnectedSystems: number;
  healthScore: number;
  systemTypes: Record<string, number>;
}

interface IntegrationStatusCardProps {
  organizationId?: string;
  providerId?: string;
  onRefresh?: () => void;
}

const SYSTEM_COLORS = {
  'SAP': 'bg-blue-100 text-blue-800',
  'ODOO': 'bg-purple-100 text-purple-800',
  'ORACLE': 'bg-red-100 text-red-800',
  'SALESFORCE': 'bg-blue-100 text-blue-800',
  'HUBSPOT': 'bg-orange-100 text-orange-800',
  'ZOHO': 'bg-green-100 text-green-800',
  'PIPEDRIVE': 'bg-pink-100 text-pink-800'
};

const SYSTEM_ICONS = {
  'ERP': Database,
  'CRM': Activity
};

export function IntegrationStatusCard({ organizationId, providerId, onRefresh }: IntegrationStatusCardProps) {
  const [overview, setOverview] = useState<StatusOverview | null>(null);
  const [integrations, setIntegrations] = useState<IntegrationStatus[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  useEffect(() => {
    fetchStatus();
  }, [organizationId, providerId]);

  const fetchStatus = async () => {
    try {
      setIsLoading(true);
      
      const params = new URLSearchParams();
      if (organizationId) params.append('organizationId', organizationId);
      if (providerId) params.append('providerId', providerId);
      
      const response = await fetch(`/api/integrations/status?${params}`);
      if (!response.ok) {
        throw new Error('Error cargando estado de integraciones');
      }
      
      const data = await response.json();
      setOverview(data.status.overview);
      setIntegrations(data.status.integrations);
      setLastRefresh(new Date());
      
      if (onRefresh) {
        onRefresh();
      }
      
    } catch (error) {
      console.error('Error cargando estado:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getHealthColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getHealthIcon = (score: number) => {
    if (score >= 80) return CheckCircle;
    if (score >= 60) return AlertTriangle;
    return XCircle;
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

  const formatNextSync = (nextSync?: string) => {
    if (!nextSync) return 'No programada';
    
    const diff = new Date(nextSync).getTime() - Date.now();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    
    if (diff < 0) return 'Atrasada';
    if (hours < 1) return 'En breve';
    if (hours < 24) return `En ${hours} hora${hours > 1 ? 's' : ''}`;
    
    const days = Math.floor(hours / 24);
    return `En ${days} día${days > 1 ? 's' : ''}`;
  };

  const getEnabledEntitiesCount = (entities: IntegrationStatus['enabledEntities']) => {
    return Object.values(entities).filter(Boolean).length;
  };

  const getApiUsagePercentage = (used: number, limit: number) => {
    return Math.round((used / limit) * 100);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        {/* Overview Cards Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="animate-pulse space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-8 bg-gray-200 rounded w-1/2"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        
        {/* Integrations List Skeleton */}
        <Card>
          <CardContent className="p-6">
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="animate-pulse flex items-center space-x-4">
                  <div className="rounded-full bg-gray-200 h-10 w-10"></div>
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!overview) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <p className="text-gray-500">No se pudieron cargar los datos de integraciones</p>
          <Button onClick={fetchStatus} variant="outline" className="mt-4">
            <RefreshCw className="h-4 w-4 mr-2" />
            Reintentar
          </Button>
        </CardContent>
      </Card>
    );
  }

  const HealthIcon = getHealthIcon(overview.healthScore);

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Integraciones</p>
                <p className="text-2xl font-bold">{overview.totalConnections}</p>
              </div>
              <Database className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Sistemas Conectados</p>
                <p className="text-2xl font-bold text-green-600">{overview.connectedSystems}</p>
              </div>
              <Wifi className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Desconectados</p>
                <p className="text-2xl font-bold text-red-600">{overview.disconnectedSystems}</p>
              </div>
              <WifiOff className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Health Score</p>
                <p className={`text-2xl font-bold ${getHealthColor(overview.healthScore)}`}>
                  {overview.healthScore}%
                </p>
              </div>
              <HealthIcon className={`h-8 w-8 ${getHealthColor(overview.healthScore)}`} />
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Integrations List */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Integraciones Activas
          </CardTitle>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">
              Actualizado: {lastRefresh.toLocaleTimeString()}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchStatus}
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {integrations.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Database className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No hay integraciones configuradas</p>
              <p className="text-sm">Conecta tu primer sistema ERP o CRM</p>
            </div>
          ) : (
            <div className="space-y-4">
              {integrations.map((integration) => {
                const TypeIcon = SYSTEM_ICONS[integration.integrationType];
                const apiUsage = getApiUsagePercentage(integration.apiCallsToday, integration.apiCallsLimit);
                
                return (
                  <div
                    key={integration.id}
                    className="flex items-center space-x-4 p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    {/* System Icon & Status */}
                    <div className="relative">
                      <div className={`p-2 rounded-full ${integration.isConnected ? 'bg-green-100' : 'bg-red-100'}`}>
                        <TypeIcon className={`h-6 w-6 ${integration.isConnected ? 'text-green-600' : 'text-red-600'}`} />
                      </div>
                      <div className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-white ${
                        integration.isConnected ? 'bg-green-500' : 'bg-red-500'
                      }`}></div>
                    </div>
                    
                    {/* Integration Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium text-gray-900 truncate">
                          {integration.connectionName}
                        </h4>
                        <Badge className={SYSTEM_COLORS[integration.systemName as keyof typeof SYSTEM_COLORS] || 'bg-gray-100 text-gray-800'}>
                          {integration.systemName}
                        </Badge>
                        <Badge variant="outline">
                          {integration.integrationType}
                        </Badge>
                      </div>
                      
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          <span>Última sync: {formatLastSync(integration.lastSyncAt)}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <RefreshCw className="h-3 w-3" />
                          <span>Próxima: {formatNextSync(integration.nextSyncAt)}</span>
                        </div>
                        <div>
                          <span>{getEnabledEntitiesCount(integration.enabledEntities)} entidades habilitadas</span>
                        </div>
                      </div>
                    </div>
                    
                    {/* API Usage */}
                    <div className="text-right min-w-0 w-24">
                      <p className="text-sm font-medium">API Calls</p>
                      <p className="text-xs text-gray-500">
                        {integration.apiCallsToday} / {integration.apiCallsLimit}
                      </p>
                      <Progress 
                        value={apiUsage} 
                        className="mt-1 h-2"
                      />
                    </div>
                    
                    {/* Status Indicator */}
                    <div className="text-right">
                      {integration.isConnected ? (
                        <div className="flex items-center text-green-600">
                          <CheckCircle className="h-4 w-4 mr-1" />
                          <span className="text-sm font-medium">Conectado</span>
                        </div>
                      ) : (
                        <div className="flex items-center text-red-600">
                          <XCircle className="h-4 w-4 mr-1" />
                          <span className="text-sm font-medium">Desconectado</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default IntegrationStatusCard;
