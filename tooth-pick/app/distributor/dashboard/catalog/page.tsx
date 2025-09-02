'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { toast } from 'react-hot-toast'
import { useCart } from '@/lib/contexts/CartContext'

interface Provider {
  id: string;
  name: string;
  email: string;
}

interface Product {
  _id: string;
  name: string;
  brand: string;
  category: string;
  description: string;
  price: number;
  currency: string;
  stock: number;
  images: string[];
  provider: Provider;
  createdAt: string;
  updatedAt: string;
}

export default function CatalogPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const { addToCart } = useCart()

  const [products, setProducts] = useState<Product[]>([])
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  
  // Estados de filtros
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('')
  const [selectedBrand, setSelectedBrand] = useState('')
  const [selectedProvider, setSelectedProvider] = useState('')
  const [priceRange, setPriceRange] = useState({ min: '', max: '' })

  // Listas para filtros
  const [categories, setCategories] = useState<string[]>([])
  const [brands, setBrands] = useState<string[]>([])
  const [providers, setProviders] = useState<Provider[]>([])

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    }
    if (session?.user?.role !== 'distributor') {
      router.push('/')
    }
  }, [session, status, router])

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const res = await fetch('/api/products/public')
        if (!res.ok) {
          throw new Error('Error al cargar productos')
        }
        
        const data = await res.json()
        setProducts(data)
        setFilteredProducts(data)
        
        // Extraer listas únicas para filtros
        const uniqueCategories = [...new Set(data.map((p: Product) => p.category))]
        const uniqueBrands = [...new Set(data.map((p: Product) => p.brand))]
        const uniqueProviders = [...new Map(data.map((p: Product) => [p.provider.id, p.provider])).values()]
        
        setCategories(uniqueCategories)
        setBrands(uniqueBrands)
        setProviders(uniqueProviders)
        
        setLoading(false)
      } catch (error) {
        toast.error('Error al cargar el catálogo')
        setLoading(false)
      }
    }

    if (session?.user?.role === 'distributor') {
      fetchProducts()
    }
  }, [session])

  // Aplicar filtros
  useEffect(() => {
    let filtered = products

    // Filtro por texto de búsqueda
    if (searchTerm) {
      filtered = filtered.filter(product =>
        product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.brand.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // Filtro por categoría
    if (selectedCategory) {
      filtered = filtered.filter(product => product.category === selectedCategory)
    }

    // Filtro por marca
    if (selectedBrand) {
      filtered = filtered.filter(product => product.brand === selectedBrand)
    }

    // Filtro por proveedor
    if (selectedProvider) {
      filtered = filtered.filter(product => product.provider.id === selectedProvider)
    }

    // Filtro por rango de precio
    if (priceRange.min || priceRange.max) {
      filtered = filtered.filter(product => {
        const price = product.price
        const min = priceRange.min ? parseFloat(priceRange.min) : 0
        const max = priceRange.max ? parseFloat(priceRange.max) : Infinity
        return price >= min && price <= max
      })
    }

    setFilteredProducts(filtered)
  }, [products, searchTerm, selectedCategory, selectedBrand, selectedProvider, priceRange])

  const formatPrice = (price: number, currency: string) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: currency,
    }).format(price)
  }

  const handleAddToCart = (product: Product) => {
    addToCart(product)
  }

  const clearFilters = () => {
    setSearchTerm('')
    setSelectedCategory('')
    setSelectedBrand('')
    setSelectedProvider('')
    setPriceRange({ min: '', max: '' })
  }

  if (status === 'loading' || loading) {
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
              <h1 className="text-3xl font-bold text-gray-900">Catálogo de Productos</h1>
              <p className="text-gray-600 mt-1">Encuentra productos dentales de alta calidad</p>
            </div>
            <div className="text-sm text-gray-500">
              {filteredProducts.length} de {products.length} productos
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          
          {/* Sidebar de Filtros */}
          <div className="lg:w-1/4">
            <div className="bg-white rounded-xl shadow-sm p-6 sticky top-8">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-semibold">Filtros</h2>
                <button
                  onClick={clearFilters}
                  className="text-sm text-blue-600 hover:text-blue-700"
                >
                  Limpiar
                </button>
              </div>

              {/* Búsqueda */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Buscar
                </label>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Nombre o marca..."
                  className="w-full border border-gray-300 p-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Categoría */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Categoría
                </label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full border border-gray-300 p-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Todas las categorías</option>
                  {categories.map(category => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              </div>

              {/* Marca */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Marca
                </label>
                <select
                  value={selectedBrand}
                  onChange={(e) => setSelectedBrand(e.target.value)}
                  className="w-full border border-gray-300 p-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Todas las marcas</option>
                  {brands.map(brand => (
                    <option key={brand} value={brand}>{brand}</option>
                  ))}
                </select>
              </div>

              {/* Proveedor */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Proveedor
                </label>
                <select
                  value={selectedProvider}
                  onChange={(e) => setSelectedProvider(e.target.value)}
                  className="w-full border border-gray-300 p-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Todos los proveedores</option>
                  {providers.map(provider => (
                    <option key={provider.id} value={provider.id}>{provider.name}</option>
                  ))}
                </select>
              </div>

              {/* Rango de Precio */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Rango de Precio
                </label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={priceRange.min}
                    onChange={(e) => setPriceRange({ ...priceRange, min: e.target.value })}
                    placeholder="Mín"
                    className="w-full border border-gray-300 p-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <input
                    type="number"
                    value={priceRange.max}
                    onChange={(e) => setPriceRange({ ...priceRange, max: e.target.value })}
                    placeholder="Máx"
                    className="w-full border border-gray-300 p-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Grid de Productos */}
          <div className="lg:w-3/4">
            {filteredProducts.length === 0 ? (
              <div className="bg-white rounded-xl shadow-sm p-12 text-center">
                <div className="text-gray-500 text-lg">No se encontraron productos</div>
                <p className="text-gray-400 mt-2">Intenta ajustar tus filtros</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {filteredProducts.map((product) => (
                  <div key={product._id} className="bg-white rounded-xl shadow-sm overflow-hidden hover:shadow-md transition-shadow">
                    {/* Imagen del producto */}
                    <div className="aspect-square bg-gray-100 relative">
                      {product.images && product.images.length > 0 ? (
                        <img
                          src={product.images[0]}
                          alt={product.name}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.currentTarget.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDIwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik0xMDAgMTMwQzExNi41NjkgMTMwIDEzMCAxMTYuNTY5IDEzMCAxMDBDMTMwIDgzLjQzMTUgMTE2LjU2OSA3MCAxMDAgNzBDODMuNDMxNSA3MCA3MCA4My40MzE1IDcwIDEwMEM3MCAxMTYuNTY5IDgzLjQzMTUgMTMwIDEwMCAxMzBaIiBmaWxsPSIjRTVFN0VCIi8+CjxwYXRoIGQ9Ik0xNjAgMTYwSDQwVjE0MEg2MEw3MCAzMEgxMzBMMTQwIDE0MEgxNjBWMTYwWiIgZmlsbD0iI0U1RTdFQiIvPgo8L3N2Zz4K'
                          }}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gray-100">
                          <div className="text-gray-400 text-sm">Sin imagen</div>
                        </div>
                      )}
                    </div>

                    {/* Información del producto */}
                    <div className="p-6">
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-semibold text-gray-900 line-clamp-2">{product.name}</h3>
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          product.stock > 10 ? 'bg-green-100 text-green-700' :
                          product.stock > 0 ? 'bg-yellow-100 text-yellow-700' :
                          'bg-red-100 text-red-700'
                        }`}>
                          {product.stock > 0 ? `${product.stock} unidades` : 'Agotado'}
                        </span>
                      </div>
                      
                      <p className="text-sm text-gray-600 mb-2">{product.brand}</p>
                      <p className="text-xs text-blue-600 mb-3">{product.category}</p>
                      
                      {product.description && (
                        <p className="text-sm text-gray-500 line-clamp-2 mb-4">{product.description}</p>
                      )}

                      <div className="flex justify-between items-center mb-4">
                        <div className="text-2xl font-bold text-gray-900">
                          {formatPrice(product.price, product.currency)}
                        </div>
                        <div className="text-xs text-gray-500">
                          por {product.provider.name}
                        </div>
                      </div>

                      <button
                        onClick={() => handleAddToCart(product)}
                        disabled={product.stock === 0}
                        className={`w-full py-2 px-4 rounded-lg font-medium transition ${
                          product.stock > 0
                            ? 'bg-blue-600 text-white hover:bg-blue-700'
                            : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        }`}
                      >
                        {product.stock > 0 ? 'Agregar al Carrito' : 'Producto Agotado'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
