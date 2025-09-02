import { InvoicingService } from './InvoicingService';
import ClinicSubscription from '@/lib/models/ClinicSubscription';
import { SubscriptionPlanUtils } from '@/lib/config/subscription-plans';
import connectDB from '@/lib/db';

/**
 * Servicio para facturación automática de suscripciones
 */
export class AutoInvoicingService {
  
  /**
   * Procesa facturación automática para todas las suscripciones que la requieran
   */
  static async processAutomaticInvoicing(): Promise<{
    processed: number;
    successful: number;
    failed: number;
    errors: any[];
  }> {
    try {
      await connectDB();
      
      const today = new Date();
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      // Buscar suscripciones que necesitan facturación
      const subscriptionsToInvoice = await ClinicSubscription.find({
        status: 'active',
        plan: { $in: ['Pro', 'Elite'] }, // Solo planes de pago
        'billing.autoInvoicing': true,
        $or: [
          { nextBillingDate: { $lte: tomorrow } },
          { nextBillingDate: null } // Suscripciones sin fecha de facturación configurada
        ],
        'billing.fiscalData.rfc': { $exists: true, $ne: '' }
      });
      
      let successful = 0;
      let failed = 0;
      const errors: any[] = [];
      
      console.log(`Processing automatic invoicing for ${subscriptionsToInvoice.length} subscriptions`);
      
      for (const subscription of subscriptionsToInvoice) {
        try {
          await this.invoiceSubscription(subscription);
          successful++;
          console.log(`✅ Invoiced subscription ${subscription._id}`);
        } catch (error: any) {
          failed++;
          const errorInfo = {
            subscriptionId: subscription._id,
            clinicId: subscription.clinicId,
            error: error.message || 'Unknown error',
            details: error
          };
          errors.push(errorInfo);
          console.error(`❌ Failed to invoice subscription ${subscription._id}:`, error);
        }
        
        // Pequeña pausa entre facturas para no sobrecargar Facturama
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      console.log(`Automatic invoicing completed: ${successful} successful, ${failed} failed`);
      
      return {
        processed: subscriptionsToInvoice.length,
        successful,
        failed,
        errors
      };
      
    } catch (error: any) {
      console.error('Error in automatic invoicing process:', error);
      throw error;
    }
  }
  
  /**
   * Factura una suscripción específica
   */
  static async invoiceSubscription(subscription: any): Promise<any> {
    try {
      // Obtener detalles del plan
      const plan = SubscriptionPlanUtils.getPlanById(subscription.plan);
      if (!plan) {
        throw new Error(`Plan ${subscription.plan} not found`);
      }
      
      // Validar datos fiscales
      if (!subscription.billing?.fiscalData?.rfc) {
        throw new Error('Fiscal data not configured for subscription');
      }
      
      const fiscalData = subscription.billing.fiscalData;
      
      // Verificar que no se haya facturado ya este período
      const lastInvoiceDate = subscription.billing.lastInvoiceDate;
      const today = new Date();
      
      if (lastInvoiceDate) {
        const daysSinceLastInvoice = Math.floor(
          (today.getTime() - lastInvoiceDate.getTime()) / (1000 * 60 * 60 * 24)
        );
        
        // Si se facturó hace menos de 25 días, saltar
        if (daysSinceLastInvoice < 25) {
          console.log(`Subscription ${subscription._id} was invoiced ${daysSinceLastInvoice} days ago, skipping`);
          return null;
        }
      }
      
      // Preparar datos del CFDI
      const cfdiData = {
        type: 'saas' as const,
        receiver: {
          rfc: fiscalData.rfc,
          name: fiscalData.nombreFiscal,
          email: fiscalData.email,
          zipCode: fiscalData.cpFiscal,
          usoCfdi: fiscalData.usoCfdi || 'G03',
          regimenFiscal: fiscalData.regimenFiscal || '612'
        },
        items: [{
          description: `Suscripción ToothPick - Plan ${plan.name} - ${today.toLocaleDateString('es-MX', { month: 'long', year: 'numeric' })}`,
          quantity: 1,
          unitPrice: plan.price.monthly / 1.16, // Sin IVA
          productCode: '81112500', // Servicios de acceso a software
          unitCode: 'E48', // Unidad de servicio
          unit: 'Servicio',
          taxRate: 0.16
        }],
        paymentForm: '03', // Transferencia electrónica
        paymentMethod: 'PUE', // Pago en una exhibición
        observations: `Facturación automática - Suscripción mensual ToothPick Plan ${plan.name}`,
        relatedEntityId: subscription._id.toString(),
        relatedEntityType: 'subscription'
      };
      
      // Generar factura
      const result = await InvoicingService.createAndIssueInvoice(cfdiData);
      
      if (!result.success) {
        throw new Error(`Invoice generation failed: ${result.error}`);
      }
      
      // Actualizar suscripción
      subscription.billing = subscription.billing || {};
      subscription.billing.invoices = subscription.billing.invoices || [];
      subscription.billing.invoices.push(result.invoice._id);
      subscription.billing.lastInvoiceDate = new Date();
      subscription.billing.lastInvoiceAmount = plan.price.monthly;
      
      // Calcular próxima fecha de facturación (30 días)
      const nextBilling = new Date();
      nextBilling.setDate(nextBilling.getDate() + 30);
      subscription.nextBillingDate = nextBilling;
      
      await subscription.save();
      
      // Log exitoso
      console.log(`✅ Successfully invoiced subscription ${subscription._id} - Invoice: ${result.invoice.uuid}`);
      
      return result.invoice;
      
    } catch (error: any) {
      console.error(`Failed to invoice subscription ${subscription._id}:`, error);
      throw error;
    }
  }
  
  /**
   * Configura facturación automática para una suscripción
   */
  static async enableAutoInvoicing(
    subscriptionId: string,
    fiscalData: {
      rfc: string;
      nombreFiscal: string;
      email?: string;
      cpFiscal: string;
      regimenFiscal?: string;
      usoCfdi?: string;
    }
  ): Promise<{ success: boolean; error?: string }> {
    try {
      await connectDB();
      
      const subscription = await ClinicSubscription.findById(subscriptionId);
      
      if (!subscription) {
        return { success: false, error: 'Subscription not found' };
      }
      
      // Validar RFC
      if (!fiscalData.rfc || fiscalData.rfc.length < 12) {
        return { success: false, error: 'Invalid RFC' };
      }
      
      // Actualizar datos fiscales y habilitar facturación automática
      subscription.billing = subscription.billing || {};
      subscription.billing.fiscalData = {
        rfc: fiscalData.rfc.toUpperCase(),
        nombreFiscal: fiscalData.nombreFiscal,
        email: fiscalData.email,
        cpFiscal: fiscalData.cpFiscal,
        regimenFiscal: fiscalData.regimenFiscal || '612',
        usoCfdi: fiscalData.usoCfdi || 'G03'
      };
      subscription.billing.autoInvoicing = true;
      
      // Establecer próxima fecha de facturación si no existe
      if (!subscription.nextBillingDate) {
        const nextBilling = new Date();
        nextBilling.setDate(nextBilling.getDate() + 30);
        subscription.nextBillingDate = nextBilling;
      }
      
      await subscription.save();
      
      return { success: true };
      
    } catch (error: any) {
      console.error('Error enabling auto invoicing:', error);
      return { success: false, error: error.message };
    }
  }
  
  /**
   * Deshabilita facturación automática para una suscripción
   */
  static async disableAutoInvoicing(subscriptionId: string): Promise<{ success: boolean; error?: string }> {
    try {
      await connectDB();
      
      const subscription = await ClinicSubscription.findById(subscriptionId);
      
      if (!subscription) {
        return { success: false, error: 'Subscription not found' };
      }
      
      subscription.billing = subscription.billing || {};
      subscription.billing.autoInvoicing = false;
      
      await subscription.save();
      
      return { success: true };
      
    } catch (error: any) {
      console.error('Error disabling auto invoicing:', error);
      return { success: false, error: error.message };
    }
  }
  
  /**
   * Obtiene estadísticas de facturación automática
   */
  static async getAutoInvoicingStats(): Promise<{
    totalSubscriptions: number;
    autoInvoicingEnabled: number;
    pendingInvoicing: number;
    invoicedThisMonth: number;
    totalRevenue: number;
  }> {
    try {
      await connectDB();
      
      const [subscriptionStats] = await ClinicSubscription.aggregate([
        {
          $group: {
            _id: null,
            totalSubscriptions: { $sum: 1 },
            autoInvoicingEnabled: {
              $sum: { $cond: ['$billing.autoInvoicing', 1, 0] }
            },
            pendingInvoicing: {
              $sum: {
                $cond: [
                  {
                    $and: [
                      { $eq: ['$billing.autoInvoicing', true] },
                      { $lte: ['$nextBillingDate', new Date()] }
                    ]
                  },
                  1,
                  0
                ]
              }
            }
          }
        }
      ]);
      
      // Estadísticas de facturación del mes actual
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);
      
      const Invoice = (await import('@/lib/models/Invoice')).default;
      const [invoiceStats] = await Invoice.aggregate([
        {
          $match: {
            type: 'saas',
            issueDate: { $gte: startOfMonth },
            status: { $in: ['active', 'sent'] }
          }
        },
        {
          $group: {
            _id: null,
            invoicedThisMonth: { $sum: 1 },
            totalRevenue: { $sum: '$total' }
          }
        }
      ]);
      
      return {
        totalSubscriptions: subscriptionStats?.totalSubscriptions || 0,
        autoInvoicingEnabled: subscriptionStats?.autoInvoicingEnabled || 0,
        pendingInvoicing: subscriptionStats?.pendingInvoicing || 0,
        invoicedThisMonth: invoiceStats?.invoicedThisMonth || 0,
        totalRevenue: invoiceStats?.totalRevenue || 0
      };
      
    } catch (error: any) {
      console.error('Error getting auto invoicing stats:', error);
      return {
        totalSubscriptions: 0,
        autoInvoicingEnabled: 0,
        pendingInvoicing: 0,
        invoicedThisMonth: 0,
        totalRevenue: 0
      };
    }
  }
}
