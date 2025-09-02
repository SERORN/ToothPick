// 👨‍💼 FASE 28: API Endpoint Administrativo para Gestión de Facturas
// ✅ GET /api/admin/invoices - Dashboard administrativo con estadísticas

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import InvoiceFase28, { InvoiceStatus, InvoiceType, Currency } from '@/lib/models/InvoiceFase28';
import InvoiceLog from '@/lib/models/InvoiceLog';
import mongoose from 'mongoose';

// 📊 Interface para filtros administrativos
interface AdminFilters {
  organizacionId?: string;
  usuarioId?: string;
  pacienteId?: string;
  status?: InvoiceStatus | InvoiceStatus[];
  tipo?: InvoiceType | InvoiceType[];
  moneda?: Currency;
  fechaDesde?: string;
  fechaHasta?: string;
  rangoImporte?: {
    min: number;
    max: number;
  };
  esAutomatica?: boolean;
  tieneErrores?: boolean;
  
  // Paginación
  page?: number;
  limit?: number;
  
  // Agrupación para estadísticas
  groupBy?: 'dia' | 'semana' | 'mes' | 'organizacion' | 'usuario' | 'status';
}

export async function GET(request: NextRequest) {
  try {
    // 1. Verificar autenticación y permisos de admin
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    const userRole = (session.user as any).role;
    const organizacionId = (session.user as any).organizacionId;

    // Solo admin y dentista pueden acceder a vista administrativa
    if (!['admin', 'dentista'].includes(userRole)) {
      return NextResponse.json(
        { error: 'No tiene permisos administrativos' },
        { status: 403 }
      );
    }

    // 2. Extraer filtros de consulta
    const { searchParams } = new URL(request.url);
    const filters = extractAdminFiltersFromSearchParams(searchParams, organizacionId);

    // 3. Construir consulta base
    const baseQuery = buildAdminQuery(filters);

    // 4. Ejecutar consultas en paralelo para dashboard
    const [
      statisticsResult,
      recentInvoicesResult,
      trendsResult,
      errorsResult
    ] = await Promise.all([
      getInvoiceStatistics(baseQuery),
      getRecentInvoices(baseQuery, filters.page || 1, filters.limit || 50),
      getInvoiceTrends(baseQuery, filters.groupBy || 'dia'),
      getInvoiceErrors(baseQuery)
    ]);

    // 5. Preparar respuesta completa
    const response = {
      success: true,
      data: {
        // Estadísticas generales
        statistics: statisticsResult,
        
        // Facturas recientes con paginación
        recentInvoices: recentInvoicesResult,
        
        // Tendencias y gráficas
        trends: trendsResult,
        
        // Errores y problemas
        errors: errorsResult,
        
        // Filtros aplicados
        appliedFilters: filters,
        
        // Metadatos de la consulta
        metadata: {
          queryExecutedAt: new Date(),
          userRole,
          organizacionId: filters.organizacionId,
          totalQueries: 4
        }
      }
    };

    return NextResponse.json(response);

  } catch (error: any) {
    console.error('Error en GET /api/admin/invoices:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Error interno del servidor',
      message: 'Error al obtener datos administrativos'
    }, { status: 500 });
  }
}

// 🔍 Extraer filtros administrativos
function extractAdminFiltersFromSearchParams(searchParams: URLSearchParams, defaultOrgId: string): AdminFilters {
  const filters: AdminFilters = {
    organizacionId: defaultOrgId // Por defecto la organización del usuario
  };

  // Permitir filtrar por otra organización solo si es super admin
  const orgId = searchParams.get('organizacionId');
  if (orgId) {
    filters.organizacionId = orgId;
  }

  // Usuario específico
  const usuarioId = searchParams.get('usuarioId');
  if (usuarioId) filters.usuarioId = usuarioId;

  // Paciente específico
  const pacienteId = searchParams.get('pacienteId');
  if (pacienteId) filters.pacienteId = pacienteId;

  // Status múltiple
  const status = searchParams.get('status');
  if (status) {
    const statusArray = status.split(',').filter(s => 
      Object.values(InvoiceStatus).includes(s as InvoiceStatus)
    );
    filters.status = statusArray.length === 1 ? statusArray[0] as InvoiceStatus : statusArray as InvoiceStatus[];
  }

  // Tipo múltiple
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

  // Rango de importe
  const importeMin = searchParams.get('importeMin');
  const importeMax = searchParams.get('importeMax');
  if (importeMin || importeMax) {
    filters.rangoImporte = {
      min: importeMin ? parseFloat(importeMin) : 0,
      max: importeMax ? parseFloat(importeMax) : Infinity
    };
  }

  // Flags booleanos
  const esAutomatica = searchParams.get('esAutomatica');
  if (esAutomatica !== null) {
    filters.esAutomatica = esAutomatica === 'true';
  }

  const tieneErrores = searchParams.get('tieneErrores');
  if (tieneErrores !== null) {
    filters.tieneErrores = tieneErrores === 'true';
  }

  // Paginación
  const page = parseInt(searchParams.get('page') || '1');
  if (page > 0) filters.page = page;

  const limit = parseInt(searchParams.get('limit') || '50');
  if (limit > 0) filters.limit = Math.min(limit, 200); // Máximo 200 para admin

  // Agrupación
  const groupBy = searchParams.get('groupBy');
  if (groupBy && ['dia', 'semana', 'mes', 'organizacion', 'usuario', 'status'].includes(groupBy)) {
    filters.groupBy = groupBy as any;
  }

  return filters;
}

