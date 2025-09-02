// 🎯 FASE 31: Middleware de Verificación de Suscripción
// ✅ Middleware para controlar acceso basado en planes de suscripción

import { SubscriptionService } from '@/lib/services/SubscriptionService';

export interface FeatureAccessResult {
  hasAccess: boolean;
  reason?: string;
  upgradeRequired?: boolean;
  currentPlan?: string;
  requiredPlan?: string;
}

export class SubscriptionMiddleware {
  
  // Verificar acceso a una característica específica
  static async checkFeatureAccess(
    userId: string,
    organizationId: string,
    feature: string
  ): Promise<FeatureAccessResult> {
    try {
      const hasAccess = await SubscriptionService.hasFeatureAccess(
        userId,
        organizationId,
        feature
      );

      if (hasAccess) {
        return { hasAccess: true };
      }

      const subscriptionStatus = await SubscriptionService.getSubscriptionStatus(
        userId,
        organizationId
      );

      return {
        hasAccess: false,
        reason: subscriptionStatus.isActive 
          ? 'Característica no incluida en tu plan actual'
          : 'Suscripción requerida',
        upgradeRequired: true,
        currentPlan: subscriptionStatus.currentPlan?.tier || 'none',
        requiredPlan: this.getRequiredPlanForFeature(feature)
      };

    } catch (error) {
      console.error('Error verificando acceso a característica:', error);
      return {
        hasAccess: false,
        reason: 'Error al verificar permisos'
      };
    }
  }

  // Verificar límites de uso
  static async checkUsageLimits(
    userId: string,
    organizationId: string,
    resourceType: 'users' | 'orders' | 'products',
    currentUsage: number
  ): Promise<FeatureAccessResult> {
    try {
      const subscriptionStatus = await SubscriptionService.getSubscriptionStatus(
        userId,
        organizationId
      );

      let limit: number | null = null;
      switch (resourceType) {
        case 'users':
          limit = subscriptionStatus.restrictions.maxUsers;
          break;
        case 'orders':
          limit = subscriptionStatus.restrictions.maxOrders;
          break;
        case 'products':
          limit = subscriptionStatus.restrictions.maxProducts;
          break;
      }

      // Si no hay límite (null), acceso ilimitado
      if (limit === null) {
        return { hasAccess: true };
      }

      // Verificar si se excede el límite
      if (currentUsage >= limit) {
        return {
          hasAccess: false,
          reason: `Has alcanzado el límite de ${limit} ${resourceType} para tu plan actual`,
          upgradeRequired: true,
          currentPlan: subscriptionStatus.currentPlan?.tier || 'none'
        };
      }

      return { hasAccess: true };

    } catch (error) {
      console.error('Error verificando límites de uso:', error);
      return {
        hasAccess: false,
        reason: 'Error al verificar límites'
      };
    }
  }

  // Middleware para rutas protegidas
  static createRouteMiddleware(requiredFeature?: string, requiredPlan?: string) {
    return async (req: any, res: any, next: any) => {
      try {
        const userId = req.user?.id;
        const organizationId = req.user?.organizationId || req.headers['x-organization-id'];

        if (!userId || !organizationId) {
          return res.status(401).json({
            error: 'Usuario y organización requeridos',
            code: 'UNAUTHORIZED'
          });
        }

        // Verificar característica específica si se requiere
        if (requiredFeature) {
          const featureAccess = await this.checkFeatureAccess(
            userId,
            organizationId,
            requiredFeature
          );

          if (!featureAccess.hasAccess) {
            return res.status(403).json({
              error: featureAccess.reason || 'Acceso denegado',
              code: 'FEATURE_ACCESS_DENIED',
              upgradeRequired: featureAccess.upgradeRequired,
              currentPlan: featureAccess.currentPlan,
              requiredPlan: featureAccess.requiredPlan
            });
          }
        }

        // Verificar plan específico si se requiere
        if (requiredPlan) {
          const subscriptionStatus = await SubscriptionService.getSubscriptionStatus(
            userId,
            organizationId
          );

          if (!subscriptionStatus.isActive) {
            return res.status(403).json({
              error: 'Suscripción activa requerida',
              code: 'SUBSCRIPTION_REQUIRED',
              upgradeRequired: true,
              requiredPlan
            });
          }

          const currentTier = subscriptionStatus.currentPlan?.tier;
          if (!this.isPlanSufficient(currentTier, requiredPlan)) {
            return res.status(403).json({
              error: `Plan ${requiredPlan} o superior requerido`,
              code: 'PLAN_UPGRADE_REQUIRED',
              upgradeRequired: true,
              currentPlan: currentTier,
              requiredPlan
            });
          }
        }

        next();

      } catch (error) {
        console.error('Error en middleware de suscripción:', error);
        return res.status(500).json({
          error: 'Error interno del servidor',
          code: 'INTERNAL_ERROR'
        });
      }
    };
  }

