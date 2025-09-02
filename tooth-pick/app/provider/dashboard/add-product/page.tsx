'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { useSession } from 'next-auth/react';
import { useEffect } from 'react';

export default function AddProductPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [form, setForm] = useState({
    name: '',
    brand: '',
    category: '',
    description: '',
    price: '',
    currency: 'MXN',
    stock: '',
    images: [''],
  });

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
    if (session && session.user.role !== 'provider') {
      router.push('/');
    }
  }, [session, status, router]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>, index?: number) => {
    const { name, value } = e.target;
    if (name === 'images' && typeof index === 'number') {
      const updatedImages = [...form.images];
      updatedImages[index] = value;
      setForm({ ...form, images: updatedImages });
    } else {
      setForm({ ...form, [name]: value });
    }
  };

  const addImageField = () => {
    setForm({ ...form, images: [...form.images, ''] });
  };

  const removeImageField = (index: number) => {
    if (form.images.length > 1) {
      const updatedImages = form.images.filter((_, i) => i !== index);
      setForm({ ...form, images: updatedImages });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const filteredImages = form.images.filter(img => img.trim() !== '');
      
      const res = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          price: Number(form.price),
          stock: Number(form.stock),
          images: filteredImages,
        }),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Error creando el producto');

      toast.success('Producto creado exitosamente');
      router.push('/provider/dashboard');
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-lg">Cargando...</div>
      </div>
    );
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
          <h1 className="text-3xl font-bold text-gray-900">Agregar Nuevo Producto</h1>
          <p className="text-gray-600 mt-2">Complete la información del producto para agregarlo a su catálogo</p>
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

            {/* Submit Button */}
            <div className="pt-6">
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                {loading ? 'Creando producto...' : 'Crear Producto'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
