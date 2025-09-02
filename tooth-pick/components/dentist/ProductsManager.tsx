'use client';

import React, { useState, useEffect } from 'react';
import { Plus, Edit3, Trash2, Eye, EyeOff, Package, TrendingUp, DollarSign } from 'lucide-react';

interface DentistProduct {
  _id: string;
  name: string;
  description: string;
  price: number;
  image?: string;
  stock: number;
  category: string;
  type: 'kit' | 'servicio' | 'producto' | 'tratamiento';
  visible: boolean;
  active: boolean;
  totalSold: number;
  totalRevenue: number;
  createdAt: string;
}

interface ProductEditorProps {
  product?: DentistProduct;
  isOpen: boolean;
  onClose: () => void;
  onSave: (productData: any) => Promise<void>;
}

const ProductEditor: React.FC<ProductEditorProps> = ({
  product,
  isOpen,
  onClose,
  onSave
}) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: 0,
    stock: 0,
    category: 'higiene-oral',
    type: 'producto' as const,
    visible: true,
    active: true,
    shippingAvailable: true,
    shippingCost: 0,
    pickupOnly: false,
    customMessage: '',
    features: [] as string[],
    duration: undefined as number | undefined,
    tags: [] as string[]
  });
  
  const [newFeature, setNewFeature] = useState('');
  const [newTag, setNewTag] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (product) {
      setFormData({
        name: product.name,
        description: product.description,
        price: product.price,
        stock: product.stock,
        category: product.category,
        type: product.type,
        visible: product.visible,
        active: product.active,
        shippingAvailable: true,
        shippingCost: 0,
        pickupOnly: false,
        customMessage: '',
        features: [],
        duration: undefined,
        tags: []
      });
    } else {
      setFormData({
        name: '',
        description: '',
        price: 0,
        stock: 0,
        category: 'higiene-oral',
        type: 'producto',
        visible: true,
        active: true,
        shippingAvailable: true,
        shippingCost: 0,
        pickupOnly: false,
        customMessage: '',
        features: [],
        duration: undefined,
        tags: []
      });
    }
  }, [product]);

  const categories = [
    { value: 'higiene-oral', label: 'Higiene Oral' },
    { value: 'blanqueamiento', label: 'Blanqueamiento' },
    { value: 'ortodoncia', label: 'Ortodoncia' },
    { value: 'protesis', label: 'Prótesis' },
    { value: 'cirugia', label: 'Cirugía' },
    { value: 'endodoncia', label: 'Endodoncia' },
    { value: 'periodoncia', label: 'Periodoncia' },
    { value: 'estetica', label: 'Estética' },
    { value: 'prevencion', label: 'Prevención' },
    { value: 'kits-dentales', label: 'Kits Dentales' },
    { value: 'productos-profesionales', label: 'Productos Profesionales' },
    { value: 'otros', label: 'Otros' }
  ];

  const types = [
    { value: 'producto', label: 'Producto' },
    { value: 'kit', label: 'Kit Dental' },
    { value: 'servicio', label: 'Servicio' },
    { value: 'tratamiento', label: 'Tratamiento' }
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await onSave(formData);
      onClose();
    } catch (error) {
      console.error('Error guardando producto:', error);
    } finally {
      setLoading(false);
    }
  };

  const addFeature = () => {
    if (newFeature.trim()) {
      setFormData(prev => ({
        ...prev,
        features: [...prev.features, newFeature.trim()]
      }));
      setNewFeature('');
    }
  };

  const removeFeature = (index: number) => {
    setFormData(prev => ({
      ...prev,
      features: prev.features.filter((_, i) => i !== index)
    }));
  };

  const addTag = () => {
    if (newTag.trim()) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, newTag.trim()]
      }));
      setNewTag('');
    }
  };

  const removeTag = (index: number) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter((_, i) => i !== index)
    }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b">
          <h2 className="text-2xl font-bold text-gray-900">
            {product ? 'Editar Producto' : 'Crear Nuevo Producto'}
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Información básica */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">Información Básica</h3>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nombre del Producto *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Descripción *
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  rows={4}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Precio (MXN) *
                  </label>
                  <input
                    type="number"
                    value={formData.price}
                    onChange={(e) => setFormData(prev => ({ ...prev, price: parseFloat(e.target.value) || 0 }))}
                    min="0"
                    step="0.01"
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Stock
                  </label>
                  <input
                    type="number"
                    value={formData.stock}
                    onChange={(e) => setFormData(prev => ({ ...prev, stock: parseInt(e.target.value) || 0 }))}
                    min="0"
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    disabled={formData.type === 'servicio'}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Categoría
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    {categories.map(cat => (
                      <option key={cat.value} value={cat.value}>
                        {cat.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tipo
                  </label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value as any }))}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    {types.map(type => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {(formData.type === 'servicio' || formData.type === 'tratamiento') && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Duración (minutos)
                  </label>
                  <input
                    type="number"
                    value={formData.duration || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, duration: parseInt(e.target.value) || undefined }))}
                    min="15"
                    step="15"
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              )}
            </div>

            {/* Configuración avanzada */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">Configuración</h3>

              <div className="space-y-3">
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={formData.visible}
                    onChange={(e) => setFormData(prev => ({ ...prev, visible: e.target.checked }))}
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                  <span className="text-sm text-gray-700">Visible para clientes</span>
                </label>

                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={formData.active}
                    onChange={(e) => setFormData(prev => ({ ...prev, active: e.target.checked }))}
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                  <span className="text-sm text-gray-700">Producto activo</span>
                </label>

                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={formData.shippingAvailable}
                    onChange={(e) => setFormData(prev => ({ ...prev, shippingAvailable: e.target.checked }))}
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                  <span className="text-sm text-gray-700">Envío disponible</span>
                </label>

                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={formData.pickupOnly}
                    onChange={(e) => setFormData(prev => ({ ...prev, pickupOnly: e.target.checked }))}
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                  <span className="text-sm text-gray-700">Solo recolección en clínica</span>
                </label>
              </div>

              {formData.shippingAvailable && !formData.pickupOnly && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Costo de envío (MXN)
                  </label>
                  <input
                    type="number"
                    value={formData.shippingCost}
                    onChange={(e) => setFormData(prev => ({ ...prev, shippingCost: parseFloat(e.target.value) || 0 }))}
                    min="0"
                    step="0.01"
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Mensaje personalizado
                </label>
                <textarea
                  value={formData.customMessage}
                  onChange={(e) => setFormData(prev => ({ ...prev, customMessage: e.target.value }))}
                  rows={3}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Mensaje especial para este producto..."
                />
              </div>

              {/* Características */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Características
                </label>
                <div className="space-y-2">
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      value={newFeature}
                      onChange={(e) => setNewFeature(e.target.value)}
                      placeholder="Nueva característica..."
                      className="flex-1 p-2 border border-gray-300 rounded"
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addFeature())}
                    />
                    <button
                      type="button"
                      onClick={addFeature}
                      className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                    >
                      Agregar
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {formData.features.map((feature, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                      >
                        {feature}
                        <button
                          type="button"
                          onClick={() => removeFeature(index)}
                          className="ml-2 text-blue-600 hover:text-blue-800"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Tags */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Etiquetas
                </label>
                <div className="space-y-2">
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      value={newTag}
                      onChange={(e) => setNewTag(e.target.value)}
                      placeholder="Nueva etiqueta..."
                      className="flex-1 p-2 border border-gray-300 rounded"
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                    />
                    <button
                      type="button"
                      onClick={addTag}
                      className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                    >
                      Agregar
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {formData.tags.map((tag, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm"
                      >
                        {tag}
                        <button
                          type="button"
                          onClick={() => removeTag(index)}
                          className="ml-2 text-green-600 hover:text-green-800"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-4 pt-6 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              disabled={loading}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              disabled={loading}
            >
              {loading ? 'Guardando...' : (product ? 'Actualizar' : 'Crear Producto')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

interface DentistProductsManagerProps {
  onProductSelect?: (product: DentistProduct) => void;
}

const DentistProductsManager: React.FC<DentistProductsManagerProps> = ({
  onProductSelect
}) => {
  const [products, setProducts] = useState<DentistProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEditor, setShowEditor] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<DentistProduct | undefined>();
  const [filters, setFilters] = useState({
    category: '',
    type: '',
    active: '',
    search: ''
  });
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    loadProducts();
    loadStats();
  }, [filters]);

  const loadProducts = async () => {
    try {
      const params = new URLSearchParams();
      if (filters.category) params.append('category', filters.category);
      if (filters.type) params.append('type', filters.type);
      if (filters.active) params.append('active', filters.active);
      if (filters.search) params.append('search', filters.search);

      const response = await fetch(`/api/dentist/products?${params}`);
      const data = await response.json();

      if (response.ok) {
        setProducts(data.products);
      } else {
        console.error('Error loading products:', data.error);
      }
    } catch (error) {
      console.error('Error loading products:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const response = await fetch('/api/dentist/marketplace-stats');
      const data = await response.json();

      if (response.ok) {
        setStats(data);
      }
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const handleSaveProduct = async (productData: any) => {
    try {
      const url = selectedProduct 
        ? `/api/dentist/products/${selectedProduct._id}`
        : '/api/dentist/products';
      
      const method = selectedProduct ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(productData)
      });

      const data = await response.json();

      if (response.ok) {
        await loadProducts();
        await loadStats();
        setShowEditor(false);
        setSelectedProduct(undefined);
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      console.error('Error saving product:', error);
      alert(error instanceof Error ? error.message : 'Error guardando producto');
    }
  };

  const handleDeleteProduct = async (productId: string) => {
    if (!confirm('¿Estás seguro de que quieres eliminar este producto?')) {
      return;
    }

    try {
      const response = await fetch(`/api/dentist/products/${productId}`, {
        method: 'DELETE'
      });

      const data = await response.json();

      if (response.ok) {
        await loadProducts();
        await loadStats();
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      console.error('Error deleting product:', error);
      alert(error instanceof Error ? error.message : 'Error eliminando producto');
    }
  };

  const toggleProductVisibility = async (product: DentistProduct) => {
    try {
      const response = await fetch(`/api/dentist/products/${product._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ visible: !product.visible })
      });

      if (response.ok) {
        await loadProducts();
      }
    } catch (error) {
      console.error('Error toggling visibility:', error);
    }
  };

  const canCreateProduct = stats?.limits?.canCreate !== false;

  return (
    <div className="space-y-6">
      {/* Estadísticas */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <Package className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Productos Activos</p>
                <p className="text-2xl font-bold text-gray-900">
                  {stats.stats.products.activeProducts}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <TrendingUp className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Vendido</p>
                <p className="text-2xl font-bold text-gray-900">
                  {stats.stats.products.totalSold}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <DollarSign className="h-8 w-8 text-yellow-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Ingresos Brutos</p>
                <p className="text-2xl font-bold text-gray-900">
                  ${stats.stats.sales.totalRevenue?.toLocaleString() || 0}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <DollarSign className="h-8 w-8 text-purple-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Ingresos Netos</p>
                <p className="text-2xl font-bold text-gray-900">
                  ${stats.netRevenue?.toLocaleString() || 0}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Controles */}
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center space-y-4 md:space-y-0">
          <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-4 mr-4">
            <input
              type="text"
              placeholder="Buscar productos..."
              value={filters.search}
              onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            
            <select
              value={filters.category}
              onChange={(e) => setFilters(prev => ({ ...prev, category: e.target.value }))}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Todas las categorías</option>
              <option value="higiene-oral">Higiene Oral</option>
              <option value="blanqueamiento">Blanqueamiento</option>
              <option value="ortodoncia">Ortodoncia</option>
              <option value="kits-dentales">Kits Dentales</option>
              <option value="otros">Otros</option>
            </select>

            <select
              value={filters.type}
              onChange={(e) => setFilters(prev => ({ ...prev, type: e.target.value }))}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Todos los tipos</option>
              <option value="producto">Producto</option>
              <option value="kit">Kit</option>
              <option value="servicio">Servicio</option>
              <option value="tratamiento">Tratamiento</option>
            </select>

            <select
              value={filters.active}
              onChange={(e) => setFilters(prev => ({ ...prev, active: e.target.value }))}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Todos los estados</option>
              <option value="true">Activos</option>
              <option value="false">Inactivos</option>
            </select>
          </div>

          <button
            onClick={() => {
              setSelectedProduct(undefined);
              setShowEditor(true);
            }}
            disabled={!canCreateProduct}
            className="flex items-center px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            title={!canCreateProduct ? stats?.limits?.reason : ''}
          >
            <Plus className="w-5 h-5 mr-2" />
            Nuevo Producto
          </button>
        </div>

        {!canCreateProduct && stats?.limits?.reason && (
          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-800">
              {stats.limits.reason}
              {stats.limits.current !== undefined && stats.limits.limit && (
                <span className="ml-2">
                  ({stats.limits.current}/{stats.limits.limit} productos)
                </span>
              )}
            </p>
          </div>
        )}
      </div>

      {/* Lista de productos */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loading ? (
          <div className="p-6 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Cargando productos...</p>
          </div>
        ) : products.length === 0 ? (
          <div className="p-6 text-center">
            <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No tienes productos creados aún</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Producto
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tipo
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Precio
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Stock
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Vendidos
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Estado
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {products.map((product) => (
                  <tr key={product._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {product.image && (
                          <div className="flex-shrink-0 h-10 w-10">
                            <img
                              className="h-10 w-10 rounded-full object-cover"
                              src={product.image}
                              alt={product.name}
                            />
                          </div>
                        )}
                        <div className={product.image ? "ml-4" : ""}>
                          <div className="text-sm font-medium text-gray-900">
                            {product.name}
                          </div>
                          <div className="text-sm text-gray-500">
                            {product.category.replace('-', ' ')}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                        {product.type}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      ${product.price.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {product.type === 'servicio' ? 'N/A' : product.stock}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {product.totalSold}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          product.active 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {product.active ? 'Activo' : 'Inactivo'}
                        </span>
                        {product.visible ? (
                          <Eye className="h-4 w-4 text-green-600" />
                        ) : (
                          <EyeOff className="h-4 w-4 text-gray-400" />
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => toggleProductVisibility(product)}
                          className="text-gray-600 hover:text-gray-900"
                          title={product.visible ? 'Ocultar' : 'Mostrar'}
                        >
                          {product.visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                        <button
                          onClick={() => {
                            setSelectedProduct(product);
                            setShowEditor(true);
                          }}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          <Edit3 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteProduct(product._id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          <Trash2 className="h-4 w-4" />
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

      {/* Editor de productos */}
      <ProductEditor
        product={selectedProduct}
        isOpen={showEditor}
        onClose={() => {
          setShowEditor(false);
          setSelectedProduct(undefined);
        }}
        onSave={handleSaveProduct}
      />
    </div>
  );
};

export default DentistProductsManager;
