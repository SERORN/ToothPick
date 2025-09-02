// 🎯 FASE 31: Servicio Principal de Suscripciones
// ✅ Lógica de negocio completa para manejo de suscripciones SaaS

import { connectDB } from '@/lib/db';
import SubscriptionPlan, { ISubscriptionPlan } from '@/lib/models/SubscriptionPlan';
import UserSubscription, { IUserSubscription } from '@/lib/models/UserSubscription';
import SubscriptionLog, { ISubscriptionLog } from '@/lib/models/SubscriptionLog';

export interface CreateSubscriptionParams {
  userId: string;
  organizationId: string;
  planId: string;
  billingCycle: 'monthly' | 'annually';
  currency: string;
  paymentMethod: 'stripe' | 'paypal' | 'spei' | 'transfer';
  requiresCFDI?: boolean;
  fiscalData?: any;
  couponCode?: string;
  source?: string;
  metadata?: Record<string, any>;
}

export interface UpgradeSubscriptionParams {
  subscriptionId: string;
  newPlanId: string;
  immediate?: boolean;
  reason?: string;
}

export interface SubscriptionStatus {
  isActive: boolean;
  isTrialing: boolean;
  daysRemaining: number;
  currentPlan: ISubscriptionPlan | null;
  subscription: IUserSubscription | null;
  restrictions: {
    maxUsers: number | null;
    maxOrders: number | null;
    maxProducts: number | null;
    features: string[];
  };
}

export class SubscriptionService {
  
  // Obtener planes disponibles para un rol específico
  static async getAvailablePlans(userRole: string, currency: string = 'USD') {
    await connectDB();
    
    const plans = await SubscriptionPlan.find({
      isActive: true,
      allowedRoles: { $in: [userRole] }
    }).sort({ tier: 1 }); // basic, plus, premium
    
    return plans.map(plan => ({
      ...plan.toObject(),
      monthlyPrice: plan.pricing.monthly.get(currency) || 0,
      annualPrice: plan.pricing.annually.get(currency) || 0,
      annualSavings: this.calculateAnnualSavings(
        plan.pricing.monthly.get(currency) || 0,
        plan.pricing.annually.get(currency) || 0
      )
    }));
  }
  
  // Calcular ahorro anual
  static calculateAnnualSavings(monthlyPrice: number, annualPrice: number): number {
    if (!monthlyPrice || !annualPrice) return 0;
    const monthlyTotal = monthlyPrice * 12;
    return Math.round(((monthlyTotal - annualPrice) / monthlyTotal) * 100);
  }
  
  // Crear nueva suscripción
  static async createSubscription(params: CreateSubscriptionParams): Promise<IUserSubscription> {
    await connectDB();
    
    // Verificar que el plan existe y está activo
    const plan = await SubscriptionPlan.findById(params.planId);
    if (!plan || !plan.isActive) {
      throw new Error('Plan no encontrado o inactivo');
    }
    
    // Verificar que no existe una suscripción activa
    const existingSubscription = await this.getActiveSubscription(params.userId, params.organizationId);
    if (existingSubscription) {
      throw new Error('Ya existe una suscripción activa para esta organización');
    }
    
    // Calcular fechas
    const now = new Date();
    const trialEnd = new Date(now.getTime() + (plan.trialDays * 24 * 60 * 60 * 1000));
    const currentPeriodEnd = params.billingCycle === 'monthly' 
      ? new Date(trialEnd.getTime() + (30 * 24 * 60 * 60 * 1000))
      : new Date(trialEnd.getTime() + (365 * 24 * 60 * 60 * 1000));
    
    // Obtener precio
    const amount = plan.pricing[params.billingCycle].get(params.currency);
    if (!amount) {
      throw new Error(`Precio no disponible para la moneda ${params.currency}`);
    }
    
    // Crear suscripción
    const subscription = new UserSubscription({
      userId: params.userId,
      organizationId: params.organizationId,
      planId: params.planId,
      status: 'trialing',
      billingCycle: params.billingCycle,
      currency: params.currency,
      amount,
      startDate: now,
      trialEnd,
      currentPeriodStart: now,
      currentPeriodEnd,
      paymentMethod: {
        type: params.paymentMethod
      },
      invoicing: {
        requiresCFDI: params.requiresCFDI || false,
        fiscalData: params.fiscalData,
        nextInvoiceDate: trialEnd
      },
      metadata: {
        source: params.source || 'web',
        ...params.metadata
      }
    });
    
    await subscription.save();
    
    // Crear log del evento
    await SubscriptionLog.createLog({
      subscriptionId: subscription._id.toString(),
      userId: params.userId,
      organizationId: params.organizationId,
      event: 'trial_started',
      eventData: {
        toPlan: params.planId,
        amount,
        currency: params.currency,
        paymentMethod: params.paymentMethod
      },
      systemData: {
        source: 'user'
      },
      result: {
        success: true
      }
    });
    
    return subscription;
  }
  
