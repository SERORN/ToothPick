// 💸 FASE 29: API Status de Pagos
// ✅ Endpoint para consultar estado de pagos

import { NextRequest, NextResponse } from 'next/server';
import PaymentTransactionModel from '@/lib/models/PaymentTransaction';
import { getUserFromRequest, getUserOrganization } from '@/lib/utils/auth';

/**
 * 📊 GET /api/payments/[id]/status
 * Consultar estado de un pago específico
 */
export async function GET(
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

    const organization = await getUserOrganization(user.id);
    if (!organization) {
      return NextResponse.json(
        { error: 'Organización no encontrada' },
        { status: 404 }
      );
    }

    const paymentId = params.id;

    // Buscar el pago
    const payment = await PaymentTransactionModel.findOne({
      _id: paymentId,
      organizationId: organization.id
    }).populate('methodId');

    if (!payment) {
      return NextResponse.json(
        { error: 'Pago no encontrado' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      payment: {
        id: payment._id,
        status: payment.status,
        method: payment.method,
        amount: payment.amount,
        currency: payment.currency,
        description: payment.description,
        externalId: payment.externalId,
        referenceCode: payment.referenceCode,
        createdAt: payment.createdAt,
        updatedAt: payment.updatedAt,
        expiresAt: payment.expiresAt,
        events: payment.events,
        metadata: payment.metadata
      }
    });

  } catch (error) {
    console.error('Error obteniendo estado del pago:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
