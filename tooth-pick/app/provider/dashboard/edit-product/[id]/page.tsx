'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter, useParams } from 'next/navigation'
import { toast } from 'react-hot-toast'

interface ProductForm {
  name: string;
  brand: string;
  category: string;
  description: string;
  price: string;
  currency: string;
  stock: string;
  images: string[];
  isActive: boolean;
}

export default function EditProductPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const params = useParams()
  const productId = params?.id

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<ProductForm>({
    name: '',
    brand: '',
    category: '',
    description: '',
    price: '',
    currency: 'MXN',
    stock: '',
    images: [''],
    isActive: true
  })

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    }
    if (session?.user?.role !== 'provider') {
      router.push('/')
    }
  }, [session, status, router])

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const res = await fetch(`/api/products/${productId}`)
        if (!res.ok) {
          throw new Error('Producto no encontrado')
        }
        
        const data = await res.json()
        setForm({
          name: data.name || '',
          brand: data.brand || '',
          category: data.category || '',
          description: data.description || '',
          price: data.price?.toString() || '',
          currency: data.currency || 'MXN',
          stock: data.stock?.toString() || '',
          images: data.images && data.images.length > 0 ? data.images : [''],
          isActive: data.isActive
        })
        setLoading(false)
      } catch (error) {
        toast.error('Error al cargar producto')
        router.push('/provider/dashboard')
      }
    }
    
    if (productId && session?.user?.role === 'provider') {
      fetchProduct()
    }
  }, [productId, session, router])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>, index?: number) => {
    const { name, value, type } = e.target
    
    if (name === 'images' && typeof index === 'number') {
      const newImages = [...form.images]
      newImages[index] = value
      setForm({ ...form, images: newImages })
    } else if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked
      setForm({ ...form, [name]: checked })
    } else {
      setForm({ ...form, [name]: value })
    }
  }

  const addImageField = () => {
    setForm({ ...form, images: [...form.images, ''] })
  }

  const removeImageField = (index: number) => {
    if (form.images.length > 1) {
      const updatedImages = form.images.filter((_, i) => i !== index)
      setForm({ ...form, images: updatedImages })
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      const filteredImages = form.images.filter(img => img.trim() !== '')
      
      const res = await fetch(`/api/products/${productId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          price: Number(form.price),
          stock: Number(form.stock),
          images: filteredImages
        }),
      })

      if (res.ok) {
        toast.success('Producto actualizado exitosamente')
        router.push('/provider/dashboard')
      } else {
        const err = await res.json()
        toast.error(err.error || 'Error al guardar cambios')
      }
    } catch (error) {
      toast.error('Error inesperado al guardar')
    } finally {
      setSaving(false)
    }
  }

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-lg">Cargando producto...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-3xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.push('/provider/dashboard')}
            className="text-blue-600 hover:text-blue-700 mb-4 flex items-center"
          >
            ← Volver al Dashboard
          </button>
          <h1 className="text-3xl font-bold text-gray-900">Editar Producto</h1>
          <p className="text-gray-600 mt-2">Modifica la información del producto</p>
        </div>

        {/* Form */}
        <div className="bg-white shadow-md rounded-xl p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            
            {/* Basic Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nombre del Producto *
                </label>
                <input
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  placeholder="Ej: Motor de implantes X200"
                  className="w-full border border-gray-300 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Marca *
                </label>
                <input
                  name="brand"
                  value={form.brand}
                  onChange={handleChange}
                  placeholder="Ej: Dentex"
                  className="w-full border border-gray-300 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Categoría *
              </label>
              <select
                name="category"
                value={form.category}
                onChange={handleChange}
                className="w-full border border-gray-300 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">Seleccionar categoría</option>
                <option value="Implantes">Implantes</option>
                <option value="Instrumental">Instrumental</option>
                <option value="Materiales">Materiales</option>
                <option value="Equipos">Equipos</option>
                <option value="Consumibles">Consumibles</option>
                <option value="Ortodoncia">Ortodoncia</option>
                <option value="Endodoncia">Endodoncia</option>
                <option value="Prótesis">Prótesis</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Descripción
              </label>
              <textarea
                name="description"
                value={form.description}
                onChange={handleChange}
                placeholder="Descripción detallada del producto..."
                rows={4}
                className="w-full border border-gray-300 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Price and Stock */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Precio *
                </label>
                <input
                  type="number"
                  name="price"
                  value={form.price}
                  onChange={handleChange}
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                  className="w-full border border-gray-300 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Moneda *
                </label>
                <select
                  name="currency"
                  value={form.currency}
                  onChange={handleChange}
                  className="w-full border border-gray-300 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="MXN">MXN (Pesos Mexicanos)</option>
                  <option value="USD">USD (Dólares)</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Stock Disponible *
                </label>
                <input
                  type="number"
                  name="stock"
                  value={form.stock}
                  onChange={handleChange}
                  placeholder="0"
                  min="0"
                  className="w-full border border-gray-300 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
            </div>

            {/* Product Status */}
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                name="isActive"
                checked={form.isActive}
                onChange={handleChange}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <label className="text-sm font-medium text-gray-700">
                Producto activo (visible para distribuidores)
              </label>
            </div>

            {/* Images */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Imágenes del Producto
              </label>
              <div className="space-y-3">
                {form.images.map((img, index) => (
                  <div key={index} className="flex gap-2">
                    <input
                      name="images"
                      value={img}
                      onChange={(e) => handleChange(e, index)}
                      placeholder={`URL de imagen #${index + 1}`}
                      className="flex-1 border border-gray-300 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    {form.images.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeImageField(index)}
                        className="bg-red-500 text-white px-3 py-2 rounded-lg hover:bg-red-600"
                      >
                        ×
                      </button>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  onClick={addImageField}
                  className="text-blue-600 hover:text-blue-700 font-medium"
                >
                  + Añadir otra imagen
                </button>
              </div>
            </div>

            {/* Submit Buttons */}
            <div className="flex gap-4 pt-6">
              <button
                type="button"
                onClick={() => router.push('/provider/dashboard')}
                className="flex-1 bg-gray-500 text-white py-3 px-6 rounded-lg hover:bg-gray-600 transition font-medium"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex-1 bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                {saving ? 'Guardando...' : 'Guardar Cambios'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
