import { OnboardingStepData } from './providerSteps';

export const adminSteps: OnboardingStepData[] = [
  // FASE 1: PERFIL
  {
    id: 'welcome-admin',
    title: 'Bienvenido, Administrador',
    description: 'Configura y gestiona toda la plataforma ToothPick',
    component: 'WelcomeStep',
    isCompleted: false,
    isOptional: false,
    estimatedTime: 2,
    category: 'profile',
    priority: 'high',
    rewards: {
      points: 50,
      badge: 'welcome_admin'
    }
  },
  {
    id: 'admin-profile',
    title: 'Configuración de Administrador',
    description: 'Completa tu perfil de administrador del sistema',
    component: 'ProfileStep',
    isCompleted: false,
    isOptional: false,
    estimatedTime: 8,
    category: 'profile',
    priority: 'high',
    validations: {
      required: ['adminName', 'email', 'phone', 'department'],
      optional: ['bio', 'notifications_preferences']
    },
    rewards: {
      points: 200,
      badge: 'admin_profile_complete'
    }
  },
  {
    id: 'admin-permissions',
    title: 'Configurar Permisos',
    description: 'Define niveles de acceso y permisos del sistema',
    component: 'PermissionsStep',
    isCompleted: false,
    isOptional: false,
    estimatedTime: 15,
    category: 'profile',
    priority: 'high',
    prerequisites: ['admin-profile'],
    validations: {
      required: ['permission_levels', 'access_controls'],
      optional: ['custom_roles', 'delegation_rules']
    },
    rewards: {
      points: 300,
      badge: 'permissions_master'
    }
  },

  // FASE 2: CONFIGURACIÓN DE PLATAFORMA
  {
    id: 'platform-branding',
    title: 'Configurar Branding',
    description: 'Personaliza la apariencia y marca de la plataforma',
    component: 'BrandingStep',
    isCompleted: false,
    isOptional: false,
    estimatedTime: 20,
    category: 'setup',
    priority: 'high',
    prerequisites: ['admin-permissions'],
    validations: {
      required: ['company_logo', 'color_scheme', 'platform_name'],
      optional: ['custom_domain', 'email_templates', 'favicon']
    },
    rewards: {
      points: 350,
      badge: 'branding_designer'
    }
  },
  {
    id: 'subscription-plans',
    title: 'Crear Planes de Suscripción',
    description: 'Define planes de suscripción y precios para usuarios',
    component: 'SubscriptionPlansStep',
    isCompleted: false,
    isOptional: false,
    estimatedTime: 25,
    category: 'setup',
    priority: 'high',
    prerequisites: ['platform-branding'],
    validations: {
      required: ['plan_structure', 'pricing_tiers', 'feature_matrix'],
      optional: ['trial_periods', 'enterprise_plans', 'custom_pricing']
    },
    rewards: {
      points: 400,
      badge: 'subscription_architect'
    }
  },
  {
    id: 'payment-processing',
    title: 'Configurar Procesamiento de Pagos',
    description: 'Activa gateways de pago y configuraciones globales',
    component: 'PaymentProcessingStep',
    isCompleted: false,
    isOptional: false,
    estimatedTime: 18,
    category: 'setup',
    priority: 'high',
    prerequisites: ['subscription-plans'],
    validations: {
      required: ['payment_gateways', 'currency_settings'],
      optional: ['multi_currency', 'tax_configuration', 'refund_policies']
    },
    rewards: {
      points: 350
    }
  },

  // FASE 3: INTEGRACIÓN Y POLÍTICAS
  {
    id: 'privacy-policies',
    title: 'Políticas de Privacidad',
    description: 'Define políticas de privacidad y términos de servicio',
    component: 'PrivacyPoliciesStep',
    isCompleted: false,
    isOptional: false,
    estimatedTime: 30,
    category: 'integration',
    priority: 'high',
    prerequisites: ['payment-processing'],
    validations: {
      required: ['privacy_policy', 'terms_of_service', 'gdpr_compliance'],
      optional: ['cookie_policy', 'data_retention', 'consent_management']
    },
    rewards: {
      points: 300,
      badge: 'compliance_officer'
    }
  },
  {
    id: 'global-settings',
    title: 'Configuraciones Globales',
    description: 'Configura parámetros globales del sistema',
    component: 'GlobalSettingsStep',
    isCompleted: false,
    isOptional: false,
    estimatedTime: 22,
    category: 'integration',
    priority: 'high',
    prerequisites: ['privacy-policies'],
    validations: {
      required: ['system_timezone', 'default_language', 'email_settings'],
      optional: ['maintenance_mode', 'api_rate_limits', 'backup_schedule']
    },
    rewards: {
      points: 300
    }
  },
  {
    id: 'user-management',
    title: 'Sistema de Gestión de Usuarios',
    description: 'Configura registro, verificación y gestión de usuarios',
    component: 'UserManagementStep',
    isCompleted: false,
    isOptional: false,
    estimatedTime: 20,
    category: 'integration',
    priority: 'high',
    prerequisites: ['global-settings'],
    validations: {
      required: ['registration_flow', 'verification_process'],
      optional: ['approval_workflows', 'bulk_operations', 'user_analytics']
    },
    rewards: {
      points: 350
    }
  },

  // FASE 4: CONFIGURACIÓN AVANZADA
  {
    id: 'analytics-dashboard',
    title: 'Configurar Analytics',
    description: 'Configura dashboards y reportes administrativos',
    component: 'AnalyticsDashboardStep',
    isCompleted: false,
    isOptional: false,
    estimatedTime: 25,
    category: 'configuration',
    priority: 'high',
    prerequisites: ['user-management'],
    validations: {
      required: ['admin_dashboard', 'key_metrics'],
      optional: ['custom_reports', 'data_exports', 'real_time_monitoring']
    },
    rewards: {
      points: 400,
      badge: 'analytics_master'
    }
  },
  {
    id: 'notification-system',
    title: 'Sistema de Notificaciones',
    description: 'Configura notificaciones y alertas del sistema',
    component: 'NotificationSystemStep',
    isCompleted: false,
    isOptional: false,
    estimatedTime: 18,
    category: 'configuration',
    priority: 'high',
    prerequisites: ['analytics-dashboard'],
    validations: {
      required: ['notification_channels', 'alert_rules'],
      optional: ['escalation_policies', 'notification_templates']
    },
    rewards: {
      points: 300
    }
  },
  {
    id: 'security-configuration',
    title: 'Configuración de Seguridad',
    description: 'Configura políticas de seguridad y autenticación',
    component: 'SecurityConfigurationStep',
    isCompleted: false,
    isOptional: false,
    estimatedTime: 22,
    category: 'configuration',
    priority: 'high',
    prerequisites: ['notification-system'],
    validations: {
      required: ['password_policies', 'session_management'],
      optional: ['two_factor_auth', 'ip_restrictions', 'audit_logging']
    },
    rewards: {
      points: 350,
      badge: 'security_expert'
    }
  },

  // FASE 5: LANZAMIENTO Y MONITOREO
  {
    id: 'system-testing',
    title: 'Pruebas del Sistema',
    description: 'Ejecuta pruebas completas de la plataforma',
    component: 'SystemTestingStep',
    isCompleted: false,
    isOptional: false,
    estimatedTime: 30,
    category: 'launch',
    priority: 'high',
    prerequisites: ['security-configuration'],
    validations: {
      required: ['functionality_tests', 'performance_tests'],
      optional: ['load_testing', 'security_testing', 'user_acceptance']
    },
    rewards: {
      points: 400
    }
  },
  {
    id: 'backup-disaster-recovery',
    title: 'Backup y Recuperación',
    description: 'Configura estrategias de backup y recuperación',
    component: 'BackupDisasterRecoveryStep',
    isCompleted: false,
    isOptional: false,
    estimatedTime: 20,
    category: 'launch',
    priority: 'high',
    prerequisites: ['system-testing'],
    validations: {
      required: ['backup_strategy', 'recovery_procedures'],
      optional: ['automated_backups', 'offsite_storage', 'disaster_plan']
    },
    rewards: {
      points: 350,
      badge: 'backup_guardian'
    }
  },
  {
    id: 'platform-launch',
    title: 'Lanzamiento de la Plataforma',
    description: 'Activa la plataforma para usuarios finales',
    component: 'PlatformLaunchStep',
    isCompleted: false,
    isOptional: false,
    estimatedTime: 15,
    category: 'launch',
    priority: 'high',
    prerequisites: ['backup-disaster-recovery'],
    validations: {
      required: ['go_live_checklist', 'monitoring_active'],
      optional: ['launch_communications', 'support_readiness']
    },
    rewards: {
      points: 500,
      badge: 'platform_launcher'
    }
  },
  {
    id: 'monitoring-setup',
    title: 'Configurar Monitoreo',
    description: 'Activa monitoreo continuo y alertas operacionales',
    component: 'MonitoringSetupStep',
    isCompleted: false,
    isOptional: false,
    estimatedTime: 18,
    category: 'launch',
    priority: 'high',
    prerequisites: ['platform-launch'],
    validations: {
      required: ['system_monitoring', 'health_checks'],
      optional: ['performance_monitoring', 'user_behavior_tracking']
    },
    rewards: {
      points: 350
    }
  },
  {
    id: 'admin-completion',
    title: 'Configuración Administrativa Completa',
    description: 'La plataforma está completamente configurada y operativa',
    component: 'CompletionStep',
    isCompleted: false,
    isOptional: false,
    estimatedTime: 5,
    category: 'launch',
    priority: 'high',
    prerequisites: ['monitoring-setup'],
    rewards: {
      points: 500,
      badge: 'master_administrator'
    }
  }
];

export default adminSteps;
