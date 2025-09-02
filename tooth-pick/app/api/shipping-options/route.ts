import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import dbConnect from '@/lib/db';
import ShippingOption from '@/lib/models/ShippingOption';
import User from '@/lib/models/User';

export async function GET(req: NextRequest) {
  await dbConnect();

  try {
    const { searchParams } = new URL(req.url);
    const postalCode = searchParams.get('postalCode');
    const orderTotal = parseFloat(searchParams.get('orderTotal') || '0');
    const activeOnly = searchParams.get('activeOnly') !== 'false';

    let query: any = {};
    if (activeOnly) {
      query.active = true;
    }

    const shippingOptions = await ShippingOption.find(query).sort({ name: 1 });

    // Si se proporciona código postal, filtrar por cobertura y calcular costos
    if (postalCode) {
      const filteredOptions = shippingOptions
        .filter(option => option.coversZone(postalCode))
        .map(option => ({
          _id: option._id,
          name: option.name,
          type: option.type,
          description: option.description,
          logoUrl: option.logoUrl,
          cost: option.calculateCost(orderTotal),
          baseCost: option.baseCost,
          deliveryTime: `${option.deliveryTimeMin}-${option.deliveryTimeMax} días`,
          deliveryDays: {
            min: option.deliveryTimeMin,
            max: option.deliveryTimeMax
          },
          features: option.features,
          freeShipping: option.freeShippingThreshold && orderTotal >= option.freeShippingThreshold,
          freeShippingThreshold: option.freeShippingThreshold,
          websiteUrl: option.websiteUrl
        }))
        .sort((a, b) => {
          // Ordenar por envío gratis primero, luego por costo
          if (a.freeShipping && !b.freeShipping) return -1;
          if (!a.freeShipping && b.freeShipping) return 1;
          return a.cost - b.cost;
        });

      return NextResponse.json({
        options: filteredOptions,
        postalCode,
        orderTotal,
        zone: getShippingZone(postalCode)
      });
    }

    // Sin código postal, devolver todas las opciones básicas
    const basicOptions = shippingOptions.map(option => ({
      _id: option._id,
      name: option.name,
      type: option.type,
      description: option.description,
      logoUrl: option.logoUrl,
      baseCost: option.baseCost,
      deliveryTime: `${option.deliveryTimeMin}-${option.deliveryTimeMax} días`,
      features: option.features,
      active: option.active,
      coverageZones: option.coverageZones
    }));

    return NextResponse.json({ options: basicOptions });

  } catch (error) {
    console.error('Error fetching shipping options:', error);
    return NextResponse.json({ 
      error: 'Error interno del servidor.' 
    }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  await dbConnect();

  try {
    const session = await getServerSession();
    
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });
    }

    const user = await User.findOne({ email: session.user.email });
    
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ 
        error: 'Solo los administradores pueden crear opciones de envío.' 
      }, { status: 403 });
    }

    const {
      name,
      type,
      description,
      contactEmail,
      websiteUrl,
      trackingUrlTemplate,
      logoUrl,
      baseCost,
      freeShippingThreshold,
      deliveryTimeMin,
      deliveryTimeMax,
      weightLimitKg,
      coverageZones,
      features
    } = await req.json();

    // Validaciones básicas
    if (!name || !description || !contactEmail || !websiteUrl || !trackingUrlTemplate) {
      return NextResponse.json({ 
        error: 'Campos obligatorios faltantes.' 
      }, { status: 400 });
    }

    if (baseCost < 0 || deliveryTimeMin < 1 || deliveryTimeMax < deliveryTimeMin) {
      return NextResponse.json({ 
        error: 'Valores de costo o tiempo inválidos.' 
      }, { status: 400 });
    }

    // Verificar que no exista una opción con el mismo nombre
    const existingOption = await ShippingOption.findOne({ name });
    if (existingOption) {
      return NextResponse.json({ 
        error: 'Ya existe una opción de envío con ese nombre.' 
      }, { status: 409 });
    }

    const shippingOption = await ShippingOption.create({
      name,
      type: type || 'standard',
      description,
      contactEmail,
      websiteUrl,
      trackingUrlTemplate,
      logoUrl,
      baseCost,
      freeShippingThreshold,
      deliveryTimeMin,
      deliveryTimeMax,
      weightLimitKg,
      coverageZones: coverageZones || [],
      features: features || []
    });

    return NextResponse.json({
      message: 'Opción de envío creada exitosamente.',
      shippingOption
    }, { status: 201 });

  } catch (error) {
    console.error('Error creating shipping option:', error);
    return NextResponse.json({ 
      error: 'Error interno del servidor.' 
    }, { status: 500 });
  }
}

// Función helper para determinar zona de envío
function getShippingZone(postalCode: string): 'metropolitana' | 'foranea' | 'remota' {
  if (!/^[0-9]{5}$/.test(postalCode)) {
    return 'remota';
  }

  const code = parseInt(postalCode);
  
  // Zona Metropolitana (CDMX y área metropolitana)
  if ((code >= 1000 && code <= 16999) || 
      (code >= 50000 && code <= 56999) || // Edo. México
      (code >= 54000 && code <= 54999)) { // Tlalnepantla, Naucalpan
    return 'metropolitana';
  }
  
  // Principales ciudades
  if ((code >= 20000 && code <= 20999) || // Aguascalientes
      (code >= 44100 && code <= 45999) || // Guadalajara
      (code >= 64000 && code <= 67999) || // Monterrey
      (code >= 72000 && code <= 72999) || // Puebla
      (code >= 76000 && code <= 76999)) { // Querétaro
    return 'foranea';
  }
  
  return 'remota';
}
