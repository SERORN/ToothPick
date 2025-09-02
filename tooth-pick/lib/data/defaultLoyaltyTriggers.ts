// 🎯 FASE 32: Triggers por Defecto para Sistema de Fidelización
// ✅ Configuración inicial de triggers comunes

import { LoyaltyTrigger } from '@/lib/models/LoyaltyTrigger';

export const DEFAULT_LOYALTY_TRIGGERS = [
  {
    name: "Pago Puntual",
    description: "Gana puntos extra por pagar tu suscripción a tiempo",
    eventType: "PAY_ON_TIME",
    isActive: true,
    pointsReward: 100,
    xpReward: 50,
    conditions: {
      minAmount: 100,
      currency: "USD"
    },
    frequency: {
      type: "MONTHLY" as const,
      limitPerPeriod: 1
    },
    tierBonuses: {
      Bronze: 0,
      Silver: 10,
      Gold: 20,
      Platinum: 30
    },
    validFrom: new Date(),
    validUntil: new Date(new Date().setFullYear(new Date().getFullYear() + 1)),
    createdBy: "system",
    metadata: {
      category: "payment",
      priority: "high",
      autoApply: true
    }
  },
  {
    name: "Renovación de Suscripción",
    description: "Recibe puntos por renovar tu suscripción",
    eventType: "RENEW_SUBSCRIPTION",
    isActive: true,
    pointsReward: 200,
    xpReward: 100,
    conditions: {},
    frequency: {
      type: "UNLIMITED" as const
    },
    tierBonuses: {
      Bronze: 0,
      Silver: 15,
      Gold: 25,
      Platinum: 40
    },
    validFrom: new Date(),
    createdBy: "system",
    metadata: {
      category: "retention",
      priority: "high",
      autoApply: true
    }
  },
  {
    name: "Upgrade de Suscripción",
    description: "Puntos extra por mejorar tu plan de suscripción",
    eventType: "UPGRADE_SUBSCRIPTION",
    isActive: true,
    pointsReward: 500,
    xpReward: 200,
    conditions: {},
    frequency: {
      type: "UNLIMITED" as const
    },
    tierBonuses: {
      Bronze: 0,
      Silver: 20,
      Gold: 30,
      Platinum: 50
    },
    validFrom: new Date(),
    createdBy: "system",
    metadata: {
      category: "growth",
      priority: "high",
      autoApply: true
    }
  },
  {
    name: "Referencia Exitosa",
    description: "Gana puntos por cada usuario que refieryas exitosamente",
    eventType: "REFER_USER",
    isActive: true,
    pointsReward: 300,
    xpReward: 150,
    conditions: {},
    frequency: {
      type: "UNLIMITED" as const
    },
    tierBonuses: {
      Bronze: 0,
      Silver: 25,
      Gold: 35,
      Platinum: 50
    },
    validFrom: new Date(),
    createdBy: "system",
    metadata: {
      category: "referral",
      priority: "high",
      autoApply: true
    }
  },
  {
    name: "Bono de Bienvenida",
    description: "Puntos de bienvenida para nuevos usuarios",
    eventType: "WELCOME_BONUS",
    isActive: true,
    pointsReward: 150,
    xpReward: 75,
    conditions: {},
    frequency: {
      type: "ONCE" as const
    },
    tierBonuses: {
      Bronze: 0,
      Silver: 0,
      Gold: 0,
      Platinum: 0
    },
    validFrom: new Date(),
    createdBy: "system",
    metadata: {
      category: "onboarding",
      priority: "medium",
      autoApply: true
    }
  },
  {
    name: "Gasto Premium",
    description: "Puntos extra por gastos altos en el sistema",
    eventType: "SPEND_OVER_X",
    isActive: true,
    pointsReward: 250,
    xpReward: 125,
    conditions: {
      minAmount: 1000,
      currency: "USD"
    },
    frequency: {
      type: "MONTHLY" as const,
      limitPerPeriod: 3
    },
    tierBonuses: {
      Bronze: 0,
      Silver: 15,
      Gold: 25,
      Platinum: 40
    },
    validFrom: new Date(),
    createdBy: "system",
    metadata: {
      category: "spending",
      priority: "medium",
      autoApply: true
    }
  },
  {
    name: "Participación en Campaña",
    description: "Puntos por participar activamente en campañas de marketing",
    eventType: "PARTICIPATE_IN_CAMPAIGN",
    isActive: true,
    pointsReward: 75,
    xpReward: 40,
    conditions: {},
    frequency: {
      type: "WEEKLY" as const,
      limitPerPeriod: 2
    },
    tierBonuses: {
      Bronze: 0,
      Silver: 10,
      Gold: 20,
      Platinum: 30
    },
    validFrom: new Date(),
    createdBy: "system",
    metadata: {
      category: "engagement",
      priority: "medium",
      autoApply: true
    }
  },
  {
    name: "Logro de Milestone",
    description: "Recompensas por alcanzar hitos importantes",
    eventType: "MILESTONE_ACHIEVED",
    isActive: true,
    pointsReward: 400,
    xpReward: 200,
    conditions: {},
    frequency: {
      type: "UNLIMITED" as const
    },
    tierBonuses: {
      Bronze: 0,
      Silver: 20,
      Gold: 30,
      Platinum: 45
    },
    validFrom: new Date(),
    createdBy: "system",
    metadata: {
      category: "achievement",
      priority: "high",
      autoApply: true
    }
  }
];

