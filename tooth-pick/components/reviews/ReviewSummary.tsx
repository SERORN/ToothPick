'use client';

import { useState, useEffect } from 'react';
import { Star, TrendingUp, Shield, Award } from 'lucide-react';
import { StarDisplay } from './StarRating';

interface ReviewStats {
  totalReviews: number;
  averageRating: number;
  ratingDistribution: {
    1: number;
    2: number;
    3: number;
    4: number;
    5: number;
  };
  verifiedPurchases: number;
  totalHelpfulVotes: number;
}

interface ReviewSummaryProps {
  targetId: string;
  targetType: 'product' | 'provider' | 'distributor';
  onWriteReview?: () => void;
  className?: string;
}

export default function ReviewSummary({
  targetId,
  targetType,
  onWriteReview,
  className = ''
}: ReviewSummaryProps) {
  const [stats, setStats] = useState<ReviewStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchStats();
  }, [targetId, targetType]);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `/api/reviews/stats?targetId=${targetId}&targetType=${targetType}`
      );
      
      if (!response.ok) {
        throw new Error('Error al cargar las estadísticas');
      }

      const data = await response.json();
      setStats(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  };

  const getRecommendationText = (rating: number, totalReviews: number) => {
    if (totalReviews < 5) return 'Pocos comentarios disponibles';
    if (rating >= 4.5) return 'Altamente recomendado';
    if (rating >= 4.0) return 'Recomendado';
    if (rating >= 3.5) return 'Buena opción';
    if (rating >= 3.0) return 'Aceptable';
    return 'Considera otras opciones';
  };

  const getRecommendationColor = (rating: number) => {
    if (rating >= 4.5) return 'text-green-600 bg-green-50';
    if (rating >= 4.0) return 'text-blue-600 bg-blue-50';
    if (rating >= 3.5) return 'text-yellow-600 bg-yellow-50';
    if (rating >= 3.0) return 'text-orange-600 bg-orange-50';
    return 'text-red-600 bg-red-50';
  };

  const RatingBar = ({ stars, count, total }: { stars: number; count: number; total: number }) => {
    const percentage = total > 0 ? (count / total) * 100 : 0;
    
    return (
      <div className="flex items-center space-x-3">
        <div className="flex items-center space-x-1 w-12">
          <span className="text-sm text-gray-600">{stars}</span>
          <Star className="w-3 h-3 fill-gray-400 text-gray-400" />
        </div>
        <div className="flex-1 bg-gray-200 rounded-full h-2">
          <div
            className="bg-yellow-400 h-2 rounded-full transition-all duration-500"
            style={{ width: `${percentage}%` }}
          />
        </div>
        <span className="text-sm text-gray-600 w-8 text-right">{count}</span>
      </div>
    );
  };

  if (loading) {
    return (
      <div className={`bg-white p-6 border border-gray-200 rounded-lg ${className}`}>
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-300 rounded w-1/3"></div>
          <div className="flex items-center space-x-4">
            <div className="h-12 w-12 bg-gray-300 rounded"></div>
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-gray-300 rounded w-1/2"></div>
              <div className="h-3 bg-gray-300 rounded w-1/3"></div>
            </div>
          </div>
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-3 bg-gray-300 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-white p-6 border border-gray-200 rounded-lg ${className}`}>
        <div className="text-center text-red-600">
          <p>{error}</p>
          <button
            onClick={fetchStats}
            className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  if (!stats) {
    return null;
  }

  const { totalReviews, averageRating, ratingDistribution, verifiedPurchases, totalHelpfulVotes } = stats;

  return (
    <div className={`bg-white p-6 border border-gray-200 rounded-lg space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900">
          Reseñas y Calificaciones
        </h2>
        {onWriteReview && (
          <button
            onClick={onWriteReview}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Escribir reseña
          </button>
        )}
      </div>

      {totalReviews === 0 ? (
        <div className="text-center py-8">
          <div className="mb-4">
            <Star className="w-12 h-12 text-gray-300 mx-auto" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Sé el primero en opinar
          </h3>
          <p className="text-gray-600 mb-4">
            No hay reseñas disponibles. ¡Comparte tu experiencia!
          </p>
          {onWriteReview && (
            <button
              onClick={onWriteReview}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Escribir primera reseña
            </button>
          )}
        </div>
      ) : (
        <>
          {/* Overall Rating */}
          <div className="flex items-center space-x-6">
            <div className="text-center">
              <div className="text-4xl font-bold text-gray-900 mb-1">
                {averageRating.toFixed(1)}
              </div>
              <StarDisplay 
                rating={averageRating} 
                size="lg" 
                showValue={false}
                className="justify-center mb-2"
              />
              <div className="text-sm text-gray-600">
                {totalReviews} reseña{totalReviews !== 1 ? 's' : ''}
              </div>
            </div>

            <div className="flex-1">
              {/* Recommendation Badge */}
              <div className={`
                inline-flex items-center px-3 py-1 rounded-full text-sm font-medium mb-3
                ${getRecommendationColor(averageRating)}
              `}>
                <Award className="w-4 h-4 mr-1" />
                {getRecommendationText(averageRating, totalReviews)}
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex items-center space-x-2 text-gray-600">
                  <Shield className="w-4 h-4 text-green-600" />
                  <span>
                    {verifiedPurchases} compra{verifiedPurchases !== 1 ? 's' : ''} verificada{verifiedPurchases !== 1 ? 's' : ''}
                  </span>
                </div>
                <div className="flex items-center space-x-2 text-gray-600">
                  <TrendingUp className="w-4 h-4 text-blue-600" />
                  <span>
                    {totalHelpfulVotes} voto{totalHelpfulVotes !== 1 ? 's' : ''} útil{totalHelpfulVotes !== 1 ? 'es' : ''}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Rating Distribution */}
          <div className="space-y-3">
            <h3 className="font-medium text-gray-900">Distribución de calificaciones</h3>
            <div className="space-y-2">
              {[5, 4, 3, 2, 1].map((stars) => (
                <RatingBar
                  key={stars}
                  stars={stars}
                  count={ratingDistribution[stars as keyof typeof ratingDistribution]}
                  total={totalReviews}
                />
              ))}
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-3 gap-4 pt-4 border-t border-gray-100">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">
                {((verifiedPurchases / totalReviews) * 100).toFixed(0)}%
              </div>
              <div className="text-sm text-gray-600">Verificadas</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">
                {(totalHelpfulVotes / Math.max(totalReviews, 1)).toFixed(1)}
              </div>
              <div className="text-sm text-gray-600">Votos útiles/reseña</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">
                {(ratingDistribution[4] + ratingDistribution[5] > 0 
                  ? ((ratingDistribution[4] + ratingDistribution[5]) / totalReviews * 100).toFixed(0)
                  : 0
                )}%
              </div>
              <div className="text-sm text-gray-600">Satisfacción</div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
