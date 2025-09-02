// 🔌 FASE 29: API Endpoints para Sistema de Pagos Internacionales
// ✅ Endpoints RESTful para gestión completa de pagos

import { NextRequest, NextResponse } from 'next/server';
import PaymentService from '@/lib/services/PaymentService';
import PaymentMethodModel, { IPaymentMethod } from '@/lib/models/PaymentMethod';
import PaymentTransactionModel, { IPaymentTransaction } from '@/lib/models/PaymentTransaction';
import { getUserFromRequest, getUserOrganization } from '@/lib/utils/auth';

/**
 * 🚀 POST /api/payments/initiate
 * Iniciar un nuevo pago
 */
export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const {
      methodId,
      amount,
      currency,
      description,
      metadata,
      returnUrl,
      cancelUrl
    } = body;

    // Validar datos requeridos
    if (!methodId || !amount || !currency) {
      return NextResponse.json(
        { error: 'methodId, amount y currency son requeridos' },
        { status: 400 }
      );
    }

    // Verificar que el método de pago pertenece a la organización
    const paymentMethod = await PaymentMethodModel.findOne({
      _id: methodId,
      organizationId: organization.id,
      isActive: true
    });

    if (!paymentMethod) {
      return NextResponse.json(
        { error: 'Método de pago no encontrado o inactivo' },
        { status: 404 }
      );
    }

    // Verificar que la moneda es compatible
    if (!paymentMethod.supportedCurrencies.includes(currency)) {
      return NextResponse.json(
        {
          error: `Moneda ${currency} no soportada por este método`,
          supportedCurrencies: paymentMethod.supportedCurrencies
        },
        { status: 400 }
      );
    }

    const paymentService = new PaymentService();
    const result = await paymentService.initiatePayment({
      methodId,
      amount,
      currency,
      description,
      metadata: {
        ...metadata,
        userId: user.id,
        organizationId: organization.id
      },
      returnUrl,
      cancelUrl
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      paymentId: result.paymentId,
      paymentLink: result.paymentLink,
      externalId: result.externalId,
      instructions: result.instructions,
      expiresAt: result.expiresAt
    });

  } catch (error) {
    console.error('Error iniciando pago:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

/**
 * 📋 GET /api/payments
 * Listar pagos de la organización
 */
export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 100);
    const status = searchParams.get('status');
    const method = searchParams.get('method');
    const currency = searchParams.get('currency');

    // Construir filtros
    const filters: any = {
      organizationId: organization.id
    };

    if (status) filters.status = status;
    if (method) filters.method = method;
    if (currency) filters.currency = currency;

    // Obtener pagos con paginación
    const payments = await PaymentTransactionModel.find(filters)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('methodId');

    const total = await PaymentTransactionModel.countDocuments(filters);

    return NextResponse.json({
      success: true,
      payments,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Error obteniendo pagos:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
