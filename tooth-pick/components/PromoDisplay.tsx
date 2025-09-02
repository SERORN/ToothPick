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
  priority: number;
  styling: {
    backgroundColor: string;
    textColor: string;
    buttonColor: string;
    position: string;
  };
  clinicId: {
    _id: string;
    name: string;
    logoUrl?: string;
  };
}

interface PromoDisplayProps {
  location: 'dashboard' | 'booking' | 'profile' | 'catalog';
  userType?: 'all' | 'new_patients' | 'existing_patients';
  className?: string;
}

export default function PromoDisplay({ location, userType = 'all', className = '' }: PromoDisplayProps) {
  const [promos, setPromos] = useState<PromoHighlight[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPromoIndex, setCurrentPromoIndex] = useState(0);

  useEffect(() => {
    loadPromos();
    
    // Rotar promociones cada 10 segundos si hay múltiples
    const interval = setInterval(() => {
      setCurrentPromoIndex(prev => (prev + 1) % Math.max(promos.length, 1));
    }, 10000);

    return () => clearInterval(interval);
  }, [promos.length]);

  const loadPromos = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        location,
        userType
      });

      const response = await fetch(`/api/marketing/highlights?${params}`);
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

  const trackView = async (promoId: string) => {
    try {
      await fetch(`/api/marketing/track/promo/${promoId}/view`, {
        method: 'POST'
      });
    } catch (error) {
      console.error('Error tracking view:', error);
    }
  };

  const handleClick = async (promo: PromoHighlight) => {
    try {
      // Registrar clic
      await fetch(`/api/marketing/track/promo/${promo._id}/click`, {
        method: 'POST'
      });
      
      // Abrir enlace
      window.open(promo.ctaLink, '_blank');
    } catch (error) {
      console.error('Error tracking click:', error);
      // Abrir enlace aunque falle el tracking
      window.open(promo.ctaLink, '_blank');
    }
  };

  // Trackear vista cuando se monta o cambia la promoción
  useEffect(() => {
    if (promos.length > 0) {
      const currentPromo = promos[currentPromoIndex];
      if (currentPromo) {
        trackView(currentPromo._id);
      }
    }
  }, [currentPromoIndex, promos]);

  if (loading || promos.length === 0) {
    return null;
  }

  const currentPromo = promos[currentPromoIndex];

  return (
    <div className={`w-full ${className}`}>
      <div 
        className={`rounded-lg shadow-sm border overflow-hidden transition-all duration-300 hover:shadow-md ${
          currentPromo.styling.position === 'sidebar' ? 'max-w-sm' : 'max-w-4xl'
        }`}
        style={{
          backgroundColor: currentPromo.styling.backgroundColor,
          color: currentPromo.styling.textColor
        }}
      >
        {/* Header con badge de promoción */}
        <div className="flex items-center justify-between p-2 bg-black bg-opacity-10">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium px-2 py-1 rounded-full bg-white bg-opacity-20">
              🔥 PROMOCIÓN ACTIVA
            </span>
            {currentPromo.clinicId?.name && (
              <span className="text-xs opacity-75">
                de {currentPromo.clinicId.name}
              </span>
            )}
          </div>
          {promos.length > 1 && (
            <div className="flex items-center gap-1">
              {promos.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentPromoIndex(index)}
                  className={`w-2 h-2 rounded-full transition-colors ${
                    index === currentPromoIndex 
                      ? 'bg-white' 
                      : 'bg-white bg-opacity-40'
                  }`}
                />
              ))}
            </div>
          )}
        </div>

        <div className={`p-4 ${
          currentPromo.styling.position === 'sidebar' ? 'text-center' : 'flex items-center gap-4'
        }`}>
          {/* Imagen */}
          {currentPromo.imageUrl && (
            <div className={`flex-shrink-0 ${
              currentPromo.styling.position === 'sidebar' 
                ? 'w-full h-32 mb-3' 
                : 'w-24 h-24'
            } rounded-lg overflow-hidden bg-white bg-opacity-10`}>
              <img 
                src={currentPromo.imageUrl} 
                alt={currentPromo.title}
                className="w-full h-full object-cover"
                loading="lazy"
              />
            </div>
          )}

          {/* Contenido */}
          <div className="flex-1 min-w-0">
            <h3 className={`font-bold mb-2 ${
              currentPromo.styling.position === 'sidebar' ? 'text-lg' : 'text-xl'
            }`}>
              {currentPromo.title}
            </h3>
            <p className={`mb-3 opacity-90 ${
              currentPromo.styling.position === 'sidebar' ? 'text-sm' : 'text-base'
            }`}>
              {currentPromo.description}
            </p>

            {/* Botón CTA */}
            <button
              onClick={() => handleClick(currentPromo)}
              className={`font-medium px-4 py-2 rounded-lg transition-all duration-200 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-opacity-50 ${
                currentPromo.styling.position === 'sidebar' ? 'w-full text-sm' : 'inline-block'
              }`}
              style={{ 
                backgroundColor: currentPromo.styling.buttonColor,
                color: '#ffffff'
              }}
            >
              {currentPromo.ctaText}
            </button>
          </div>
        </div>

        {/* Footer con tiempo restante */}
        <div className="px-4 pb-2">
          <PromoCountdown visibleUntil={currentPromo.visibleUntil} />
        </div>
      </div>
    </div>
  );
}

