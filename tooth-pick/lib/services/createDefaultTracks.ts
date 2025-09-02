import OnboardingTrack from '../models/OnboardingTrack';

export async function createDefaultTracks() {
  const defaultTracks = [
    // Track para Pacientes
    {
      title: "Bienvenido a ToothPick - Guía del Paciente",
      description: "Aprende a usar ToothPick para encontrar dentistas, agendar citas y gestionar tu salud dental",
      targetRole: "patient",
      difficulty: "beginner",
      category: "Introducción",
      icon: "🦷",
      tags: ["básico", "navegación", "citas"],
      estimatedMinutes: 30,
      prerequisites: [],
      steps: [
        {
          stepId: "patient_welcome",
          title: "Introducción a ToothPick",
          description: "Conoce las principales funciones de la plataforma y cómo puede ayudarte",
          type: "video",
          contentRef: "/videos/patient-welcome.mp4",
          content: {
            text: `
              <h2>¡Bienvenido a ToothPick!</h2>
              <p>ToothPick es tu plataforma integral para el cuidado dental. Aquí podrás:</p>
              <ul>
                <li>🔍 <strong>Encontrar dentistas</strong> cerca de ti con especialidades específicas</li>
                <li>📅 <strong>Agendar citas</strong> de forma rápida y sencilla</li>
                <li>📋 <strong>Gestionar tu historial</strong> médico dental</li>
                <li>💬 <strong>Comunicarte</strong> con tu dentista</li>
                <li>📊 <strong>Seguir tu progreso</strong> de tratamientos</li>
              </ul>
              <p>Esta guía te ayudará a familiarizarte con todas estas funciones paso a paso.</p>
            `
          },
          required: true,
          order: 1,
          estimatedMinutes: 5,
          validation: {
            type: "time_spent",
            criteria: { minimumMinutes: 2 }
          }
        },
        {
          stepId: "patient_profile",
          title: "Completa tu Perfil",
          description: "Configura tu información personal y preferencias de salud dental",
          type: "task",
          contentRef: "/profile",
          content: {
            tasks: [
              {
                id: "complete_basic_info",
                title: "Información Básica",
                description: "Completa tu nombre, teléfono y dirección",
                type: "form_completion",
                validation: {
                  type: "api_call",
                  criteria: { endpoint: "/api/user/profile" }
                },
                instructions: [
                  "Ve a tu perfil haciendo clic en tu avatar",
                  "Completa todos los campos obligatorios",
                  "Guarda los cambios"
                ]
              },
              {
                id: "health_preferences",
                title: "Preferencias de Salud",
                description: "Indica alergias, condiciones médicas y preferencias de tratamiento",
                type: "form_completion",
                validation: {
                  type: "element_exists",
                  criteria: { selector: "[data-health-completed='true']" }
                },
                instructions: [
                  "Ve a la sección 'Salud Dental' en tu perfil",
                  "Completa el cuestionario de salud",
                  "Indica cualquier alergia o condición especial"
                ]
              }
            ]
          },
          required: true,
          order: 2,
          estimatedMinutes: 10,
          rewards: {
            points: 50,
            badge: "Perfil Completo"
          }
        },
        {
          stepId: "patient_search_dentist",
          title: "Buscar Dentistas",
          description: "Aprende a buscar y filtrar dentistas según tus necesidades",
          type: "task",
          contentRef: "/dentists",
          content: {
            tasks: [
              {
                id: "search_location",
                title: "Buscar por Ubicación",
                description: "Encuentra dentistas cerca de ti",
                type: "feature_usage",
                validation: {
                  type: "page_navigation",
                  criteria: { url: "/dentists" }
                },
                instructions: [
                  "Ve a la sección 'Dentistas' en el menú principal",
                  "Usa el filtro de ubicación para encontrar dentistas cerca",
                  "Explora los diferentes dentistas disponibles"
                ]
              },
              {
                id: "filter_specialty",
                title: "Filtrar por Especialidad",
                description: "Busca dentistas con especialidades específicas",
                type: "feature_usage",
                validation: {
                  type: "element_exists",
                  criteria: { selector: "[data-specialty-filter='selected']" }
                },
                instructions: [
                  "Usa los filtros de especialidad",
                  "Selecciona al menos una especialidad",
                  "Observa cómo cambian los resultados"
                ]
              }
            ]
          },
          required: true,
          order: 3,
          estimatedMinutes: 8,
          rewards: {
            points: 30
          }
        },
        {
          stepId: "patient_book_appointment",
          title: "Agendar una Cita",
          description: "Reserva tu primera cita dental a través de la plataforma",
          type: "task",
          contentRef: "/book",
          content: {
            tasks: [
              {
                id: "select_dentist",
                title: "Seleccionar Dentista",
                description: "Elige un dentista y revisa su perfil",
                type: "navigation",
                validation: {
                  type: "page_navigation",
                  criteria: { url: "/book/" }
                }
              },
              {
                id: "choose_time",
                title: "Seleccionar Horario",
                description: "Elige fecha y hora disponible",
                type: "form_completion",
                validation: {
                  type: "element_exists",
                  criteria: { selector: "[data-appointment-selected='true']" }
                }
              },
              {
                id: "confirm_booking",
                title: "Confirmar Reserva",
                description: "Completa la información de la cita",
                type: "form_completion",
                validation: {
                  type: "api_call",
                  criteria: { endpoint: "/api/appointments" }
                }
              }
            ]
          },
          required: false,
          order: 4,
          estimatedMinutes: 7,
          rewards: {
            points: 100,
            badge: "Primera Cita Agendada",
            unlockFeature: "recordatorios_automaticos"
          }
        }
      ],
      completionRewards: {
        points: 200,
        certificate: "Paciente ToothPick Certificado",
        badge: "Explorador Dental",
        unlockFeatures: ["chat_directo", "historial_completo", "recomendaciones_personalizadas"]
      },
      isActive: true
    },

    // Track para Dentistas
    {
      title: "ToothPick para Profesionales - Configuración Inicial",
      description: "Configura tu práctica dental y comienza a recibir pacientes a través de ToothPick",
      targetRole: "dentist",
      difficulty: "intermediate",
      category: "Configuración Profesional",
      icon: "👨‍⚕️",
      tags: ["profesional", "configuración", "práctica"],
      estimatedMinutes: 45,
      prerequisites: [],
      steps: [
        {
          stepId: "dentist_verification",
          title: "Verificación Profesional",
          description: "Completa tu verificación como profesional de la salud dental",
          type: "task",
          contentRef: "/dentist/verification",
          content: {
            tasks: [
              {
                id: "upload_license",
                title: "Subir Licencia Profesional",
                description: "Sube tu cédula profesional y documentos de certificación",
                type: "form_completion",
                validation: {
                  type: "api_call",
                  criteria: { endpoint: "/api/dentist/verification" }
                }
              },
              {
                id: "clinic_info",
                title: "Información de la Clínica",
                description: "Registra los datos de tu práctica dental",
                type: "form_completion",
                validation: {
                  type: "element_exists",
                  criteria: { selector: "[data-clinic-registered='true']" }
                }
              }
            ]
          },
          required: true,
          order: 1,
          estimatedMinutes: 15,
          rewards: {
            points: 100,
            badge: "Dentista Verificado"
          }
        },
        {
          stepId: "dentist_profile_setup",
          title: "Configurar Perfil Profesional",
          description: "Crea un perfil atractivo para atraer pacientes",
          type: "task",
          contentRef: "/dentist/profile",
          content: {
            tasks: [
              {
                id: "add_specialties",
                title: "Agregar Especialidades",
                description: "Especifica tus áreas de especialización",
                type: "form_completion",
                validation: {
                  type: "element_exists",
                  criteria: { selector: "[data-specialties-added='true']" }
                }
              },
              {
                id: "upload_photos",
                title: "Fotos del Consultorio",
                description: "Sube fotos de tu consultorio y equipo",
                type: "form_completion",
                validation: {
                  type: "api_call",
                  criteria: { endpoint: "/api/dentist/photos" }
                }
              },
              {
                id: "set_description",
                title: "Descripción Profesional",
                description: "Escribe una descripción atractiva de tu práctica",
                type: "form_completion",
                validation: {
                  type: "element_exists",
                  criteria: { selector: "[data-description-complete='true']" }
                }
              }
            ]
          },
          required: true,
          order: 2,
          estimatedMinutes: 20,
          rewards: {
            points: 75,
            badge: "Perfil Profesional Completo"
          }
        },
        {
          stepId: "dentist_schedule",
          title: "Configurar Disponibilidad",
          description: "Establece tu horario de trabajo y disponibilidad para citas",
          type: "task",
          contentRef: "/dentist/schedule",
          content: {
            tasks: [
              {
                id: "set_working_hours",
                title: "Horario de Trabajo",
                description: "Define tu horario de atención",
                type: "form_completion",
                validation: {
                  type: "api_call",
                  criteria: { endpoint: "/api/dentist/schedule" }
                }
              },
              {
                id: "block_unavailable",
                title: "Bloquear Fechas No Disponibles",
                description: "Marca vacaciones y días no laborables",
                type: "feature_usage",
                validation: {
                  type: "element_exists",
                  criteria: { selector: "[data-schedule-configured='true']" }
                }
              }
            ]
          },
          required: true,
          order: 3,
          estimatedMinutes: 10,
          rewards: {
            points: 50,
            unlockFeature: "calendario_automatico"
          }
        }
      ],
      completionRewards: {
        points: 300,
        certificate: "Dentista ToothPick Certificado",
        badge: "Profesional Activo",
        unlockFeatures: ["dashboard_avanzado", "reportes_detallados", "comunicacion_pacientes"]
      },
      isActive: true
    },

    // Track para Distribuidores
    {
      title: "ToothPick para Distribuidores - Gestión de Productos",
      description: "Aprende a gestionar tu catálogo de productos y órdenes en ToothPick",
      targetRole: "distributor",
      difficulty: "intermediate",
      category: "Gestión Comercial",
      icon: "📦",
      tags: ["distribuidor", "productos", "órdenes"],
      estimatedMinutes: 40,
      prerequisites: [],
      steps: [
        {
          stepId: "distributor_verification",
          title: "Verificación como Distribuidor",
          description: "Completa el proceso de verificación comercial",
          type: "task",
          contentRef: "/distributor/verification",
          content: {
            tasks: [
              {
                id: "company_registration",
                title: "Registro de Empresa",
                description: "Registra tu empresa y documentos comerciales",
                type: "form_completion",
                validation: {
                  type: "api_call",
                  criteria: { endpoint: "/api/distributor/verification" }
                }
              },
              {
                id: "tax_info",
                title: "Información Fiscal",
                description: "Proporciona información fiscal y de facturación",
                type: "form_completion",
                validation: {
                  type: "element_exists",
                  criteria: { selector: "[data-tax-info-complete='true']" }
                }
              }
            ]
          },
          required: true,
          order: 1,
          estimatedMinutes: 15,
          rewards: {
            points: 100,
            badge: "Distribuidor Verificado"
          }
        },
        {
          stepId: "distributor_catalog",
          title: "Configurar Catálogo de Productos",
          description: "Crea y organiza tu catálogo de productos dentales",
          type: "task",
          contentRef: "/distributor/catalog",
          content: {
            tasks: [
              {
                id: "add_categories",
                title: "Crear Categorías",
                description: "Organiza tus productos en categorías",
                type: "form_completion",
                validation: {
                  type: "api_call",
                  criteria: { endpoint: "/api/products/categories" }
                }
              },
              {
                id: "upload_products",
                title: "Subir Productos",
                description: "Agrega tus primeros productos al catálogo",
                type: "form_completion",
                validation: {
                  type: "element_exists",
                  criteria: { selector: "[data-products-uploaded='true']" }
                }
              },
              {
                id: "set_pricing",
                title: "Configurar Precios",
                description: "Establece precios y políticas de descuento",
                type: "form_completion",
                validation: {
                  type: "api_call",
                  criteria: { endpoint: "/api/products/pricing" }
                }
              }
            ]
          },
          required: true,
          order: 2,
          estimatedMinutes: 20,
          rewards: {
            points: 80,
            badge: "Catálogo Configurado"
          }
        },
        {
          stepId: "distributor_orders",
          title: "Gestión de Órdenes",
          description: "Aprende a gestionar órdenes y envíos",
          type: "article",
          contentRef: "/knowledge/order-management",
          content: {
            text: `
              <h2>Gestión de Órdenes ToothPick</h2>
              <p>Como distribuidor en ToothPick, puedes gestionar eficientemente todas tus órdenes desde el dashboard. Aquí te explicamos el proceso:</p>
              
              <h3>1. Recepción de Órdenes</h3>
              <ul>
                <li>Las órdenes llegan automáticamente a tu dashboard</li>
                <li>Recibes notificaciones por email y en la plataforma</li>
                <li>Puedes ver detalles completos de cada orden</li>
              </ul>
              
              <h3>2. Procesamiento</h3>
              <ul>
                <li>Confirma disponibilidad de productos</li>
                <li>Actualiza el estado de la orden</li>
                <li>Genera etiquetas de envío</li>
              </ul>
              
              <h3>3. Envío y Seguimiento</h3>
              <ul>
                <li>Integración con servicios de paquetería</li>
                <li>Seguimiento automático para clientes</li>
                <li>Notificaciones de entrega</li>
              </ul>
            `
          },
          required: true,
          order: 3,
          estimatedMinutes: 5,
          validation: {
            type: "time_spent",
            criteria: { minimumMinutes: 3 }
          }
        }
      ],
      completionRewards: {
        points: 250,
        certificate: "Distribuidor ToothPick Certificado",
        badge: "Socio Comercial",
        unlockFeatures: ["analytics_ventas", "promociones_automaticas", "integracion_inventario"]
      },
      isActive: true
    }
  ];

  try {
    // Crear cada track en la base de datos
    for (const trackData of defaultTracks) {
      const existingTrack = await OnboardingTrack.findOne({ 
        title: trackData.title,
        targetRole: trackData.targetRole 
      });

      if (!existingTrack) {
        await OnboardingTrack.create(trackData);
        console.log(`✅ Track creado: ${trackData.title}`);
      } else {
        console.log(`⚠️  Track ya existe: ${trackData.title}`);
      }
    }

    console.log('🎉 Tracks por defecto creados exitosamente');
    return true;
  } catch (error) {
    console.error('❌ Error creando tracks por defecto:', error);
    return false;
  }
}
