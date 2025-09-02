'use client';

import { useState } from 'react';
import { X, Flag, AlertTriangle, MessageSquare, Mail, Eye } from 'lucide-react';

interface ReportReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  reviewId: string;
  reviewContent: string;
  onReportSubmitted?: () => void;
}

const REPORT_REASONS = [
  {
    id: 'spam',
    label: 'Spam o contenido promocional',
    description: 'Contenido promocional no relacionado o spam',
    icon: Mail
  },
  {
    id: 'inappropriate',
    label: 'Contenido inapropiado',
    description: 'Lenguaje ofensivo, discriminatorio o inapropiado',
    icon: AlertTriangle
  },
  {
    id: 'fake',
    label: 'Reseña falsa o fraudulenta',
    description: 'Reseña que parece ser falsa o manipulada',
    icon: Eye
  },
  {
    id: 'irrelevant',
    label: 'No relacionado con el producto',
    description: 'Contenido que no está relacionado con el producto/servicio',
    icon: MessageSquare
  },
  {
    id: 'harassment',
    label: 'Acoso o ataque personal',
    description: 'Contenido que constituye acoso hacia una persona',
    icon: Flag
  },
  {
    id: 'other',
    label: 'Otro motivo',
    description: 'Especifica otro motivo en los comentarios',
    icon: AlertTriangle
  }
];

export default function ReportReviewModal({
  isOpen,
  onClose,
  reviewId,
  reviewContent,
  onReportSubmitted
}: ReportReviewModalProps) {
  const [selectedReason, setSelectedReason] = useState<string>('');
  const [additionalComments, setAdditionalComments] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedReason) {
      setError('Por favor selecciona un motivo para el reporte');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch(`/api/reviews/${reviewId}/report`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reason: selectedReason,
          additionalComments: additionalComments.trim() || undefined
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error al enviar el reporte');
      }

      // Reset form
      setSelectedReason('');
      setAdditionalComments('');
      
      // Call callback if provided
      onReportSubmitted?.();
      
      // Close modal
      onClose();
      
      // Show success message (you might want to use a toast library instead)
      alert('Reporte enviado correctamente. Nuestro equipo lo revisará pronto.');
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setSelectedReason('');
      setAdditionalComments('');
      setError(null);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <Flag className="w-6 h-6 text-red-600" />
            <h2 className="text-xl font-semibold text-gray-900">
              Reportar Reseña
            </h2>
          </div>
          <button
            onClick={handleClose}
            disabled={isSubmitting}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Review Preview */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-medium text-gray-900 mb-2">Reseña a reportar:</h3>
            <p className="text-gray-700 text-sm leading-relaxed">
              {reviewContent.length > 200 
                ? `${reviewContent.substring(0, 200)}...` 
                : reviewContent
              }
            </p>
          </div>

          {/* Reason Selection */}
          <div className="space-y-4">
            <h3 className="font-medium text-gray-900">
              ¿Por qué reportas esta reseña? <span className="text-red-500">*</span>
            </h3>
            <div className="space-y-3">
              {REPORT_REASONS.map((reason) => {
                const IconComponent = reason.icon;
                return (
                  <label
                    key={reason.id}
                    className={`
                      flex items-start space-x-3 p-4 border rounded-lg cursor-pointer transition-all
                      ${selectedReason === reason.id
                        ? 'border-red-500 bg-red-50'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                      }
                    `}
                  >
                    <input
                      type="radio"
                      name="reason"
                      value={reason.id}
                      checked={selectedReason === reason.id}
                      onChange={(e) => setSelectedReason(e.target.value)}
                      className="mt-1 text-red-600 focus:ring-red-500"
                    />
                    <IconComponent className={`
                      w-5 h-5 mt-0.5 flex-shrink-0
                      ${selectedReason === reason.id ? 'text-red-600' : 'text-gray-400'}
                    `} />
                    <div className="flex-1 min-w-0">
                      <div className={`
                        font-medium text-sm
                        ${selectedReason === reason.id ? 'text-red-900' : 'text-gray-900'}
                      `}>
                        {reason.label}
                      </div>
                      <div className={`
                        text-sm
                        ${selectedReason === reason.id ? 'text-red-700' : 'text-gray-600'}
                      `}>
                        {reason.description}
                      </div>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Additional Comments */}
          <div className="space-y-2">
            <label htmlFor="comments" className="block font-medium text-gray-900">
              Comentarios adicionales
              {selectedReason === 'other' && (
                <span className="text-red-500 ml-1">*</span>
              )}
            </label>
            <textarea
              id="comments"
              rows={4}
              value={additionalComments}
              onChange={(e) => setAdditionalComments(e.target.value)}
              placeholder={
                selectedReason === 'other'
                  ? 'Por favor especifica el motivo del reporte...'
                  : 'Proporciona detalles adicionales sobre este reporte (opcional)'
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
              required={selectedReason === 'other'}
            />
            <p className="text-xs text-gray-500">
              Esta información nos ayudará a revisar el reporte de manera más efectiva.
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-3">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0" />
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          )}

          {/* Disclaimer */}
          <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
            <p className="text-xs text-blue-800 leading-relaxed">
              <strong>Importante:</strong> Los reportes falsos o malintencionados pueden resultar 
              en acciones contra tu cuenta. Solo reporta contenido que genuinamente viole 
              nuestras políticas de comunidad.
            </p>
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={handleClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !selectedReason || (selectedReason === 'other' && !additionalComments.trim())}
              className="px-6 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Enviando...</span>
                </>
              ) : (
                <>
                  <Flag className="w-4 h-4" />
                  <span>Enviar Reporte</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
