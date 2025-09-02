import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { 
  Package, 
  Truck, 
  CheckCircle, 
  Clock, 
  MapPin, 
  ExternalLink,
  AlertCircle,
  Phone,
  Calendar
} from 'lucide-react';

interface OrderTimeline {
  created: string;
  confirmed?: string;
  processing?: string;
  shipped?: string;
  delivered?: string;
  cancelled?: string;
}

interface ShippingInfo {
  orderId: string;
  orderNumber: string;
  status: string;
  shippingMethod: 'pickup' | 'delivery';
  shippingProvider?: string;
  shippingCost?: number;
  trackingNumber?: string;
  trackingUrl?: string;
  pickupLocation?: {
    name: string;
    address: string;
    city: string;
    state: string;
    postalCode: string;
    phone: string;
    hours: string;
  };
  estimatedDelivery?: string;
  actualDelivery?: string;
  timeline: OrderTimeline;
  buyer: {
    name: string;
    email: string;
  };
  seller: {
    name: string;
    email: string;
  };
}

interface OrderTrackingProps {
  orderId: string;
  className?: string;
}

export default function OrderTracking({ orderId, className }: OrderTrackingProps) {
  const [shippingInfo, setShippingInfo] = useState<ShippingInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchShippingInfo();
  }, [orderId]);

  const fetchShippingInfo = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/orders/${orderId}/shipping`);
      
      if (!response.ok) {
        throw new Error('Error al obtener información de envío');
      }

      const data = await response.json();
      setShippingInfo(data.shippingInfo);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'delivered':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'shipped':
        return <Truck className="h-5 w-5 text-blue-500" />;
      case 'processing':
        return <Package className="h-5 w-5 text-yellow-500" />;
      case 'cancelled':
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      default:
        return <Clock className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      'pending': 'Pendiente',
      'confirmed': 'Confirmado',
      'processing': 'Procesando',
      'shipped': 'Enviado',
      'delivered': 'Entregado',
      'cancelled': 'Cancelado'
    };
    return labels[status] || status;
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      'pending': 'bg-gray-100 text-gray-800',
      'confirmed': 'bg-blue-100 text-blue-800',
      'processing': 'bg-yellow-100 text-yellow-800',
      'shipped': 'bg-blue-100 text-blue-800',
      'delivered': 'bg-green-100 text-green-800',
      'cancelled': 'bg-red-100 text-red-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('es-MX', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(price);
  };

  const timelineSteps = [
    { key: 'created', label: 'Pedido creado', icon: Package },
    { key: 'confirmed', label: 'Confirmado', icon: CheckCircle },
    { key: 'processing', label: 'En procesamiento', icon: Clock },
    { key: 'shipped', label: 'Enviado', icon: Truck },
    { key: 'delivered', label: 'Entregado', icon: CheckCircle }
  ];

  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-2">Cargando información de envío...</span>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={className}>
        <CardContent className="text-center py-8">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <p className="text-red-600 mb-4">{error}</p>
          <Button onClick={fetchShippingInfo} variant="outline">
            Reintentar
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!shippingInfo) {
    return (
      <Card className={className}>
        <CardContent className="text-center py-8">
          <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">No se encontró información de envío</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Estado actual */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              {getStatusIcon(shippingInfo.status)}
              Pedido #{shippingInfo.orderNumber}
            </span>
            <Badge className={getStatusColor(shippingInfo.status)}>
              {getStatusLabel(shippingInfo.status)}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Información de envío */}
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-medium mb-2">Método de entrega</h4>
              <p className="text-sm text-gray-600 capitalize">
                {shippingInfo.shippingMethod === 'pickup' ? 'Recoger en tienda' : 'Envío a domicilio'}
              </p>
              {shippingInfo.shippingProvider && (
                <p className="text-sm text-gray-600">
                  Proveedor: {shippingInfo.shippingProvider}
                </p>
              )}
              {shippingInfo.shippingCost && (
                <p className="text-sm text-gray-600">
                  Costo: {formatPrice(shippingInfo.shippingCost)}
                </p>
              )}
            </div>

            {shippingInfo.estimatedDelivery && (
              <div>
                <h4 className="font-medium mb-2">Fecha estimada</h4>
                <p className="text-sm text-gray-600 flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  {formatDate(shippingInfo.estimatedDelivery)}
                </p>
              </div>
            )}
          </div>

          {/* Tracking */}
          {shippingInfo.trackingNumber && (
            <div className="space-y-2">
              <h4 className="font-medium">Número de seguimiento</h4>
              <div className="flex items-center gap-2">
                <code className="bg-gray-100 px-2 py-1 rounded text-sm">
                  {shippingInfo.trackingNumber}
                </code>
                {shippingInfo.trackingUrl && (
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => window.open(shippingInfo.trackingUrl, '_blank')}
                  >
                    <ExternalLink className="h-4 w-4 mr-1" />
                    Rastrear
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* Información de pickup */}
          {shippingInfo.shippingMethod === 'pickup' && shippingInfo.pickupLocation && (
            <div className="space-y-2">
              <h4 className="font-medium flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Ubicación de recogida
              </h4>
              <div className="bg-gray-50 p-3 rounded-lg space-y-1">
                <p className="font-medium">{shippingInfo.pickupLocation.name}</p>
                <p className="text-sm text-gray-600">
                  {shippingInfo.pickupLocation.address}, {shippingInfo.pickupLocation.city}, {shippingInfo.pickupLocation.state}
                </p>
                <p className="text-sm text-gray-600 flex items-center gap-1">
                  <Phone className="h-3 w-3" />
                  {shippingInfo.pickupLocation.phone}
                </p>
                <p className="text-sm text-gray-600">
                  Horario: {shippingInfo.pickupLocation.hours}
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Timeline */}
      <Card>
        <CardHeader>
          <CardTitle>Historial del pedido</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {timelineSteps.map((step, index) => {
              const timestamp = shippingInfo.timeline[step.key as keyof OrderTimeline];
              const isCompleted = !!timestamp;
              const isCurrent = !isCompleted && index > 0 && 
                timelineSteps.slice(0, index).every(s => shippingInfo.timeline[s.key as keyof OrderTimeline]);

              return (
                <div key={step.key} className="flex items-start gap-3">
                  <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                    isCompleted ? 'bg-green-100 text-green-600' :
                    isCurrent ? 'bg-blue-100 text-blue-600' :
                    'bg-gray-100 text-gray-400'
                  }`}>
                    <step.icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium ${
                      isCompleted ? 'text-green-900' :
                      isCurrent ? 'text-blue-900' :
                      'text-gray-500'
                    }`}>
                      {step.label}
                    </p>
                    {timestamp && (
                      <p className="text-xs text-gray-500 mt-1">
                        {formatDate(timestamp)}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}

            {shippingInfo.timeline.cancelled && (
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center bg-red-100 text-red-600">
                  <AlertCircle className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-red-900">Pedido cancelado</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {formatDate(shippingInfo.timeline.cancelled)}
                  </p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Información de contacto */}
      <Card>
        <CardHeader>
          <CardTitle>Información de contacto</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-medium mb-2">Comprador</h4>
              <p className="text-sm text-gray-600">{shippingInfo.buyer.name}</p>
              <p className="text-sm text-gray-600">{shippingInfo.buyer.email}</p>
            </div>
            <div>
              <h4 className="font-medium mb-2">Vendedor</h4>
              <p className="text-sm text-gray-600">{shippingInfo.seller.name}</p>
              <p className="text-sm text-gray-600">{shippingInfo.seller.email}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
