// 🎛️ FASE 29: API Métodos de Pago
// ✅ Gestión de métodos de pago por organización

import { NextRequest, NextResponse } from 'next/server';
import PaymentMethodModel from '@/lib/models/PaymentMethod';
import BankTransferService from '@/lib/services/BankTransferService';
import { getUserFromRequest, getUserOrganization, hasPermission } from '@/lib/utils/auth';

/**
 * 📋 GET /api/payment-methods
 * Listar métodos de pago disponibles
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
    const currency = searchParams.get('currency');
    const country = searchParams.get('country');

    // Construir filtros
    const filters: any = {
      organizationId: organization.id,
      isActive: true
    };

    if (currency) {
      filters.supportedCurrencies = { $in: [currency] };
    }

    if (country) {
      filters.supportedCountries = { $in: [country] };
    }

    // Obtener métodos de pago
    const methods = await PaymentMethodModel.find(filters)
      .sort({ priority: 1, lastUsedAt: -1 });

    // Obtener métodos de transferencia bancaria disponibles por país
    const bankTransferService = new BankTransferService();
    const availableBankMethods = country 
      ? bankTransferService.getAvailableMethodsByCountry(country)
      : [];

    return NextResponse.json({
      success: true,
      methods: methods.map(method => ({
        id: method._id,
        type: method.type,
        provider: method.provider,
        name: method.name,
        description: method.description,
        supportedCurrencies: method.supportedCurrencies,
        supportedCountries: method.supportedCountries,
        isDefault: method.isDefault,
        fees: method.fees,
        limits: method.limits,
        processingTime: method.processingTime
      })),
      bankTransferMethods: availableBankMethods,
      total: methods.length
    });

  } catch (error) {
    console.error('Error obteniendo métodos de pago:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

/**
 * ➕ POST /api/payment-methods
 * Crear nuevo método de pago
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

    // Verificar permisos
    if (!hasPermission(user, 'payments:manage')) {
      return NextResponse.json(
        { error: 'Sin permisos para gestionar métodos de pago' },
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

    const body = await request.json();
    const {
      type,
      provider,
      name,
      description,
      accountData,
      supportedCurrencies,
      supportedCountries,
      isDefault = false,
      fees,
      limits
    } = body;

    // Validar datos requeridos
    if (!type || !provider || !name || !accountData) {
      return NextResponse.json(
        { error: 'Tipo, proveedor, nombre y datos de cuenta son requeridos' },
        { status: 400 }
      );
    }

    // Si es transferencia bancaria, validar datos específicos
    if (['bank_transfer', 'swift', 'spei', 'pix'].includes(type)) {
      const bankTransferService = new BankTransferService();
      const validation = bankTransferService.validateAccountData(type, accountData);
      
      if (!validation.valid) {
        return NextResponse.json(
          { error: validation.error },
          { status: 400 }
        );
      }
    }

    // Si se marca como default, desmarcar otros defaults
    if (isDefault) {
      await PaymentMethodModel.updateMany(
        { organizationId: organization.id },
        { isDefault: false }
      );
    }

    // Crear método de pago
    const method = new PaymentMethodModel({
      organizationId: organization.id,
      type,
      provider,
      name,
      description,
      accountData,
      supportedCurrencies: supportedCurrencies || ['USD'],
      supportedCountries: supportedCountries || ['US'],
      isDefault,
      isActive: true,
      fees: fees || { fixed: 0, percentage: 0 },
      limits: limits || { min: 1, max: 100000 },
      processingTime: getDefaultProcessingTime(type),
      createdBy: user.id
    });

    await method.save();

    return NextResponse.json({
      success: true,
      method: {
        id: method._id,
        type: method.type,
        provider: method.provider,
        name: method.name,
        description: method.description,
        isDefault: method.isDefault,
        isActive: method.isActive
      }
    }, { status: 201 });

  } catch (error) {
    console.error('Error creando método de pago:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

/**
 * ⏰ Obtener tiempo de procesamiento por defecto
 */
function getDefaultProcessingTime(type: string): string {
  const times: Record<string, string> = {
    'stripe': 'Inmediato',
    'paypal': 'Inmediato',
    'spei': 'Inmediato (24/7)',
    'pix': 'Inmediato (24/7)',
    'swift': '1-3 días hábiles',
    'bank_transfer': '1-2 días hábiles',
    'manual': 'Manual'
  };

  return times[type] || 'Variable';
}
