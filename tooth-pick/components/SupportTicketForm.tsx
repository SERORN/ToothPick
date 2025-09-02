'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';

interface SupportTicketFormProps {
  onSubmit?: (ticket: any) => void;
  isModal?: boolean;
}

const SupportTicketForm: React.FC<SupportTicketFormProps> = ({ 
  onSubmit, 
  isModal = false 
}) => {
  const { data: session } = useSession();
  const router = useRouter();
  
  const [formData, setFormData] = useState({
    subject: '',
    description: '',
    category: '',
    priority: 'medium' as 'low' | 'medium' | 'high' | 'urgent',
    attachments: [] as string[]
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const categories = [
    { value: 'technical', label: 'Soporte Técnico' },
    { value: 'billing', label: 'Facturación' },
    { value: 'product', label: 'Producto' },
    { value: 'account', label: 'Cuenta' },
    { value: 'general', label: 'General' }
  ];

  const priorities = [
    { value: 'low', label: 'Baja', color: 'text-green-600' },
    { value: 'medium', label: 'Media', color: 'text-yellow-600' },
    { value: 'high', label: 'Alta', color: 'text-orange-600' },
    { value: 'urgent', label: 'Urgente', color: 'text-red-600' }
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!session?.user?.id) {
      setError('Debes estar autenticado para crear un ticket');
      return;
    }

    if (!formData.subject.trim() || !formData.description.trim() || !formData.category) {
      setError('Por favor completa todos los campos requeridos');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/support/tickets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Error al crear el ticket');
      }

      if (onSubmit) {
        onSubmit(result.data);
      } else {
        router.push(`/support/${result.data._id}`);
      }
      
      // Reset form
      setFormData({
        subject: '',
        description: '',
        category: '',
        priority: 'medium',
        attachments: []
      });

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al crear el ticket');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  return (
    <div className={`${isModal ? 'p-6' : 'max-w-2xl mx-auto p-6'}`}>
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">
          Crear Ticket de Soporte
        </h2>

        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Asunto */}
          <div>
            <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-2">
              Asunto *
            </label>
            <input
              type="text"
              id="subject"
              name="subject"
              value={formData.subject}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Describe brevemente tu problema"
              maxLength={200}
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              {formData.subject.length}/200 caracteres
            </p>
          </div>

          {/* Categoría */}
          <div>
            <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-2">
              Categoría *
            </label>
            <select
              id="category"
              name="category"
              value={formData.category}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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

          {/* Prioridad */}
          <div>
            <label htmlFor="priority" className="block text-sm font-medium text-gray-700 mb-2">
              Prioridad
            </label>
            <select
              id="priority"
              name="priority"
              value={formData.priority}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {priorities.map(priority => (
                <option key={priority.value} value={priority.value}>
                  {priority.label}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-1">
              Selecciona la prioridad según la urgencia de tu problema
            </p>
          </div>

          {/* Descripción */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
              Descripción *
            </label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              rows={6}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Describe tu problema con el mayor detalle posible. Incluye pasos para reproducir el error, mensajes de error específicos, etc."
              maxLength={2000}
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              {formData.description.length}/2000 caracteres
            </p>
          </div>

          {/* Botones */}
          <div className="flex justify-end space-x-4">
            {isModal && (
              <button
                type="button"
                onClick={() => router.back()}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
                disabled={isSubmitting}
              >
                Cancelar
              </button>
            )}
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Creando...' : 'Crear Ticket'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SupportTicketForm;
