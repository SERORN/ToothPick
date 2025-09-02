'use client';

import React, { useState, useEffect } from 'react';
import { 
  ShoppingCart, 
  Clock, 
  CheckCircle, 
  XCircle, 
  Package, 
  User,
  MapPin,
  Phone,
  Mail,
  Calendar
} from 'lucide-react';

interface OrderItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  subtotal: number;
  isDentistService: boolean;
  serviceDuration?: number;
  appointmentRequired: boolean;
}

interface Customer {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  profilePicture?: string;
}

interface Order {
  _id: string;
  orderNumber: string;
  buyerId: Customer;
  items: OrderItem[];
  subtotal: number;
  platformFee: number;
  total: number;
  status: 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  paymentStatus: 'pending' | 'paid' | 'refunded';
  shippingMethod: 'pickup' | 'delivery';
  shipping?: {
    fullName: string;
    address: string;
    city: string;
    state: string;
    zipCode: string;
    phone: string;
    email: string;
  };
  notes?: string;
  providerNotes?: string;
  createdAt: string;
  confirmedAt?: string;
  deliveredAt?: string;
}

interface OrdersManagerProps {
  onOrderSelect?: (order: Order) => void;
}

const statusConfig = {
  pending: { 
    label: 'Pendiente', 
    color: 'bg-yellow-100 text-yellow-800',
    icon: Clock
  },
  confirmed: { 
    label: 'Confirmado', 
    color: 'bg-blue-100 text-blue-800',
    icon: CheckCircle
  },
  processing: { 
    label: 'Procesando', 
    color: 'bg-purple-100 text-purple-800',
    icon: Package
  },
  shipped: { 
    label: 'Enviado', 
    color: 'bg-indigo-100 text-indigo-800',
    icon: Package
  },
  delivered: { 
    label: 'Entregado', 
    color: 'bg-green-100 text-green-800',
    icon: CheckCircle
  },
  cancelled: { 
    label: 'Cancelado', 
    color: 'bg-red-100 text-red-800',
    icon: XCircle
  }
};

