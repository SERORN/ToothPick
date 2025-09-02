import { NextRequest, NextResponse } from 'next/server';
// REMOVED: import connectDB from '@/lib/db';
// REMOVED: import ClinicSubscription from '@/lib/models/ClinicSubscription';
// REMOVED: import { SubscriptionPlanUtils, PlanId } from '@/lib/config/subscription-plans';

export interface SubscriptionValidationResult {
  hasAccess: boolean;
  subscription: any;
  reason?: string;
  upgradeRequired?: boolean;
  limitExceeded?: boolean;
  trialExpired?: boolean;
}

/**
 * Función para verificar acceso a características específicas
 */
export async function checkSubscriptionAccess(
  userId: string,
  feature: string
): Promise<boolean> {
  try {
    await connectDB();
    
    const subscription = await ClinicSubscription.findOne({ clinicId: userId });
    
    // Si no tiene suscripción, asumir plan Free
    if (!subscription) {
      return false; // Free plan no tiene acceso a marketing
    }
    
    // Verificar si la suscripción está activa usando método público
    const validation = await SubscriptionMiddleware.validateFeatureAccess(userId, feature);
    
    // Verificar acceso a marketing específicamente
    if (feature === 'marketing') {
      const planFeatures = SubscriptionPlanUtils.getPlanFeatures(subscription.planId);
      return planFeatures?.marketing?.campaigns === true;
    }
    
    return validation.hasAccess;
  } catch (error) {
    console.error('Error checking subscription access:', error);
    return false;
  }
}

/**
 * Función auxiliar para validar acceso por plan específico
 */
export async function validateSubscriptionAccess(
  userId: string,
  allowedPlans: string[]
): Promise<boolean> {
  try {
    await connectDB();
    
    const subscription = await ClinicSubscription.findOne({ 
      dentistId: userId,
      status: 'active'
    });
    
    if (!subscription) {
      return allowedPlans.includes('free');
    }
    
    return allowedPlans.includes(subscription.plan);
  } catch (error) {
    console.error('Error validating subscription access:', error);
    return false;
  }
}

/**
 * Middleware para validar acceso según el plan de suscripción
 */
export class SubscriptionMiddleware {
  
  /**
   * Valida si un usuario tiene acceso a una característica
   */
  static async validateFeatureAccess(
    userId: string,
    feature: string,
    requiredPlan?: PlanId
  ): Promise<SubscriptionValidationResult> {
    try {
      await connectDB();
      
      const subscription = await ClinicSubscription.findOne({ clinicId: userId });
      
      // Si no tiene suscripción, crear una gratuita
      if (!subscription) {
        const freeSubscription = await this.createFreeSubscription(userId);
        return this.checkFeatureAccess(freeSubscription, feature, requiredPlan);
      }
      
      // Verificar si la suscripción está activa
      if (!this.isSubscriptionActive(subscription)) {
        return {
          hasAccess: false,
          subscription,
          reason: 'Suscripción inactiva o expirada',
          upgradeRequired: true,
          trialExpired: subscription.status === 'trial' && new Date() > subscription.trialEndsAt
        };
      }
      
      return this.checkFeatureAccess(subscription, feature, requiredPlan);
      
    } catch (error) {
      console.error('Error validating subscription:', error);
      return {
        hasAccess: false,
        subscription: null,
        reason: 'Error interno del servidor'
      };
    }
  }
  
  /**
   * Verifica acceso específico a una característica
   */
  private static checkFeatureAccess(
    subscription: any,
    feature: string,
    requiredPlan?: PlanId
  ): SubscriptionValidationResult {
    const plan = SubscriptionPlanUtils.getPlanById(subscription.plan);
    
    if (!plan) {
      return {
        hasAccess: false,
        subscription,
        reason: 'Plan no válido'
      };
    }
    
    // Si se especifica un plan requerido, verificar
    if (requiredPlan) {
      const hasRequiredPlan = SubscriptionPlanUtils.isUpgrade('Free', subscription.plan) || 
                              subscription.plan === requiredPlan;
      
      if (!hasRequiredPlan) {
        return {
          hasAccess: false,
          subscription,
          reason: `Requiere plan ${requiredPlan} o superior`,
          upgradeRequired: true
        };
      }
    }
    
    // Verificar característica específica
    const hasFeature = SubscriptionPlanUtils.canAccessFeature(plan, feature as any);
    
    return {
      hasAccess: hasFeature,
      subscription,
      reason: hasFeature ? undefined : `Característica no incluida en plan ${plan.name}`,
      upgradeRequired: !hasFeature
    };
  }
  