// Componente para mostrar countdown
function PromoCountdown({ visibleUntil }: { visibleUntil: string }) {
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    const updateCountdown = () => {
      const now = new Date().getTime();
      const end = new Date(visibleUntil).getTime();
      const difference = end - now;

      if (difference > 0) {
        const days = Math.floor(difference / (1000 * 60 * 60 * 24));
        const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));

        if (days > 0) {
          setTimeLeft(`⏰ ${days}d ${hours}h restantes`);
        } else if (hours > 0) {
          setTimeLeft(`⏰ ${hours}h ${minutes}m restantes`);
        } else if (minutes > 0) {
          setTimeLeft(`⏰ ${minutes}m restantes`);
        } else {
          setTimeLeft('⏰ Último minuto!');
        }
      } else {
        setTimeLeft('Promoción expirada');
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 60000); // Actualizar cada minuto

    return () => clearInterval(interval);
  }, [visibleUntil]);

  return (
    <div className="text-xs opacity-70 text-center">
      {timeLeft}
    </div>
  );
}

// Componente simplificado para promociones pequeñas
export function PromoDisplayMini({ location, className = '' }: Pick<PromoDisplayProps, 'location' | 'className'>) {
  const [promos, setPromos] = useState<PromoHighlight[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    loadPromos();
  }, []);

  const loadPromos = async () => {
    try {
      const response = await fetch(`/api/marketing/highlights?location=${location}&userType=all`);
      const data = await response.json();

      if (data.success) {
        setPromos(data.data.promotions.slice(0, 3)); // Solo mostrar las primeras 3
      }
    } catch (error) {
      console.error('Error loading promos:', error);
    }
  };

  if (promos.length === 0) {
    return null;
  }

  const currentPromo = promos[currentIndex];

  return (
    <div className={`${className}`}>
      <div 
        className="p-3 rounded-lg border-l-4 text-sm"
        style={{
          backgroundColor: currentPromo.styling.backgroundColor,
          color: currentPromo.styling.textColor,
          borderLeftColor: currentPromo.styling.buttonColor
        }}
      >
        <div className="flex items-center justify-between mb-2">
          <span className="font-medium">{currentPromo.title}</span>
          <span className="text-xs opacity-75">🔥</span>
        </div>
        <p className="text-xs opacity-90 mb-2 line-clamp-2">
          {currentPromo.description}
        </p>
        <button
          onClick={() => window.open(currentPromo.ctaLink, '_blank')}
          className="text-xs font-medium hover:underline"
          style={{ color: currentPromo.styling.buttonColor }}
        >
          {currentPromo.ctaText} →
        </button>
      </div>
    </div>
  );
}
