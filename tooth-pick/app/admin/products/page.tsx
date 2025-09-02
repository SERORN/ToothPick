'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';

interface Product {
  _id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  stock: number;
  isActive: boolean;
  images: string[];
  provider: {
    _id: string;
    name: string;
    email: string;
  };
  createdAt: string;
  updatedAt: string;
  stats: {
    totalSold: number;
    totalRevenue: number;
  };
}

export default function AdminProductsPage() {
  const { data: session, status } = useSession();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    status: 'all',
    category: 'all',
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
    fetchProducts();
  }, [filters]);

  const fetchProducts = async () => {
    try {
      const params = new URLSearchParams();
      if (filters.status !== 'all') params.set('status', filters.status);
      if (filters.category !== 'all') params.set('category', filters.category);
      if (filters.search) params.set('search', filters.search);

      const response = await fetch(`/api/admin/products?${params}`);
      if (response.ok) {
        const data = await response.json();
        setProducts(data);
      }
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateProduct = async (productId: string, updates: Partial<Product>) => {
    setUpdating(productId);
    try {
      const response = await fetch('/api/admin/products', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ productId, updates }),
      });

      if (response.ok) {
        await fetchProducts(); // Recargar la lista
      }
    } catch (error) {
      console.error('Error updating product:', error);
    } finally {
      setUpdating(null);
    }
  };

  const deleteProduct = async (productId: string) => {
    if (!confirm('¿Estás seguro de que quieres desactivar este producto?')) {
      return;
    }

    setUpdating(productId);
    try {
      const response = await fetch('/api/admin/products', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ productId }),
      });

      if (response.ok) {
        await fetchProducts(); // Recargar la lista
      }
    } catch (error) {
      console.error('Error deleting product:', error);
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

  const getCategoryBadgeColor = (category: string) => {
    switch (category.toLowerCase()) {
      case 'equipos': return 'bg-blue-100 text-blue-800';
      case 'materiales': return 'bg-green-100 text-green-800';
      case 'instrumental': return 'bg-purple-100 text-purple-800';
      case 'consumibles': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const categories = ['equipos', 'materiales', 'instrumental', 'consumibles'];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded mb-4 w-1/3"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-64 bg-gray-200 rounded"></div>
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
              <h1 className="text-2xl font-bold text-gray-900">Gestión de Productos</h1>
              <p className="text-gray-600">Moderar y controlar productos de la plataforma</p>
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Estado
              </label>
              <select
                value={filters.status}
                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">Todos</option>
                <option value="active">Activos</option>
                <option value="inactive">Inactivos</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Categoría
              </label>
              <select
                value={filters.category}
                onChange={(e) => setFilters({ ...filters, category: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">Todas las categorías</option>
                {categories.map(category => (
                  <option key={category} value={category}>
                    {category.charAt(0).toUpperCase() + category.slice(1)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Buscar Producto
              </label>
              <input
                type="text"
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                placeholder="Buscar por nombre..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Products Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
          {products.map((product) => (
            <div key={product._id} className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow">
              {/* Product Image */}
              <div className="relative h-48 w-full">
                {product.images && product.images.length > 0 ? (
                  <Image
                    src={product.images[0]}
                    alt={product.name}
                    fill
                    className="object-cover rounded-t-lg"
                  />
                ) : (
                  <div className="w-full h-full bg-gray-200 rounded-t-lg flex items-center justify-center">
                    <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                )}
                
                {/* Status Badge */}
                <div className="absolute top-2 right-2">
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                    product.isActive 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {product.isActive ? 'Activo' : 'Inactivo'}
                  </span>
                </div>
              </div>

              {/* Product Info */}
              <div className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="text-lg font-semibold text-gray-900 line-clamp-2">
                    {product.name}
                  </h3>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${getCategoryBadgeColor(product.category)}`}>
                    {product.category}
                  </span>
                </div>

                <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                  {product.description}
                </p>

                <div className="flex justify-between items-center mb-3">
                  <span className="text-xl font-bold text-blue-600">
                    {formatCurrency(product.price)}
                  </span>
                  <span className="text-sm text-gray-500">
                    Stock: {product.stock}
                  </span>
                </div>

                {/* Provider Info */}
                <div className="mb-3 p-2 bg-gray-50 rounded">
                  <p className="text-sm text-gray-600">
                    <span className="font-medium">Proveedor:</span> {product.provider.name}
                  </p>
                  <p className="text-xs text-gray-500">{product.provider.email}</p>
                </div>

                {/* Stats */}
                <div className="mb-4 grid grid-cols-2 gap-2 text-sm">
                  <div className="text-center p-2 bg-blue-50 rounded">
                    <p className="font-medium text-blue-600">{product.stats.totalSold}</p>
                    <p className="text-gray-600 text-xs">Vendidos</p>
                  </div>
                  <div className="text-center p-2 bg-green-50 rounded">
                    <p className="font-medium text-green-600">{formatCurrency(product.stats.totalRevenue)}</p>
                    <p className="text-gray-600 text-xs">Ingresos</p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex space-x-2">
                  <button
                    onClick={() => updateProduct(product._id, { isActive: !product.isActive })}
                    disabled={updating === product._id}
                    className={`flex-1 px-3 py-2 text-sm font-medium rounded transition-colors ${
                      product.isActive
                        ? 'bg-red-100 text-red-700 hover:bg-red-200'
                        : 'bg-green-100 text-green-700 hover:bg-green-200'
                    }`}
                  >
                    {updating === product._id ? '...' : product.isActive ? 'Desactivar' : 'Activar'}
                  </button>
                  
                  <button
                    onClick={() => deleteProduct(product._id)}
                    disabled={updating === product._id}
                    className="px-3 py-2 text-sm font-medium text-red-700 bg-red-50 rounded hover:bg-red-100 transition-colors"
                  >
                    Eliminar
                  </button>
                </div>

                <div className="mt-2 text-xs text-gray-500">
                  Creado: {formatDate(product.createdAt)}
                </div>
              </div>
            </div>
          ))}
        </div>

        {products.length === 0 && (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No se encontraron productos</h3>
            <p className="text-gray-500">No hay productos que coincidan con los filtros aplicados.</p>
          </div>
        )}

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-lg shadow">
            <h4 className="text-sm font-medium text-gray-600">Total Productos</h4>
            <p className="text-2xl font-bold text-gray-900">{products.length}</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <h4 className="text-sm font-medium text-gray-600">Productos Activos</h4>
            <p className="text-2xl font-bold text-green-600">
              {products.filter(p => p.isActive).length}
            </p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <h4 className="text-sm font-medium text-gray-600">Total Vendidos</h4>
            <p className="text-2xl font-bold text-blue-600">
              {products.reduce((sum, p) => sum + p.stats.totalSold, 0)}
            </p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <h4 className="text-sm font-medium text-gray-600">Ingresos Totales</h4>
            <p className="text-2xl font-bold text-purple-600">
              {formatCurrency(products.reduce((sum, p) => sum + p.stats.totalRevenue, 0))}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
