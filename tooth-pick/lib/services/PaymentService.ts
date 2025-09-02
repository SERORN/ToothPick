// 💳 FASE 29: Servicio Principal de Pagos Multicanal
// ✅ Lógica central para procesar pagos internacionales

import { Types } from 'mongoose';
import PaymentMethod, { IPaymentMethod } from '../models/PaymentMethod';
import PaymentTransaction, { IPaymentTransaction } from '../models/PaymentTransaction';
import { StripeService } from './StripeService';
import { PayPalService } from './PayPalService';
import { BankTransferService } from './BankTransferService';
import { getCurrencyExchangeRate } from '../utils/currencyUtils';

export interface PaymentInitiationRequest {
  methodId: string;
  amount: number;
  currency: string;
  description?: string;
  metadata?: {
    userId?: string;
    organizationId?: string;
    userAgent?: string;
    ipAddress?: string;
    country?: string;
  };
  returnUrl?: string;
  cancelUrl?: string;
}

export interface PaymentInitiationResponse {
  success: boolean;
  paymentId?: string;
  transactionId?: string;
  paymentLink?: string;
  externalId?: string;
  referenceCode?: string;
  instructions?: string;
  expiresAt?: Date;
  error?: string;
}

export interface PaymentConfirmationRequest {
  transactionId: string;
  externalId?: string;
  metadata?: any;
}

export interface RefundRequest {
  transactionId: string;
  amount?: number; // Si no se especifica, reembolso total
  reason: string;
}

export class PaymentService {
  private stripeService: StripeService;
  private paypalService: PayPalService;
  private bankTransferService: BankTransferService;

  constructor() {
    this.stripeService = new StripeService();
    this.paypalService = new PayPalService();
    this.bankTransferService = new BankTransferService();
  }

  /**
   * 🚀 Iniciar un nuevo pago
   */
  async initiatePayment(request: PaymentInitiationRequest): Promise<PaymentInitiationResponse> {
    try {
      // 1. Validar datos de entrada
      const validation = await this.validatePaymentRequest(request);
      if (!validation.valid) {
        return { success: false, error: validation.error };
      }

      // 2. Obtener método de pago
      const paymentMethod = await this.getPaymentMethod(
        request.paymentMethodId,
        request.payeeId,
        request.currency
      );

      if (!paymentMethod) {
        return { success: false, error: 'Método de pago no encontrado o no compatible' };
      }

      // 3. Verificar compatibilidad
      const isCompatible = paymentMethod.isCompatibleWith(
        request.amount,
        request.currency,
        request.metadata?.country
      );

      if (!isCompatible) {
        return { success: false, error: 'El método de pago no es compatible con esta transacción' };
      }

      // 4. Calcular conversión de moneda si es necesaria
      const exchangeData = await this.calculateCurrencyConversion(
        request.amount,
        request.currency,
        paymentMethod.currency
      );

      // 5. Calcular fees
      const fees = paymentMethod.calculateFees(exchangeData.convertedAmount);

      // 6. Crear transacción en base de datos
      const transaction = await this.createTransaction({
        orderId: new Types.ObjectId(request.orderId),
        payerId: new Types.ObjectId(request.payerId),
        payeeId: new Types.ObjectId(request.payeeId),
        paymentMethodId: paymentMethod._id,
        amount: {
          original: request.amount,
          currency: request.currency,
          converted: exchangeData.convertedAmount,
          convertedCurrency: paymentMethod.currency,
          exchangeRate: exchangeData.exchangeRate
        },
        fees: {
          platform: 0, // Configurar según tu modelo de negocio
          payment: fees.total,
          total: fees.total,
          currency: paymentMethod.currency
        },
        method: paymentMethod.type,
        description: request.description,
        metadata: request.metadata || {}
      });

      // 7. Procesar según el tipo de método
      const processingResult = await this.processPaymentByMethod(
        paymentMethod,
        transaction,
        exchangeData.convertedAmount
      );

      if (!processingResult.success) {
        await transaction.addEvent('payment_failed', 'failed', processingResult.error || 'Error desconocido');
        transaction.status = 'failed';
        await transaction.save();
        return { success: false, error: processingResult.error };
      }

      // 8. Actualizar transacción con datos del proveedor
      transaction.paymentLink = processingResult.paymentLink;
      transaction.externalId = processingResult.externalId;
      if (processingResult.externalId) {
        transaction.metadata.paymentIntentId = processingResult.externalId;
      }

      await transaction.addEvent('payment_intent_created', 'processing', 'Payment intent creado exitosamente');
      transaction.status = 'processing';
      await transaction.save();

      // 9. Actualizar último uso del método
      await paymentMethod.updateLastUsed();

      return {
        success: true,
        transactionId: transaction._id.toString(),
        paymentLink: processingResult.paymentLink,
        referenceCode: transaction.referenceCode,
        instructions: processingResult.instructions,
        expiresAt: processingResult.expiresAt
      };

    } catch (error) {
      console.error('Error iniciando pago:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Error interno del servidor' 
      };
    }
  }

