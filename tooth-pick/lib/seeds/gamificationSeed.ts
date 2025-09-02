import dbConnect from '@/lib/db';

const defaultEvents = [
  // Eventos de Onboarding
  {
    id: 'profile_completed',
    title: 'Perfil Completado',
    description: 'Completar el perfil personal con toda la información requerida',
    category: 'onboarding',
    pointsBase: 50,
    applicableRoles: ['patient', 'dentist', 'distributor'],
    isDaily: false,
    cooldownHours: 0,
    maxOccurrences: 1
  },
  {
    id: 'first_login',
    title: 'Primera Sesión',
    description: 'Iniciar sesión por primera vez en la plataforma',
    category: 'onboarding',
    pointsBase: 25,
    applicableRoles: ['patient', 'dentist', 'distributor'],
    isDaily: false,
    maxOccurrences: 1
  },
  {
    id: 'track_completed',
    title: 'Track de Onboarding Completado',
    description: 'Completar un track completo del sistema de onboarding',
    category: 'onboarding',
    pointsBase: 100,
    applicableRoles: ['patient', 'dentist', 'distributor'],
    isDaily: false,
    maxOccurrences: 10,
    badgeAwarded: 'track_master'
  },
  {
    id: 'lesson_completed',
    title: 'Lección Completada',
    description: 'Completar una lección del sistema de onboarding/academy',
    category: 'education',
    pointsBase: 20,
    applicableRoles: ['patient', 'dentist', 'distributor'],
    isDaily: false,
    cooldownHours: 1,
    maxOccurrences: null
  },

  // Eventos de Actividad Diaria
  {
    id: 'daily_login',
    title: 'Inicio de Sesión Diario',
    description: 'Iniciar sesión en la plataforma',
    category: 'engagement',
    pointsBase: 10,
    applicableRoles: ['patient', 'dentist', 'distributor'],
    isDaily: true,
    cooldownHours: 20,
    maxOccurrences: null
  },
  {
    id: 'daily_activity',
    title: 'Actividad Diaria',
    description: 'Realizar al menos 3 acciones en la plataforma en un día',
    category: 'engagement',
    pointsBase: 15,
    applicableRoles: ['patient', 'dentist', 'distributor'],
    isDaily: true,
    cooldownHours: 20,
    maxOccurrences: null
  },

  // Eventos de Marketplace
  {
    id: 'first_order',
    title: 'Primera Compra',
    description: 'Realizar la primera compra en el marketplace',
    category: 'marketplace',
    pointsBase: 100,
    applicableRoles: ['patient', 'dentist'],
    isDaily: false,
    maxOccurrences: 1,
    badgeAwarded: 'first_buyer'
  },
  {
    id: 'order_placed',
    title: 'Pedido Realizado',
    description: 'Realizar un pedido en el marketplace',
    category: 'marketplace',
    pointsBase: 30,
    applicableRoles: ['patient', 'dentist'],
    isDaily: false,
    cooldownHours: 2,
    maxOccurrences: null
  },
  {
    id: 'review_written',
    title: 'Reseña Escrita',
    description: 'Escribir una reseña para un producto',
    category: 'marketplace',
    pointsBase: 25,
    applicableRoles: ['patient', 'dentist'],
    isDaily: false,
    cooldownHours: 6,
    maxOccurrences: null
  },

  // Eventos de Citas
  {
    id: 'appointment_booked',
    title: 'Cita Agendada',
    description: 'Agendar una cita dental',
    category: 'appointments',
    pointsBase: 20,
    applicableRoles: ['patient'],
    isDaily: false,
    cooldownHours: 1,
    maxOccurrences: null
  },
  {
    id: 'appointment_attended',
    title: 'Cita Atendida',
    description: 'Asistir a una cita dental agendada',
    category: 'appointments',
    pointsBase: 50,
    applicableRoles: ['patient'],
    isDaily: false,
    cooldownHours: 0,
    maxOccurrences: null
  },
  {
    id: 'appointment_completed',
    title: 'Cita Completada',
    description: 'Completar una cita dental como dentista',
    category: 'appointments',
    pointsBase: 40,
    applicableRoles: ['dentist'],
    isDaily: false,
    cooldownHours: 0,
    maxOccurrences: null
  },

  // Eventos Sociales
  {
    id: 'referral_sent',
    title: 'Referido Enviado',
    description: 'Enviar una invitación de referido',
    category: 'social',
    pointsBase: 15,
    applicableRoles: ['patient', 'dentist', 'distributor'],
    isDaily: false,
    cooldownHours: 1,
    maxOccurrences: null
  },
  {
    id: 'referral_joined',
    title: 'Referido Exitoso',
    description: 'Un usuario se registra usando tu código de referido',
    category: 'social',
    pointsBase: 100,
    applicableRoles: ['patient', 'dentist', 'distributor'],
    isDaily: false,
    cooldownHours: 0,
    maxOccurrences: null,
    badgeAwarded: 'referrer'
  },

  // Eventos Especiales
  {
    id: 'survey_completed',
    title: 'Encuesta Completada',
    description: 'Completar una encuesta de satisfacción',
    category: 'feedback',
    pointsBase: 30,
    applicableRoles: ['patient', 'dentist', 'distributor'],
    isDaily: false,
    cooldownHours: 24,
    maxOccurrences: null
  },
  {
    id: 'support_ticket_resolved',
    title: 'Ticket de Soporte Resuelto',
    description: 'Resolver un ticket de soporte como staff',
    category: 'support',
    pointsBase: 25,
    applicableRoles: ['admin', 'support'],
    isDaily: false,
    cooldownHours: 0,
    maxOccurrences: null
  }
];