  /**
   * Valida límites de uso (ej: número de citas)
   */
  static async validateUsageLimits(
    userId: string,
    limitType: 'appointments' | 'storage' | 'api_calls'
  ): Promise<SubscriptionValidationResult> {
    try {
      await connectDB();
      
      const subscription = await ClinicSubscription.findOne({ clinicId: userId });
      
      if (!subscription) {
        return {
          hasAccess: false,
          subscription: null,
          reason: 'No se encontró suscripción'
        };
      }
      
      if (limitType === 'appointments') {
        const limits = subscription.checkLimits();
        
        return {
          hasAccess: limits.canCreateAppointment,
          subscription,
          reason: limits.needsUpgrade ? 
            `Límite alcanzado: ${limits.appointmentsUsed}/${limits.appointmentsLimit} citas` : 
            undefined,
          limitExceeded: limits.needsUpgrade,
          upgradeRequired: limits.needsUpgrade
        };
      }
      
      // Otros tipos de límites se pueden implementar aquí
      return {
        hasAccess: true,
        subscription
      };
      
    } catch (error) {
      console.error('Error validating usage limits:', error);
      return {
        hasAccess: false,
        subscription: null,
        reason: 'Error interno del servidor'
      };
    }
  }
  
  /**
   * Crea una suscripción gratuita por defecto
   */
  private static async createFreeSubscription(userId: string) {
    const freeSubscription = new ClinicSubscription({
      clinicId: userId,
      plan: 'Free',
      status: 'active',
      startedAt: new Date(),
      expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 año
      pricing: {
        amount: 0,
        currency: 'MXN',
        interval: 'month',
        intervalCount: 1
      },
      features: SubscriptionPlanUtils.getPlanById('Free')?.features,
      history: [{
        action: 'created',
        toPlan: 'Free',
        timestamp: new Date(),
        reason: 'Auto-created free subscription'
      }]
    });
    
    return await freeSubscription.save();
  }
  
  /**
   * Verifica si una suscripción está activa
   */
  private static isSubscriptionActive(subscription: any): boolean {
    const now = new Date();
    
    // Verificar estado
    if (!['active', 'trial'].includes(subscription.status)) {
      return false;
    }
    
    // Verificar fechas de expiración
    if (subscription.expiresAt && now > subscription.expiresAt) {
      return false;
    }
    
    // Si está en trial, verificar fecha del trial
    if (subscription.status === 'trial' && subscription.trialEndsAt && now > subscription.trialEndsAt) {
      return false;
    }
    
    return true;
  }
  
  /**
   * Middleware para APIs - valida acceso antes de procesar request
   */
  static async apiMiddleware(
    request: NextRequest,
    userId: string,
    requiredFeature?: string,
    requiredPlan?: PlanId
  ): Promise<NextResponse | null> {
    
    if (!requiredFeature && !requiredPlan) {
      return null; // No hay restricciones
    }
    
    const validation = await this.validateFeatureAccess(userId, requiredFeature || 'basic', requiredPlan);
    
    if (!validation.hasAccess) {
      return NextResponse.json({
        error: 'Acceso denegado',
        reason: validation.reason,
        upgradeRequired: validation.upgradeRequired,
        subscription: {
          plan: validation.subscription?.plan,
          status: validation.subscription?.status
        }
      }, { status: 403 });
    }
    
    // Agregar información de suscripción al request para uso posterior
    (request as any).subscription = validation.subscription;
    
    return null; // Continuar con el request
  }
  
  /**
   * Helper para incrementar uso y validar límites
   */
  static async trackUsage(
    userId: string,
    usageType: 'appointment' | 'api_call' | 'storage',
    amount: number = 1
  ): Promise<{ success: boolean; limitExceeded?: boolean }> {
    try {
      await connectDB();
      
      const subscription = await ClinicSubscription.findOne({ clinicId: userId });
      
      if (!subscription) {
        return { success: false };
      }
      
      if (usageType === 'appointment') {
        // Verificar límites antes de incrementar
        const limits = subscription.checkLimits();
        
        if (!limits.canCreateAppointment) {
          return { success: false, limitExceeded: true };
        }
        
        // Incrementar uso
        await subscription.incrementAppointmentUsage();
        return { success: true };
      }
      
      // Otros tipos de uso se pueden implementar aquí
      return { success: true };
      
    } catch (error) {
      console.error('Error tracking usage:', error);
      return { success: false };
    }
  }
}

/**
 * Hook para usar en componentes React
 */
export const useSubscriptionValidation = () => {
  const validateFeature = async (feature: string, requiredPlan?: PlanId) => {
    // En un hook real, obtendríamos el userId del contexto de autenticación
    const userId = 'current-user-id'; // TODO: Obtener del contexto
    return SubscriptionMiddleware.validateFeatureAccess(userId, feature, requiredPlan);
  };
  
  const validateUsage = async (usageType: 'appointments' | 'storage' | 'api_calls') => {
    const userId = 'current-user-id'; // TODO: Obtener del contexto
    return SubscriptionMiddleware.validateUsageLimits(userId, usageType);
  };
  
  return {
    validateFeature,
    validateUsage
  };
};

export default SubscriptionMiddleware;