// Función para crear triggers por defecto en una organización
export async function createDefaultTriggers(organizationId: string, createdBy: string = 'system') {
  try {
    const triggers = DEFAULT_LOYALTY_TRIGGERS.map(trigger => ({
      ...trigger,
      organizationId,
      createdBy,
      createdAt: new Date(),
      updatedAt: new Date()
    }));

    const createdTriggers = await LoyaltyTrigger.insertMany(triggers);
    
    console.log(`✅ Creados ${createdTriggers.length} triggers por defecto para organización ${organizationId}`);
    return createdTriggers;
    
  } catch (error) {
    console.error('❌ Error creando triggers por defecto:', error);
    throw error;
  }
}

// Función para actualizar triggers existentes con nuevas configuraciones
export async function updateDefaultTriggers(organizationId: string) {
  try {
    const updates = [];
    
    for (const trigger of DEFAULT_LOYALTY_TRIGGERS) {
      const updateResult = await LoyaltyTrigger.updateOne(
        {
          organizationId,
          eventType: trigger.eventType,
          createdBy: 'system'
        },
        {
          $set: {
            ...trigger,
            updatedAt: new Date()
          }
        },
        { upsert: true }
      );
      
      updates.push(updateResult);
    }
    
    console.log(`✅ Actualizados triggers por defecto para organización ${organizationId}`);
    return updates;
    
  } catch (error) {
    console.error('❌ Error actualizando triggers por defecto:', error);
    throw error;
  }
}

// Triggers especiales para eventos estacionales
export const SEASONAL_TRIGGERS = [
  {
    name: "Bonus Navideño",
    description: "Puntos extra durante la temporada navideña",
    eventType: "PAY_ON_TIME",
    isActive: true,
    pointsReward: 150,
    xpReward: 75,
    conditions: {},
    frequency: {
      type: "MONTHLY" as const,
      limitPerPeriod: 1
    },
    tierBonuses: {
      Bronze: 50,
      Silver: 75,
      Gold: 100,
      Platinum: 150
    },
    validFrom: new Date('2024-12-01'),
    validUntil: new Date('2025-01-15'),
    metadata: {
      category: "seasonal",
      season: "christmas",
      priority: "high",
      autoApply: true
    }
  },
  {
    name: "Promoción Año Nuevo",
    description: "Comienza el año ganando puntos extra",
    eventType: "RENEW_SUBSCRIPTION",
    isActive: true,
    pointsReward: 300,
    xpReward: 150,
    conditions: {},
    frequency: {
      type: "ONCE" as const
    },
    tierBonuses: {
      Bronze: 25,
      Silver: 50,
      Gold: 75,
      Platinum: 100
    },
    validFrom: new Date('2025-01-01'),
    validUntil: new Date('2025-01-31'),
    metadata: {
      category: "seasonal",
      season: "new_year",
      priority: "high",
      autoApply: true
    }
  }
];

// Función para crear triggers estacionales
export async function createSeasonalTriggers(organizationId: string, season: string, createdBy: string = 'system') {
  try {
    const seasonalTriggers = SEASONAL_TRIGGERS.filter(trigger => 
      trigger.metadata.season === season
    );
    
    const triggers = seasonalTriggers.map(trigger => ({
      ...trigger,
      organizationId,
      createdBy: `${createdBy}_seasonal`,
      createdAt: new Date(),
      updatedAt: new Date()
    }));

    const createdTriggers = await LoyaltyTrigger.insertMany(triggers);
    
    console.log(`✅ Creados ${createdTriggers.length} triggers estacionales (${season}) para organización ${organizationId}`);
    return createdTriggers;
    
  } catch (error) {
    console.error('❌ Error creando triggers estacionales:', error);
    throw error;
  }
}

export default {
  DEFAULT_LOYALTY_TRIGGERS,
  SEASONAL_TRIGGERS,
  createDefaultTriggers,
  updateDefaultTriggers,
  createSeasonalTriggers
};
