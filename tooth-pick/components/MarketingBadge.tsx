import React, { useState, useEffect } from 'react';

interface MarketingBadgeProps {
  dentistId: string;
  className?: string;
}

export default function MarketingBadge({ dentistId, className = '' }: MarketingBadgeProps) {
  const [hasActivePromo, setHasActivePromo] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkActivePromos();
  }, [dentistId]);

  const checkActivePromos = async () => {
    try {
      const response = await fetch(`/api/marketing/highlights?clinicId=${dentistId}&includeInactive=false`);
      const data = await response.json();

      if (data.success) {
        const activePromos = data.data.promotions.filter((promo: any) => 
          promo.isActive && new Date(promo.visibleUntil) > new Date()
        );
        setHasActivePromo(activePromos.length > 0);
      }
    } catch (error) {
      console.error('Error checking active promos:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !hasActivePromo) {
    return null;
  }

  return (
    <div className={`inline-flex items-center gap-2 ${className}`}>
      <span className="relative inline-flex">
        <span className="animate-ping absolute inline-flex h-3 w-3 rounded-full bg-orange-400 opacity-75"></span>
        <span className="relative inline-flex rounded-full h-3 w-3 bg-orange-500"></span>
      </span>
      <span className="text-sm font-medium text-orange-600 bg-orange-100 px-2 py-1 rounded-full">
        🔥 Promo Activa
      </span>
    </div>
  );
}
