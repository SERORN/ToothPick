'use client';

import React, { useState, useEffect } from 'react';

interface DentistProduct {
  _id: string;
  name: string;
  description: string;
  price: number;
  image?: string;
  type: 'kit' | 'servicio' | 'producto' | 'tratamiento';
  category: string;
  owner: string;
  dentist: {
    _id: string;
    name: string;
    clinicName?: string;
    profilePicture?: string;
    city?: string;
    state?: string;
  };
  features?: string[];
  customMessage?: string;
  shippingAvailable: boolean;
  shippingCost?: number;
  pickupOnly: boolean;
}

interface DentistStoreProps {
  dentistId: string;
  isPublic?: boolean;
  onProductSelect?: (product: DentistProduct) => void;
}

const DentistStorePreview: React.FC<DentistStoreProps> = ({
  dentistId,
  isPublic = false,
  onProductSelect
}) => {
  const [products, setProducts] = useState<DentistProduct[]>([]);
  const [dentist, setDentist] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedType, setSelectedType] = useState('');

  useEffect(() => {
    loadProducts();
  }, [dentistId, selectedCategory, selectedType]);

  const loadProducts = async () => {
    try {
      const params = new URLSearchParams();
      params.append('dentist', dentistId);
      if (selectedCategory) params.append('category', selectedCategory);
      if (selectedType) params.append('type', selectedType);

      const response = await fetch(`/api/public/dentist-products?${params}`);
      const data = await response.json();

      if (response.ok) {
        setProducts(data.products);
        if (data.products.length > 0) {
          setDentist(data.products[0].dentist);
        }
      } else {
        console.error('Error loading products:', data.error);
      }
    } catch (error) {
      console.error('Error loading products:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePurchase = async (product: DentistProduct) => {
    if (onProductSelect) {
      onProductSelect(product);
    }
  };

  const categories = [
    { value: '', label: 'Todas las categorías' },
    { value: 'higiene-oral', label: 'Higiene Oral' },
    { value: 'blanqueamiento', label: 'Blanqueamiento' },
    { value: 'ortodoncia', label: 'Ortodoncia' },
    { value: 'kits-dentales', label: 'Kits Dentales' },
    { value: 'otros', label: 'Otros' }
  ];

  const types = [
    { value: '', label: 'Todos los tipos' },
    { value: 'producto', label: 'Productos' },
    { value: 'kit', label: 'Kits' },
    { value: 'servicio', label: 'Servicios' },
    { value: 'tratamiento', label: 'Tratamientos' }
  ];

  if (loading) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header de la tienda */}
      {dentist && (
        <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white p-6 rounded-lg">
          <div className="flex items-center space-x-4">
            {dentist.profilePicture ? (
              <img
                src={dentist.profilePicture}
                alt={dentist.name}
                className="h-16 w-16 rounded-full object-cover border-4 border-white"
              />
            ) : (
              <div className="h-16 w-16 rounded-full bg-white bg-opacity-20 flex items-center justify-center">
                <span className="text-2xl font-bold">
                  {dentist.name.charAt(0)}
                </span>
              </div>
            )}
            <div>
              <h1 className="text-2xl font-bold">
                {dentist.clinicName || `Tienda de ${dentist.name}`}
              </h1>
              <p className="text-blue-100">
                Dr. {dentist.name}
              </p>
              {dentist.city && dentist.state && (
                <p className="text-blue-200 text-sm">
                  {dentist.city}, {dentist.state}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Filtros */}
      <div className="flex flex-wrap gap-4 bg-white p-4 rounded-lg shadow">
        <div className="flex-1 min-w-[200px]">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {categories.map(cat => (
              <option key={cat.value} value={cat.value}>
                {cat.label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex-1 min-w-[200px]">
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {types.map(type => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Grid de productos */}
      {products.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">🦷</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No hay productos disponibles
          </h3>
          <p className="text-gray-600">
            Este dentista aún no ha publicado productos o servicios.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {products.map((product) => (
            <div
              key={product._id}
              className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300 overflow-hidden"
            >
              {/* Imagen del producto */}
              <div className="h-48 bg-gray-200 relative">
                {product.image ? (
                  <img
                    src={product.image}
                    alt={product.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400">
                    <div className="text-center">
                      <div className="text-4xl mb-2">
                        {product.type === 'servicio' || product.type === 'tratamiento' ? '🦷' : '📦'}
                      </div>
                      <p className="text-sm">Sin imagen</p>
                    </div>
                  </div>
                )}
                
                {/* Badge de tipo */}
                <div className="absolute top-2 left-2">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    product.type === 'servicio' || product.type === 'tratamiento'
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-green-100 text-green-800'
                  }`}>
                    {product.type.charAt(0).toUpperCase() + product.type.slice(1)}
                  </span>
                </div>
              </div>

              {/* Contenido */}
              <div className="p-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-2">
                  {product.name}
                </h3>
                
                <p className="text-gray-600 text-sm mb-3 line-clamp-3">
                  {product.description}
                </p>

                {/* Características */}
                {product.features && product.features.length > 0 && (
                  <div className="mb-3">
                    <div className="flex flex-wrap gap-1">
                      {product.features.slice(0, 3).map((feature, index) => (
                        <span
                          key={index}
                          className="inline-flex px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded"
                        >
                          {feature}
                        </span>
                      ))}
                      {product.features.length > 3 && (
                        <span className="inline-flex px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded">
                          +{product.features.length - 3} más
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* Mensaje personalizado */}
                {product.customMessage && (
                  <div className="mb-3 p-2 bg-blue-50 border-l-4 border-blue-400">
                    <p className="text-sm text-blue-700">
                      {product.customMessage}
                    </p>
                  </div>
                )}

                {/* Información de envío */}
                <div className="mb-3 text-sm text-gray-600">
                  {product.pickupOnly ? (
                    <span className="flex items-center">
                      📍 Solo recolección en clínica
                    </span>
                  ) : product.shippingAvailable ? (
                    <span className="flex items-center">
                      🚚 Envío disponible
                      {product.shippingCost && product.shippingCost > 0 && (
                        <span className="ml-1">
                          (+${product.shippingCost.toLocaleString()})
                        </span>
                      )}
                    </span>
                  ) : (
                    <span className="flex items-center text-orange-600">
                      ⚠️ Consultar disponibilidad
                    </span>
                  )}
                </div>

                {/* Precio y botón */}
                <div className="flex items-center justify-between">
                  <div className="text-2xl font-bold text-blue-600">
                    ${product.price.toLocaleString()}
                    <span className="text-sm text-gray-500 ml-1">MXN</span>
                  </div>
                  
                  <button
                    onClick={() => handlePurchase(product)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200 text-sm font-medium"
                  >
                    {product.type === 'servicio' || product.type === 'tratamiento' 
                      ? 'Agendar' 
                      : 'Comprar'
                    }
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default DentistStorePreview;
