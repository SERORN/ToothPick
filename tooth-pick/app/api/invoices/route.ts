// 📋 FASE 28: API Endpoint para Obtener Facturas
// ✅ GET /api/invoices - Listado con filtros y paginación

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import InvoiceFase28, { InvoiceStatus, InvoiceType, Currency } from '@/lib/models/InvoiceFase28';

// 📊 Interface para filtros de búsqueda
interface InvoiceFilters {
  status?: InvoiceStatus | InvoiceStatus[];
  tipo?: InvoiceType | InvoiceType[];
  moneda?: Currency;
  fechaDesde?: string;
  fechaHasta?: string;
  pacienteId?: string;
  ordenId?: string;
  folio?: string;
  uuid?: string;
  rfcReceptor?: string;
  esAutomatica?: boolean;
  
  // Paginación
  page?: number;
  limit?: number;
  
  // Ordenamiento
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export async function GET(request: NextRequest) {
  try {
    // 1. Verificar autenticación
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    // 2. Obtener organización del usuario
    const organizacionId = (session.user as any).organizacionId;
    if (!organizacionId) {
      return NextResponse.json(
        { error: 'Usuario sin organización asignada' },
        { status: 400 }
      );
    }

    // 3. Extraer parámetros de consulta
    const { searchParams } = new URL(request.url);
    const filters = extractFiltersFromSearchParams(searchParams);

    // 4. Construir query de MongoDB
    const query = buildMongoQuery(organizacionId, filters);

    // 5. Configurar paginación
    const page = filters.page || 1;
    const limit = Math.min(filters.limit || 20, 100); // Máximo 100 por página
    const skip = (page - 1) * limit;

    // 6. Configurar ordenamiento
    const sortField = filters.sortBy || 'fechaEmision';
    const sortOrder = filters.sortOrder === 'asc' ? 1 : -1;
    const sort: any = {};
    sort[sortField] = sortOrder;

    // 7. Ejecutar consulta con agregación para optimizar
    const pipeline = [
      { $match: query },
      { $sort: sort },
      {
        $facet: {
          data: [
            { $skip: skip },
            { $limit: limit },
            {
              $lookup: {
                from: 'users',
                localField: 'usuarioId',
                foreignField: '_id',
                as: 'usuario',
                pipeline: [{ $project: { nombre: 1, email: 1 } }]
              }
            },
            {
              $lookup: {
                from: 'users',
                localField: 'pacienteId',
                foreignField: '_id',
                as: 'paciente',
                pipeline: [{ $project: { nombre: 1, email: 1 } }]
              }
            },
            {
              $lookup: {
                from: 'orders',
                localField: 'ordenId',
                foreignField: '_id',
                as: 'orden',
                pipeline: [{ $project: { numero: 1, total: 1, status: 1 } }]
              }
            },
            {
              $addFields: {
                usuario: { $arrayElemAt: ['$usuario', 0] },
                paciente: { $arrayElemAt: ['$paciente', 0] },
                orden: { $arrayElemAt: ['$orden', 0] }
              }
            }
          ],
          totalCount: [
            { $count: 'count' }
          ],
          stats: [
            {
              $group: {
                _id: null,
                totalFacturas: { $sum: 1 },
                totalImporte: { $sum: '$total' },
                statusCounts: {
                  $push: {
                    status: '$status',
                    count: 1
                  }
                },
                monedas: { $addToSet: '$moneda' }
              }
            }
          ]
        }
      }
    ];

    const result = await InvoiceFase28.aggregate(pipeline);
    const aggregationResult = result[0];

    // 8. Procesar resultado
    const facturas = aggregationResult.data || [];
    const totalCount = aggregationResult.totalCount[0]?.count || 0;
    const stats = aggregationResult.stats[0] || {
      totalFacturas: 0,
      totalImporte: 0,
      statusCounts: [],
      monedas: []
    };

    // 9. Calcular estadísticas de status
    const statusStats = stats.statusCounts.reduce((acc: any, item: any) => {
      acc[item.status] = (acc[item.status] || 0) + 1;
      return acc;
    }, {});

    // 10. Respuesta exitosa
    return NextResponse.json({
      success: true,
      data: {
        facturas: facturas.map(formatInvoiceForResponse),
        pagination: {
          page,
          limit,
          total: totalCount,
          pages: Math.ceil(totalCount / limit),
          hasNext: skip + limit < totalCount,
          hasPrev: page > 1
        },
        stats: {
          total: stats.totalFacturas,
          totalImporte: stats.totalImporte,
          statusCounts: statusStats,
          monedas: stats.monedas
        },
        filters: filters // Echo back de los filtros aplicados
      }
    });

  } catch (error: any) {
    console.error('Error en GET /api/invoices:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Error interno del servidor',
      message: 'Error al obtener facturas'
    }, { status: 500 });
  }
}

