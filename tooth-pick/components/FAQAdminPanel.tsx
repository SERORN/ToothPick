'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';

interface FAQ {
  _id: string;
  question: string;
  answer: string;
  category: string;
  rolesVisibleTo: string[];
  isPublished: boolean;
  views: number;
  isHelpful: number;
  isNotHelpful: number;
  createdAt: string;
  updatedAt: string;
  createdBy: {
    _id: string;
    name: string;
  };
}

const FAQAdminPanel: React.FC = () => {
  const { data: session } = useSession();
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingFAQ, setEditingFAQ] = useState<FAQ | null>(null);

  const [formData, setFormData] = useState({
    question: '',
    answer: '',
    category: '',
    rolesVisibleTo: ['all'] as string[],
    isPublished: false
  });

  const categories = [
    { value: 'general', label: 'General' },
    { value: 'technical', label: 'Técnico' },
    { value: 'billing', label: 'Facturación' },
    { value: 'products', label: 'Productos' },
    { value: 'account', label: 'Cuenta' },
    { value: 'marketplace', label: 'Marketplace' },
    { value: 'toothpay', label: 'ToothPay' }
  ];

  const roles = [
    { value: 'all', label: 'Todos los usuarios' },
    { value: 'provider', label: 'Proveedores' },
    { value: 'distributor', label: 'Distribuidores' },
    { value: 'clinic', label: 'Clínicas' },
    { value: 'admin', label: 'Administradores' }
  ];

  useEffect(() => {
    if (session?.user?.role === 'admin') {
      fetchFAQs();
    }
  }, [session]);

  const fetchFAQs = async () => {
    try {
      setLoading(true);
      setError('');

      const response = await fetch('/api/support/faqs?includeUnpublished=true');
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Error al cargar FAQs');
      }

      setFaqs(result.data || []);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar FAQs');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.question.trim() || !formData.answer.trim() || !formData.category) {
      setError('Por favor completa todos los campos requeridos');
      return;
    }

    try {
      const url = editingFAQ ? `/api/support/faqs/${editingFAQ._id}` : '/api/support/faqs';
      const method = editingFAQ ? 'PATCH' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Error al guardar FAQ');
      }

      setFormData({
        question: '',
        answer: '',
        category: '',
        rolesVisibleTo: ['all'],
        isPublished: false
      });
      setShowCreateForm(false);
      setEditingFAQ(null);
      fetchFAQs();

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar FAQ');
    }
  };

  const handleEdit = (faq: FAQ) => {
    setFormData({
      question: faq.question,
      answer: faq.answer,
      category: faq.category,
      rolesVisibleTo: faq.rolesVisibleTo,
      isPublished: faq.isPublished
    });
    setEditingFAQ(faq);
    setShowCreateForm(true);
  };

  const handleDelete = async (faqId: string) => {
    if (!confirm('¿Estás seguro de que quieres eliminar este FAQ?')) {
      return;
    }

    try {
      const response = await fetch(`/api/support/faqs/${faqId}`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Error al eliminar FAQ');
      }

      fetchFAQs();

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al eliminar FAQ');
    }
  };

  const handleTogglePublished = async (faq: FAQ) => {
    try {
      const response = await fetch(`/api/support/faqs/${faq._id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          isPublished: !faq.isPublished
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Error al actualizar FAQ');
      }

      fetchFAQs();

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al actualizar FAQ');
    }
  };

  const handleRoleChange = (role: string) => {
    if (role === 'all') {
      setFormData(prev => ({ ...prev, rolesVisibleTo: ['all'] }));
    } else {
      setFormData(prev => {
        const newRoles = prev.rolesVisibleTo.includes('all') 
          ? [role]
          : prev.rolesVisibleTo.includes(role)
            ? prev.rolesVisibleTo.filter(r => r !== role)
            : [...prev.rolesVisibleTo.filter(r => r !== 'all'), role];
        
        return { ...prev, rolesVisibleTo: newRoles.length > 0 ? newRoles : ['all'] };
      });
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (session?.user?.role !== 'admin') {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-md">
        <p className="text-red-600">No tienes permisos para acceder a esta sección</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Gestión de FAQs</h1>
        <button
          onClick={() => {
            setShowCreateForm(true);
            setEditingFAQ(null);
            setFormData({
              question: '',
              answer: '',
              category: '',
              rolesVisibleTo: ['all'],
              isPublished: false
            });
          }}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          Crear FAQ
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-md">
          <p className="text-red-600 text-sm">{error}</p>
        </div>
      )}

      {/* Formulario de creación/edición */}
      {showCreateForm && (
        <div className="bg-white border rounded-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            {editingFAQ ? 'Editar FAQ' : 'Crear Nuevo FAQ'}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="question" className="block text-sm font-medium text-gray-700 mb-1">
                Pregunta *
              </label>
              <input
                type="text"
                id="question"
                value={formData.question}
                onChange={(e) => setFormData(prev => ({ ...prev, question: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label htmlFor="answer" className="block text-sm font-medium text-gray-700 mb-1">
                Respuesta *
              </label>
              <textarea
                id="answer"
                value={formData.answer}
                onChange={(e) => setFormData(prev => ({ ...prev, answer: e.target.value }))}
                rows={6}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">
                Categoría *
              </label>
              <select
                id="category"
                value={formData.category}
                onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">Selecciona una categoría</option>
                {categories.map(category => (
                  <option key={category.value} value={category.value}>
                    {category.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Visible para roles
              </label>
              <div className="space-y-2">
                {roles.map(role => (
                  <label key={role.value} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.rolesVisibleTo.includes(role.value)}
                      onChange={() => handleRoleChange(role.value)}
                      className="mr-2"
                    />
                    <span className="text-sm text-gray-700">{role.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.isPublished}
                  onChange={(e) => setFormData(prev => ({ ...prev, isPublished: e.target.checked }))}
                  className="mr-2"
                />
                <span className="text-sm text-gray-700">Publicar inmediatamente</span>
              </label>
            </div>

            <div className="flex justify-end space-x-2">
              <button
                type="button"
                onClick={() => setShowCreateForm(false)}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                {editingFAQ ? 'Actualizar' : 'Crear'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Lista de FAQs */}
      <div className="bg-white border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Pregunta
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Categoría
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Estado
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Estadísticas
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Roles
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Fecha
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {faqs.map((faq) => (
                <tr key={faq._id}>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    <div className="max-w-xs truncate">
                      {faq.question}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {categories.find(c => c.value === faq.category)?.label || faq.category}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      faq.isPublished 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {faq.isPublished ? 'Publicado' : 'Borrador'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div className="space-y-1">
                      <div>Vistas: {faq.views}</div>
                      <div>Útil: +{faq.isHelpful} / -{faq.isNotHelpful}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {faq.rolesVisibleTo.includes('all') 
                      ? 'Todos' 
                      : faq.rolesVisibleTo.join(', ')
                    }
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(faq.createdAt)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleEdit(faq)}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => handleTogglePublished(faq)}
                        className={`${
                          faq.isPublished 
                            ? 'text-red-600 hover:text-red-800' 
                            : 'text-green-600 hover:text-green-800'
                        }`}
                      >
                        {faq.isPublished ? 'Despublicar' : 'Publicar'}
                      </button>
                      <button
                        onClick={() => handleDelete(faq._id)}
                        className="text-red-600 hover:text-red-800"
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

        {faqs.length === 0 && (
          <div className="p-8 text-center">
            <p className="text-gray-500">No hay FAQs creados</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default FAQAdminPanel;
