'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { redirect } from 'next/navigation';
import Link from 'next/link';

interface User {
  _id: string;
  name: string;
  email: string;
  role: 'admin' | 'provider' | 'distributor' | 'client';
  isActive?: boolean;
  createdAt: string;
  updatedAt: string;
  stats: {
    totalOrders: number;
    totalSpent: number;
    totalEarned: number;
  };
}

export default function AdminUsersPage() {
  const { data: session, status } = useSession();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    role: 'all',
    search: ''
  });

  // Verificar acceso de admin
  if (status === 'loading') {
    return <div className="min-h-screen flex items-center justify-center">
      <div className="text-lg">Cargando...</div>
    </div>;
  }

  if (!session || session.user.role !== 'admin') {
    redirect('/login');
  }

  useEffect(() => {
    fetchUsers();
  }, [filters]);

  const fetchUsers = async () => {
    try {
      const params = new URLSearchParams();
      if (filters.role !== 'all') params.set('role', filters.role);
      if (filters.search) params.set('search', filters.search);

      const response = await fetch(`/api/admin/users?${params}`);
      if (response.ok) {
        const data = await response.json();
        setUsers(data);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateUser = async (userId: string, updates: Partial<User>) => {
    setUpdating(userId);
    try {
      const response = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId, updates }),
      });

      if (response.ok) {
        await fetchUsers(); // Recargar la lista
      }
    } catch (error) {
      console.error('Error updating user:', error);
    } finally {
      setUpdating(null);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-CL');
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-red-100 text-red-800';
      case 'provider': return 'bg-blue-100 text-blue-800';
      case 'distributor': return 'bg-green-100 text-green-800';
      case 'client': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'admin': return 'Administrador';
      case 'provider': return 'Proveedor';
      case 'distributor': return 'Distribuidor';
      case 'client': return 'Cliente';
      default: return role;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded mb-4 w-1/3"></div>
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-16 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Gestión de Usuarios</h1>
              <p className="text-gray-600">Administrar roles y permisos de usuarios</p>
            </div>
            <Link 
              href="/admin/dashboard"
              className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg transition-colors"
            >
              ← Volver al Dashboard
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6">
        {/* Filters */}
        <div className="bg-white p-6 rounded-lg shadow mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Filtrar por Rol
              </label>
              <select
                value={filters.role}
                onChange={(e) => setFilters({ ...filters, role: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">Todos los roles</option>
                <option value="admin">Administradores</option>
                <option value="provider">Proveedores</option>
                <option value="distributor">Distribuidores</option>
                <option value="client">Clientes</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Buscar Usuario
              </label>
              <input
                type="text"
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                placeholder="Buscar por nombre o email..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Users Table */}
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">
              Usuarios ({users.length})
            </h3>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                <tr>
                  <th className="px-6 py-3">Usuario</th>
                  <th className="px-6 py-3">Rol</th>
                  <th className="px-6 py-3">Estado</th>
                  <th className="px-6 py-3">Estadísticas</th>
                  <th className="px-6 py-3">Registro</th>
                  <th className="px-6 py-3">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user._id} className="bg-white border-b hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div>
                        <div className="font-medium text-gray-900">{user.name}</div>
                        <div className="text-gray-500">{user.email}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getRoleBadgeColor(user.role)}`}>
                        {getRoleLabel(user.role)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-2">
                        <div className={`w-2 h-2 rounded-full ${user.isActive !== false ? 'bg-green-400' : 'bg-red-400'}`}></div>
                        <span className="text-sm">
                          {user.isActive !== false ? 'Activo' : 'Inactivo'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm">
                        <div>{user.stats.totalOrders} órdenes</div>
                        {user.role === 'distributor' && (
                          <div className="text-gray-500">
                            Gastado: {formatCurrency(user.stats.totalSpent)}
                          </div>
                        )}
                        {user.role === 'provider' && (
                          <div className="text-gray-500">
                            Ganado: {formatCurrency(user.stats.totalEarned)}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-500">
                      {formatDate(user.createdAt)}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex space-x-2">
                        {/* Toggle Role (solo si no es admin) */}
                        {user.role !== 'admin' && (
                          <select
                            value={user.role}
                            onChange={(e) => updateUser(user._id, { role: e.target.value as any })}
                            disabled={updating === user._id}
                            className="text-xs px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                          >
                            <option value="provider">Proveedor</option>
                            <option value="distributor">Distribuidor</option>
                            <option value="client">Cliente</option>
                          </select>
                        )}
                        
                        {/* Toggle Active Status */}
                        <button
                          onClick={() => updateUser(user._id, { isActive: user.isActive === false })}
                          disabled={updating === user._id || user.role === 'admin'}
                          className={`text-xs px-2 py-1 rounded transition-colors ${
                            user.isActive !== false
                              ? 'bg-red-100 text-red-700 hover:bg-red-200'
                              : 'bg-green-100 text-green-700 hover:bg-green-200'
                          } ${user.role === 'admin' ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                          {updating === user._id ? '...' : user.isActive !== false ? 'Desactivar' : 'Activar'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {users.length === 0 && (
            <div className="px-6 py-8 text-center text-gray-500">
              No se encontraron usuarios con los filtros aplicados.
            </div>
          )}
        </div>

        {/* Summary Stats */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-lg shadow">
            <h4 className="text-sm font-medium text-gray-600">Total Usuarios</h4>
            <p className="text-2xl font-bold text-gray-900">{users.length}</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <h4 className="text-sm font-medium text-gray-600">Proveedores</h4>
            <p className="text-2xl font-bold text-blue-600">
              {users.filter(u => u.role === 'provider').length}
            </p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <h4 className="text-sm font-medium text-gray-600">Distribuidores</h4>
            <p className="text-2xl font-bold text-green-600">
              {users.filter(u => u.role === 'distributor').length}
            </p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <h4 className="text-sm font-medium text-gray-600">Usuarios Activos</h4>
            <p className="text-2xl font-bold text-purple-600">
              {users.filter(u => u.isActive !== false).length}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