  /**
   * ✅ Confirmar un pago (webhook o callback)
   */
  async confirmPayment(request: PaymentConfirmationRequest): Promise<boolean> {
    try {
      const transaction = await PaymentTransaction.findById(request.transactionId);
      if (!transaction) {
        throw new Error('Transacción no encontrada');
      }

      const paymentMethod = await PaymentMethod.findById(transaction.paymentMethodId);
      if (!paymentMethod) {
        throw new Error('Método de pago no encontrado');
      }

      // Verificar estado actual
      if (transaction.status !== 'processing') {
        throw new Error(`No se puede confirmar pago con estado: ${transaction.status}`);
      }

      // Verificar con el proveedor externo
      const verification = await this.verifyPaymentWithProvider(
        paymentMethod.type,
        request.externalId || transaction.externalId || '',
        request.metadata
      );

      if (verification.success) {
        transaction.status = 'paid';
        transaction.completedAt = new Date();
        transaction.externalId = request.externalId || transaction.externalId;
        await transaction.addEvent('payment_confirmed', 'paid', 'Pago confirmado exitosamente');
      } else {
        transaction.status = 'failed';
        transaction.failedAt = new Date();
        await transaction.addEvent('payment_failed', 'failed', verification.error || 'Verificación fallida');
      }

      await transaction.save();
      return verification.success;

    } catch (error) {
      console.error('Error confirmando pago:', error);
      return false;
    }
  }

  /**
   * 💸 Procesar reembolso
   */
  async refundPayment(request: RefundRequest): Promise<PaymentInitiationResponse> {
    try {
      const transaction = await PaymentTransaction.findById(request.transactionId);
      if (!transaction) {
        return { success: false, error: 'Transacción no encontrada' };
      }

      if (!transaction.isRefundable) {
        return { success: false, error: 'Esta transacción no puede ser reembolsada' };
      }

      const refundAmount = request.amount || transaction.getRemainingAmount();
      if (refundAmount > transaction.getRemainingAmount()) {
        return { success: false, error: 'Monto de reembolso excede el monto disponible' };
      }

      const paymentMethod = await PaymentMethod.findById(transaction.paymentMethodId);
      if (!paymentMethod) {
        return { success: false, error: 'Método de pago no encontrado' };
      }

      // Procesar reembolso con el proveedor
      const refundResult = await this.processRefundByMethod(
        paymentMethod.type,
        transaction.externalId || '',
        refundAmount,
        request.reason
      );

      if (refundResult.success) {
        await transaction.addRefund(refundAmount, request.reason, refundResult.refundId || '');
        await transaction.addEvent('refund_initiated', 'refunded', 'Reembolso procesado exitosamente');
        
        return {
          success: true,
          transactionId: transaction._id.toString(),
          referenceCode: refundResult.refundId
        };
      } else {
        return { success: false, error: refundResult.error };
      }

    } catch (error) {
      console.error('Error procesando reembolso:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Error interno del servidor' 
      };
    }
  }

  /**
   * 📊 Obtener estado de un pago
   */
  async getPaymentStatus(transactionId: string): Promise<IPaymentTransaction | null> {
    try {
      const transaction = await PaymentTransaction.findById(transactionId)
        .populate('paymentMethodId')
        .populate('payerId', 'name email')
        .populate('payeeId', 'name');

      return transaction;
    } catch (error) {
      console.error('Error obteniendo estado del pago:', error);
      return null;
    }
  }

  /**
   * 📋 Listar métodos de pago de una organización
   */
  async listOrganizationMethods(orgId: string, currency?: string): Promise<IPaymentMethod[]> {
    try {
      return await PaymentMethod.findByOrganization(orgId, currency);
    } catch (error) {
      console.error('Error listando métodos de pago:', error);
      return [];
    }
  }

  /**
   * ✅ Validar si un método es compatible con una moneda
   */
  async validateMethodForCurrency(methodId: string, currency: string): Promise<boolean> {
    try {
      const method = await PaymentMethod.findById(methodId);
      return method ? method.currency === currency : false;
    } catch (error) {
      console.error('Error validando método:', error);
      return false;
    }
  }

