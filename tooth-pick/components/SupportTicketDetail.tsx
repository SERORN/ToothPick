'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';

interface User {
  _id: string;
  name: string;
  email: string;
  role: string;
}

interface Reply {
  _id: string;
  message: string;
  author: User;
  createdAt: string;
  isInternal: boolean;
  readBy: string[];
}

interface Ticket {
  _id: string;
  ticketNumber: string;
  subject: string;
  description: string;
  category: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  user: User;
  assignedTo?: User;
  replies: Reply[];
  createdAt: string;
  updatedAt: string;
  satisfactionRating?: number;
  satisfactionComment?: string;
}

interface SupportTicketDetailProps {
  ticketId: string;
}

const SupportTicketDetail: React.FC<SupportTicketDetailProps> = ({ ticketId }) => {
  const { data: session } = useSession();
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [replyMessage, setReplyMessage] = useState('');
  const [isSubmittingReply, setIsSubmittingReply] = useState(false);
  const [satisfactionRating, setSatisfactionRating] = useState<number | null>(null);
  const [satisfactionComment, setSatisfactionComment] = useState('');
  const [isSubmittingSatisfaction, setIsSubmittingSatisfaction] = useState(false);

  const statusColors = {
    open: 'bg-blue-100 text-blue-800',
    in_progress: 'bg-yellow-100 text-yellow-800',
    resolved: 'bg-green-100 text-green-800',
    closed: 'bg-gray-100 text-gray-800'
  };

  const priorityColors = {
    low: 'bg-green-100 text-green-800',
    medium: 'bg-yellow-100 text-yellow-800',
    high: 'bg-orange-100 text-orange-800',
    urgent: 'bg-red-100 text-red-800'
  };

  const statusLabels = {
    open: 'Abierto',
    in_progress: 'En Progreso',
    resolved: 'Resuelto',
    closed: 'Cerrado'
  };

  const priorityLabels = {
    low: 'Baja',
    medium: 'Media',
    high: 'Alta',
    urgent: 'Urgente'
  };

  useEffect(() => {
    fetchTicket();
  }, [ticketId]);

  const fetchTicket = async () => {
    try {
      setLoading(true);
      setError('');

      const response = await fetch(`/api/support/tickets/${ticketId}`);
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Error al cargar el ticket');
      }

      setTicket(result.data);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar el ticket');
    } finally {
      setLoading(false);
    }
  };

  const handleReplySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!replyMessage.trim()) return;

    try {
      setIsSubmittingReply(true);

      const response = await fetch(`/api/support/tickets/${ticketId}/replies`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: replyMessage.trim()
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Error al enviar respuesta');
      }

      setReplyMessage('');
      fetchTicket(); // Refresh ticket to show new reply

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al enviar respuesta');
    } finally {
      setIsSubmittingReply(false);
    }
  };

  const handleSatisfactionSubmit = async () => {
    if (satisfactionRating === null) return;

    try {
      setIsSubmittingSatisfaction(true);

      const response = await fetch(`/api/support/tickets/${ticketId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          satisfactionRating,
          satisfactionComment: satisfactionComment.trim()
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Error al enviar calificación');
      }

      fetchTicket(); // Refresh ticket

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al enviar calificación');
    } finally {
      setIsSubmittingSatisfaction(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const canReply = session?.user?.id && (
    session.user.role === 'admin' || 
    session.user.id === ticket?.user._id ||
    session.user.id === ticket?.assignedTo?._id
  );

  const showSatisfactionForm = ticket?.status === 'resolved' && 
    session?.user?.id === ticket?.user._id && 
    !ticket.satisfactionRating;

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error || !ticket) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-md">
        <p className="text-red-600">{error || 'Ticket no encontrado'}</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header del ticket */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              #{ticket.ticketNumber}
            </h1>
            <h2 className="text-xl text-gray-700 mb-4">
              {ticket.subject}
            </h2>
          </div>
          <div className="flex space-x-2">
            <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${statusColors[ticket.status]}`}>
              {statusLabels[ticket.status]}
            </span>
            <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${priorityColors[ticket.priority]}`}>
              {priorityLabels[ticket.priority]}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
          <div>
            <strong>Categoría:</strong> {ticket.category}
          </div>
          <div>
            <strong>Creado:</strong> {formatDate(ticket.createdAt)}
          </div>
          <div>
            <strong>Usuario:</strong> {ticket.user.name} ({ticket.user.email})
          </div>
          <div>
            <strong>Asignado a:</strong> {ticket.assignedTo ? `${ticket.assignedTo.name}` : 'Sin asignar'}
          </div>
          <div>
            <strong>Última actualización:</strong> {formatDate(ticket.updatedAt)}
          </div>
          {ticket.satisfactionRating && (
            <div>
              <strong>Calificación:</strong> {ticket.satisfactionRating}/5 ⭐
            </div>
          )}
        </div>
      </div>

      {/* Descripción del ticket */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Descripción</h3>
        <div className="prose prose-sm max-w-none">
          <p className="whitespace-pre-wrap text-gray-700">{ticket.description}</p>
        </div>
      </div>

      {/* Respuestas */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Respuestas ({ticket.replies?.length || 0})
        </h3>
        
        <div className="space-y-4">
          {ticket.replies?.map((reply) => (
            <div key={reply._id} className={`border rounded-lg p-4 ${reply.isInternal ? 'bg-yellow-50 border-yellow-200' : 'bg-gray-50'}`}>
              <div className="flex justify-between items-start mb-2">
                <div className="flex items-center space-x-2">
                  <span className="font-medium text-gray-900">
                    {reply.author.name}
                  </span>
                  <span className="text-sm text-gray-500">
                    ({reply.author.role})
                  </span>
                  {reply.isInternal && (
                    <span className="text-xs bg-yellow-200 text-yellow-800 px-2 py-1 rounded">
                      Nota interna
                    </span>
                  )}
                </div>
                <span className="text-sm text-gray-500">
                  {formatDate(reply.createdAt)}
                </span>
              </div>
              <div className="prose prose-sm max-w-none">
                <p className="whitespace-pre-wrap text-gray-700">{reply.message}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Formulario de respuesta */}
        {canReply && ticket.status !== 'closed' && (
          <form onSubmit={handleReplySubmit} className="mt-6 space-y-4">
            <div>
              <label htmlFor="reply" className="block text-sm font-medium text-gray-700 mb-2">
                Escribir respuesta
              </label>
              <textarea
                id="reply"
                value={replyMessage}
                onChange={(e) => setReplyMessage(e.target.value)}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Escribe tu respuesta aquí..."
                required
              />
            </div>
            <button
              type="submit"
              disabled={isSubmittingReply || !replyMessage.trim()}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmittingReply ? 'Enviando...' : 'Enviar Respuesta'}
            </button>
          </form>
        )}
      </div>

      {/* Formulario de satisfacción */}
      {showSatisfactionForm && (
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Califica el soporte recibido
          </h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                ¿Qué tan satisfecho estás con la resolución? *
              </label>
              <div className="flex space-x-2">
                {[1, 2, 3, 4, 5].map((rating) => (
                  <button
                    key={rating}
                    type="button"
                    onClick={() => setSatisfactionRating(rating)}
                    className={`w-10 h-10 rounded-full border-2 flex items-center justify-center ${
                      satisfactionRating === rating
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white text-gray-600 border-gray-300 hover:border-blue-400'
                    }`}
                  >
                    {rating}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label htmlFor="satisfactionComment" className="block text-sm font-medium text-gray-700 mb-2">
                Comentarios adicionales (opcional)
              </label>
              <textarea
                id="satisfactionComment"
                value={satisfactionComment}
                onChange={(e) => setSatisfactionComment(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Comparte tu experiencia o sugerencias..."
              />
            </div>

            <button
              onClick={handleSatisfactionSubmit}
              disabled={isSubmittingSatisfaction || satisfactionRating === null}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmittingSatisfaction ? 'Enviando...' : 'Enviar Calificación'}
            </button>
          </div>
        </div>
      )}

      {/* Mostrar calificación existente */}
      {ticket.satisfactionRating && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-green-900 mb-2">
            Calificación del soporte
          </h3>
          <div className="flex items-center space-x-2 mb-2">
            <span className="text-green-700">Calificación:</span>
            <span className="text-xl">
              {'⭐'.repeat(ticket.satisfactionRating)}
            </span>
            <span className="text-green-700">({ticket.satisfactionRating}/5)</span>
          </div>
          {ticket.satisfactionComment && (
            <p className="text-green-700 italic">"{ticket.satisfactionComment}"</p>
          )}
        </div>
      )}
    </div>
  );
};

export default SupportTicketDetail;