// 🏗️ Construir query administrativa
function buildAdminQuery(filters: AdminFilters): any {
  const query: any = {};

  if (filters.organizacionId) {
    query.organizacionId = filters.organizacionId;
  }

  if (filters.usuarioId) {
    query.usuarioId = filters.usuarioId;
  }

  if (filters.pacienteId) {
    query.pacienteId = filters.pacienteId;
  }

  if (filters.status) {
    if (Array.isArray(filters.status)) {
      query.status = { $in: filters.status };
    } else {
      query.status = filters.status;
    }
  }

  if (filters.tipo) {
    if (Array.isArray(filters.tipo)) {
      query.tipo = { $in: filters.tipo };
    } else {
      query.tipo = filters.tipo;
    }
  }

  if (filters.moneda) {
    query.moneda = filters.moneda;
  }

  if (filters.fechaDesde || filters.fechaHasta) {
    query.fechaEmision = {};
    if (filters.fechaDesde) {
      query.fechaEmision.$gte = new Date(filters.fechaDesde);
    }
    if (filters.fechaHasta) {
      const fechaHasta = new Date(filters.fechaHasta);
      fechaHasta.setHours(23, 59, 59, 999);
      query.fechaEmision.$lte = fechaHasta;
    }
  }

  if (filters.rangoImporte) {
    query.total = {
      $gte: filters.rangoImporte.min,
      $lte: filters.rangoImporte.max
    };
  }

  if (filters.esAutomatica !== undefined) {
    query.esAutomatica = filters.esAutomatica;
  }

  if (filters.tieneErrores !== undefined) {
    if (filters.tieneErrores) {
      query.$or = [
        { emailError: { $exists: true, $ne: null } },
        { 'cancelacion.error': { $exists: true, $ne: null } },
        { status: 'error' }
      ];
    }
  }

  return query;
}

// 📊 Obtener estadísticas generales
async function getInvoiceStatistics(baseQuery: any) {
  const pipeline = [
    { $match: baseQuery },
    {
      $group: {
        _id: null,
        totalFacturas: { $sum: 1 },
        totalImporte: { $sum: '$total' },
        promedioImporte: { $avg: '$total' },
        
        // Conteos por status
        borradores: { $sum: { $cond: [{ $eq: ['$status', 'borrador'] }, 1, 0] } },
        emitidas: { $sum: { $cond: [{ $eq: ['$status', 'emitida'] }, 1, 0] } },
        enviadas: { $sum: { $cond: [{ $eq: ['$status', 'enviada'] }, 1, 0] } },
        canceladas: { $sum: { $cond: [{ $eq: ['$status', 'cancelada'] }, 1, 0] } },
        errores: { $sum: { $cond: [{ $eq: ['$status', 'error'] }, 1, 0] } },
        
        // Conteos por tipo
        cfdiIngresos: { $sum: { $cond: [{ $eq: ['$tipo', 'CFDI_INGRESO'] }, 1, 0] } },
        cfdiEgresos: { $sum: { $cond: [{ $eq: ['$tipo', 'CFDI_EGRESO'] }, 1, 0] } },
        internacionales: { $sum: { $cond: [{ $eq: ['$tipo', 'INTERNACIONAL'] }, 1, 0] } },
        
        // Conteos por moneda
        facturasMXN: { $sum: { $cond: [{ $eq: ['$moneda', 'MXN'] }, 1, 0] } },
        facturasUSD: { $sum: { $cond: [{ $eq: ['$moneda', 'USD'] }, 1, 0] } },
        facturasEUR: { $sum: { $cond: [{ $eq: ['$moneda', 'EUR'] }, 1, 0] } },
        
        // Automatización
        automaticas: { $sum: { $cond: ['$esAutomatica', 1, 0] } },
        manuales: { $sum: { $cond: [{ $not: '$esAutomatica' }, 1, 0] } },
        
        // Email
        emailsEnviados: { $sum: { $cond: ['$emailEnviado', 1, 0] } },
        emailsPendientes: { $sum: { $cond: [{ $not: '$emailEnviado' }, 1, 0] } }
      }
    }
  ];

  const result = await InvoiceFase28.aggregate(pipeline);
  return result[0] || {};
}