const OrderDetailModal: React.FC<{
  order: Order;
  isOpen: boolean;
  onClose: () => void;
  onUpdateStatus: (orderId: string, status: string, notes?: string) => Promise<void>;
}> = ({ order, isOpen, onClose, onUpdateStatus }) => {
  const [newStatus, setNewStatus] = useState(order.status);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  const handleUpdateStatus = async () => {
    if (newStatus === order.status) {
      onClose();
      return;
    }

    setLoading(true);
    try {
      await onUpdateStatus(order._id, newStatus, notes);
      onClose();
    } catch (error) {
      console.error('Error updating status:', error);
    } finally {
      setLoading(false);
    }
  };

  const getAvailableStatuses = () => {
    const transitions: { [key: string]: string[] } = {
      'pending': ['confirmed', 'cancelled'],
      'confirmed': ['processing', 'cancelled'],
      'processing': ['shipped', 'delivered', 'cancelled'],
      'shipped': ['delivered'],
      'delivered': [],
      'cancelled': []
    };

    return transitions[order.status] || [];
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                Orden #{order.orderNumber}
              </h2>
              <p className="text-gray-600 mt-1">
                Creada el {new Date(order.createdAt).toLocaleDateString()}
              </p>
            </div>
            <div className="flex items-center space-x-2">
              {React.createElement(statusConfig[order.status].icon, {
                className: "h-5 w-5"
              })}
              <span className={`inline-flex px-3 py-1 rounded-full text-sm font-medium ${statusConfig[order.status].color}`}>
                {statusConfig[order.status].label}
              </span>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Información del cliente */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
              <User className="h-5 w-5 mr-2" />
              Información del Cliente
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center space-x-3">
                {order.buyerId.profilePicture ? (
                  <img
                    src={order.buyerId.profilePicture}
                    alt={order.buyerId.name}
                    className="h-10 w-10 rounded-full object-cover"
                  />
                ) : (
                  <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                    <User className="h-6 w-6 text-gray-600" />
                  </div>
                )}
                <div>
                  <p className="font-medium text-gray-900">{order.buyerId.name}</p>
                  <p className="text-sm text-gray-600 flex items-center">
                    <Mail className="h-4 w-4 mr-1" />
                    {order.buyerId.email}
                  </p>
                </div>
              </div>
              {order.buyerId.phone && (
                <div className="flex items-center text-sm text-gray-600">
                  <Phone className="h-4 w-4 mr-2" />
                  {order.buyerId.phone}
                </div>
              )}
            </div>
          </div>

          {/* Productos */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
              <ShoppingCart className="h-5 w-5 mr-2" />
              Productos/Servicios
            </h3>
            <div className="space-y-3">
              {order.items.map((item, index) => (
                <div key={index} className="flex justify-between items-start p-4 border border-gray-200 rounded-lg">
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900">{item.name}</h4>
                    <div className="mt-1 space-y-1">
                      <p className="text-sm text-gray-600">
                        Cantidad: {item.quantity} × ${item.price.toLocaleString()}
                      </p>
                      {item.isDentistService && (
                        <div className="flex items-center text-sm text-blue-600">
                          <Clock className="h-4 w-4 mr-1" />
                          Duración: {item.serviceDuration} minutos
                        </div>
                      )}
                      {item.appointmentRequired && (
                        <div className="flex items-center text-sm text-orange-600">
                          <Calendar className="h-4 w-4 mr-1" />
                          Requiere cita
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-gray-900">
                      ${item.subtotal.toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Información de envío */}
          {order.shipping && (
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                <MapPin className="h-5 w-5 mr-2" />
                Información de Envío
              </h3>
              <div className="space-y-2 text-sm">
                <p><span className="font-medium">Nombre:</span> {order.shipping.fullName}</p>
                <p><span className="font-medium">Dirección:</span> {order.shipping.address}</p>
                <p><span className="font-medium">Ciudad:</span> {order.shipping.city}, {order.shipping.state}</p>
                <p><span className="font-medium">Código Postal:</span> {order.shipping.zipCode}</p>
                <p><span className="font-medium">Teléfono:</span> {order.shipping.phone}</p>
              </div>
            </div>
          )}

          {/* Resumen financiero */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Resumen Financiero</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span>${order.subtotal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span>Comisión de plataforma:</span>
                <span>${order.platformFee.toLocaleString()}</span>
              </div>
              <div className="flex justify-between font-medium text-lg border-t pt-2">
                <span>Total:</span>
                <span>${order.total.toLocaleString()}</span>
              </div>
              <div className="flex justify-between font-medium text-green-600">
                <span>Tus ingresos:</span>
                <span>${(order.subtotal - order.platformFee).toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Notas */}
          {order.notes && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Notas del Cliente</h3>
              <p className="text-gray-700 bg-gray-50 p-3 rounded-lg">{order.notes}</p>
            </div>
          )}

          {order.providerNotes && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Tus Notas</h3>
              <p className="text-gray-700 bg-blue-50 p-3 rounded-lg">{order.providerNotes}</p>
            </div>
          )}

          {/* Actualizar estado */}
          {getAvailableStatuses().length > 0 && (
            <div className="border-t pt-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Actualizar Estado</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nuevo Estado
                  </label>
                  <select
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value={order.status}>
                      {statusConfig[order.status].label} (actual)
                    </option>
                    {getAvailableStatuses().map(status => (
                      <option key={status} value={status}>
                        {statusConfig[status].label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Notas (opcional)
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Agregar notas sobre este cambio de estado..."
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end space-x-4 p-6 border-t">
          <button
            onClick={onClose}
            className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
            disabled={loading}
          >
            Cerrar
          </button>
          {getAvailableStatuses().length > 0 && newStatus !== order.status && (
            <button
              onClick={handleUpdateStatus}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              disabled={loading}
            >
              {loading ? 'Actualizando...' : 'Actualizar Estado'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

const DentistOrdersManager: React.FC<OrdersManagerProps> = ({ onOrderSelect }) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [filters, setFilters] = useState({
    status: '',
    page: 1
  });

  useEffect(() => {
    loadOrders();
  }, [filters]);

  const loadOrders = async () => {
    try {
      const params = new URLSearchParams();
      if (filters.status) params.append('status', filters.status);
      params.append('page', filters.page.toString());

      const response = await fetch(`/api/dentist/orders?${params}`);
      const data = await response.json();

      if (response.ok) {
        setOrders(data.orders);
      } else {
        console.error('Error loading orders:', data.error);
      }
    } catch (error) {
      console.error('Error loading orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateOrderStatus = async (orderId: string, status: string, notes?: string) => {
    try {
      const response = await fetch('/api/dentist/orders', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ orderId, status, notes })
      });

      const data = await response.json();

      if (response.ok) {
        await loadOrders();
        // Actualizar la orden seleccionada si está abierta
        if (selectedOrder && selectedOrder._id === orderId) {
          setSelectedOrder({ ...selectedOrder, status });
        }
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      console.error('Error updating order status:', error);
      alert(error instanceof Error ? error.message : 'Error actualizando estado');
    }
  };

  const getOrderSummary = (order: Order) => {
    const hasServices = order.items.some(item => item.isDentistService);
    const requiresAppointment = order.items.some(item => item.appointmentRequired);
    return { hasServices, requiresAppointment };
  };

  return (
    <div className="space-y-6">
      {/* Filtros */}
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center space-y-4 md:space-y-0">
          <div className="flex space-x-4">
            <select
              value={filters.status}
              onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value, page: 1 }))}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Todos los estados</option>
              <option value="pending">Pendientes</option>
              <option value="confirmed">Confirmados</option>
              <option value="processing">Procesando</option>
              <option value="shipped">Enviados</option>
              <option value="delivered">Entregados</option>
              <option value="cancelled">Cancelados</option>
            </select>
          </div>

          <div className="text-sm text-gray-600">
            Total de órdenes: {orders.length}
          </div>
        </div>
      </div>

      {/* Lista de órdenes */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loading ? (
          <div className="p-6 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Cargando órdenes...</p>
          </div>
        ) : orders.length === 0 ? (
          <div className="p-6 text-center">
            <ShoppingCart className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No hay órdenes para mostrar</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Orden
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Cliente
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Productos
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Estado
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Fecha
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {orders.map((order) => {
                  const { hasServices, requiresAppointment } = getOrderSummary(order);
                  const StatusIcon = statusConfig[order.status].icon;
                  
                  return (
                    <tr key={order._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            #{order.orderNumber}
                          </div>
                          <div className="text-sm text-gray-500">
                            {order.shippingMethod === 'pickup' ? 'Recolección' : 'Envío'}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          {order.buyerId.profilePicture ? (
                            <img
                              className="h-8 w-8 rounded-full object-cover"
                              src={order.buyerId.profilePicture}
                              alt={order.buyerId.name}
                            />
                          ) : (
                            <div className="h-8 w-8 rounded-full bg-gray-300 flex items-center justify-center">
                              <User className="h-5 w-5 text-gray-600" />
                            </div>
                          )}
                          <div className="ml-3">
                            <div className="text-sm font-medium text-gray-900">
                              {order.buyerId.name}
                            </div>
                            <div className="text-sm text-gray-500">
                              {order.buyerId.email}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">
                          {order.items.length} producto{order.items.length > 1 ? 's' : ''}
                        </div>
                        <div className="text-sm text-gray-500 space-x-2">
                          {hasServices && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800">
                              <Clock className="h-3 w-3 mr-1" />
                              Servicio
                            </span>
                          )}
                          {requiresAppointment && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-orange-100 text-orange-800">
                              <Calendar className="h-3 w-3 mr-1" />
                              Cita
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          ${order.total.toLocaleString()}
                        </div>
                        <div className="text-sm text-gray-500">
                          Ganancia: ${(order.subtotal - order.platformFee).toLocaleString()}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${statusConfig[order.status].color}`}>
                          <StatusIcon className="h-3 w-3 mr-1" />
                          {statusConfig[order.status].label}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(order.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => {
                            setSelectedOrder(order);
                            setShowDetailModal(true);
                            onOrderSelect?.(order);
                          }}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          Ver detalles
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal de detalles */}
      {selectedOrder && (
        <OrderDetailModal
          order={selectedOrder}
          isOpen={showDetailModal}
          onClose={() => {
            setShowDetailModal(false);
            setSelectedOrder(null);
          }}
          onUpdateStatus={handleUpdateOrderStatus}
        />
      )}
    </div>
  );
};

export default DentistOrdersManager;
