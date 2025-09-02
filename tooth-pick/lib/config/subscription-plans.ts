export interface SubscriptionPlan {
  id: 'Free' | 'Pro' | 'Elite';
  name: string;
  description: string;
  price: {
    monthly: number;    // Precio en centavos
    yearly: number;     // Precio anual en centavos (con descuento)
    currency: string;
  };
  popular?: boolean;
  features: {
    // Límites básicos
    maxAppointments: number | 'unlimited';
    commissionRate: number;
    
    // Características incluidas
    priorityListing: boolean;
    advancedAnalytics: boolean;
    marketplaceAccess: boolean;
    customWebsite: boolean;
    marketingAutomation: boolean;
    prioritySupport: boolean;
    customBranding: boolean;
    apiAccess: boolean;
    exportData: boolean;
    
    // Funcionalidades de marketing
    marketing: {
      campaigns: boolean;
      promotions: boolean;
      segmentation: boolean;
    };
    
    // Características textuales para mostrar
    featureList: string[];
  };
  stripePriceId?: {
    monthly: string;
    yearly: string;
  };
  stripeProductId?: string;
}

export const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    id: 'Free',
    name: 'Gratis',
    description: 'Perfecto para dentistas que están empezando',
    price: {
      monthly: 0,
      yearly: 0,
      currency: 'MXN'
    },
    features: {
      maxAppointments: 20,
      commissionRate: 8.5,
      priorityListing: false,
      advancedAnalytics: false,
      marketplaceAccess: false,
      customWebsite: false,
      marketingAutomation: false,
      prioritySupport: false,
      customBranding: false,
      apiAccess: false,
      exportData: false,
      marketing: {
        campaigns: false,
        promotions: false,
        segmentation: false
      },
      featureList: [
        'Hasta 20 citas mensuales',
        'Comisión del 8.5% por cita',
        'Perfil básico en directorio',
        'Acceso limitado a estadísticas',
        'Soporte por email'
      ]
    }
  },
  {
    id: 'Pro',
    name: 'Profesional',
    description: 'Para clínicas que buscan crecer sin límites',
    price: {
      monthly: 49900,      // $499 MXN
      yearly: 479040,      // $4,790.40 MXN (20% descuento)
      currency: 'MXN'
    },
    popular: true,
    features: {
      maxAppointments: 'unlimited',
      commissionRate: 0,
      priorityListing: true,
      advancedAnalytics: true,
      marketplaceAccess: true,
      customWebsite: false,
      marketingAutomation: false,
      prioritySupport: false,
      customBranding: true,
      apiAccess: true,
      exportData: true,
      marketing: {
        campaigns: true,
        promotions: true,
        segmentation: true
      },
      featureList: [
        'Citas ilimitadas',
        '0% comisión por citas',
        'Posicionamiento preferente en directorio',
        'Estadísticas completas y avanzadas',
        'Acceso al marketplace sin comisiones',
        'Notificaciones personalizadas premium',
        'Branding personalizado',
        'Exportación de datos',
        'Acceso a API',
        'Campañas de marketing y promociones',
        'Soporte prioritario'
      ]
    },
    stripePriceId: {
      monthly: 'price_1234567890_monthly', // TODO: Crear en Stripe
      yearly: 'price_1234567890_yearly'
    },
    stripeProductId: 'prod_toothpick_pro'
  },
  {
    id: 'Elite',
    name: 'Elite',
    description: 'Solución empresarial con todas las funcionalidades',
    price: {
      monthly: 99900,      // $999 MXN
      yearly: 959040,      // $9,590.40 MXN (20% descuento)
      currency: 'MXN'
    },
    features: {
      maxAppointments: 'unlimited',
      commissionRate: 0,
      priorityListing: true,
      advancedAnalytics: true,
      marketplaceAccess: true,
      customWebsite: true,
      marketingAutomation: true,
      prioritySupport: true,
      customBranding: true,
      apiAccess: true,
      exportData: true,
      marketing: {
        campaigns: true,
        promotions: true,
        segmentation: true
      },
      featureList: [
        'Todo lo del plan Profesional',
        'Sitio web personalizado',
        'Campañas de marketing automatizadas avanzadas',
        'Atención prioritaria 24/7',
        'Consultor dedicado',
        'Integración WhatsApp Business',
        'Reportes ejecutivos personalizados',
        'Multi-ubicación y franquicias',
        'API avanzada con webhooks',
        'Onboarding personalizado'
      ]
    },
    stripePriceId: {
      monthly: 'price_9876543210_monthly', // TODO: Crear en Stripe
      yearly: 'price_9876543210_yearly'
    },
    stripeProductId: 'prod_toothpick_elite'
  }
];

