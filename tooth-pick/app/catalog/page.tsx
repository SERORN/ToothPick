'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { toast } from 'react-hot-toast'
import { useCart } from '@/lib/contexts/CartContext'
import { isEligibleForLeasing, formatMXNPrice } from '@/lib/utils/paymentSimulator'
import LeaseApplicationModal from '@/components/LeaseApplicationModal'

interface Product {
  _id: string
  name: string
  brand: string
  category: string
  price: number
  currency: string
  description: string
  image?: string
  images?: string[]
  isActive: boolean
  providerId: {
    _id: string
    name: string
  }
  distributorId?: {
    _id: string
    name: string
  }
  stock: number
  reviewStats?: {
    averageRating: number
    count: number
  }
  createdAt: string
}

interface Distributor {
  _id: string
  name: string
  email: string
}

export default function PublicCatalogPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const { addToCart } = useCart()
  
  const [products, setProducts] = useState<Product[]>([])
  const [distributors, setDistributors] = useState<Distributor[]>([])
  const [loading, setLoading] = useState(true)
  
  // 🔍 FILTROS
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('')
  const [selectedBrand, setSelectedBrand] = useState('')
  const [selectedDistributor, setSelectedDistributor] = useState('')
  const [priceRange, setPriceRange] = useState({ min: 0, max: 10000 })

  // 📄 MODAL DE ARRENDAMIENTO
  const [leaseModalOpen, setLeaseModalOpen] = useState(false)
  const [selectedProductForLease, setSelectedProductForLease] = useState<Product | null>(null)

  useEffect(() => {
    fetchPublicProducts()
    fetchDistributors()
  }, [])

  const fetchPublicProducts = async () => {
    try {
      const res = await fetch('/api/products/public')
      if (res.ok) {
        const data = await res.json()
        setProducts(data)
      } else {
        toast.error('Error al cargar productos')
      }
    } catch (error) {
      toast.error('Error al cargar productos')
    } finally {
      setLoading(false)
    }
  }

  const fetchDistributors = async () => {
    try {
      const res = await fetch('/api/users?role=distributor')
      if (res.ok) {
        const data = await res.json()
        setDistributors(data)
      }
    } catch (error) {
      console.error('Error al cargar distribuidores:', error)
    }
  }

  const formatPrice = (price: number, currency: string) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: currency,
    }).format(price)
  }

  const handleAddToCart = (product: Product) => {
    // Solo permitir agregar si hay un distribuidor asignado
    if (!product.distributorId) {
      toast.error('Este producto no está disponible para venta directa')
      return
    }

    if (product.stock <= 0) {
      toast.error('Producto sin stock disponible')
      return
    }

    // Verificar si el usuario está autenticado como customer
    if (!session) {
      toast.error('Debes iniciar sesión para agregar productos al carrito')
      router.push('/login?redirect=/catalog')
      return
    }

    if (session.user.role !== 'customer') {
      toast.error('Solo los clientes pueden comprar productos')
      return
    }

    addToCart({
      productId: product._id,
      name: product.name,
      brand: product.brand,
      price: product.price,
      currency: product.currency,
      image: product.image,
      quantity: 1,
      maxStock: product.stock,
      distributorId: product.distributorId._id,
      distributorName: product.distributorId.name
    })

    toast.success(`${product.name} agregado al carrito`)
  }

  const handleRequestLease = (product: Product) => {
    if (!session) {
      toast.error('Debes iniciar sesión para solicitar arrendamiento')
      router.push('/login?redirect=/catalog')
      return
    }

    setSelectedProductForLease(product)
    setLeaseModalOpen(true)
  }

  const handleLeaseSuccess = () => {
    toast.success('Solicitud de arrendamiento enviada exitosamente')
    // Opcional: redirigir a página de solicitudes
    setTimeout(() => {
      if (session?.user?.role === 'customer') {
        router.push('/customer/lease-requests')
      }
    }, 2000)
  }

  // Filtrar productos
  const filteredProducts = products.filter((product: Product) => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.brand.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = !selectedCategory || product.category === selectedCategory
    const matchesBrand = !selectedBrand || product.brand === selectedBrand
    const matchesDistributor = !selectedDistributor || product.distributorId?._id === selectedDistributor
    const matchesPrice = product.price >= priceRange.min && product.price <= priceRange.max
    
    return matchesSearch && matchesCategory && matchesBrand && matchesDistributor && matchesPrice && product.isActive
  })

  const categories = [...new Set(products.map((p: Product) => p.category))]
  const brands = [...new Set(products.map((p: Product) => p.brand))]

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-lg">Cargando catálogo...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                🦷 ToothPick Catálogo
              </h1>
              <p className="text-gray-600 mt-1">
                Productos dentales de calidad para tu clínica
              </p>
            </div>
            
            <div className="flex items-center space-x-4">
              {!session ? (
                <div className="space-x-2">
                  <button
                    onClick={() => router.push('/login')}
                    className="px-4 py-2 text-blue-600 hover:text-blue-700"
                  >
                    Iniciar Sesión
                  </button>
                  <button
                    onClick={() => router.push('/register')}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    Registrarse
                  </button>
                </div>
              ) : (
                <div className="flex items-center space-x-4">
                  <span className="text-sm text-gray-600">
                    Bienvenido, {session.user.name}
                  </span>
                  {session.user.role === 'customer' && (
                    <button
                      onClick={() => router.push('/customer/dashboard')}
                      className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                    >
                      Mi Dashboard
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Filtros */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-8">
          <h2 className="text-lg font-semibold mb-4">Filtros</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Búsqueda */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Buscar
              </label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Nombre o marca..."
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Categoría */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Categoría
              </label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Todas las categorías</option>
                {categories.map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </div>

            {/* Marca */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Marca
              </label>
              <select
                value={selectedBrand}
                onChange={(e) => setSelectedBrand(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Todas las marcas</option>
                {brands.map(brand => (
                  <option key={brand} value={brand}>{brand}</option>
                ))}
              </select>
            </div>

            {/* Distribuidor */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Distribuidor
              </label>
              <select
                value={selectedDistributor}
                onChange={(e) => setSelectedDistributor(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Todos los distribuidores</option>
                {distributors.map(distributor => (
                  <option key={distributor._id} value={distributor._id}>
                    {distributor.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Rango de precios */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Precio máximo: ${priceRange.max}
              </label>
              <input
                type="range"
                min="0"
                max="10000"
                step="100"
                value={priceRange.max}
                onChange={(e) => setPriceRange(prev => ({ ...prev, max: parseInt(e.target.value) }))}
                className="w-full"
              />
            </div>
          </div>

          {/* Reset filters */}
          <div className="mt-4">
            <button
              onClick={() => {
                setSearchTerm('')
                setSelectedCategory('')
                setSelectedBrand('')
                setSelectedDistributor('')
                setPriceRange({ min: 0, max: 10000 })
              }}
              className="text-sm text-blue-600 hover:text-blue-700"
            >
              Limpiar filtros
            </button>
          </div>
        </div>

        {/* Productos */}
        <div className="mb-4">
          <p className="text-gray-600">
            {filteredProducts.length} productos encontrados
          </p>
        </div>

        {filteredProducts.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm p-12 text-center">
            <div className="text-gray-500 text-lg mb-4">
              No se encontraron productos
            </div>
            <p className="text-gray-400">
              Ajusta los filtros para ver más productos
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredProducts.map((product) => (
              <div key={product._id} className="bg-white rounded-xl shadow-sm overflow-hidden hover:shadow-md transition-shadow">
                {/* Imagen del producto */}
                <div 
                  className="h-48 bg-gray-100 overflow-hidden cursor-pointer relative group"
                  onClick={() => router.push(`/products/${product._id}`)}
                >
                  {product.image ? (
                    <img
                      src={product.image}
                      alt={product.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                      <span className="text-4xl">🦷</span>
                    </div>
                  )}
                  
                  {/* Stock warnings */}
                  {product.stock <= 0 && (
                    <div className="absolute inset-0 bg-red-500 bg-opacity-75 flex items-center justify-center">
                      <span className="text-white font-bold text-sm">SIN STOCK</span>
                    </div>
                  )}
                  {product.stock > 0 && product.stock <= 5 && (
                    <div className="absolute top-2 right-2 bg-orange-500 text-white text-xs px-2 py-1 rounded">
                      ¡Últimas {product.stock}!
                    </div>
                  )}
                  
                  {/* Hover overlay */}
                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 transition-all duration-200 flex items-center justify-center">
                    <span className="text-white font-medium opacity-0 group-hover:opacity-100 transition-opacity text-sm">
                      Ver detalles
                    </span>
                  </div>
                </div>

                {/* Información del producto */}
                <div className="p-4">
                  <h3 
                    className="font-semibold text-gray-900 mb-1 line-clamp-2 cursor-pointer hover:text-blue-600"
                    onClick={() => router.push(`/products/${product._id}`)}
                  >
                    {product.name}
                  </h3>
                  <p className="text-sm text-gray-600 mb-2">{product.brand}</p>
                  <p className="text-xs text-blue-600 mb-2">{product.category}</p>
                  
                  {/* Rating - mostrar solo si hay reseñas */}
                  {product.reviewStats && product.reviewStats.count > 0 && (
                    <div className="flex items-center gap-1 mb-2">
                      <div className="flex text-yellow-400 text-sm">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <span key={star}>
                            {star <= Math.round(product.reviewStats!.averageRating) ? '★' : '☆'}
                          </span>
                        ))}
                      </div>
                      <span className="text-xs text-gray-600">
                        ({product.reviewStats!.count})
                      </span>
                    </div>
                  )}
                  
                  {product.distributorId && (
                    <p className="text-xs text-gray-500 mb-3">
                      Vendido por: {product.distributorId.name}
                    </p>
                  )}

                  <div className="flex items-center justify-between mb-3">
                    <span className="text-lg font-bold text-gray-900">
                      {formatPrice(product.price, product.currency)}
                    </span>
                    <span className="text-xs text-gray-500">
                      Stock: {product.stock}
                    </span>
                  </div>

                  {/* Botones de acción */}
                  <div className="space-y-2">
                    <button
                      onClick={() => handleAddToCart(product)}
                      disabled={!product.distributorId || product.stock <= 0}
                      className={`w-full py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                        product.distributorId && product.stock > 0
                          ? 'bg-blue-600 text-white hover:bg-blue-700'
                          : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      }`}
                    >
                      {!product.distributorId 
                        ? 'No disponible' 
                        : product.stock <= 0 
                          ? 'Sin stock'
                          : '🛒 Agregar al carrito'
                      }
                    </button>

                    {/* Botón de arrendamiento para productos > $50,000 */}
                    {isEligibleForLeasing(product.price) && product.distributorId && (
                      <button
                        onClick={() => handleRequestLease(product)}
                        className="w-full py-2 px-4 bg-purple-600 text-white rounded-md hover:bg-purple-700 text-sm font-medium transition-colors"
                      >
                        📄 Solicitar Arrendamiento
                      </button>
                    )}
                    
                    <button
                      onClick={() => router.push(`/products/${product._id}`)}
                      className="w-full py-2 px-4 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 text-sm font-medium transition-colors"
                    >
                      Ver detalles
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal de Arrendamiento */}
      {selectedProductForLease && (
        <LeaseApplicationModal
          product={selectedProductForLease}
          isOpen={leaseModalOpen}
          onClose={() => {
            setLeaseModalOpen(false)
            setSelectedProductForLease(null)
          }}
          onSuccess={handleLeaseSuccess}
        />
      )}
    </div>
  )
}
