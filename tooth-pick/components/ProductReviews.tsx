'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { toast } from 'react-hot-toast'

interface Review {
  _id: string
  rating: number
  comment?: string
  isVerifiedPurchase: boolean
  createdAt: string
  user: {
    name: string
  }
}

interface ReviewStats {
  totalReviews: number
  averageRating: number
  ratingDistribution: {
    five: number
    four: number
    three: number
    two: number
    one: number
  }
}

interface ProductReviewsProps {
  productId: string
  productName: string
}

export default function ProductReviews({ productId, productName }: ProductReviewsProps) {
  const { data: session } = useSession()
  const [reviews, setReviews] = useState<Review[]>([])
  const [stats, setStats] = useState<ReviewStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [showReviewForm, setShowReviewForm] = useState(false)
  const [newReview, setNewReview] = useState({ rating: 5, comment: '' })
  const [submitting, setSubmitting] = useState(false)
  const [canReview, setCanReview] = useState(false)

  useEffect(() => {
    fetchReviews()
    if (session?.user?.role === 'customer') {
      checkCanReview()
    }
  }, [productId, session])

  const fetchReviews = async () => {
    try {
      const res = await fetch(`/api/reviews?productId=${productId}&limit=10`)
      if (res.ok) {
        const data = await res.json()
        setReviews(data.reviews)
        setStats(data.stats)
      }
    } catch (error) {
      console.error('Error al cargar reseñas:', error)
    } finally {
      setLoading(false)
    }
  }

  const checkCanReview = async () => {
    // Aquí podrías hacer una llamada para verificar si puede reseñar
    // Por simplicidad, asumimos que sí puede si está autenticado como customer
    setCanReview(true)
  }

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)

    try {
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId,
          rating: newReview.rating,
          comment: newReview.comment.trim()
        })
      })

      const data = await res.json()

      if (res.ok) {
        toast.success('¡Reseña publicada exitosamente!')
        setReviews([data.review, ...reviews])
        setNewReview({ rating: 5, comment: '' })
        setShowReviewForm(false)
        setCanReview(false)
        fetchReviews() // Refrescar para actualizar stats
      } else {
        toast.error(data.error || 'Error al publicar reseña')
      }
    } catch (error) {
      toast.error('Error al publicar reseña')
    } finally {
      setSubmitting(false)
    }
  }

  const renderStars = (rating: number, size: 'sm' | 'md' | 'lg' = 'md') => {
    const sizeClasses = {
      sm: 'text-sm',
      md: 'text-base',
      lg: 'text-xl'
    }

    return (
      <div className={`flex items-center ${sizeClasses[size]}`}>
        {[1, 2, 3, 4, 5].map((star) => (
          <span
            key={star}
            className={star <= rating ? 'text-yellow-400' : 'text-gray-300'}
          >
            ⭐
          </span>
        ))}
      </div>
    )
  }

  const renderRatingDistribution = () => {
    if (!stats || stats.totalReviews === 0) return null

    return (
      <div className="space-y-2">
        {[5, 4, 3, 2, 1].map((rating) => {
          const count = stats.ratingDistribution[
            ['one', 'two', 'three', 'four', 'five'][rating - 1] as keyof typeof stats.ratingDistribution
          ]
          const percentage = stats.totalReviews > 0 ? (count / stats.totalReviews) * 100 : 0

          return (
            <div key={rating} className="flex items-center text-sm">
              <span className="w-3 text-right mr-2">{rating}</span>
              <span className="text-yellow-400 mr-2">⭐</span>
              <div className="flex-1 bg-gray-200 rounded-full h-2 mr-2">
                <div
                  className="bg-yellow-400 h-2 rounded-full"
                  style={{ width: `${percentage}%` }}
                />
              </div>
              <span className="w-8 text-xs text-gray-500">{count}</span>
            </div>
          )
        })}
      </div>
    )
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded w-5/6"></div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <h3 className="text-xl font-semibold mb-6">📝 Reseñas del Producto</h3>

      {/* Resumen de calificaciones */}
      {stats && stats.totalReviews > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Promedio */}
          <div className="text-center">
            <div className="text-4xl font-bold text-gray-900 mb-2">
              {stats.averageRating.toFixed(1)}
            </div>
            {renderStars(Math.round(stats.averageRating), 'lg')}
            <p className="text-sm text-gray-600 mt-2">
              Basado en {stats.totalReviews} reseña{stats.totalReviews !== 1 ? 's' : ''}
            </p>
          </div>

          {/* Distribución */}
          <div>
            <h4 className="font-medium mb-3">Distribución de calificaciones</h4>
            {renderRatingDistribution()}
          </div>
        </div>
      ) : (
        <div className="text-center py-8">
          <div className="text-gray-400 text-4xl mb-4">📝</div>
          <h4 className="text-lg font-medium text-gray-900 mb-2">
            Sé el primero en reseñar este producto
          </h4>
          <p className="text-gray-600">
            Ayuda a otros clientes compartiendo tu experiencia
          </p>
        </div>
      )}

      {/* Botón para escribir reseña */}
      {session?.user?.role === 'customer' && canReview && !showReviewForm && (
        <div className="mb-6">
          <button
            onClick={() => setShowReviewForm(true)}
            className="bg-blue-600 text-white px-6 py-3 rounded-md hover:bg-blue-700 font-medium"
          >
            ✍️ Escribir una reseña
          </button>
        </div>
      )}

      {/* Formulario de nueva reseña */}
      {showReviewForm && (
        <div className="border border-gray-200 rounded-lg p-6 mb-6">
          <h4 className="font-medium mb-4">Escribir reseña para {productName}</h4>
          
          <form onSubmit={handleSubmitReview} className="space-y-4">
            {/* Selector de estrellas */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Calificación *
              </label>
              <div className="flex items-center space-x-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setNewReview(prev => ({ ...prev, rating: star }))}
                    className={`text-2xl hover:scale-110 transition-transform ${
                      star <= newReview.rating ? 'text-yellow-400' : 'text-gray-300'
                    }`}
                  >
                    ⭐
                  </button>
                ))}
                <span className="ml-2 text-sm text-gray-600">
                  ({newReview.rating} estrella{newReview.rating !== 1 ? 's' : ''})
                </span>
              </div>
            </div>

            {/* Comentario */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Comentario (opcional)
              </label>
              <textarea
                value={newReview.comment}
                onChange={(e) => setNewReview(prev => ({ ...prev, comment: e.target.value }))}
                maxLength={500}
                rows={4}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Comparte tu experiencia con este producto..."
              />
              <div className="text-xs text-gray-500 mt-1">
                {newReview.comment.length}/500 caracteres
              </div>
            </div>

            {/* Botones */}
            <div className="flex space-x-3">
              <button
                type="submit"
                disabled={submitting}
                className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {submitting ? 'Publicando...' : 'Publicar Reseña'}
              </button>
              <button
                type="button"
                onClick={() => setShowReviewForm(false)}
                className="bg-gray-300 text-gray-700 px-6 py-2 rounded-md hover:bg-gray-400"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Lista de reseñas */}
      {reviews.length > 0 && (
        <div className="space-y-6">
          <h4 className="font-medium">Reseñas de clientes</h4>
          
          {reviews.map((review) => (
            <div key={review._id} className="border-b border-gray-100 pb-6 last:border-b-0">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="flex items-center space-x-2 mb-1">
                    {renderStars(review.rating, 'sm')}
                    {review.isVerifiedPurchase && (
                      <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">
                        ✅ Compra verificada
                      </span>
                    )}
                  </div>
                  <p className="text-sm font-medium text-gray-900">{review.user.name}</p>
                </div>
                <span className="text-xs text-gray-500">
                  {formatDate(review.createdAt)}
                </span>
              </div>
              
              {review.comment && (
                <p className="text-gray-700 text-sm leading-relaxed">
                  {review.comment}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Mensaje si no está autenticado */}
      {!session && reviews.length === 0 && (
        <div className="text-center py-6 border-t">
          <p className="text-gray-600">
            <a href="/login" className="text-blue-600 hover:text-blue-700">
              Inicia sesión
            </a> para ver y escribir reseñas
          </p>
        </div>
      )}
    </div>
  )
}