  // Obtener suscripción activa de una organización
  static async getActiveSubscription(
    userId: string, 
    organizationId: string
  ): Promise<IUserSubscription | null> {
    await connectDB();
    
    return await UserSubscription.findOne({
      userId,
      organizationId,
      status: { $in: ['trialing', 'active', 'past_due'] },
      currentPeriodEnd: { $gt: new Date() }
    }).populate('planId');
  }
  
  // Obtener estado completo de suscripción
  static async getSubscriptionStatus(
    userId: string,
    organizationId: string
  ): Promise<SubscriptionStatus> {
    const subscription = await this.getActiveSubscription(userId, organizationId);
    
    if (!subscription) {
      return {
        isActive: false,
        isTrialing: false,
        daysRemaining: 0,
        currentPlan: null,
        subscription: null,
        restrictions: {
          maxUsers: 1, // Límite básico sin suscripción
          maxOrders: 10,
          maxProducts: 50,
          features: ['basic_catalog', 'basic_orders']
        }
      };
    }
    
    const plan = subscription.planId as any as ISubscriptionPlan;
    const isTrialing = subscription.status === 'trialing' && 
      subscription.trialEnd && subscription.trialEnd > new Date();
    
    return {
      isActive: subscription.isActive,
      isTrialing,
      daysRemaining: subscription.daysRemaining,
      currentPlan: plan,
      subscription,
      restrictions: {
        maxUsers: plan.features.maxUsers,
        maxOrders: plan.features.maxOrders,
        maxProducts: plan.features.maxProducts,
        features: plan.features.features
      }
    };
  }
  
  // Actualizar suscripción (upgrade/downgrade)
  static async upgradeSubscription(params: UpgradeSubscriptionParams): Promise<IUserSubscription> {
    await connectDB();
    
    const subscription = await UserSubscription.findById(params.subscriptionId).populate('planId');
    if (!subscription) {
      throw new Error('Suscripción no encontrada');
    }
    
    const currentPlan = subscription.planId as any as ISubscriptionPlan;
    const newPlan = await SubscriptionPlan.findById(params.newPlanId);
    if (!newPlan) {
      throw new Error('Nuevo plan no encontrado');
    }
    
    // Calcular diferencia de precio si es inmediato
    const oldAmount = subscription.amount;
    const newAmount = newPlan.pricing[subscription.billingCycle].get(subscription.currency);
    
    if (!newAmount) {
      throw new Error(`Precio no disponible para la moneda ${subscription.currency}`);
    }
    
    // Determinar si es upgrade o downgrade
    const isUpgrade = newAmount > oldAmount;
    const eventType = isUpgrade ? 'upgraded' : 'downgraded';
    
    // Actualizar suscripción
    subscription.planId = params.newPlanId;
    subscription.amount = newAmount;
    
    if (params.immediate) {
      // Cambio inmediato
      subscription.metrics.upgrades += isUpgrade ? 1 : 0;
      subscription.metrics.downgrades += isUpgrade ? 0 : 1;
    } else {
      // Cambio al final del período
      subscription.renewalSettings.upgradeOnRenewal = params.newPlanId;
    }
    
    await subscription.save();
    
    // Crear log del evento
    await SubscriptionLog.createLog({
      subscriptionId: subscription._id.toString(),
      userId: subscription.userId,
      organizationId: subscription.organizationId,
      event: eventType,
      eventData: {
        fromPlan: currentPlan._id.toString(),
        toPlan: params.newPlanId,
        amount: newAmount,
        currency: subscription.currency,
        changeReason: params.reason || 'user_requested'
      },
      systemData: {
        source: 'user'
      },
      result: {
        success: true
      }
    });
    
    return subscription;
  }
  
  // Cancelar suscripción
  static async cancelSubscription(
    subscriptionId: string,
    immediate: boolean = false,
    reason?: string
  ): Promise<IUserSubscription> {
    await connectDB();
    
    const subscription = await UserSubscription.findById(subscriptionId);
    if (!subscription) {
      throw new Error('Suscripción no encontrada');
    }
    
    const now = new Date();
    
    if (immediate) {
      subscription.status = 'canceled';
      subscription.endedAt = now;
      subscription.canceledAt = now;
    } else {
      subscription.renewalSettings.cancelAtPeriodEnd = true;
      subscription.canceledAt = now;
    }
    
    await subscription.save();
    
    // Crear log del evento
    await SubscriptionLog.createLog({
      subscriptionId: subscription._id.toString(),
      userId: subscription.userId,
      organizationId: subscription.organizationId,
      event: 'canceled',
      eventData: {
        changeReason: reason || 'user_requested',
        metadata: { immediate }
      },
      systemData: {
        source: 'user'
      },
      result: {
        success: true
      }
    });
    
    return subscription;
  }
  
