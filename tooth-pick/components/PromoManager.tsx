'use client';

import React, { useState, useEffect } from 'react';

interface PromoHighlight {
  _id: string;
  title: string;
  description: string;
  imageUrl: string;
  ctaText: string;
  ctaLink: string;
  visibleUntil: string;
  isActive: boolean;
  priority: number;
  targetAudience: string;
  displayLocations: string[];
  metrics: {
    views: number;
    clicks: number;
    conversions: number;
    ctr: number;
  };
  styling: {
    backgroundColor: string;
    textColor: string;
    buttonColor: string;
    position: string;
  };
}

export default function PromoManager() {
  const [promos, setPromos] = useState<PromoHighlight[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedPromo, setSelectedPromo] = useState<PromoHighlight | null>(null);

  // Estado del formulario
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    imageUrl: '',
    ctaText: 'Ver más',
    ctaLink: '',
    visibleUntil: '',
    priority: 1,
    targetAudience: 'all',
    displayLocations: ['dashboard'],
    styling: {
      backgroundColor: '#f0f9ff',
      textColor: '#1f2937',
      buttonColor: '#3b82f6',
      position: 'top'
    }
  });

  useEffect(() => {
    loadPromos();
  }, []);

  const loadPromos = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/marketing/highlights?includeInactive=true');
      const data = await response.json();

      if (data.success) {
        setPromos(data.data.promotions);
      }
    } catch (error) {
      console.error('Error loading promos:', error);
    } finally {
      setLoading(false);
    }
  };

  const createPromo = async () => {
    try {
      const response = await fetch('/api/marketing/highlights', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (data.success) {
        setShowCreateModal(false);
        loadPromos();
        resetForm();
        alert('Promoción creada exitosamente');
      } else {
        alert(data.error || 'Error al crear promoción');
      }
    } catch (error) {
      console.error('Error creating promo:', error);
      alert('Error al crear promoción');
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      imageUrl: '',
      ctaText: 'Ver más',
      ctaLink: '',
      visibleUntil: '',
      priority: 1,
      targetAudience: 'all',
      displayLocations: ['dashboard'],
      styling: {
        backgroundColor: '#f0f9ff',
        textColor: '#1f2937',
        buttonColor: '#3b82f6',
        position: 'top'
      }
    });
  };

  const getStatusBadge = (promo: PromoHighlight) => {
    const isActive = promo.isActive && new Date(promo.visibleUntil) > new Date();
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
        isActive 
          ? 'bg-green-100 text-green-800' 
          : 'bg-gray-100 text-gray-800'
      }`}>
        {isActive ? 'ACTIVA' : 'INACTIVA'}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Cargando promociones...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Promociones Destacadas</h2>
            <p className="text-gray-600">Gestiona las promociones que se muestran a tus pacientes</p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
          >
            <span>+</span>
            Nueva Promoción
          </button>
        </div>
      </div>

      {/* Lista de promociones */}
      <div className="space-y-4">
        {promos.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg border">
            <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">🎯</span>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No hay promociones</h3>
            <p className="text-gray-600 mb-4">Crea tu primera promoción destacada</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
            >
              Crear Promoción
            </button>
          </div>
        ) : (
          promos.map((promo) => (
            <div key={promo._id} className="bg-white rounded-lg shadow-sm border p-6">
              <div className="flex flex-col lg:flex-row lg:items-start gap-6">
                {/* Imagen */}
                <div className="w-full lg:w-48 h-32 rounded-lg overflow-hidden bg-gray-100">
                  {promo.imageUrl ? (
                    <img 
                      src={promo.imageUrl} 
                      alt={promo.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                      Sin imagen
                    </div>
                  )}
                </div>

                {/* Contenido */}
                <div className="flex-1">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{promo.title}</h3>
                      <p className="text-gray-600 mt-1">{promo.description}</p>
                    </div>
                    {getStatusBadge(promo)}
                  </div>

                  <div className="flex flex-wrap gap-4 text-sm text-gray-500 mb-4">
                    <span>Prioridad: {promo.priority}</span>
                    <span>Audiencia: {promo.targetAudience}</span>
                    <span>Válida hasta: {new Date(promo.visibleUntil).toLocaleDateString()}</span>
                    <span>Ubicaciones: {promo.displayLocations.join(', ')}</span>
                  </div>

                  {/* Métricas */}
                  <div className="flex flex-wrap gap-6 text-sm mb-4">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                      <span>👁 {promo.metrics.views} vistas</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                      <span>🔗 {promo.metrics.clicks} clics</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
                      <span>📈 CTR: {promo.metrics.ctr}%</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 bg-orange-500 rounded-full"></span>
                      <span>🎯 {promo.metrics.conversions} conversiones</span>
                    </div>
                  </div>

                  {/* Acciones */}
                  <div className="flex gap-2">
                    <a
                      href={promo.ctaLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-gray-100 text-gray-700 px-3 py-1 rounded text-sm hover:bg-gray-200"
                    >
                      {promo.ctaText}
                    </a>
                    <button
                      onClick={() => setSelectedPromo(promo)}
                      className="bg-blue-100 text-blue-700 px-3 py-1 rounded text-sm hover:bg-blue-200"
                    >
                      Ver Detalles
                    </button>
                  </div>
                </div>
              </div>

              {/* Vista previa */}
              <div className="mt-6 pt-6 border-t">
                <h4 className="text-sm font-medium text-gray-700 mb-3">Vista Previa:</h4>
                <div 
                  className="rounded-lg p-4 border-l-4 max-w-md"
                  style={{
                    backgroundColor: promo.styling.backgroundColor,
                    color: promo.styling.textColor,
                    borderLeftColor: promo.styling.buttonColor
                  }}
                >
                  <h5 className="font-semibold mb-2">{promo.title}</h5>
                  <p className="text-sm mb-3">{promo.description}</p>
                  <button
                    className="text-white px-4 py-2 rounded text-sm font-medium"
                    style={{ backgroundColor: promo.styling.buttonColor }}
                  >
                    {promo.ctaText}
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal crear promoción */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-xl font-bold mb-4">Nueva Promoción Destacada</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Título</label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e: any) => setFormData({...formData, title: e.target.value})}
                    className="w-full border rounded-lg px-3 py-2"
                    placeholder="Ej: ¡20% descuento en limpieza dental!"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Descripción</label>
                  <textarea
                    value={formData.description}
                    onChange={(e: any) => setFormData({...formData, description: e.target.value})}
                    className="w-full border rounded-lg px-3 py-2"
                    rows={3}
                    placeholder="Descripción de la promoción..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">URL de Imagen</label>
                  <input
                    type="url"
                    value={formData.imageUrl}
                    onChange={(e: any) => setFormData({...formData, imageUrl: e.target.value})}
                    className="w-full border rounded-lg px-3 py-2"
                    placeholder="https://..."
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Texto del Botón</label>
                    <input
                      type="text"
                      value={formData.ctaText}
                      onChange={(e: any) => setFormData({...formData, ctaText: e.target.value})}
                      className="w-full border rounded-lg px-3 py-2"
                      placeholder="Ver más"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Enlace del Botón</label>
                    <input
                      type="url"
                      value={formData.ctaLink}
                      onChange={(e: any) => setFormData({...formData, ctaLink: e.target.value})}
                      className="w-full border rounded-lg px-3 py-2"
                      placeholder="https://..."
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Válida hasta</label>
                    <input
                      type="datetime-local"
                      value={formData.visibleUntil}
                      onChange={(e: any) => setFormData({...formData, visibleUntil: e.target.value})}
                      className="w-full border rounded-lg px-3 py-2"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Prioridad (1-10)</label>
                    <input
                      type="number"
                      min="1"
                      max="10"
                      value={formData.priority}
                      onChange={(e: any) => setFormData({...formData, priority: parseInt(e.target.value)})}
                      className="w-full border rounded-lg px-3 py-2"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Audiencia Objetivo</label>
                  <select
                    value={formData.targetAudience}
                    onChange={(e: any) => setFormData({...formData, targetAudience: e.target.value})}
                    className="w-full border rounded-lg px-3 py-2"
                  >
                    <option value="all">Todos los pacientes</option>
                    <option value="new_patients">Pacientes nuevos</option>
                    <option value="existing_patients">Pacientes existentes</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Ubicaciones de Display</label>
                  <div className="space-y-2">
                    {['dashboard', 'booking', 'profile', 'catalog'].map(location => (
                      <label key={location} className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={formData.displayLocations.includes(location)}
                          onChange={(e: any) => {
                            if (e.target.checked) {
                              setFormData({
                                ...formData,
                                displayLocations: [...formData.displayLocations, location]
                              });
                            } else {
                              setFormData({
                                ...formData,
                                displayLocations: formData.displayLocations.filter(l => l !== location)
                              });
                            }
                          }}
                        />
                        <span className="capitalize">{location}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Personalización de estilo */}
                <div className="border-t pt-4">
                  <h3 className="font-medium mb-3">Personalización Visual</h3>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">Color de Fondo</label>
                      <input
                        type="color"
                        value={formData.styling.backgroundColor}
                        onChange={(e: any) => setFormData({
                          ...formData,
                          styling: {...formData.styling, backgroundColor: e.target.value}
                        })}
                        className="w-full h-10 border rounded"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Color de Texto</label>
                      <input
                        type="color"
                        value={formData.styling.textColor}
                        onChange={(e: any) => setFormData({
                          ...formData,
                          styling: {...formData.styling, textColor: e.target.value}
                        })}
                        className="w-full h-10 border rounded"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Color del Botón</label>
                      <input
                        type="color"
                        value={formData.styling.buttonColor}
                        onChange={(e: any) => setFormData({
                          ...formData,
                          styling: {...formData.styling, buttonColor: e.target.value}
                        })}
                        className="w-full h-10 border rounded"
                      />
                    </div>
                  </div>
                </div>

                {/* Vista previa */}
                {formData.title && (
                  <div className="border-t pt-4">
                    <h3 className="font-medium mb-3">Vista Previa</h3>
                    <div 
                      className="rounded-lg p-4 border-l-4 max-w-md"
                      style={{
                        backgroundColor: formData.styling.backgroundColor,
                        color: formData.styling.textColor,
                        borderLeftColor: formData.styling.buttonColor
                      }}
                    >
                      <h5 className="font-semibold mb-2">{formData.title}</h5>
                      <p className="text-sm mb-3">{formData.description}</p>
                      <button
                        className="text-white px-4 py-2 rounded text-sm font-medium"
                        style={{ backgroundColor: formData.styling.buttonColor }}
                      >
                        {formData.ctaText}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => {
                    setShowCreateModal(false);
                    resetForm();
                  }}
                  className="px-4 py-2 border rounded-lg hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={createPromo}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Crear Promoción
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
