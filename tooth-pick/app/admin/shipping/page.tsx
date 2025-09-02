import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { 
  Truck, 
  Plus, 
  Edit, 
  Package, 
  AlertCircle,
  ExternalLink,
  Search,
  Filter
} from 'lucide-react';

interface ShippingOption {
  _id: string;
  name: string;
  type: 'standard' | 'express' | 'overnight';
  basePrice: number;
  weightMultiplier: number;
  coverageZones: string[];
  estimatedDays: string;
  logo?: string;
  trackingUrlTemplate?: string;
  isActive: boolean;
}

interface Order {
  _id: string;
  orderNumber: string;
  status: string;
  shippingMethod: 'pickup' | 'delivery';
  shippingProvider?: string;
  trackingNumber?: string;
  buyerId: { name: string; email: string };
  sellerId: { name: string; email: string };
  total: number;
  createdAt: string;
  estimatedDelivery?: string;
}

export default function ShippingAdminPage() {
  const [shippingOptions, setShippingOptions] = useState<ShippingOption[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [updateModalOpen, setUpdateModalOpen] = useState(false);
  const [newShippingModalOpen, setNewShippingModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Estados para formularios
  const [newShippingForm, setNewShippingForm] = useState({
    name: '',
    type: 'standard' as 'standard' | 'express' | 'overnight',
    basePrice: '',
    weightMultiplier: '1',
    coverageZones: '',
    estimatedDays: '',
    logo: '',
    trackingUrlTemplate: ''
  });

  const [updateForm, setUpdateForm] = useState({
    shippingProvider: '',
    trackingNumber: '',
    status: '',
    estimatedDelivery: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch shipping options
      const shippingResponse = await fetch('/api/shipping-options');
      if (shippingResponse.ok) {
        const shippingData = await shippingResponse.json();
        setShippingOptions(shippingData.options || []);
      }

      // Fetch orders with shipping info
      const ordersResponse = await fetch('/api/admin/orders?include=shipping');
      if (ordersResponse.ok) {
        const ordersData = await ordersResponse.json();
        setOrders(ordersData.orders || []);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateShippingOption = async () => {
    try {
      const response = await fetch('/api/shipping-options', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newShippingForm,
          basePrice: parseFloat(newShippingForm.basePrice),
          weightMultiplier: parseFloat(newShippingForm.weightMultiplier),
          coverageZones: newShippingForm.coverageZones.split(',').map(zone => zone.trim())
        })
      });

      if (response.ok) {
        setNewShippingModalOpen(false);
        setNewShippingForm({
          name: '',
          type: 'standard',
          basePrice: '',
          weightMultiplier: '1',
          coverageZones: '',
          estimatedDays: '',
          logo: '',
          trackingUrlTemplate: ''
        });
        fetchData();
      }
    } catch (error) {
      console.error('Error creating shipping option:', error);
    }
  };

  const handleUpdateOrder = async () => {
    if (!selectedOrder) return;

    try {
      const response = await fetch(`/api/orders/${selectedOrder._id}/shipping`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateForm)
      });

      if (response.ok) {
        setUpdateModalOpen(false);
        setSelectedOrder(null);
        setUpdateForm({
          shippingProvider: '',
          trackingNumber: '',
          status: '',
          estimatedDelivery: ''
        });
        fetchData();
      }
    } catch (error) {
      console.error('Error updating order:', error);
    }
  };

  const openUpdateModal = (order: Order) => {
    setSelectedOrder(order);
    setUpdateForm({
      shippingProvider: order.shippingProvider || '',
      trackingNumber: order.trackingNumber || '',
      status: order.status,
      estimatedDelivery: order.estimatedDelivery ? 
        new Date(order.estimatedDelivery).toISOString().split('T')[0] : ''
    });
    setUpdateModalOpen(true);
  };

  const filteredOrders = orders.filter(order => {
    const matchesSearch = order.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         order.buyerId.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         order.sellerId.name.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

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

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(price);
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Administración de Envíos</h1>
        <Dialog open={newShippingModalOpen} onOpenChange={setNewShippingModalOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Nuevo Proveedor
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Agregar Proveedor de Envío</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Nombre del proveedor</Label>
                <Input
                  id="name"
                  value={newShippingForm.name}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                    setNewShippingForm({...newShippingForm, name: e.target.value})
                  }
                  placeholder="Ej: DHL"
                />
              </div>
              
              <div>
                <Label htmlFor="type">Tipo de servicio</Label>
                <Select 
                  value={newShippingForm.type} 
                  onValueChange={(value: 'standard' | 'express' | 'overnight') => 
                    setNewShippingForm({...newShippingForm, type: value})
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="standard">Estándar</SelectItem>
                    <SelectItem value="express">Exprés</SelectItem>
                    <SelectItem value="overnight">Día siguiente</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="basePrice">Precio base</Label>
                  <Input
                    id="basePrice"
                    type="number"
                    value={newShippingForm.basePrice}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                      setNewShippingForm({...newShippingForm, basePrice: e.target.value})
                    }
                    placeholder="100"
                  />
                </div>
                
                <div>
                  <Label htmlFor="weightMultiplier">Multiplicador peso</Label>
                  <Input
                    id="weightMultiplier"
                    type="number"
                    step="0.1"
                    value={newShippingForm.weightMultiplier}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                      setNewShippingForm({...newShippingForm, weightMultiplier: e.target.value})
                    }
                    placeholder="1.0"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="estimatedDays">Días estimados</Label>
                <Input
                  id="estimatedDays"
                  value={newShippingForm.estimatedDays}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                    setNewShippingForm({...newShippingForm, estimatedDays: e.target.value})
                  }
                  placeholder="2-3 días hábiles"
                />
              </div>

              <div>
                <Label htmlFor="coverageZones">Zonas de cobertura (separadas por comas)</Label>
                <Textarea
                  id="coverageZones"
                  value={newShippingForm.coverageZones}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => 
                    setNewShippingForm({...newShippingForm, coverageZones: e.target.value})
                  }
                  placeholder="01000-05999, 10000-14999, 50000-59999"
                />
              </div>

              <div>
                <Label htmlFor="trackingUrlTemplate">URL de tracking (opcional)</Label>
                <Input
                  id="trackingUrlTemplate"
                  value={newShippingForm.trackingUrlTemplate}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                    setNewShippingForm({...newShippingForm, trackingUrlTemplate: e.target.value})
                  }
                  placeholder="https://example.com/track?number={trackingNumber}"
                />
              </div>

              <Button onClick={handleCreateShippingOption} className="w-full">
                Crear Proveedor
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Proveedores de envío */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Truck className="h-5 w-5" />
            Proveedores de Envío
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {shippingOptions.map((option) => (
              <Card key={option._id} className="border">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-medium">{option.name}</h3>
                    <Badge variant={option.isActive ? "default" : "secondary"}>
                      {option.isActive ? "Activo" : "Inactivo"}
                    </Badge>
                  </div>
                  <div className="space-y-1 text-sm text-gray-600">
                    <p>Tipo: {option.type}</p>
                    <p>Precio base: {formatPrice(option.basePrice)}</p>
                    <p>Tiempo: {option.estimatedDays}</p>
                    <p>Zonas: {option.coverageZones.length} configuradas</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Órdenes con envío */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Órdenes y Envíos
          </CardTitle>
          <div className="flex gap-4 mt-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Buscar por número de orden, comprador o vendedor..."
                  value={searchTerm}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los estados</SelectItem>
                <SelectItem value="pending">Pendiente</SelectItem>
                <SelectItem value="confirmed">Confirmado</SelectItem>
                <SelectItem value="processing">Procesando</SelectItem>
                <SelectItem value="shipped">Enviado</SelectItem>
                <SelectItem value="delivered">Entregado</SelectItem>
                <SelectItem value="cancelled">Cancelado</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Orden</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Método</TableHead>
                  <TableHead>Proveedor</TableHead>
                  <TableHead>Tracking</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOrders.map((order) => (
                  <TableRow key={order._id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">#{order.orderNumber}</div>
                        <div className="text-sm text-gray-500">{order.buyerId.name}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(order.status)}>
                        {order.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="capitalize">
                      {order.shippingMethod === 'pickup' ? 'Pickup' : 'Delivery'}
                    </TableCell>
                    <TableCell>{order.shippingProvider || '-'}</TableCell>
                    <TableCell>
                      {order.trackingNumber ? (
                        <code className="text-xs">{order.trackingNumber}</code>
                      ) : (
                        '-'
                      )}
                    </TableCell>
                    <TableCell>{formatPrice(order.total)}</TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openUpdateModal(order)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Modal de actualización */}
      <Dialog open={updateModalOpen} onOpenChange={setUpdateModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Actualizar Envío - #{selectedOrder?.orderNumber}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="shippingProvider">Proveedor de envío</Label>
              <Select 
                value={updateForm.shippingProvider} 
                onValueChange={(value) => setUpdateForm({...updateForm, shippingProvider: value})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar proveedor" />
                </SelectTrigger>
                <SelectContent>
                  {shippingOptions.map((option) => (
                    <SelectItem key={option._id} value={option.name}>
                      {option.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="trackingNumber">Número de seguimiento</Label>
              <Input
                id="trackingNumber"
                value={updateForm.trackingNumber}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                  setUpdateForm({...updateForm, trackingNumber: e.target.value})
                }
                placeholder="ABC123456789"
              />
            </div>

            <div>
              <Label htmlFor="status">Estado</Label>
              <Select 
                value={updateForm.status} 
                onValueChange={(value) => setUpdateForm({...updateForm, status: value})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pendiente</SelectItem>
                  <SelectItem value="confirmed">Confirmado</SelectItem>
                  <SelectItem value="processing">Procesando</SelectItem>
                  <SelectItem value="shipped">Enviado</SelectItem>
                  <SelectItem value="delivered">Entregado</SelectItem>
                  <SelectItem value="cancelled">Cancelado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="estimatedDelivery">Fecha estimada de entrega</Label>
              <Input
                id="estimatedDelivery"
                type="date"
                value={updateForm.estimatedDelivery}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                  setUpdateForm({...updateForm, estimatedDelivery: e.target.value})
                }
              />
            </div>

            <Button onClick={handleUpdateOrder} className="w-full">
              Actualizar Envío
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
