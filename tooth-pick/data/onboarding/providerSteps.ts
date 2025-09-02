export interface OnboardingStepData {
  id: string;
  title: string;
  description: string;
  component: string;
  isCompleted: boolean;
  isOptional: boolean;
  estimatedTime: number; // minutos
  prerequisites?: string[];
  category: 'profile' | 'setup' | 'integration' | 'configuration' | 'launch';
  priority: 'high' | 'medium' | 'low';
  validations?: {
    required: string[];
    optional: string[];
  };
  rewards?: {
    points: number;
    badge?: string;
  };
}

export const providerSteps: OnboardingStepData[] = [
  // FASE 1: PERFIL
  {
    id: 'welcome-provider',
    title: 'Bienvenido a ToothPick',
    description: 'Descubre cómo ToothPick transformará tu negocio dental',
    component: 'WelcomeStep',
    isCompleted: false,
    isOptional: false,
    estimatedTime: 2,
    category: 'profile',
    priority: 'high',
    rewards: {
      points: 50,
      badge: 'welcome_provider'
    }
  },
  {
    id: 'provider-profile',
    title: 'Completa tu Perfil de Empresa',
    description: 'Información básica de tu empresa proveedora',
    component: 'ProfileStep',
    isCompleted: false,
    isOptional: false,
    estimatedTime: 8,
    category: 'profile',
    priority: 'high',
    validations: {
      required: ['companyName', 'rfc', 'address', 'phone'],
      optional: ['website', 'description', 'specialties']
    },
    rewards: {
      points: 200,
      badge: 'profile_complete'
    }
  },
  {
    id: 'provider-verification',
    title: 'Verificación de Empresa',
    description: 'Sube documentos legales para verificar tu empresa',
    component: 'VerificationStep',
    isCompleted: false,
    isOptional: false,
    estimatedTime: 10,
    category: 'profile',
    priority: 'high',
    prerequisites: ['provider-profile'],
    validations: {
      required: ['rfc_document', 'legal_representative_id'],
      optional: ['certifications', 'business_license']
    },
    rewards: {
      points: 300,
      badge: 'verified_provider'
    }
  },

  // FASE 2: CONFIGURACIÓN
  {
    id: 'provider-catalog-setup',
    title: 'Configurar Catálogo',
    description: 'Define categorías y estructura de tu catálogo',
    component: 'CatalogSetupStep',
    isCompleted: false,
    isOptional: false,
    estimatedTime: 15,
    category: 'setup',
    priority: 'high',
    prerequisites: ['provider-verification'],
    validations: {
      required: ['main_categories', 'pricing_strategy'],
      optional: ['subcategories', 'product_templates']
    },
    rewards: {
      points: 250
    }
  },
  {
    id: 'provider-products',
    title: 'Cargar Productos Iniciales',
    description: 'Agrega tus primeros productos al catálogo',
    component: 'ProductsStep',
    isCompleted: false,
    isOptional: false,
    estimatedTime: 20,
    category: 'setup',
    priority: 'high',
    prerequisites: ['provider-catalog-setup'],
    validations: {
      required: ['min_5_products'],
      optional: ['product_images', 'detailed_descriptions']
    },
    rewards: {
      points: 400,
      badge: 'catalog_builder'
    }
  },
  {
    id: 'provider-pricing',
    title: 'Configurar Precios y Descuentos',
    description: 'Define estrategias de precios y descuentos por volumen',
    component: 'PricingStep',
    isCompleted: false,
    isOptional: false,
    estimatedTime: 12,
    category: 'setup',
    priority: 'high',
    prerequisites: ['provider-products'],
    validations: {
      required: ['base_prices', 'currency'],
      optional: ['volume_discounts', 'seasonal_pricing']
    },
    rewards: {
      points: 200
    }
  },

  // FASE 3: INTEGRACIÓN
  {
    id: 'provider-erp-integration',
    title: 'Conectar Sistema ERP',
    description: 'Integra tu ERP existente con ToothPick',
    component: 'ERPIntegrationStep',
    isCompleted: false,
    isOptional: true,
    estimatedTime: 25,
    category: 'integration',
    priority: 'medium',
    prerequisites: ['provider-pricing'],
    validations: {
      required: ['system_type'],
      optional: ['api_credentials', 'sync_settings']
    },
    rewards: {
      points: 500,
      badge: 'integration_master'
    }
  },
  {
    id: 'provider-inventory-sync',
    title: 'Sincronizar Inventario',
    description: 'Configura sincronización automática de inventario',
    component: 'InventorySyncStep',
    isCompleted: false,
    isOptional: true,
    estimatedTime: 15,
    category: 'integration',
    priority: 'medium',
    prerequisites: ['provider-erp-integration'],
    validations: {
      required: ['sync_frequency'],
      optional: ['low_stock_alerts', 'auto_restock']
    },
    rewards: {
      points: 300
    }
  },

  // FASE 4: CONFIGURACIÓN AVANZADA
  {
    id: 'provider-payment-methods',
    title: 'Configurar Métodos de Pago',
    description: 'Activa métodos de pago y facturación',
    component: 'PaymentMethodsStep',
    isCompleted: false,
    isOptional: false,
    estimatedTime: 18,
    category: 'configuration',
    priority: 'high',
    prerequisites: ['provider-pricing'],
    validations: {
      required: ['primary_payment_method'],
      optional: ['secondary_methods', 'payment_terms']
    },
    rewards: {
      points: 250
    }
  },
  {
    id: 'provider-shipping-config',
    title: 'Configurar Envíos',
    description: 'Define zonas de envío, costos y tiempos de entrega',
    component: 'ShippingConfigStep',
    isCompleted: false,
    isOptional: false,
    estimatedTime: 12,
    category: 'configuration',
    priority: 'high',
    prerequisites: ['provider-payment-methods'],
    validations: {
      required: ['shipping_zones', 'delivery_times'],
      optional: ['free_shipping_thresholds', 'express_options']
    },
    rewards: {
      points: 200
    }
  },
  {
    id: 'provider-notifications',
    title: 'Configurar Notificaciones',
    description: 'Personaliza alertas y notificaciones automáticas',
    component: 'NotificationsStep',
    isCompleted: false,
    isOptional: true,
    estimatedTime: 8,
    category: 'configuration',
    priority: 'low',
    prerequisites: ['provider-shipping-config'],
    validations: {
      required: ['notification_preferences'],
      optional: ['email_templates', 'sms_settings']
    },
    rewards: {
      points: 100
    }
  },

  // FASE 5: LANZAMIENTO
  {
    id: 'provider-test-order',
    title: 'Procesar Orden de Prueba',
    description: 'Simula una orden completa para verificar configuración',
    component: 'TestOrderStep',
    isCompleted: false,
    isOptional: false,
    estimatedTime: 10,
    category: 'launch',
    priority: 'high',
    prerequisites: ['provider-shipping-config'],
    validations: {
      required: ['test_order_complete'],
      optional: ['order_tracking_test']
    },
    rewards: {
      points: 300
    }
  },
  {
    id: 'provider-go-live',
    title: 'Activar Cuenta y Publicar',
    description: 'Activa tu cuenta para recibir órdenes reales',
    component: 'GoLiveStep',
    isCompleted: false,
    isOptional: false,
    estimatedTime: 5,
    category: 'launch',
    priority: 'high',
    prerequisites: ['provider-test-order'],
    validations: {
      required: ['terms_accepted', 'account_activated'],
      optional: ['marketing_preferences']
    },
    rewards: {
      points: 500,
      badge: 'provider_live'
    }
  },
  {
    id: 'provider-completion',
    title: 'Onboarding Completado',
    description: 'Felicitaciones, tu cuenta está lista para operar',
    component: 'CompletionStep',
    isCompleted: false,
    isOptional: false,
    estimatedTime: 3,
    category: 'launch',
    priority: 'high',
    prerequisites: ['provider-go-live'],
    rewards: {
      points: 200,
      badge: 'onboarding_champion'
    }
  }
];

export default providerSteps;
