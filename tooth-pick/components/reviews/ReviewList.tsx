'use client';

import { useState, useEffect } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { 
  ThumbsUp, 
  ThumbsDown, 
  Flag, 
  MoreVertical,
  Filter,
  ChevronDown,
  User,
  Verified
} from 'lucide-react';
import { StarDisplay } from './StarRating';

interface Review {
  _id: string;
  user: {
    _id: string;
    name: string;
    email: string;
    profileImage?: string;
  };
  targetType: 'product' | 'provider' | 'distributor';
  targetId: string;
  rating: number;
  title: string;
  content: string;
  isVerifiedPurchase: boolean;
  helpfulVotes: number;
  unhelpfulVotes: number;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  updatedAt: string;
}

interface ReviewListProps {
  targetId: string;
  targetType: 'product' | 'provider' | 'distributor';
  currentUserId?: string;
  showFilters?: boolean;
  className?: string;
}

interface ReviewFilters {
  rating: number | null;
  sortBy: 'newest' | 'oldest' | 'highest' | 'lowest' | 'helpful';
  verifiedOnly: boolean;
}

export default function ReviewList({
  targetId,
  targetType,
  currentUserId,
  showFilters = true,
  className = ''
}: ReviewListProps) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<ReviewFilters>({
    rating: null,
    sortBy: 'newest',
    verifiedOnly: false
  });
  const [showFiltersPanel, setShowFiltersPanel] = useState(false);
  const [votedReviews, setVotedReviews] = useState<Record<string, 'helpful' | 'unhelpful'>>({});

  useEffect(() => {
    fetchReviews();
  }, [targetId, targetType, filters]);

  const fetchReviews = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        targetId,
        targetType,
        ...(filters.rating && { rating: filters.rating.toString() }),
        sortBy: filters.sortBy,
        ...(filters.verifiedOnly && { verifiedOnly: 'true' })
      });

      const response = await fetch(`/api/reviews?${params}`);
      if (!response.ok) {
        throw new Error('Error al cargar las reseñas');
      }

      const data = await response.json();
      setReviews(data.reviews || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  };

  const handleVote = async (reviewId: string, voteType: 'helpful' | 'unhelpful') => {
    if (!currentUserId) {
      // Mostrar modal de login o mensaje
      return;
    }

    try {
      const response = await fetch(`/api/reviews/${reviewId}/vote`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ voteType }),
      });

      if (!response.ok) {
        throw new Error('Error al votar');
      }

      const data = await response.json();
      
      // Actualizar el estado local
      setReviews(prev => prev.map(review => 
        review._id === reviewId 
          ? { 
              ...review, 
              helpfulVotes: data.helpfulVotes,
              unhelpfulVotes: data.unhelpfulVotes
            }
          : review
      ));

      setVotedReviews(prev => ({
        ...prev,
        [reviewId]: voteType
      }));
    } catch (err) {
      console.error('Error voting:', err);
    }
  };

  const handleReport = async (reviewId: string, reason: string) => {
    if (!currentUserId) return;

    try {
      const response = await fetch(`/api/reviews/${reviewId}/report`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ reason }),
      });

      if (!response.ok) {
        throw new Error('Error al reportar la reseña');
      }

      // Mostrar mensaje de éxito
      alert('Reseña reportada correctamente. Nuestro equipo la revisará.');
    } catch (err) {
      console.error('Error reporting review:', err);
      alert('Error al reportar la reseña. Inténtalo de nuevo.');
    }
  };

  const FilterPanel = () => (
    <div className="bg-gray-50 p-4 rounded-lg space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Rating filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Calificación
          </label>
          <select
            value={filters.rating || ''}
            onChange={(e) => setFilters(prev => ({
              ...prev,
              rating: e.target.value ? parseInt(e.target.value) : null
            }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Todas</option>
            <option value="5">5 estrellas</option>
            <option value="4">4 estrellas</option>
            <option value="3">3 estrellas</option>
            <option value="2">2 estrellas</option>
            <option value="1">1 estrella</option>
          </select>
        </div>

        {/* Sort filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Ordenar por
          </label>
          <select
            value={filters.sortBy}
            onChange={(e) => setFilters(prev => ({
              ...prev,
              sortBy: e.target.value as ReviewFilters['sortBy']
            }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="newest">Más recientes</option>
            <option value="oldest">Más antiguos</option>
            <option value="highest">Mayor calificación</option>
            <option value="lowest">Menor calificación</option>
            <option value="helpful">Más útiles</option>
          </select>
        </div>

        {/* Verified filter */}
        <div>
          <label className="flex items-center space-x-2 pt-6">
            <input
              type="checkbox"
              checked={filters.verifiedOnly}
              onChange={(e) => setFilters(prev => ({
                ...prev,
                verifiedOnly: e.target.checked
              }))}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700">Solo compras verificadas</span>
          </label>
        </div>
      </div>
    </div>
  );

  const ReviewCard = ({ review }: { review: Review }) => (
    <div className="bg-white p-6 border border-gray-200 rounded-lg space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center">
            {review.user.profileImage ? (
              <img
                src={review.user.profileImage}
                alt={review.user.name}
                className="w-10 h-10 rounded-full object-cover"
              />
            ) : (
              <User className="w-5 h-5 text-gray-600" />
            )}
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-medium text-gray-900">
                {review.user.name}
              </span>
              {review.isVerifiedPurchase && (
                <div className="flex items-center space-x-1 text-green-600">
                  <Verified className="w-4 h-4" />
                  <span className="text-xs">Compra verificada</span>
                </div>
              )}
            </div>
            <span className="text-sm text-gray-500">
              {formatDistanceToNow(new Date(review.createdAt), { 
                addSuffix: true, 
                locale: es 
              })}
            </span>
          </div>
        </div>
        
        {currentUserId && currentUserId !== review.user._id && (
          <div className="relative">
            <button className="p-1 hover:bg-gray-100 rounded">
              <MoreVertical className="w-4 h-4 text-gray-400" />
            </button>
          </div>
        )}
      </div>

      {/* Rating and title */}
      <div className="space-y-2">
        <StarDisplay rating={review.rating} size="sm" showValue={false} />
        <h3 className="font-semibold text-gray-900">{review.title}</h3>
      </div>

      {/* Content */}
      <p className="text-gray-700 leading-relaxed">{review.content}</p>

      {/* Actions */}
      <div className="flex items-center justify-between pt-4 border-t border-gray-100">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => handleVote(review._id, 'helpful')}
            className={`
              flex items-center space-x-2 px-3 py-1 rounded-full text-sm transition-colors
              ${votedReviews[review._id] === 'helpful'
                ? 'bg-green-100 text-green-700'
                : 'text-gray-600 hover:bg-gray-100'
              }
            `}
            disabled={!currentUserId}
          >
            <ThumbsUp className="w-4 h-4" />
            <span>Útil ({review.helpfulVotes})</span>
          </button>
          
          <button
            onClick={() => handleVote(review._id, 'unhelpful')}
            className={`
              flex items-center space-x-2 px-3 py-1 rounded-full text-sm transition-colors
              ${votedReviews[review._id] === 'unhelpful'
                ? 'bg-red-100 text-red-700'
                : 'text-gray-600 hover:bg-gray-100'
              }
            `}
            disabled={!currentUserId}
          >
            <ThumbsDown className="w-4 h-4" />
            <span>No útil ({review.unhelpfulVotes})</span>
          </button>
        </div>

        {currentUserId && currentUserId !== review.user._id && (
          <button
            onClick={() => handleReport(review._id, 'inappropriate')}
            className="flex items-center space-x-1 text-gray-500 hover:text-red-600 text-sm"
          >
            <Flag className="w-4 h-4" />
            <span>Reportar</span>
          </button>
        )}
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className={`space-y-4 ${className}`}>
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white p-6 border border-gray-200 rounded-lg">
            <div className="animate-pulse space-y-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gray-300 rounded-full"></div>
                <div className="space-y-2">
                  <div className="h-4 bg-gray-300 rounded w-32"></div>
                  <div className="h-3 bg-gray-300 rounded w-24"></div>
                </div>
              </div>
              <div className="h-4 bg-gray-300 rounded w-full"></div>
              <div className="h-4 bg-gray-300 rounded w-3/4"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className={`text-center py-8 ${className}`}>
        <p className="text-red-600">{error}</p>
        <button
          onClick={fetchReviews}
          className="mt-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Filters */}
      {showFilters && (
        <div className="space-y-4">
          <button
            onClick={() => setShowFiltersPanel(!showFiltersPanel)}
            className="flex items-center space-x-2 text-gray-600 hover:text-gray-900"
          >
            <Filter className="w-4 h-4" />
            <span>Filtros</span>
            <ChevronDown 
              className={`w-4 h-4 transition-transform ${
                showFiltersPanel ? 'rotate-180' : ''
              }`} 
            />
          </button>
          
          {showFiltersPanel && <FilterPanel />}
        </div>
      )}

      {/* Reviews */}
      {reviews.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-500">No hay reseñas disponibles</p>
        </div>
      ) : (
        <div className="space-y-4">
          {reviews.map((review) => (
            <ReviewCard key={review._id} review={review} />
          ))}
        </div>
      )}
    </div>
  );
}