  // 🔧 Métodos privados

  private async validatePaymentRequest(request: PaymentInitiationRequest): Promise<{ valid: boolean; error?: string }> {
    if (!request.orderId || !Types.ObjectId.isValid(request.orderId)) {
      return { valid: false, error: 'ID de orden inválido' };
    }

    if (!request.payerId || !Types.ObjectId.isValid(request.payerId)) {
      return { valid: false, error: 'ID de pagador inválido' };
    }

    if (!request.payeeId || !Types.ObjectId.isValid(request.payeeId)) {
      return { valid: false, error: 'ID de beneficiario inválido' };
    }

    if (!request.amount || request.amount <= 0) {
      return { valid: false, error: 'Monto inválido' };
    }

    if (!request.currency || !/^[A-Z]{3}$/.test(request.currency)) {
      return { valid: false, error: 'Moneda inválida' };
    }

    return { valid: true };
  }

  private async getPaymentMethod(
    methodId: string | undefined,
    orgId: string,
    currency: string
  ): Promise<IPaymentMethod | null> {
    if (methodId) {
      return await PaymentMethod.findById(methodId);
    } else {
      return await PaymentMethod.findDefault(orgId, currency);
    }
  }

  private async calculateCurrencyConversion(
    amount: number,
    fromCurrency: string,
    toCurrency: string
  ): Promise<{ convertedAmount: number; exchangeRate: number }> {
    if (fromCurrency === toCurrency) {
      return { convertedAmount: amount, exchangeRate: 1 };
    }

    const exchangeRate = await getCurrencyExchangeRate(fromCurrency, toCurrency);
    const convertedAmount = Math.round((amount * exchangeRate) * 100) / 100;

    return { convertedAmount, exchangeRate };
  }

  private async createTransaction(data: any): Promise<IPaymentTransaction> {
    const transaction = new PaymentTransaction(data);
    await transaction.addEvent('created', 'pending', 'Transacción creada');
    return await transaction.save();
  }

  private async processPaymentByMethod(
    method: IPaymentMethod,
    transaction: IPaymentTransaction,
    amount: number
  ): Promise<{ success: boolean; paymentLink?: string; externalId?: string; instructions?: string; expiresAt?: Date; error?: string }> {
    switch (method.type) {
      case 'stripe':
        return await this.stripeService.createPaymentIntent(
          amount,
          method.currency,
          transaction.referenceCode,
          method.accountData
        );

      case 'paypal':
        return await this.paypalService.createOrder(
          amount,
          method.currency,
          transaction.referenceCode,
          method.accountData
        );

      case 'bank_transfer':
      case 'swift':
      case 'spei':
      case 'pix':
        return await this.bankTransferService.generateInstructions(
          method.type,
          amount,
          method.currency,
          transaction.referenceCode,
          method.accountData
        );

      case 'manual':
        return {
          success: true,
          instructions: method.accountData.instructions || 'Contactar para instrucciones de pago',
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 días
        };

      default:
        return { success: false, error: 'Método de pago no soportado' };
    }
  }

  private async verifyPaymentWithProvider(
    method: string,
    externalId: string,
    metadata?: any
  ): Promise<{ success: boolean; error?: string }> {
    switch (method) {
      case 'stripe':
        return await this.stripeService.verifyPayment(externalId);

      case 'paypal':
        return await this.paypalService.verifyPayment(externalId);

      case 'bank_transfer':
      case 'swift':
      case 'spei':
      case 'pix':
        return await this.bankTransferService.verifyPayment(externalId, metadata);

      case 'manual':
        // Verificación manual - requiere intervención humana
        return { success: false, error: 'Verificación manual requerida' };

      default:
        return { success: false, error: 'Método de verificación no soportado' };
    }
  }

  private async processRefundByMethod(
    method: string,
    externalId: string,
    amount: number,
    reason: string
  ): Promise<{ success: boolean; refundId?: string; error?: string }> {
    switch (method) {
      case 'stripe':
        return await this.stripeService.createRefund(externalId, amount, reason);

      case 'paypal':
        return await this.paypalService.createRefund(externalId, amount, reason);

      case 'bank_transfer':
      case 'swift':
      case 'spei':
      case 'pix':
        return await this.bankTransferService.initiateRefund(externalId, amount, reason);

      case 'manual':
        return {
          success: true,
          refundId: `MANUAL-${Date.now()}`,
          error: 'Reembolso manual - requiere procesamiento fuera del sistema'
        };

      default:
        return { success: false, error: 'Método de reembolso no soportado' };
    }
  }
}

export default PaymentService;
