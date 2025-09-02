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

interface FAQListProps {
  adminView?: boolean;
  category?: string;
  limit?: number;
}

const FAQList: React.FC<FAQListProps> = ({
  adminView = false,
  category,
  limit
}) => {
  const { data: session } = useSession();
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(category || '');
  const [expandedFAQ, setExpandedFAQ] = useState<string | null>(null);

  const categories = [
    { value: 'general', label: 'General' },
    { value: 'technical', label: 'Técnico' },
    { value: 'billing', label: 'Facturación' },
    { value: 'products', label: 'Productos' },
    { value: 'account', label: 'Cuenta' },
    { value: 'marketplace', label: 'Marketplace' },
    { value: 'toothpay', label: 'ToothPay' }
  ];

  useEffect(() => {
    fetchFAQs();
  }, [selectedCategory, searchTerm]);

  const fetchFAQs = async () => {
    try {
      setLoading(true);
      setError('');

      const params = new URLSearchParams();
      if (selectedCategory) params.append('category', selectedCategory);
      if (searchTerm) params.append('search', searchTerm);
      if (limit) params.append('limit', limit.toString());

      const response = await fetch(`/api/support/faqs?${params}`);
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

  const handleFAQVote = async (faqId: string, isHelpful: boolean) => {
    try {
      const response = await fetch(`/api/support/faqs/${faqId}/vote`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ isHelpful }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Error al votar');
      }

      // Update the FAQ in the list
      setFaqs(prev => prev.map(faq => 
        faq._id === faqId 
          ? { ...faq, isHelpful: result.data.isHelpful, isNotHelpful: result.data.isNotHelpful }
          : faq
      ));

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al votar');
    }
  };

  const toggleFAQ = (faqId: string) => {
    setExpandedFAQ(expandedFAQ === faqId ? null : faqId);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const filteredFAQs = faqs.filter(faq => {
    const matchesSearch = !searchTerm || 
      faq.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
      faq.answer.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = !selectedCategory || faq.category === selectedCategory;
    
    return matchesSearch && matchesCategory;
  });

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header y filtros */}
      {!adminView && (
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Preguntas Frecuentes
          </h1>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Encuentra respuestas rápidas a las preguntas más comunes sobre nuestros productos y servicios.
          </p>
        </div>
      )}

      {/* Filtros de búsqueda */}
      <div className="bg-white p-4 rounded-lg shadow-sm border">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-1">
              Buscar
            </label>
            <input
              type="text"
              id="search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Buscar en preguntas y respuestas..."
            />
          </div>

          <div>
            <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">
              Categoría
            </label>
            <select
              id="category"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Todas las categorías</option>
              {categories.map(cat => (
                <option key={cat.value} value={cat.value}>
                  {cat.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-md">
          <p className="text-red-600 text-sm">{error}</p>
        </div>
      )}

      {/* Lista de FAQs */}
      <div className="space-y-4">
        {filteredFAQs.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500">
              {searchTerm || selectedCategory 
                ? 'No se encontraron FAQs que coincidan con tu búsqueda'
                : 'No hay FAQs disponibles'
              }
            </p>
          </div>
        ) : (
          filteredFAQs.map((faq) => (
            <div key={faq._id} className="bg-white border rounded-lg shadow-sm">
              <button
                onClick={() => toggleFAQ(faq._id)}
                className="w-full px-6 py-4 text-left flex justify-between items-center hover:bg-gray-50 focus:outline-none focus:bg-gray-50"
              >
                <div className="flex-1">
                  <h3 className="text-lg font-medium text-gray-900 mb-1">
                    {faq.question}
                  </h3>
                  {adminView && (
                    <div className="flex items-center space-x-4 text-sm text-gray-500">
                      <span>Categoría: {categories.find(c => c.value === faq.category)?.label || faq.category}</span>
                      <span>Vistas: {faq.views}</span>
                      <span>Votos: +{faq.isHelpful} / -{faq.isNotHelpful}</span>
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        faq.isPublished 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {faq.isPublished ? 'Publicado' : 'Borrador'}
                      </span>
                    </div>
                  )}
                </div>
                <div className="flex items-center space-x-2">
                  {!adminView && (
                    <span className="text-sm text-gray-500">
                      {categories.find(c => c.value === faq.category)?.label}
                    </span>
                  )}
                  <svg
                    className={`w-5 h-5 text-gray-400 transform transition-transform ${
                      expandedFAQ === faq._id ? 'rotate-180' : ''
                    }`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </button>

              {expandedFAQ === faq._id && (
                <div className="px-6 pb-4 border-t bg-gray-50">
                  <div className="pt-4">
                    <div className="prose prose-sm max-w-none mb-4">
                      <div
                        className="text-gray-700"
                        dangerouslySetInnerHTML={{ __html: faq.answer.replace(/\n/g, '<br>') }}
                      />
                    </div>

                    {!adminView && session?.user?.id && (
                      <div className="flex items-center justify-between pt-4 border-t">
                        <div className="text-sm text-gray-500">
                          ¿Te ayudó esta respuesta?
                        </div>
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleFAQVote(faq._id, true)}
                            className="flex items-center space-x-1 px-3 py-1 text-sm text-green-600 hover:bg-green-50 rounded"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L9 6v4m-7 7l2-2m2 2l-2-2m8-2v-2a2 2 0 00-2-2h-2a2 2 0 00-2 2v2m0 0h4" />
                            </svg>
                            <span>Sí ({faq.isHelpful})</span>
                          </button>
                          <button
                            onClick={() => handleFAQVote(faq._id, false)}
                            className="flex items-center space-x-1 px-3 py-1 text-sm text-red-600 hover:bg-red-50 rounded"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14H5.236a2 2 0 01-1.789-2.894l3.5-7A2 2 0 018.736 3h4.018c.163 0 .326.02.485.06L17 4m-7 10v2a2 2 0 002 2h.095c.5 0 .905-.405.905-.905 0-.714.211-1.412.608-2.006L15 18v-4m-7-7l-2 2m2-2l2 2m8 2v2a2 2 0 002 2h2a2 2 0 002-2v-2m0 0h-4" />
                            </svg>
                            <span>No ({faq.isNotHelpful})</span>
                          </button>
                        </div>
                      </div>
                    )}

                    {adminView && (
                      <div className="pt-4 border-t text-xs text-gray-500">
                        <div className="flex justify-between">
                          <span>Creado por: {faq.createdBy.name}</span>
                          <span>Fecha: {formatDate(faq.createdAt)}</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Información adicional para no-admin */}
      {!adminView && filteredFAQs.length > 0 && (
        <div className="text-center pt-8">
          <p className="text-gray-600">
            ¿No encontraste lo que buscabas?{' '}
            <a href="/support/new" className="text-blue-600 hover:text-blue-800 font-medium">
              Crea un ticket de soporte
            </a>
          </p>
        </div>
      )}
    </div>
  );
};

export default FAQList;
