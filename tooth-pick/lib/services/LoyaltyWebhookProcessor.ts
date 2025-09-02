// 🎯 FASE 32: Procesador de Webhooks para Fidelización
// ✅ Detector automático de eventos para triggers de fidelidad

import { LoyaltyService } from '@/lib/services/LoyaltyService';
import UserSubscription from '@/lib/models/UserSubscription';

export class LoyaltyWebhookProcessor {
  
  // Procesar evento de pago exitoso
  static async processPaymentSuccess(paymentData: {
    userId: string;
    organizationId: string;
    amount: number;
    currency: string;
    paidAt: Date;
    subscriptionId?: string;
    isOnTime?: boolean;
  }) {
    try {
      const events = [];
      
      // Trigger: PAY_ON_TIME
      if (paymentData.isOnTime) {
        const onTimeEvents = await LoyaltyService.processEvent({
          userId: paymentData.userId,
          organizationId: paymentData.organizationId,
          eventType: 'PAY_ON_TIME',
          eventData: {
            sourceModule: 'payment',
            sourceId: paymentData.subscriptionId,
            description: `Pago puntual de ${paymentData.amount} ${paymentData.currency}`,
            dynamicValue: paymentData.amount,
            metadata: {
              currency: paymentData.currency,
              isOnTime: true
            }
          },
          originalEventDate: paymentData.paidAt,
          systemInfo: {
            source: 'webhook',
            requestId: crypto.randomUUID()
          }
        });
        events.push(...onTimeEvents);
      }
      
      // Trigger: SPEND_OVER_X (si supera cierto monto)
      if (paymentData.amount >= 1000) {
        const spendingEvents = await LoyaltyService.processEvent({
          userId: paymentData.userId,
          organizationId: paymentData.organizationId,
          eventType: 'SPEND_OVER_X',
          eventData: {
            sourceModule: 'payment',
            sourceId: paymentData.subscriptionId,
            description: `Gasto alto: ${paymentData.amount} ${paymentData.currency}`,
            dynamicValue: paymentData.amount,
            metadata: {
              currency: paymentData.currency,
              spendingTier: paymentData.amount >= 5000 ? 'premium' : 'high'
            }
          },
          originalEventDate: paymentData.paidAt,
          systemInfo: {
            source: 'webhook',
            requestId: crypto.randomUUID()
          }
        });
        events.push(...spendingEvents);
      }
      
      return events;
      
    } catch (error) {
      console.error('Error procesando pago para fidelización:', error);
      throw error;
    }
  }
  
  // Procesar renovación de suscripción
  static async processSubscriptionRenewal(renewalData: {
    userId: string;
    organizationId: string;
    subscriptionId: string;
    planId: string;
    amount: number;
    currency: string;
    renewedAt: Date;
    isAutomatic?: boolean;
    wasOnTime?: boolean;
  }) {
    try {
      // Actualizar métricas de fidelización en la suscripción
      const subscription = await UserSubscription.findOne({
        userId: renewalData.userId,
        organizationId: renewalData.organizationId
      });
      
      if (subscription) {
        subscription.loyalty.loyaltyEvents.renewalsOnTime += renewalData.wasOnTime ? 1 : 0;
        subscription.loyalty.loyaltyEvents.consecutiveRenewals += 1;
        subscription.loyalty.loyaltyEvents.lastRenewalBonus = new Date();
        subscription.loyalty.lifetimeValue += renewalData.amount;
        
        await subscription.save();
      }
      
      // Trigger: RENEW_SUBSCRIPTION
      const renewalEvents = await LoyaltyService.processEvent({
        userId: renewalData.userId,
        organizationId: renewalData.organizationId,
        eventType: 'RENEW_SUBSCRIPTION',
        eventData: {
          sourceModule: 'subscription',
          sourceId: renewalData.subscriptionId,
          description: `Renovación ${renewalData.isAutomatic ? 'automática' : 'manual'} de suscripción`,
          dynamicValue: renewalData.amount,
          metadata: {
            planId: renewalData.planId,
            isAutomatic: renewalData.isAutomatic,
            wasOnTime: renewalData.wasOnTime,
            currency: renewalData.currency
          }
        },
        originalEventDate: renewalData.renewedAt,
        systemInfo: {
          source: 'webhook',
          requestId: crypto.randomUUID()
        }
      });
      
      return renewalEvents;
      
    } catch (error) {
      console.error('Error procesando renovación para fidelización:', error);
      throw error;
    }
  }
  
  // Procesar upgrade de suscripción
  static async processSubscriptionUpgrade(upgradeData: {
    userId: string;
    organizationId: string;
    subscriptionId: string;
    fromPlanId: string;
    toPlanId: string;
    upgradedAt: Date;
    additionalAmount?: number;
  }) {
    try {
      // Actualizar métricas de la suscripción
      const subscription = await UserSubscription.findOne({
        userId: upgradeData.userId,
        organizationId: upgradeData.organizationId
      });
      
      if (subscription) {
        subscription.loyalty.loyaltyEvents.upgradeCount += 1;
        await subscription.save();
      }
      
      // Trigger: UPGRADE_SUBSCRIPTION
      const upgradeEvents = await LoyaltyService.processEvent({
        userId: upgradeData.userId,
        organizationId: upgradeData.organizationId,
        eventType: 'UPGRADE_SUBSCRIPTION',
        eventData: {
          sourceModule: 'subscription',
          sourceId: upgradeData.subscriptionId,
          description: `Upgrade de plan de suscripción`,
          dynamicValue: upgradeData.additionalAmount,
          metadata: {
            fromPlanId: upgradeData.fromPlanId,
            toPlanId: upgradeData.toPlanId,
            upgradeType: 'plan_change'
          }
        },
        originalEventDate: upgradeData.upgradedAt,
        systemInfo: {
          source: 'webhook',
          requestId: crypto.randomUUID()
        }
      });
      
      return upgradeEvents;
      
    } catch (error) {
      console.error('Error procesando upgrade para fidelización:', error);
      throw error;
    }
  }
  