// Utilidades para trabajar con planes
export class SubscriptionPlanUtils {
  
  /**
   * Obtiene un plan por su ID
   */
  static getPlanById(planId: string): SubscriptionPlan | null {
    return SUBSCRIPTION_PLANS.find(plan => plan.id === planId) || null;
  }
  
  /**
   * Obtiene el precio formateado de un plan
   */
  static getFormattedPrice(plan: SubscriptionPlan, interval: 'monthly' | 'yearly' = 'monthly'): string {
    const price = interval === 'monthly' ? plan.price.monthly : plan.price.yearly;
    const amount = price / 100; // Convertir centavos a pesos
    
    if (amount === 0) return 'Gratis';
    
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: plan.price.currency
    }).format(amount);
  }
  
  /**
   * Calcula el descuento anual
   */
  static getYearlyDiscount(plan: SubscriptionPlan): number {
    if (plan.price.monthly === 0) return 0;
    
    const monthlyTotal = plan.price.monthly * 12;
    const yearlyPrice = plan.price.yearly;
    const discount = ((monthlyTotal - yearlyPrice) / monthlyTotal) * 100;
    
    return Math.round(discount);
  }
  
  /**
   * Obtiene las características de un plan por ID
   */
  static getPlanFeatures(planId: string): SubscriptionPlan['features'] | null {
    const plan = this.getPlanById(planId);
    return plan ? plan.features : null;
  }
  
  /**
   * Verifica si un plan puede acceder a una característica
   */
  static canAccessFeature(plan: SubscriptionPlan, feature: keyof SubscriptionPlan['features']): boolean {
    return Boolean(plan.features[feature]);
  }
  
  /**
   * Obtiene los límites de un plan
   */
  static getPlanLimits(plan: SubscriptionPlan) {
    return {
      maxAppointments: plan.features.maxAppointments,
      commissionRate: plan.features.commissionRate,
      hasUnlimitedAppointments: plan.features.maxAppointments === 'unlimited',
      isCommissionFree: plan.features.commissionRate === 0
    };
  }
  
  /**
   * Compara dos planes y devuelve si es un upgrade
   */
  static isUpgrade(fromPlan: string, toPlan: string): boolean {
    const planOrder = { 'Free': 0, 'Pro': 1, 'Elite': 2 };
    return planOrder[toPlan as keyof typeof planOrder] > planOrder[fromPlan as keyof typeof planOrder];
  }
  
  /**
   * Obtiene el siguiente plan recomendado
   */
  static getNextRecommendedPlan(currentPlan: string): SubscriptionPlan | null {
    const planOrder = ['Free', 'Pro', 'Elite'];
    const currentIndex = planOrder.indexOf(currentPlan);
    
    if (currentIndex === -1 || currentIndex === planOrder.length - 1) {
      return null;
    }
    
    return this.getPlanById(planOrder[currentIndex + 1]);
  }
  
  /**
   * Valida si un plan existe y está disponible
   */
  static isValidPlan(planId: string): boolean {
    return SUBSCRIPTION_PLANS.some(plan => plan.id === planId);
  }
  
  /**
   * Obtiene planes disponibles para mostrar en pricing
   */
  static getAvailablePlans(): SubscriptionPlan[] {
    return SUBSCRIPTION_PLANS;
  }
  
  /**
   * Calcula comisión según el plan
   */
  static calculateCommission(amount: number, plan: SubscriptionPlan): number {
    if (plan.features.commissionRate === 0) return 0;
    return (amount * plan.features.commissionRate) / 100;
  }
}

// Constantes para configuración
export const TRIAL_DAYS = 30;
export const BILLING_GRACE_PERIOD_DAYS = 3;
export const CANCELLATION_GRACE_PERIOD_DAYS = 7;

// Tipos para TypeScript
export type PlanId = 'Free' | 'Pro' | 'Elite';
export type BillingInterval = 'monthly' | 'yearly';
export type SubscriptionStatus = 'active' | 'inactive' | 'trial' | 'past_due' | 'canceled' | 'unpaid';

export default SUBSCRIPTION_PLANS;
