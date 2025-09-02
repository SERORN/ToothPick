import { OnboardingStepData } from './providerSteps';

export const distributorSteps: OnboardingStepData[] = [
  // FASE 1: PERFIL
  {
    id: 'welcome-distributor',
    title: 'Bienvenido, Distribuidor',
    description: 'Descubre cómo expandir tu red comercial con ToothPick',
    component: 'WelcomeStep',
    isCompleted: false,
    isOptional: false,
    estimatedTime: 2,
    category: 'profile',
    priority: 'high',
    rewards: {
      points: 50,
      badge: 'welcome_distributor'
    }
  },
  {
    id: 'distributor-profile',
    title: 'Completa tu Perfil Comercial',
    description: 'Información de tu empresa distribuidora',
    component: 'ProfileStep',
    isCompleted: false,
    isOptional: false,
    estimatedTime: 8,
    category: 'profile',
    priority: 'high',
    validations: {
      required: ['companyName', 'rfc', 'address', 'phone'],
      optional: ['website', 'description', 'territories']
    },
    rewards: {
      points: 200,
      badge: 'profile_complete'
    }
  },
  {
    id: 'distributor-verification',
    title: 'Verificación y Licencias',
    description: 'Verifica tu empresa y carga licencias de distribución',
    component: 'VerificationStep',
    isCompleted: false,
    isOptional: false,
    estimatedTime: 12,
    category: 'profile',
    priority: 'high',
    prerequisites: ['distributor-profile'],
    validations: {
      required: ['rfc_document', 'distribution_license'],
      optional: ['certifications', 'insurance_documents']
    },
    rewards: {
      points: 300,
      badge: 'verified_distributor'
    }
  },

  // FASE 2: CONFIGURACIÓN
  {
    id: 'distributor-territories',
    title: 'Definir Territorios de Distribución',
    description: 'Configura las zonas geográficas que cubres',
    component: 'TerritoriesStep',
    isCompleted: false,
    isOptional: false,
    estimatedTime: 15,
    category: 'setup',
    priority: 'high',
    prerequisites: ['distributor-verification'],
    validations: {
      required: ['coverage_areas', 'delivery_zones'],
      optional: ['exclusive_territories', 'expansion_plans']
    },
    rewards: {
      points: 250
    }
  },
  {
    id: 'distributor-providers',
    title: 'Conectar con Proveedores',
    description: 'Busca y conecta con proveedores de productos dentales',
    component: 'ProvidersStep',
    isCompleted: false,
    isOptional: false,
    estimatedTime: 20,
    category: 'setup',
    priority: 'high',
    prerequisites: ['distributor-territories'],
    validations: {
      required: ['min_3_providers'],
      optional: ['preferred_brands', 'exclusive_agreements']
    },
    rewards: {
      points: 400,
      badge: 'network_builder'
    }
  },
  {
    id: 'distributor-catalog',
    title: 'Configurar Catálogo Personalizado',
    description: 'Crea tu catálogo con productos de múltiples proveedores',
    component: 'CatalogStep',
    isCompleted: false,
    isOptional: false,
    estimatedTime: 18,
    category: 'setup',
    priority: 'high',
    prerequisites: ['distributor-providers'],
    validations: {
      required: ['product_selection', 'category_organization'],
      optional: ['custom_bundles', 'featured_products']
    },
    rewards: {
      points: 300
    }
  },

  // FASE 3: INTEGRACIÓN
  {
    id: 'distributor-pricing-strategy',
    title: 'Configurar Estrategia de Precios',
    description: 'Define márgenes, descuentos y precios especiales',
    component: 'PricingStrategyStep',
    isCompleted: false,
    isOptional: false,
    estimatedTime: 22,
    category: 'integration',
    priority: 'high',
    prerequisites: ['distributor-catalog'],
    validations: {
      required: ['margin_rules', 'discount_structure'],
      optional: ['volume_pricing', 'loyalty_discounts']
    },
    rewards: {
      points: 350
    }
  },
  {
    id: 'distributor-crm-integration',
    title: 'Integrar Sistema CRM',
    description: 'Conecta tu CRM existente para gestionar clientes',
    component: 'CRMIntegrationStep',
    isCompleted: false,
    isOptional: true,
    estimatedTime: 25,
    category: 'integration',
    priority: 'medium',
    prerequisites: ['distributor-pricing-strategy'],
    validations: {
      required: ['crm_type'],
      optional: ['api_connection', 'sync_settings']
    },
    rewards: {
      points: 500,
      badge: 'crm_master'
    }
  },
  {
    id: 'distributor-clients-import',
    title: 'Importar Base de Clientes',
    description: 'Migra tu base de clientes existente',
    component: 'ClientsImportStep',
    isCompleted: false,
    isOptional: true,
    estimatedTime: 15,
    category: 'integration',
    priority: 'medium',
    prerequisites: ['distributor-crm-integration'],
    validations: {
      required: ['client_data_format'],
      optional: ['contact_preferences', 'purchase_history']
    },
    rewards: {
      points: 300
    }
  },

  // FASE 4: CONFIGURACIÓN AVANZADA
  {
    id: 'distributor-payment-collection',
    title: 'Configurar Métodos de Cobro',
    description: 'Activa formas de cobro y términos de crédito',
    component: 'PaymentCollectionStep',
    isCompleted: false,
    isOptional: false,
    estimatedTime: 16,
    category: 'configuration',
    priority: 'high',
    prerequisites: ['distributor-pricing-strategy'],
    validations: {
      required: ['payment_methods', 'credit_terms'],
      optional: ['financing_options', 'collection_policies']
    },
    rewards: {
      points: 250
    }
  },
  {
    id: 'distributor-logistics',
    title: 'Configurar Logística',
    description: 'Define rutas de entrega y gestión de inventario',
    component: 'LogisticsStep',
    isCompleted: false,
    isOptional: false,
    estimatedTime: 20,
    category: 'configuration',
    priority: 'high',
    prerequisites: ['distributor-payment-collection'],
    validations: {
      required: ['delivery_routes', 'warehouse_locations'],
      optional: ['third_party_logistics', 'tracking_integration']
    },
    rewards: {
      points: 300
    }
  },
  {
    id: 'distributor-sales-team',
    title: 'Configurar Equipo de Ventas',
    description: 'Agrega vendedores y define territorios',
    component: 'SalesTeamStep',
    isCompleted: false,
    isOptional: true,
    estimatedTime: 12,
    category: 'configuration',
    priority: 'medium',
    prerequisites: ['distributor-logistics'],
    validations: {
      required: ['sales_representatives'],
      optional: ['commission_structure', 'performance_metrics']
    },
    rewards: {
      points: 200
    }
  },

  // FASE 5: LANZAMIENTO
  {
    id: 'distributor-test-sales',
    title: 'Realizar Ventas de Prueba',
    description: 'Procesa órdenes de prueba con clientes piloto',
    component: 'TestSalesStep',
    isCompleted: false,
    isOptional: false,
    estimatedTime: 15,
    category: 'launch',
    priority: 'high',
    prerequisites: ['distributor-logistics'],
    validations: {
      required: ['test_orders', 'order_fulfillment'],
      optional: ['client_feedback', 'process_optimization']
    },
    rewards: {
      points: 350
    }
  },
  {
    id: 'distributor-marketing-launch',
    title: 'Lanzar Campaña de Marketing',
    description: 'Activa herramientas de marketing y promociones',
    component: 'MarketingLaunchStep',
    isCompleted: false,
    isOptional: true,
    estimatedTime: 18,
    category: 'launch',
    priority: 'medium',
    prerequisites: ['distributor-test-sales'],
    validations: {
      required: ['marketing_materials'],
      optional: ['promotional_campaigns', 'referral_programs']
    },
    rewards: {
      points: 300,
      badge: 'marketing_master'
    }
  },
  {
    id: 'distributor-go-live',
    title: 'Activar Operaciones Completas',
    description: 'Activa tu cuenta para operaciones a gran escala',
    component: 'GoLiveStep',
    isCompleted: false,
    isOptional: false,
    estimatedTime: 5,
    category: 'launch',
    priority: 'high',
    prerequisites: ['distributor-test-sales'],
    validations: {
      required: ['terms_accepted', 'operations_active'],
      optional: ['monitoring_dashboard']
    },
    rewards: {
      points: 500,
      badge: 'distributor_live'
    }
  },
  {
    id: 'distributor-completion',
    title: 'Onboarding Completado',
    description: 'Tu empresa está lista para distribución a gran escala',
    component: 'CompletionStep',
    isCompleted: false,
    isOptional: false,
    estimatedTime: 3,
    category: 'launch',
    priority: 'high',
    prerequisites: ['distributor-go-live'],
    rewards: {
      points: 200,
      badge: 'onboarding_champion'
    }
  }
];

export default distributorSteps;
