import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import dbConnect from '@/lib/db';
import LeaseApplication from '@/lib/models/LeaseApplication';
import Product from '@/lib/models/Product';
import User from '@/lib/models/User';
import { calculatePaymentQuote, isEligibleForLeasing } from '@/lib/utils/paymentSimulator';

export async function POST(req: NextRequest) {
  await dbConnect();

  try {
    const session = await getServerSession();
    
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });
    }

    const {
      productId,
      leaseType,
      months,
      applicantInfo,
      orderType
    } = await req.json();

    // Validar campos requeridos
    if (!productId || !leaseType || !months || !applicantInfo) {
      return NextResponse.json({ 
        error: 'Todos los campos son obligatorios.' 
      }, { status: 400 });
    }

    // Validar tipo de arrendamiento
    if (!['leasing', 'financing'].includes(leaseType)) {
      return NextResponse.json({ 
        error: 'Tipo de arrendamiento inválido.' 
      }, { status: 400 });
    }

    // Validar plazo
    if (![12, 24, 36].includes(months)) {
      return NextResponse.json({ 
        error: 'Plazo inválido. Debe ser 12, 24 o 36 meses.' 
      }, { status: 400 });
    }

    // Obtener usuario actual
    const user = await User.findOne({ email: session.user.email });
    if (!user) {
      return NextResponse.json({ error: 'Usuario no encontrado.' }, { status: 404 });
    }

    // Verificar producto existe y es elegible
    const product = await Product.findById(productId).populate('distributorId');
    if (!product) {
      return NextResponse.json({ error: 'Producto no encontrado.' }, { status: 404 });
    }

    if (!isEligibleForLeasing(product.price)) {
      return NextResponse.json({ 
        error: `Este producto no es elegible para arrendamiento. Precio mínimo: $50,000 MXN` 
      }, { status: 400 });
    }

    // Verificar que no existe solicitud pendiente para este producto
    const existingApplication = await LeaseApplication.findOne({
      userId: user._id,
      productId,
      status: 'pending'
    });

    if (existingApplication) {
      return NextResponse.json({ 
        error: 'Ya tienes una solicitud pendiente para este producto.' 
      }, { status: 409 });
    }

    // Calcular pagos
    const quote = calculatePaymentQuote(product.price, months);
    const selectedQuote = quote[leaseType as keyof typeof quote];

    // Crear solicitud
    const leaseApplication = await LeaseApplication.create({
      userId: user._id,
      distributorId: product.distributorId._id,
      productId,
      leaseType,
      months,
      monthlyPayment: selectedQuote.monthlyPayment,
      totalToPay: selectedQuote.totalToPay,
      orderType: orderType || (user.role === 'customer' ? 'b2c' : 'b2b'),
      applicantInfo: {
        name: applicantInfo.name || user.name,
        email: applicantInfo.email || user.email,
        phone: applicantInfo.phone || user.phone || '',
        company: applicantInfo.company || ''
      }
    });

    // Poblar datos para respuesta
    await leaseApplication.populate([
      { path: 'product', select: 'name brand price images' },
      { path: 'distributor', select: 'name email' }
    ]);

    return NextResponse.json({
      message: 'Solicitud de arrendamiento creada exitosamente.',
      application: leaseApplication
    }, { status: 201 });

  } catch (error) {
    console.error('Error creando solicitud de arrendamiento:', error);
    return NextResponse.json({ 
      error: 'Error interno del servidor.' 
    }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  await dbConnect();

  try {
    const session = await getServerSession();
    
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });
    }

    const user = await User.findOne({ email: session.user.email });
    if (!user) {
      return NextResponse.json({ error: 'Usuario no encontrado.' }, { status: 404 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');

    // Construir filtros
    let filters: any = {};
    
    if (user.role === 'admin') {
      // Admin ve todas las solicitudes
      if (status && ['pending', 'approved', 'rejected'].includes(status)) {
        filters.status = status;
      }
    } else if (user.role === 'distributor') {
      // Distribuidor ve solicitudes de sus productos
      filters.distributorId = user._id;
      if (status && ['pending', 'approved', 'rejected'].includes(status)) {
        filters.status = status;
      }
    } else {
      // Cliente ve solo sus solicitudes
      filters.userId = user._id;
      if (status && ['pending', 'approved', 'rejected'].includes(status)) {
        filters.status = status;
      }
    }

    // Obtener solicitudes con paginación
    const applications = await LeaseApplication.find(filters)
      .populate([
        { path: 'product', select: 'name brand price images' },
        { path: 'user', select: 'name email role' },
        { path: 'distributor', select: 'name email' }
      ])
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    const total = await LeaseApplication.countDocuments(filters);

    return NextResponse.json({
      applications,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Error obteniendo solicitudes de arrendamiento:', error);
    return NextResponse.json({ 
      error: 'Error interno del servidor.' 
    }, { status: 500 });
  }
}