const defaultBadges = [
  // Insignias de Onboarding
  {
    id: 'welcome_aboard',
    title: 'Bienvenido a Bordo',
    description: 'Completar el registro y primer inicio de sesión',
    iconEmoji: '🎉',
    category: 'onboarding',
    rarity: 'common',
    isSecret: false,
    pointsReward: 0,
    criteria: {
      type: 'events',
      events: ['first_login'],
      minCount: 1
    },
    applicableRoles: ['patient', 'dentist', 'distributor']
  },
  {
    id: 'profile_master',
    title: 'Maestro del Perfil',
    description: 'Completar el perfil al 100%',
    iconEmoji: '👤',
    category: 'onboarding',
    rarity: 'common',
    isSecret: false,
    pointsReward: 25,
    criteria: {
      type: 'events',
      events: ['profile_completed'],
      minCount: 1
    },
    applicableRoles: ['patient', 'dentist', 'distributor']
  },
  {
    id: 'track_master',
    title: 'Maestro de Tracks',
    description: 'Completar 3 tracks de onboarding',
    iconEmoji: '🎓',
    category: 'education',
    rarity: 'uncommon',
    isSecret: false,
    pointsReward: 50,
    criteria: {
      type: 'events',
      events: ['track_completed'],
      minCount: 3
    },
    applicableRoles: ['patient', 'dentist', 'distributor']
  },

  // Insignias de Actividad
  {
    id: 'daily_warrior',
    title: 'Guerrero Diario',
    description: 'Mantener una racha de 7 días consecutivos',
    iconEmoji: '🔥',
    category: 'engagement',
    rarity: 'uncommon',
    isSecret: false,
    pointsReward: 100,
    criteria: {
      type: 'streak',
      minStreak: 7
    },
    applicableRoles: ['patient', 'dentist', 'distributor']
  },
  {
    id: 'consistent_user',
    title: 'Usuario Consistente',
    description: 'Mantener una racha de 30 días consecutivos',
    iconEmoji: '⭐',
    category: 'engagement',
    rarity: 'rare',
    isSecret: false,
    pointsReward: 300,
    criteria: {
      type: 'streak',
      minStreak: 30
    },
    applicableRoles: ['patient', 'dentist', 'distributor']
  },
  {
    id: 'engagement_legend',
    title: 'Leyenda del Compromiso',
    description: 'Mantener una racha de 100 días consecutivos',
    iconEmoji: '👑',
    category: 'engagement',
    rarity: 'legendary',
    isSecret: false,
    pointsReward: 1000,
    criteria: {
      type: 'streak',
      minStreak: 100
    },
    applicableRoles: ['patient', 'dentist', 'distributor']
  },

  // Insignias de Marketplace
  {
    id: 'first_buyer',
    title: 'Primer Comprador',
    description: 'Realizar la primera compra en el marketplace',
    iconEmoji: '🛒',
    category: 'marketplace',
    rarity: 'common',
    isSecret: false,
    pointsReward: 50,
    criteria: {
      type: 'events',
      events: ['first_order'],
      minCount: 1
    },
    applicableRoles: ['patient', 'dentist']
  },
  {
    id: 'shopping_enthusiast',
    title: 'Entusiasta de Compras',
    description: 'Realizar 10 pedidos en el marketplace',
    iconEmoji: '🛍️',
    category: 'marketplace',
    rarity: 'uncommon',
    isSecret: false,
    pointsReward: 150,
    criteria: {
      type: 'events',
      events: ['order_placed'],
      minCount: 10
    },
    applicableRoles: ['patient', 'dentist']
  },
  {
    id: 'reviewer',
    title: 'Reseñador',
    description: 'Escribir 5 reseñas de productos',
    iconEmoji: '✍️',
    category: 'marketplace',
    rarity: 'uncommon',
    isSecret: false,
    pointsReward: 100,
    criteria: {
      type: 'events',
      events: ['review_written'],
      minCount: 5
    },
    applicableRoles: ['patient', 'dentist']
  },

  // Insignias de Citas
  {
    id: 'appointment_regular',
    title: 'Paciente Regular',
    description: 'Asistir a 5 citas dentales',
    iconEmoji: '🦷',
    category: 'appointments',
    rarity: 'uncommon',
    isSecret: false,
    pointsReward: 200,
    criteria: {
      type: 'events',
      events: ['appointment_attended'],
      minCount: 5
    },
    applicableRoles: ['patient']
  },
  {
    id: 'dedicated_dentist',
    title: 'Dentista Dedicado',
    description: 'Completar 25 citas como dentista',
    iconEmoji: '🩺',
    category: 'appointments',
    rarity: 'rare',
    isSecret: false,
    pointsReward: 500,
    criteria: {
      type: 'events',
      events: ['appointment_completed'],
      minCount: 25
    },
    applicableRoles: ['dentist']
  },

  // Insignias Sociales
  {
    id: 'referrer',
    title: 'Embajador',
    description: 'Conseguir que se registre un usuario con tu código',
    iconEmoji: '🤝',
    category: 'social',
    rarity: 'uncommon',
    isSecret: false,
    pointsReward: 75,
    criteria: {
      type: 'events',
      events: ['referral_joined'],
      minCount: 1
    },
    applicableRoles: ['patient', 'dentist', 'distributor']
  },
  {
    id: 'super_referrer',
    title: 'Super Embajador',
    description: 'Conseguir que se registren 5 usuarios con tu código',
    iconEmoji: '🌟',
    category: 'social',
    rarity: 'rare',
    isSecret: false,
    pointsReward: 500,
    criteria: {
      type: 'events',
      events: ['referral_joined'],
      minCount: 5
    },
    applicableRoles: ['patient', 'dentist', 'distributor']
  },

  // Insignias de Nivel
  {
    id: 'level_5',
    title: 'Explorador',
    description: 'Alcanzar el nivel 5',
    iconEmoji: '🔍',
    category: 'progression',
    rarity: 'common',
    isSecret: false,
    pointsReward: 50,
    criteria: {
      type: 'level',
      minLevel: 5
    },
    applicableRoles: ['patient', 'dentist', 'distributor']
  },
  {
    id: 'level_10',
    title: 'Aventurero',
    description: 'Alcanzar el nivel 10',
    iconEmoji: '⚔️',
    category: 'progression',
    rarity: 'uncommon',
    isSecret: false,
    pointsReward: 100,
    criteria: {
      type: 'level',
      minLevel: 10
    },
    applicableRoles: ['patient', 'dentist', 'distributor']
  },
  {
    id: 'level_25',
    title: 'Veterano',
    description: 'Alcanzar el nivel 25',
    iconEmoji: '🏆',
    category: 'progression',
    rarity: 'rare',
    isSecret: false,
    pointsReward: 500,
    criteria: {
      type: 'level',
      minLevel: 25
    },
    applicableRoles: ['patient', 'dentist', 'distributor']
  },
  {
    id: 'level_50',
    title: 'Maestro',
    description: 'Alcanzar el nivel 50',
    iconEmoji: '🎖️',
    category: 'progression',
    rarity: 'epic',
    isSecret: false,
    pointsReward: 1500,
    criteria: {
      type: 'level',
      minLevel: 50
    },
    applicableRoles: ['patient', 'dentist', 'distributor']
  },

  // Insignias Secretas
  {
    id: 'early_bird',
    title: 'Madrugador',
    description: 'Iniciar sesión antes de las 6:00 AM durante 5 días',
    iconEmoji: '🌅',
    category: 'special',
    rarity: 'rare',
    isSecret: true,
    pointsReward: 200,
    criteria: {
      type: 'custom',
      description: 'Login before 6 AM for 5 days'
    },
    applicableRoles: ['patient', 'dentist', 'distributor']
  },
  {
    id: 'night_owl',
    title: 'Búho Nocturno',
    description: 'Usar la plataforma después de las 11:00 PM durante 7 días',
    iconEmoji: '🦉',
    category: 'special',
    rarity: 'rare',
    isSecret: true,
    pointsReward: 200,
    criteria: {
      type: 'custom',
      description: 'Use platform after 11 PM for 7 days'
    },
    applicableRoles: ['patient', 'dentist', 'distributor']
  },
  {
    id: 'perfectionist',
    title: 'Perfeccionista',
    description: 'Completar todas las lecciones de onboarding con 100% de progreso',
    iconEmoji: '💎',
    category: 'education',
    rarity: 'epic',
    isSecret: true,
    pointsReward: 1000,
    criteria: {
      type: 'custom',
      description: 'Complete all onboarding tracks with 100% progress'
    },
    applicableRoles: ['patient', 'dentist', 'distributor']
  }
];

export async function seedGamificationData() {
  try {
    await dbConnect();
    
    const GamificationEvent = (await import('@/lib/models/GamificationEvent')).default;
    const Badge = (await import('@/lib/models/Badge')).default;

    console.log('🎮 Iniciando seed de datos de gamificación...');

    // Limpiar datos existentes
    await GamificationEvent.deleteMany({});
    await Badge.deleteMany({});

    // Insertar eventos
    console.log('📅 Insertando eventos de gamificación...');
    const events = await GamificationEvent.insertMany(defaultEvents);
    console.log(`✅ ${events.length} eventos insertados`);

    // Insertar insignias
    console.log('🏆 Insertando insignias...');
    const badges = await Badge.insertMany(defaultBadges);
    console.log(`✅ ${badges.length} insignias insertadas`);

    console.log('🎯 Seed de gamificación completado exitosamente');

    return {
      success: true,
      events: events.length,
      badges: badges.length
    };
  } catch (error) {
    console.error('❌ Error en seed de gamificación:', error);
    throw error;
  }
}

export { defaultEvents, defaultBadges };
