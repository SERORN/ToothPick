'use client'

import { useSession, signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import StripeIntegration from '@/components/StripeIntegration'

interface Product {
  _id: string;
  name: string;
  brand: string;
  category: string;
  description?: string;
  price: number;
  currency: string;
  stock: number;
  images: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function ProviderDashboard() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    }
    if (session && session.user.role !== 'provider') {
      router.push('/')
    }
  }, [session, status, router])

  useEffect(() => {
    if (session?.user.role === 'provider') {
      fetchProducts()
    }
  }, [session])

  const fetchProducts = async () => {
    try {
      const res = await fetch('/api/products')
      if (res.ok) {
        const data = await res.json()
        setProducts(data)
      }
    } catch (error) {
      console.error('Error fetching products:', error)
    } finally {
      setLoading(false)
    }
  }

  const toggleProductStatus = async (productId: string, currentStatus: boolean) => {
    try {
      const res = await fetch(`/api/products/${productId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !currentStatus }),
      })

      if (res.ok) {
        setProducts(products.map(p => 
          p._id === productId ? { ...p, isActive: !currentStatus } : p
        ))
        // Aquí podrías agregar una notificación de éxito
      } else {
        console.error('Error toggling product status')
      }
    } catch (error) {
      console.error('Error toggling product status:', error)
    }
  }

  const deleteProduct = async (productId: string) => {
    if (!confirm('¿Estás seguro de que quieres eliminar este producto?')) return
    
    try {
      const res = await fetch(`/api/products/${productId}`, {
        method: 'DELETE',
      })

      if (res.ok) {
        setProducts(products.filter(p => p._id !== productId))
        // Aquí podrías agregar una notificación de éxito
      } else {
        console.error('Error deleting product')
      }
    } catch (error) {
      console.error('Error deleting product:', error)
    }
  }

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-lg">Cargando panel del proveedor...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Panel del Proveedor</h1>
              <p className="text-sm text-gray-600">Gestión de productos y órdenes</p>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-700">
                📦 Proveedor: {session?.user.name}
              </span>
              <button
                onClick={() => signOut({ callbackUrl: '/login' })}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm transition"
              >
                Cerrar Sesión
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          
          {/* Stats Overview */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-green-600 text-white rounded-xl p-6">
              <h3 className="text-lg font-semibold">Productos Activos</h3>
              <p className="text-3xl font-bold">{products.filter(p => p.isActive).length}</p>
              <p className="text-green-200 text-sm">de {products.length} total</p>
            </div>
            <div className="bg-blue-600 text-white rounded-xl p-6">
              <h3 className="text-lg font-semibold">Órdenes Pendientes</h3>
              <p className="text-3xl font-bold">8</p>
              <p className="text-blue-200 text-sm">2 urgentes</p>
            </div>
            <div className="bg-purple-600 text-white rounded-xl p-6">
              <h3 className="text-lg font-semibold">Ventas del Mes</h3>
              <p className="text-3xl font-bold">$28,450</p>
              <p className="text-purple-200 text-sm">+12% vs anterior</p>
              <p className="text-purple-100 text-xs mt-1">💰 Recibes: 94.5% (5.5% comisión)</p>
            </div>
            <div className="bg-orange-600 text-white rounded-xl p-6">
              <h3 className="text-lg font-semibold">Stock Bajo</h3>
              <p className="text-3xl font-bold">{products.filter(p => p.stock < 10).length}</p>
              <p className="text-orange-200 text-sm">Requieren atención</p>
            </div>
          </div>

          {/* Stripe Integration Section */}
          <div className="mb-8">
            <StripeIntegration />
          </div>

          {/* Management Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            
            <div className="bg-white shadow-md rounded-xl p-6 hover:shadow-lg transition-shadow">
              <h2 className="text-xl font-semibold mb-2 text-gray-800">📋 Mis Productos</h2>
              <p className="text-gray-600 mb-4">Ver, editar y administrar tu catálogo completo.</p>
              <button className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm transition">
                Ver Catálogo
              </button>
            </div>

            <div className="bg-white shadow-md rounded-xl p-6 hover:shadow-lg transition-shadow">
              <h2 className="text-xl font-semibold mb-2 text-gray-800">➕ Agregar Producto</h2>
              <p className="text-gray-600 mb-4">Sube nuevos productos con stock y precio.</p>
              <button 
                onClick={() => router.push('/provider/dashboard/add-product')}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm transition"
              >
                Nuevo Producto
              </button>
            </div>

            <div className="bg-white shadow-md rounded-xl p-6 hover:shadow-lg transition-shadow">
              <h2 className="text-xl font-semibold mb-2 text-gray-800">📥 Órdenes Recibidas</h2>
              <p className="text-gray-600 mb-4">Revisa pedidos de distribuidores.</p>
              <div className="flex items-center justify-between">
                <button 
                  onClick={() => router.push('/provider/dashboard/orders')}
                  className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-sm transition"
                >
                  Ver Órdenes
                </button>
                <span className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded-full">8 pendientes</span>
              </div>
            </div>

            <div className="bg-white shadow-md rounded-xl p-6 hover:shadow-lg transition-shadow">
              <h2 className="text-xl font-semibold mb-2 text-gray-800">📦 Inventario</h2>
              <p className="text-gray-600 mb-4">Actualiza cantidades disponibles.</p>
              <div className="flex items-center justify-between">
                <button className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm transition">
                  Gestionar Stock
                </button>
                <span className="bg-orange-100 text-orange-800 text-xs px-2 py-1 rounded-full">{products.filter(p => p.stock < 10).length} bajo stock</span>
              </div>
            </div>

            <div className="bg-white shadow-md rounded-xl p-6 hover:shadow-lg transition-shadow">
              <h2 className="text-xl font-semibold mb-2 text-gray-800">🏦 Arrendamientos</h2>
              <p className="text-gray-600 mb-4">Consulta solicitudes de financiamiento.</p>
              <button className="bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded-lg text-sm transition">
                Ver Solicitudes
              </button>
            </div>

            <div className="bg-white shadow-md rounded-xl p-6 hover:shadow-lg transition-shadow">
              <h2 className="text-xl font-semibold mb-2 text-gray-800">👤 Mi Perfil</h2>
              <p className="text-gray-600 mb-4">Actualiza información de empresa y contacto.</p>
              <button className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg text-sm transition">
                Editar Perfil
              </button>
            </div>

          </div>

          {/* Products Table */}
          <div className="bg-white rounded-xl shadow-md p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-gray-800">Mis Productos</h2>
              <button
                onClick={() => router.push('/provider/dashboard/add-product')}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm transition"
              >
                + Agregar Producto
              </button>
            </div>

            {loading ? (
              <div className="text-center py-8">
                <div className="text-gray-500">Cargando productos...</div>
              </div>
            ) : products.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-gray-500 mb-4">No tienes productos registrados</div>
                <button
                  onClick={() => router.push('/provider/dashboard/add-product')}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition"
                >
                  Crear mi primer producto
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-4 font-medium text-gray-700">Producto</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-700">Marca</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-700">Categoría</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-700">Precio</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-700">Stock</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-700">Estado</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-700">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {products.map((product) => (
                      <tr key={product._id} className="hover:bg-gray-50">
                        <td className="py-3 px-4">
                          <div className="flex items-center">
                            {product.images[0] && (
                              <img
                                src={product.images[0]}
                                alt={product.name}
                                className="w-12 h-12 rounded-lg object-cover mr-3"
                                onError={(e) => {
                                  e.currentTarget.src = '/placeholder-product.png'
                                }}
                              />
                            )}
                            <div>
                              <div className="font-medium text-gray-900">{product.name}</div>
                              <div className="text-sm text-gray-500 truncate max-w-xs">
                                {product.description}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-900">{product.brand}</td>
                        <td className="py-3 px-4 text-sm text-gray-900">{product.category}</td>
                        <td className="py-3 px-4 text-sm font-semibold text-gray-900">
                          {product.currency} ${product.price.toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-900">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            product.stock < 10 
                              ? 'bg-red-100 text-red-800' 
                              : product.stock < 50 
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-green-100 text-green-800'
                          }`}>
                            {product.stock} unidades
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            product.isActive 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {product.isActive ? 'Activo' : 'Inactivo'}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex space-x-2">
                            <button
                              onClick={() => router.push(`/provider/dashboard/edit-product/${product._id}`)}
                              className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                            >
                              Editar
                            </button>
                            <button
                              onClick={() => toggleProductStatus(product._id, product.isActive)}
                              className={`text-sm font-medium ${
                                product.isActive 
                                  ? 'text-gray-600 hover:text-gray-700' 
                                  : 'text-green-600 hover:text-green-700'
                              }`}
                            >
                              {product.isActive ? 'Desactivar' : 'Activar'}
                            </button>
                            <button
                              onClick={() => deleteProduct(product._id)}
                              className="text-red-600 hover:text-red-700 text-sm font-medium"
                            >
                              Eliminar
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </div>
      </main>
    </div>
  )
}
