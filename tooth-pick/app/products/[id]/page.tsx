'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { toast } from 'react-hot-toast'
import { useCart } from '@/lib/contexts/CartContext'
import ProductReviews from '@/components/ProductReviews'

interface Product {
  _id: string
  name: string
  brand: string
  category: string
  price: number
  currency: string
  description: string
  images?: string[]
  isActive: boolean
  stock: number
  providerId: {
    _id: string
    name: string
  }
  distributorId?: {
    _id: string
    name: string
  }
  createdAt: string
}

export default function ProductDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { data: session } = useSession()
  const { addToCart } = useCart()
  
  const productId = params?.id as string
  const [product, setProduct] = useState<Product | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedImage, setSelectedImage] = useState(0)

  useEffect(() => {
    if (productId) {
      fetchProduct()
    }
  }, [productId])

  const fetchProduct = async () => {
    try {
      const res = await fetch(`/api/products/${productId}`)
      if (res.ok) {
        const data = await res.json()
        setProduct(data)
      } else {
        toast.error('Producto no encontrado')
        router.push('/catalog')
      }
    } catch (error) {
      toast.error('Error al cargar producto')
      router.push('/catalog')
    } finally {
      setLoading(false)
    }
  }

  const formatPrice = (price: number, currency: string) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: currency,
    }).format(price)
  }

  const handleAddToCart = () => {
    if (!product) return

    if (!product.distributorId) {
      toast.error('Este producto no está disponible para venta directa')
      return
    }

    if (product.stock <= 0) {
      toast.error('Producto sin stock disponible')
      return
    }

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
      image: product.images?.[0],
      quantity: 1,
      maxStock: product.stock,
      distributorId: product.distributorId._id,
      distributorName: product.distributorId.name
    })

    toast.success('Producto agregado al carrito')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-lg">Cargando producto...</div>
      </div>
    )
  }

  if (!product) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Producto no encontrado
          </h2>
          <button
            onClick={() => router.push('/catalog')}
            className="text-blue-600 hover:text-blue-700"
          >
            ← Volver al catálogo
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <button
            onClick={() => router.push('/catalog')}
            className="text-blue-600 hover:text-blue-700 mb-4 flex items-center"
          >
            ← Volver al catálogo
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
          
          {/* Imágenes del producto */}
          <div>
            <div className="bg-white rounded-xl shadow-sm overflow-hidden mb-4">
              <div className="aspect-square bg-gray-100 flex items-center justify-center">
                {product.images && product.images[selectedImage] ? (
                  <img
                    src={product.images[selectedImage]}
                    alt={product.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="text-6xl text-gray-400">🦷</div>
                )}
              </div>
            </div>

            {/* Thumbnails */}
            {product.images && product.images.length > 1 && (
              <div className="grid grid-cols-4 gap-2">
                {product.images.map((image, index) => (
                  <button
                    key={index}
                    onClick={() => setSelectedImage(index)}
                    className={`aspect-square bg-white rounded-lg overflow-hidden border-2 ${
                      selectedImage === index ? 'border-blue-500' : 'border-gray-200'
                    }`}
                  >
                    <img
                      src={image}
                      alt={`${product.name} ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Información del producto */}
          <div className="bg-white rounded-xl shadow-sm p-8">
            <div className="mb-6">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                {product.name}
              </h1>
              <p className="text-lg text-gray-600 mb-2">{product.brand}</p>
              <span className="inline-block bg-blue-100 text-blue-800 text-sm px-3 py-1 rounded-full">
                {product.category}
              </span>
            </div>

            <div className="mb-6">
              <div className="text-3xl font-bold text-gray-900 mb-2">
                {formatPrice(product.price, product.currency)}
              </div>
              <div className="text-sm text-gray-600">
                Stock disponible: {product.stock} unidades
              </div>
            </div>

            {product.distributorId && (
              <div className="mb-6 p-4 bg-green-50 rounded-lg">
                <p className="text-sm text-green-800">
                  <span className="font-medium">Vendido por:</span> {product.distributorId.name}
                </p>
              </div>
            )}

            {product.description && (
              <div className="mb-8">
                <h3 className="font-semibold text-gray-900 mb-3">Descripción</h3>
                <p className="text-gray-700 leading-relaxed">
                  {product.description}
                </p>
              </div>
            )}

            {/* Botón de compra */}
            <div className="space-y-4">
              <button
                onClick={handleAddToCart}
                disabled={!product.distributorId || product.stock <= 0}
                className={`w-full py-4 px-6 rounded-md font-medium text-lg transition-colors ${
                  product.distributorId && product.stock > 0
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                {!product.distributorId 
                  ? 'No disponible para venta directa' 
                  : product.stock <= 0 
                    ? 'Sin stock disponible'
                    : '🛒 Agregar al carrito'
                }
              </button>

              {session?.user?.role === 'customer' && (
                <button
                  onClick={() => router.push('/checkout')}
                  className="w-full py-3 px-6 bg-green-600 text-white rounded-md hover:bg-green-700 font-medium"
                >
                  💳 Comprar ahora
                </button>
              )}
            </div>

            {/* Información adicional */}
            <div className="mt-8 pt-6 border-t border-gray-200">
              <div className="text-sm text-gray-600 space-y-2">
                <div className="flex justify-between">
                  <span>Proveedor:</span>
                  <span className="font-medium">{product.providerId.name}</span>
                </div>
                <div className="flex justify-between">
                  <span>Disponible desde:</span>
                  <span>{new Date(product.createdAt).toLocaleDateString('es-MX')}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Reseñas del producto */}
        <ProductReviews 
          productId={product._id} 
          productName={product.name}
        />
      </div>
    </div>
  )
}