  // Obtener plan requerido para una característica
  private static getRequiredPlanForFeature(feature: string): string {
    const featurePlanMap: { [key: string]: string } = {
      'basic_catalog': 'basic',
      'basic_orders': 'basic',
      'basic_profile': 'basic',
      'advanced_catalog': 'plus',
      'inventory_management': 'plus',
      'analytics_basic': 'plus',
      'analytics_advanced': 'premium',
      'team_management': 'plus',
      'custom_branding': 'premium',
      'api_access': 'premium',
      'priority_support': 'premium',
      'white_label': 'premium',
      'custom_integrations': 'premium',
      'dedicated_manager': 'premium'
    };

    return featurePlanMap[feature] || 'plus';
  }

  // Verificar si un plan es suficiente para el requerimiento
  private static isPlanSufficient(currentPlan: string | undefined, requiredPlan: string): boolean {
    const planHierarchy = ['basic', 'plus', 'premium'];
    const currentIndex = planHierarchy.indexOf(currentPlan || '');
    const requiredIndex = planHierarchy.indexOf(requiredPlan);

    return currentIndex >= requiredIndex;
  }

  // Decorador para funciones que requieren verificación de suscripción
  static requiresFeature(feature: string) {
    return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
      const originalMethod = descriptor.value;

      descriptor.value = async function (...args: any[]) {
        // Extraer userId y organizationId de los argumentos o contexto
        const userId = this.userId || args[0]?.userId;
        const organizationId = this.organizationId || args[0]?.organizationId;

        if (!userId || !organizationId) {
          throw new Error('Usuario y organización requeridos para verificar suscripción');
        }

        const access = await SubscriptionMiddleware.checkFeatureAccess(
          userId,
          organizationId,
          feature
        );

        if (!access.hasAccess) {
          const error = new Error(access.reason || 'Acceso denegado');
          (error as any).code = 'FEATURE_ACCESS_DENIED';
          (error as any).upgradeRequired = access.upgradeRequired;
          (error as any).currentPlan = access.currentPlan;
          (error as any).requiredPlan = access.requiredPlan;
          throw error;
        }

        return originalMethod.apply(this, args);
      };

      return descriptor;
    };
  }

  // Verificar estado de suscripción para webhooks
  static async validateSubscriptionForWebhook(
    userId: string,
    organizationId: string
  ): Promise<boolean> {
    try {
      const subscriptionStatus = await SubscriptionService.getSubscriptionStatus(
        userId,
        organizationId
      );

      return subscriptionStatus.isActive;
    } catch (error) {
      console.error('Error validando suscripción para webhook:', error);
      return false;
    }
  }
}

// Helper para uso en componentes de React
export const useSubscriptionAccess = () => {
  const checkAccess = async (
    userId: string,
    organizationId: string,
    feature: string
  ): Promise<FeatureAccessResult> => {
    return SubscriptionMiddleware.checkFeatureAccess(userId, organizationId, feature);
  };

  const checkLimits = async (
    userId: string,
    organizationId: string,
    resourceType: 'users' | 'orders' | 'products',
    currentUsage: number
  ): Promise<FeatureAccessResult> => {
    return SubscriptionMiddleware.checkUsageLimits(userId, organizationId, resourceType, currentUsage);
  };

  return {
    checkAccess,
    checkLimits
  };
};

export default SubscriptionMiddleware;