  // Procesar referencia exitosa
  static async processSuccessfulReferral(referralData: {
    referrerId: string;
    referredUserId: string;
    organizationId: string;
    referredAt: Date;
    referralValue?: number; // Valor de la primera suscripción del referido
  }) {
    try {
      // Actualizar métricas del referidor
      const referrerSubscription = await UserSubscription.findOne({
        userId: referralData.referrerId,
        organizationId: referralData.organizationId
      });
      
      if (referrerSubscription) {
        referrerSubscription.loyalty.loyaltyEvents.referralsSuccessful += 1;
        await referrerSubscription.save();
      }
      
      // Trigger: REFER_USER para el referidor
      const referralEvents = await LoyaltyService.processEvent({
        userId: referralData.referrerId,
        organizationId: referralData.organizationId,
        eventType: 'REFER_USER',
        eventData: {
          sourceModule: 'referral',
          sourceId: referralData.referredUserId,
          description: `Referencia exitosa de nuevo usuario`,
          dynamicValue: referralData.referralValue,
          metadata: {
            referredUserId: referralData.referredUserId,
            referralValue: referralData.referralValue,
            hasActiveSubscription: true
          }
        },
        originalEventDate: referralData.referredAt,
        systemInfo: {
          source: 'webhook',
          requestId: crypto.randomUUID()
        }
      });
      
      // Trigger: WELCOME_BONUS para el referido (si aplica)
      const welcomeEvents = await LoyaltyService.processEvent({
        userId: referralData.referredUserId,
        organizationId: referralData.organizationId,
        eventType: 'WELCOME_BONUS',
        eventData: {
          sourceModule: 'referral',
          sourceId: referralData.referrerId,
          description: `Bono de bienvenida por referencia`,
          metadata: {
            referredBy: referralData.referrerId,
            isReferral: true
          }
        },
        originalEventDate: referralData.referredAt,
        systemInfo: {
          source: 'webhook',
          requestId: crypto.randomUUID()
        }
      });
      
      return [...referralEvents, ...welcomeEvents];
      
    } catch (error) {
      console.error('Error procesando referencia para fidelización:', error);
      throw error;
    }
  }
  
  // Procesar participación en campaña
  static async processCampaignParticipation(campaignData: {
    userId: string;
    organizationId: string;
    campaignId: string;
    participatedAt: Date;
    campaignType: string;
    completionValue?: number;
  }) {
    try {
      // Trigger: PARTICIPATE_IN_CAMPAIGN
      const campaignEvents = await LoyaltyService.processEvent({
        userId: campaignData.userId,
        organizationId: campaignData.organizationId,
        eventType: 'PARTICIPATE_IN_CAMPAIGN',
        eventData: {
          sourceModule: 'campaign',
          sourceId: campaignData.campaignId,
          description: `Participación en campaña: ${campaignData.campaignType}`,
          dynamicValue: campaignData.completionValue,
          metadata: {
            campaignId: campaignData.campaignId,
            campaignType: campaignData.campaignType,
            completionValue: campaignData.completionValue
          }
        },
        originalEventDate: campaignData.participatedAt,
        systemInfo: {
          source: 'webhook',
          requestId: crypto.randomUUID()
        }
      });
      
      return campaignEvents;
      
    } catch (error) {
      console.error('Error procesando participación en campaña:', error);
      throw error;
    }
  }
  
  // Procesar milestone de actividad (ejemplo: 100 pedidos)
  static async processActivityMilestone(milestoneData: {
    userId: string;
    organizationId: string;
    milestoneType: 'orders' | 'revenue' | 'engagement' | 'tenure';
    milestoneValue: number;
    achievedAt: Date;
    description: string;
  }) {
    try {
      // Trigger: MILESTONE_ACHIEVED
      const milestoneEvents = await LoyaltyService.processEvent({
        userId: milestoneData.userId,
        organizationId: milestoneData.organizationId,
        eventType: 'MILESTONE_ACHIEVED',
        eventData: {
          sourceModule: 'engagement',
          sourceId: `${milestoneData.milestoneType}_${milestoneData.milestoneValue}`,
          description: milestoneData.description,
          dynamicValue: milestoneData.milestoneValue,
          metadata: {
            milestoneType: milestoneData.milestoneType,
            milestoneValue: milestoneData.milestoneValue,
            category: 'achievement'
          }
        },
        originalEventDate: milestoneData.achievedAt,
        systemInfo: {
          source: 'webhook',
          requestId: crypto.randomUUID()
        }
      });
      
      return milestoneEvents;
      
    } catch (error) {
      console.error('Error procesando milestone:', error);
      throw error;
    }
  }
  
  // Método helper para determinar si un pago fue a tiempo
  static isPaymentOnTime(dueDate: Date, paidDate: Date): boolean {
    return paidDate <= dueDate;
  }
  
  // Método helper para determinar valor de referencia
  static calculateReferralValue(subscriptionAmount: number, currency: string): number {
    // Convertir a USD base para cálculo uniforme
    const conversionRates: { [key: string]: number } = {
      'USD': 1,
      'MXN': 0.055,
      'BRL': 0.18,
      'ARS': 0.0011,
      'CLP': 0.0011,
      'COP': 0.00025,
      'EUR': 1.1
    };
    
    const rate = conversionRates[currency] || 1;
    return subscriptionAmount * rate;
  }
}

export default LoyaltyWebhookProcessor;
