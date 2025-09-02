// 💰 FASE 29: API Reembolsos de Pagos
// ✅ Endpoint para procesar reembolsos

import { NextRequest, NextResponse } from 'next/server';
import PaymentService from '@/lib/services/PaymentService';
import PaymentTransactionModel from '@/lib/models/PaymentTransaction';
import { getUserFromRequest, getUserOrganization, hasPermission } from '@/lib/utils/auth';

/**
 * 🔄 POST /api/payments/[id]/refund
 * Procesar reembolso de un pago
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json(
        { error: 'Usuario no autenticado' },
        { status: 401 }
      );
    }

    // Verificar permisos de reembolso
    if (!hasPermission(user, 'payments:refund')) {
      return NextResponse.json(
        { error: 'Sin permisos para realizar reembolsos' },
        { status: 403 }
      );
    }

    const organization = await getUserOrganization(user.id);
    if (!organization) {
      return NextResponse.json(
        { error: 'Organización no encontrada' },
        { status: 404 }
      );
    }

    const paymentId = params.id;
    const body = await request.json();
    const { amount, reason, notifyCustomer = true } = body;

    // Validar datos requeridos
    if (!reason) {
      return NextResponse.json(
        { error: 'Razón del reembolso es requerida' },
        { status: 400 }
      );
    }

    // Buscar el pago
    const payment = await PaymentTransactionModel.findOne({
      _id: paymentId,
      organizationId: organization.id
    });

    if (!payment) {
      return NextResponse.json(
        { error: 'Pago no encontrado' },
        { status: 404 }
      );
    }

    // Verificar que el pago puede ser reembolsado
    if (payment.status !== 'completed') {
      return NextResponse.json(
        { error: 'Solo se pueden reembolsar pagos completados' },
        { status: 400 }
      );
    }

    // Si no se especifica monto, reembolsar todo
    const refundAmount = amount || payment.amount;

    // Validar monto de reembolso
    if (refundAmount <= 0 || refundAmount > payment.amount) {
      return NextResponse.json(
        { error: 'Monto de reembolso inválido' },
        { status: 400 }
      );
    }

    // Verificar reembolsos previos
    const totalRefunded = payment.refunds?.reduce((sum, refund) => sum + refund.amount, 0) || 0;
    if (totalRefunded + refundAmount > payment.amount) {
      return NextResponse.json(
        { 
          error: 'El monto excede el disponible para reembolso',
          available: payment.amount - totalRefunded
        },
        { status: 400 }
      );
    }

    const paymentService = new PaymentService();
    const result = await paymentService.processRefund(paymentId, {
      amount: refundAmount,
      reason,
      requestedBy: user.id,
      notifyCustomer
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      refundId: result.refundId,
      amount: refundAmount,
      currency: payment.currency,
      status: result.status,
      estimatedTime: result.estimatedTime
    });

  } catch (error) {
    console.error('Error procesando reembolso:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