// 🔍 Extraer filtros de los search params
function extractFiltersFromSearchParams(searchParams: URLSearchParams): InvoiceFilters {
  const filters: InvoiceFilters = {};

  // Status (puede ser múltiple)
  const status = searchParams.get('status');
  if (status) {
    const statusArray = status.split(',').filter(s => 
      Object.values(InvoiceStatus).includes(s as InvoiceStatus)
    );
    filters.status = statusArray.length === 1 ? statusArray[0] as InvoiceStatus : statusArray as InvoiceStatus[];
  }

  // Tipo (puede ser múltiple)
  const tipo = searchParams.get('tipo');
  if (tipo) {
    const tipoArray = tipo.split(',').filter(t => 
      Object.values(InvoiceType).includes(t as InvoiceType)
    );
    filters.tipo = tipoArray.length === 1 ? tipoArray[0] as InvoiceType : tipoArray as InvoiceType[];
  }

  // Moneda
  const moneda = searchParams.get('moneda');
  if (moneda && Object.values(Currency).includes(moneda as Currency)) {
    filters.moneda = moneda as Currency;
  }

  // Fechas
  const fechaDesde = searchParams.get('fechaDesde');
  if (fechaDesde) filters.fechaDesde = fechaDesde;

  const fechaHasta = searchParams.get('fechaHasta');
  if (fechaHasta) filters.fechaHasta = fechaHasta;

  // IDs
  const pacienteId = searchParams.get('pacienteId');
  if (pacienteId) filters.pacienteId = pacienteId;

  const ordenId = searchParams.get('ordenId');
  if (ordenId) filters.ordenId = ordenId;

  // Búsqueda por texto
  const folio = searchParams.get('folio');
  if (folio) filters.folio = folio;

  const uuid = searchParams.get('uuid');
  if (uuid) filters.uuid = uuid;

  const rfcReceptor = searchParams.get('rfcReceptor');
  if (rfcReceptor) filters.rfcReceptor = rfcReceptor;

  // Boolean
  const esAutomatica = searchParams.get('esAutomatica');
  if (esAutomatica !== null) {
    filters.esAutomatica = esAutomatica === 'true';
  }

  // Paginación
  const page = parseInt(searchParams.get('page') || '1');
  if (page > 0) filters.page = page;

  const limit = parseInt(searchParams.get('limit') || '20');
  if (limit > 0) filters.limit = Math.min(limit, 100);

  // Ordenamiento
  const sortBy = searchParams.get('sortBy');
  if (sortBy) filters.sortBy = sortBy;

  const sortOrder = searchParams.get('sortOrder');
  if (sortOrder === 'asc' || sortOrder === 'desc') {
    filters.sortOrder = sortOrder;
  }

  return filters;
}

// 🏗️ Construir query de MongoDB
function buildMongoQuery(organizacionId: string, filters: InvoiceFilters): any {
  const query: any = { organizacionId };

  // Status
  if (filters.status) {
    if (Array.isArray(filters.status)) {
      query.status = { $in: filters.status };
    } else {
      query.status = filters.status;
    }
  }

  // Tipo
  if (filters.tipo) {
    if (Array.isArray(filters.tipo)) {
      query.tipo = { $in: filters.tipo };
    } else {
      query.tipo = filters.tipo;
    }
  }

  // Moneda
  if (filters.moneda) {
    query.moneda = filters.moneda;
  }

  // Rango de fechas
  if (filters.fechaDesde || filters.fechaHasta) {
    query.fechaEmision = {};
    
    if (filters.fechaDesde) {
      query.fechaEmision.$gte = new Date(filters.fechaDesde);
    }
    
    if (filters.fechaHasta) {
      const fechaHasta = new Date(filters.fechaHasta);
      fechaHasta.setHours(23, 59, 59, 999); // Incluir todo el día
      query.fechaEmision.$lte = fechaHasta;
    }
  }

  // IDs específicos
  if (filters.pacienteId) {
    query.pacienteId = filters.pacienteId;
  }

  if (filters.ordenId) {
    query.ordenId = filters.ordenId;
  }

  // Búsquedas por texto
  if (filters.folio) {
    query.folio = { $regex: filters.folio, $options: 'i' };
  }

  if (filters.uuid) {
    query.uuid = { $regex: filters.uuid, $options: 'i' };
  }

  if (filters.rfcReceptor) {
    query['receptor.rfc'] = { $regex: filters.rfcReceptor.toUpperCase(), $options: 'i' };
  }

  // Boolean
  if (filters.esAutomatica !== undefined) {
    query.esAutomatica = filters.esAutomatica;
  }

  return query;
}

// 🎨 Formatear factura para respuesta
function formatInvoiceForResponse(factura: any) {
  return {
    id: factura._id,
    folio: factura.folio,
    serie: factura.serie,
    folioCompleto: `${factura.serie}${factura.folio}`,
    uuid: factura.uuid,
    
    // Información básica
    tipo: factura.tipo,
    status: factura.status,
    moneda: factura.moneda,
    tipoCambio: factura.tipoCambio,
    
    // Importes
    subtotal: factura.subtotal,
    descuento: factura.descuento,
    impuestos: factura.impuestos,
    total: factura.total,
    
    // Partes involucradas
    emisor: {
      rfc: factura.emisor?.rfc,
      nombre: factura.emisor?.nombre
    },
    receptor: {
      rfc: factura.receptor?.rfc,
      nombre: factura.receptor?.nombre,
      email: factura.receptor?.email
    },
    
    // Referencias
    usuario: factura.usuario,
    paciente: factura.paciente,
    orden: factura.orden,
    
    // Archivos
    xmlPath: factura.xmlPath,
    pdfPath: factura.pdfPath,
    
    // Metadatos
    pais: factura.pais,
    notas: factura.notas,
    esAutomatica: factura.esAutomatica,
    
    // Email
    emailEnviado: factura.emailEnviado,
    emailFecha: factura.emailFecha,
    
    // Cancelación
    cancelacion: factura.cancelacion,
    
    // Fechas
    fechaEmision: factura.fechaEmision,
    fechaTimbrado: factura.fechaTimbrado,
    createdAt: factura.createdAt,
    updatedAt: factura.updatedAt
  };
}

// 🚫 Otros métodos no permitidos
export async function POST() {
  return NextResponse.json(
    { error: 'Método no permitido. Use /api/invoices/create para crear facturas' },
    { status: 405 }
  );
}

export async function PUT() {
  return NextResponse.json(
    { error: 'Método no permitido' },
    { status: 405 }
  );
}

export async function DELETE() {
  return NextResponse.json(
    { error: 'Método no permitido' },
    { status: 405 }
  );
}