// 📋 Obtener facturas recientes
async function getRecentInvoices(baseQuery: any, page: number, limit: number) {
  const skip = (page - 1) * limit;

  const pipeline = [
    { $match: baseQuery },
    { $sort: { createdAt: -1 } },
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
              pipeline: [{ $project: { nombre: 1, email: 1, role: 1 } }]
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
            $addFields: {
              usuario: { $arrayElemAt: ['$usuario', 0] },
              paciente: { $arrayElemAt: ['$paciente', 0] }
            }
          },
          {
            $project: {
              folio: 1,
              serie: 1,
              uuid: 1,
              tipo: 1,
              status: 1,
              moneda: 1,
              total: 1,
              usuario: 1,
              paciente: 1,
              esAutomatica: 1,
              emailEnviado: 1,
              fechaEmision: 1,
              fechaTimbrado: 1,
              createdAt: 1
            }
          }
        ],
        totalCount: [{ $count: 'count' }]
      }
    }
  ];

  const result = await InvoiceFase28.aggregate(pipeline);
  const aggregationResult = result[0];

  return {
    facturas: aggregationResult.data || [],
    pagination: {
      page,
      limit,
      total: aggregationResult.totalCount[0]?.count || 0,
      pages: Math.ceil((aggregationResult.totalCount[0]?.count || 0) / limit)
    }
  };
}

// 📈 Obtener tendencias
async function getInvoiceTrends(baseQuery: any, groupBy: string) {
  let groupExpression: any;
  let sortOrder: any;

  switch (groupBy) {
    case 'dia':
      groupExpression = {
        year: { $year: '$fechaEmision' },
        month: { $month: '$fechaEmision' },
        day: { $dayOfMonth: '$fechaEmision' }
      };
      sortOrder = { '_id.year': 1, '_id.month': 1, '_id.day': 1 };
      break;

    case 'semana':
      groupExpression = {
        year: { $year: '$fechaEmision' },
        week: { $week: '$fechaEmision' }
      };
      sortOrder = { '_id.year': 1, '_id.week': 1 };
      break;

    case 'mes':
      groupExpression = {
        year: { $year: '$fechaEmision' },
        month: { $month: '$fechaEmision' }
      };
      sortOrder = { '_id.year': 1, '_id.month': 1 };
      break;

    case 'status':
      groupExpression = '$status';
      sortOrder = { count: -1 };
      break;

    default:
      groupExpression = '$tipo';
      sortOrder = { count: -1 };
  }

  const pipeline = [
    { $match: baseQuery },
    {
      $group: {
        _id: groupExpression,
        count: { $sum: 1 },
        totalImporte: { $sum: '$total' },
        promedioImporte: { $avg: '$total' }
      }
    },
    { $sort: sortOrder },
    { $limit: 100 } // Limitar resultados para gráficas
  ];

  return await InvoiceFase28.aggregate(pipeline);
}

// ⚠️ Obtener errores y problemas
async function getInvoiceErrors(baseQuery: any) {
  // Facturas con errores
  const errorQuery = {
    ...baseQuery,
    $or: [
      { emailError: { $exists: true, $ne: null } },
      { status: 'error' }
    ]
  };

  const errorsPromise = InvoiceFase28.find(errorQuery)
    .select('folio serie uuid status emailError createdAt')
    .sort({ createdAt: -1 })
    .limit(20)
    .lean();

  // Logs de errores recientes
  const logsPromise = InvoiceLog.find({
    organizacionId: baseQuery.organizacionId,
    severidad: 'error'
  })
  .select('evento descripcion timestamp metadata')
  .sort({ timestamp: -1 })
  .limit(20)
  .lean();

  const [errors, logs] = await Promise.all([errorsPromise, logsPromise]);

  return {
    facturasConError: errors,
    logsRecientes: logs,
    totalErrores: errors.length
  };
}

// 🚫 Otros métodos no permitidos
export async function POST() {
  return NextResponse.json(
    { error: 'Método no permitido' },
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
