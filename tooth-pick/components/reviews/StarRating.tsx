'use client';

import { useState } from 'react';
import { Star } from 'lucide-react';

interface StarRatingProps {
  rating: number;
  onChange?: (rating: number) => void;
  readonly?: boolean;
  size?: 'sm' | 'md' | 'lg';
  showValue?: boolean;
  className?: string;
}

export default function StarRating({
  rating,
  onChange,
  readonly = false,
  size = 'md',
  showValue = false,
  className = ''
}: StarRatingProps) {
  const [hoverRating, setHoverRating] = useState(0);
  const [isHovering, setIsHovering] = useState(false);

  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6'
  };

  const textSizeClasses = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg'
  };

  const handleStarClick = (starRating: number) => {
    if (!readonly && onChange) {
      onChange(starRating);
    }
  };

  const handleStarHover = (starRating: number) => {
    if (!readonly) {
      setHoverRating(starRating);
      setIsHovering(true);
    }
  };

  const handleMouseLeave = () => {
    if (!readonly) {
      setIsHovering(false);
      setHoverRating(0);
    }
  };

  const displayRating = isHovering ? hoverRating : rating;
  const isInteractive = !readonly && onChange;

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div 
        className="flex items-center gap-1"
        onMouseLeave={handleMouseLeave}
      >
        {[1, 2, 3, 4, 5].map((star) => {
          const isFilled = star <= displayRating;
          const isPartiallyFilled = star === Math.ceil(displayRating) && displayRating % 1 !== 0;
          
          return (
            <button
              key={star}
              type="button"
              className={`
                relative transition-all duration-200 ease-in-out
                ${isInteractive ? 'cursor-pointer hover:scale-110' : 'cursor-default'}
                ${isInteractive && isHovering ? 'transform scale-105' : ''}
                focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 rounded
              `}
              onClick={() => handleStarClick(star)}
              onMouseEnter={() => handleStarHover(star)}
              disabled={readonly}
              aria-label={`${star} estrella${star !== 1 ? 's' : ''}`}
            >
              <Star
                className={`
                  ${sizeClasses[size]} transition-colors duration-200
                  ${isFilled 
                    ? 'fill-yellow-400 text-yellow-400' 
                    : isInteractive && hoverRating >= star
                      ? 'fill-yellow-300 text-yellow-300'
                      : 'fill-gray-200 text-gray-300'
                  }
                  ${isInteractive ? 'hover:text-yellow-400' : ''}
                `}
              />
              
              {/* Partial fill for decimal ratings */}
              {isPartiallyFilled && (
                <div 
                  className="absolute top-0 left-0 overflow-hidden"
                  style={{ width: `${(displayRating % 1) * 100}%` }}
                >
                  <Star
                    className={`
                      ${sizeClasses[size]} fill-yellow-400 text-yellow-400
                    `}
                  />
                </div>
              )}
            </button>
          );
        })}
      </div>
      
      {showValue && (
        <span className={`
          font-medium text-gray-700 ${textSizeClasses[size]}
          ${isHovering ? 'text-yellow-600' : ''}
        `}>
          {isHovering ? hoverRating.toFixed(1) : rating.toFixed(1)}
        </span>
      )}
      
      {/* Screen reader text */}
      <span className="sr-only">
        {rating} de 5 estrellas
      </span>
    </div>
  );
}

// Componente para mostrar solo el rating (readonly)
export function StarDisplay({ 
  rating, 
  size = 'md', 
  showValue = true,
  className = '' 
}: Pick<StarRatingProps, 'rating' | 'size' | 'showValue' | 'className'>) {
  return (
    <StarRating
      rating={rating}
      readonly={true}
      size={size}
      showValue={showValue}
      className={className}
    />
  );
}

// Componente para entrada de rating
export function StarInput({ 
  rating, 
  onChange, 
  size = 'md',
  className = '',
  label,
  required = false
}: Pick<StarRatingProps, 'rating' | 'onChange' | 'size' | 'className'> & {
  label?: string;
  required?: boolean;
}) {
  return (
    <div className={`space-y-2 ${className}`}>
      {label && (
        <label className="block text-sm font-medium text-gray-700">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <StarRating
        rating={rating}
        onChange={onChange}
        size={size}
        showValue={true}
      />
    </div>
  );
}
