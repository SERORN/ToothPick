import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import ShippingOption from '@/lib/models/ShippingOption';
import { ShippingService } from '@/lib/services/ShippingService';

export async function POST(req: NextRequest) {
  await dbConnect();

  try {
    const { 
      optionId, 
      postalCode, 
      orderTotal, 
      weight = 1,
      packageType = 'standard'
    } = await req.json();

    // Validar parámetros requeridos
    if (!optionId || !postalCode) {
      return NextResponse.json({ 
        error: 'ID de opción y código postal son requeridos.' 
      }, { status: 400 });
    }

    // Obtener opción de envío
    const shippingOption = await ShippingOption.findById(optionId);
    if (!shippingOption) {
      return NextResponse.json({ 
        error: 'Opción de envío no encontrada.' 
      }, { status: 404 });
    }

    // Verificar si está activa
    if (!shippingOption.isActive) {
      return NextResponse.json({ 
        error: 'Esta opción de envío no está disponible.' 
      }, { status: 400 });
    }

    // Verificar cobertura
    const coversZone = await shippingOption.coversZone(postalCode);
    if (!coversZone) {
      return NextResponse.json({ 
        error: 'Esta opción no cubre el código postal proporcionado.' 
      }, { status: 400 });
    }

    // Calcular costo
    const shippingCost = await shippingOption.calculateCost(weight, packageType);

    // Calcular descuentos por volumen de compra si aplica
    let finalCost = shippingCost;
    let discountApplied = null;

    // Descuentos por monto de compra
    if (orderTotal >= 5000) { // $5,000 MXN o más
      const discountPercentage = orderTotal >= 10000 ? 100 : 50; // Envío gratis o 50% descuento
      const discount = (shippingCost * discountPercentage) / 100;
      finalCost = Math.max(0, shippingCost - discount);
      
      discountApplied = {
        type: discountPercentage === 100 ? 'free_shipping' : 'volume_discount',
        percentage: discountPercentage,
        amount: discount,
        reason: discountPercentage === 100 
          ? 'Envío gratis por compra mayor a $10,000 MXN'
          : 'Descuento del 50% en envío por compra mayor a $5,000 MXN'
      };
    }

    // Información adicional de la zona
    const shippingZone = ShippingService.getShippingZone(postalCode);

    // Calcular tiempo estimado de entrega más preciso
    const baseDeliveryDays = getDeliveryDaysByType(shippingOption.type);
    const zoneMultiplier = getZoneDeliveryMultiplier(shippingZone);
    const estimatedDeliveryDays = Math.ceil(baseDeliveryDays * zoneMultiplier);

    // Generar fecha estimada de entrega
    const estimatedDeliveryDate = new Date();
    estimatedDeliveryDate.setDate(estimatedDeliveryDate.getDate() + estimatedDeliveryDays);

    const response = {
      optionId: shippingOption._id,
      providerName: shippingOption.name,
      serviceType: shippingOption.type,
      baseCost: shippingCost,
      finalCost: finalCost,
      currency: 'MXN',
      estimatedDays: estimatedDeliveryDays,
      estimatedDeliveryDate: estimatedDeliveryDate,
      shippingZone: shippingZone,
      weight: weight,
      packageType: packageType,
      discountApplied: discountApplied,
      breakdown: {
        basePrice: shippingOption.basePrice,
        weightCost: (weight - 1) * (shippingOption.basePrice * (shippingOption.weightMultiplier - 1)),
        zoneSurcharge: getZoneSurcharge(shippingZone, shippingOption.basePrice),
        packageTypeFee: getPackageTypeFee(packageType, shippingOption.basePrice)
      },
      coverage: {
        postalCode: postalCode,
        zone: shippingZone,
        covered: true
      }
    };

    return NextResponse.json({
      success: true,
      cost: finalCost,
      calculation: response
    });

  } catch (error) {
    console.error('Error calculating shipping cost:', error);
    return NextResponse.json({ 
      error: 'Error interno del servidor al calcular costo de envío.' 
    }, { status: 500 });
  }
}

// Helper functions para cálculos más precisos

function getDeliveryDaysByType(type: string): number {
  const typeDays: Record<string, number> = {
    'overnight': 1,
    'express': 2,
    'standard': 4
  };
  return typeDays[type] || 4;
}

function getZoneDeliveryMultiplier(zone: string): number {
  const zoneMultipliers: Record<string, number> = {
    'metro': 1.0,      // Área metropolitana
    'urban': 1.2,      // Ciudades grandes
    'suburban': 1.5,   // Suburbios
    'rural': 2.0,      // Zonas rurales
    'remote': 3.0      // Zonas remotas
  };
  return zoneMultipliers[zone] || 1.5;
}

function getZoneSurcharge(zone: string, basePrice: number): number {
  const zoneSurcharges: Record<string, number> = {
    'metro': 0,        // Sin recargo
    'urban': 0.1,      // 10% recargo
    'suburban': 0.25,  // 25% recargo
    'rural': 0.5,      // 50% recargo
    'remote': 1.0      // 100% recargo
  };
  
  const surchargeRate = zoneSurcharges[zone] || 0.25;
  return basePrice * surchargeRate;
}

function getPackageTypeFee(packageType: string, basePrice: number): number {
  const packageFees: Record<string, number> = {
    'standard': 0,      // Sin recargo
    'fragile': 0.2,     // 20% recargo por frágil
    'oversized': 0.5,   // 50% recargo por gran tamaño
    'hazardous': 0.3,   // 30% recargo por materiales peligrosos
    'express': 0.15     // 15% recargo por servicio express
  };
  
  const feeRate = packageFees[packageType] || 0;
  return basePrice * feeRate;
}

// Método GET para obtener estimaciones rápidas sin cálculos detallados
export async function GET(req: NextRequest) {
  await dbConnect();

  try {
    const { searchParams } = new URL(req.url);
    const postalCode = searchParams.get('postalCode');
    const weight = parseFloat(searchParams.get('weight') || '1');
    const orderTotal = parseFloat(searchParams.get('orderTotal') || '0');

    if (!postalCode) {
      return NextResponse.json({ 
        error: 'Código postal es requerido.' 
      }, { status: 400 });
    }

    // Obtener todas las opciones disponibles para la zona
    const estimates = await ShippingService.calculateShippingOptions(
      postalCode, 
      weight, 
      orderTotal
    );

    return NextResponse.json({
      estimates: estimates,
      postalCode: postalCode,
      weight: weight,
      orderTotal: orderTotal
    });

  } catch (error) {
    console.error('Error getting shipping estimates:', error);
    return NextResponse.json({ 
      error: 'Error interno del servidor.' 
    }, { status: 500 });
  }
}
