import { OnboardingStepData } from './providerSteps';

export const clinicSteps: OnboardingStepData[] = [
  // FASE 1: PERFIL
  {
    id: 'welcome-clinic',
    title: 'Bienvenida, Clínica Dental',
    description: 'Optimiza tus compras y gestión con ToothPick',
    component: 'WelcomeStep',
    isCompleted: false,
    isOptional: false,
    estimatedTime: 2,
    category: 'profile',
    priority: 'high',
    rewards: {
      points: 50,
      badge: 'welcome_clinic'
    }
  },
  {
    id: 'clinic-profile',
    title: 'Información de tu Clínica',
    description: 'Completa los datos básicos de tu clínica dental',
    component: 'ProfileStep',
    isCompleted: false,
    isOptional: false,
    estimatedTime: 8,
    category: 'profile',
    priority: 'high',
    validations: {
      required: ['clinicName', 'rfc', 'address', 'phone'],
      optional: ['website', 'description', 'specialties']
    },
    rewards: {
      points: 200,
      badge: 'profile_complete'
    }
  },
  {
    id: 'clinic-specialties',
    title: 'Especialidades y Servicios',
    description: 'Define las especialidades dentales que ofreces',
    component: 'SpecialtiesStep',
    isCompleted: false,
    isOptional: false,
    estimatedTime: 10,
    category: 'profile',
    priority: 'high',
    prerequisites: ['clinic-profile'],
    validations: {
      required: ['primary_specialties'],
      optional: ['secondary_specialties', 'equipment_list']
    },
    rewards: {
      points: 150
    }
  },

  // FASE 2: CONFIGURACIÓN
  {
    id: 'clinic-team-setup',
    title: 'Configurar Equipo de Trabajo',
    description: 'Agrega dentistas, asistentes y personal administrativo',
    component: 'TeamSetupStep',
    isCompleted: false,
    isOptional: false,
    estimatedTime: 15,
    category: 'setup',
    priority: 'high',
    prerequisites: ['clinic-specialties'],
    validations: {
      required: ['team_members'],
      optional: ['roles_permissions', 'schedules']
    },
    rewards: {
      points: 250,
      badge: 'team_builder'
    }
  },
  {
    id: 'clinic-preferences',
    title: 'Preferencias de Compra',
    description: 'Configura categorías de productos y marcas preferidas',
    component: 'PreferencesStep',
    isCompleted: false,
    isOptional: false,
    estimatedTime: 12,
    category: 'setup',
    priority: 'high',
    prerequisites: ['clinic-team-setup'],
    validations: {
      required: ['product_categories'],
      optional: ['preferred_brands', 'budget_ranges']
    },
    rewards: {
      points: 200
    }
  },
  {
    id: 'clinic-distributors',
    title: 'Seleccionar Distribuidores',
    description: 'Conecta con distribuidores en tu zona',
    component: 'DistributorsStep',
    isCompleted: false,
    isOptional: false,
    estimatedTime: 18,
    category: 'setup',
    priority: 'high',
    prerequisites: ['clinic-preferences'],
    validations: {
      required: ['selected_distributors'],
      optional: ['preferred_payment_terms', 'delivery_preferences']
    },
    rewards: {
      points: 300,
      badge: 'network_connected'
    }
  },

  // FASE 3: INTEGRACIÓN
  {
    id: 'clinic-inventory-system',
    title: 'Sistema de Inventario',
    description: 'Configura gestión inteligente de inventario',
    component: 'InventorySystemStep',
    isCompleted: false,
    isOptional: true,
    estimatedTime: 20,
    category: 'integration',
    priority: 'medium',
    prerequisites: ['clinic-distributors'],
    validations: {
      required: ['inventory_tracking'],
      optional: ['automatic_reordering', 'expiry_alerts']
    },
    rewards: {
      points: 350,
      badge: 'inventory_master'
    }
  },
  {
    id: 'clinic-practice-software',
    title: 'Integrar Software de Práctica',
    description: 'Conecta tu software dental existente',
    component: 'PracticeSoftwareStep',
    isCompleted: false,
    isOptional: true,
    estimatedTime: 25,
    category: 'integration',
    priority: 'medium',
    prerequisites: ['clinic-inventory-system'],
    validations: {
      required: ['software_type'],
      optional: ['api_integration', 'data_sync']
    },
    rewards: {
      points: 400,
      badge: 'integration_pro'
    }
  },

  // FASE 4: CONFIGURACIÓN AVANZADA
  {
    id: 'clinic-budget-controls',
    title: 'Controles de Presupuesto',
    description: 'Define presupuestos y límites de compra',
    component: 'BudgetControlsStep',
    isCompleted: false,
    isOptional: true,
    estimatedTime: 12,
    category: 'configuration',
    priority: 'medium',
    prerequisites: ['clinic-distributors'],
    validations: {
      required: ['budget_limits'],
      optional: ['approval_workflows', 'spending_alerts']
    },
    rewards: {
      points: 200
    }
  },
  {
    id: 'clinic-ordering-workflows',
    title: 'Flujos de Ordenamiento',
    description: 'Personaliza procesos de órdenes y aprobaciones',
    component: 'OrderingWorkflowsStep',
    isCompleted: false,
    isOptional: false,
    estimatedTime: 15,
    category: 'configuration',
    priority: 'high',
    prerequisites: ['clinic-budget-controls'],
    validations: {
      required: ['ordering_process'],
      optional: ['approval_chains', 'emergency_orders']
    },
    rewards: {
      points: 250
    }
  },
  {
    id: 'clinic-payment-setup',
    title: 'Configurar Métodos de Pago',
    description: 'Activa formas de pago y términos de crédito',
    component: 'PaymentSetupStep',
    isCompleted: false,
    isOptional: false,
    estimatedTime: 10,
    category: 'configuration',
    priority: 'high',
    prerequisites: ['clinic-ordering-workflows'],
    validations: {
      required: ['payment_methods'],
      optional: ['credit_applications', 'payment_schedules']
    },
    rewards: {
      points: 200
    }
  },

  // FASE 5: LANZAMIENTO
  {
    id: 'clinic-first-quote',
    title: 'Solicitar Primera Cotización',
    description: 'Practica el proceso con una cotización real',
    component: 'FirstQuoteStep',
    isCompleted: false,
    isOptional: false,
    estimatedTime: 10,
    category: 'launch',
    priority: 'high',
    prerequisites: ['clinic-payment-setup'],
    validations: {
      required: ['quote_request'],
      optional: ['quote_comparison', 'supplier_feedback']
    },
    rewards: {
      points: 300
    }
  },
  {
    id: 'clinic-first-order',
    title: 'Realizar Primera Orden',
    description: 'Completa tu primera compra en la plataforma',
    component: 'FirstOrderStep',
    isCompleted: false,
    isOptional: false,
    estimatedTime: 12,
    category: 'launch',
    priority: 'high',
    prerequisites: ['clinic-first-quote'],
    validations: {
      required: ['order_placement', 'payment_processing'],
      optional: ['delivery_tracking', 'order_feedback']
    },
    rewards: {
      points: 400,
      badge: 'first_buyer'
    }
  },
  {
    id: 'clinic-loyalty-enrollment',
    title: 'Programa de Lealtad',
    description: 'Únete al programa de puntos y recompensas',
    component: 'LoyaltyEnrollmentStep',
    isCompleted: false,
    isOptional: true,
    estimatedTime: 8,
    category: 'launch',
    priority: 'medium',
    prerequisites: ['clinic-first-order'],
    validations: {
      required: ['loyalty_enrollment'],
      optional: ['referral_setup', 'reward_preferences']
    },
    rewards: {
      points: 250,
      badge: 'loyalty_member'
    }
  },
  {
    id: 'clinic-training-complete',
    title: 'Capacitación del Equipo',
    description: 'Capacita a tu equipo en el uso de la plataforma',
    component: 'TrainingCompleteStep',
    isCompleted: false,
    isOptional: true,
    estimatedTime: 20,
    category: 'launch',
    priority: 'medium',
    prerequisites: ['clinic-first-order'],
    validations: {
      required: ['team_training'],
      optional: ['certification_completion', 'best_practices']
    },
    rewards: {
      points: 300,
      badge: 'training_champion'
    }
  },
  {
    id: 'clinic-go-live',
    title: 'Activar Operaciones Completas',
    description: 'Tu clínica está lista para usar ToothPick completamente',
    component: 'GoLiveStep',
    isCompleted: false,
    isOptional: false,
    estimatedTime: 5,
    category: 'launch',
    priority: 'high',
    prerequisites: ['clinic-first-order'],
    validations: {
      required: ['full_activation'],
      optional: ['feedback_submission']
    },
    rewards: {
      points: 500,
      badge: 'clinic_live'
    }
  },
  {
    id: 'clinic-completion',
    title: 'Onboarding Completado',
    description: 'Felicitaciones, estás listo para optimizar tus compras',
    component: 'CompletionStep',
    isCompleted: false,
    isOptional: false,
    estimatedTime: 3,
    category: 'launch',
    priority: 'high',
    prerequisites: ['clinic-go-live'],
    rewards: {
      points: 200,
      badge: 'onboarding_champion'
    }
  }
];

export default clinicSteps;