  // Reactivar suscripción cancelada
  static async reactivateSubscription(subscriptionId: string): Promise<IUserSubscription> {
    await connectDB();
    
    const subscription = await UserSubscription.findById(subscriptionId);
    if (!subscription) {
      throw new Error('Suscripción no encontrada');
    }
    
    if (subscription.status !== 'canceled') {
      throw new Error('Solo se pueden reactivar suscripciones canceladas');
    }
    
    // Verificar si no ha expirado completamente
    if (subscription.currentPeriodEnd < new Date()) {
      throw new Error('La suscripción ha expirado y no puede ser reactivada');
    }
    
    subscription.status = 'active';
    subscription.renewalSettings.cancelAtPeriodEnd = false;
    subscription.renewalSettings.autoRenew = true;
    subscription.canceledAt = undefined;
    subscription.endedAt = undefined;
    
    await subscription.save();
    
    // Crear log del evento
    await SubscriptionLog.createLog({
      subscriptionId: subscription._id.toString(),
      userId: subscription.userId,
      organizationId: subscription.organizationId,
      event: 'reactivated',
      systemData: {
        source: 'user'
      },
      result: {
        success: true
      }
    });
    
    return subscription;
  }
  
  // Procesar renovación automática
  static async processRenewal(subscriptionId: string): Promise<IUserSubscription> {
    await connectDB();
    
    const subscription = await UserSubscription.findById(subscriptionId);
    if (!subscription) {
      throw new Error('Suscripción no encontrada');
    }
    
    // Verificar si debe renovarse
    if (!subscription.renewalSettings.autoRenew || subscription.renewalSettings.cancelAtPeriodEnd) {
      subscription.status = 'expired';
      subscription.endedAt = new Date();
      await subscription.save();
      return subscription;
    }
    
    // Calcular nuevo período
    const now = new Date();
    const periodLength = subscription.billingCycle === 'monthly' ? 30 : 365;
    const newPeriodEnd = new Date(now.getTime() + (periodLength * 24 * 60 * 60 * 1000));
    
    // Verificar si hay upgrade pendiente
    if (subscription.renewalSettings.upgradeOnRenewal) {
      const newPlan = await SubscriptionPlan.findById(subscription.renewalSettings.upgradeOnRenewal);
      if (newPlan) {
        subscription.planId = subscription.renewalSettings.upgradeOnRenewal;
        subscription.amount = newPlan.pricing[subscription.billingCycle].get(subscription.currency) || subscription.amount;
        subscription.renewalSettings.upgradeOnRenewal = undefined;
      }
    }
    
    subscription.currentPeriodStart = now;
    subscription.currentPeriodEnd = newPeriodEnd;
    subscription.status = 'active';
    subscription.metrics.renewals += 1;
    subscription.invoicing.nextInvoiceDate = newPeriodEnd;
    
    await subscription.save();
    
    // Crear log del evento
    await SubscriptionLog.createLog({
      subscriptionId: subscription._id.toString(),
      userId: subscription.userId,
      organizationId: subscription.organizationId,
      event: 'renewed',
      eventData: {
        amount: subscription.amount,
        currency: subscription.currency
      },
      systemData: {
        source: 'system'
      },
      result: {
        success: true
      }
    });
    
    return subscription;
  }
  
  // Obtener suscripciones que expiran pronto
  static async getExpiringSubscriptions(days: number = 7): Promise<IUserSubscription[]> {
    await connectDB();
    
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + days);
    
    return await UserSubscription.find({
      status: { $in: ['trialing', 'active'] },
      currentPeriodEnd: { $lte: futureDate, $gt: new Date() },
      'renewalSettings.autoRenew': true
    }).populate('planId');
  }
  
  // Estadísticas de suscripciones
  static async getSubscriptionStats(organizationId?: string) {
    await connectDB();
    
    const matchStage = organizationId ? { organizationId } : {};
    
    const stats = await UserSubscription.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalRevenue: { $sum: '$amount' }
        }
      }
    ]);
    
    const planStats = await UserSubscription.aggregate([
      { $match: { ...matchStage, status: { $in: ['trialing', 'active'] } } },
      {
        $group: {
          _id: '$planId',
          count: { $sum: 1 },
          revenue: { $sum: '$amount' }
        }
      },
      {
        $lookup: {
          from: 'subscriptionplans',
          localField: '_id',
          foreignField: '_id',
          as: 'plan'
        }
      }
    ]);
    
    return {
      statusBreakdown: stats,
      planBreakdown: planStats,
      timestamp: new Date()
    };
  }
  
  // Verificar acceso a funcionalidad
  static async hasFeatureAccess(
    userId: string,
    organizationId: string,
    feature: string
  ): Promise<boolean> {
    const status = await this.getSubscriptionStatus(userId, organizationId);
    
    if (!status.isActive) {
      // Funcionalidades básicas sin suscripción
      const basicFeatures = ['basic_catalog', 'basic_orders', 'basic_profile'];
      return basicFeatures.includes(feature);
    }
    
    return status.restrictions.features.includes(feature) || 
           status.currentPlan?.features.features.includes(feature) || false;
  }
}
