// 🤖 FASE 28: API Endpoint para Facturación Automática
// ✅ POST /api/invoices/auto - Generación automática de facturas

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import InvoiceFase28, { InvoiceType, Currency, InvoiceStatus } from '@/lib/models/InvoiceFase28';
import InvoiceSettings from '@/lib/models/InvoiceSettings';
import InvoiceLog from '@/lib/models/InvoiceLog';
import InvoiceService from '@/lib/services/InvoiceService';
import mongoose from 'mongoose';

// 📋 Interface para facturación automática
interface AutoInvoiceRequest {
  // Modo de operación
  modo: 'orden' | 'lote' | 'programado';
  
  // Para modo 'orden' - facturar una orden específica
  ordenId?: string;
  
  // Para modo 'lote' - facturar múltiples órdenes
  ordenIds?: string[];
  
  // Para modo 'programado' - facturar según configuración
  configuracion?: {
    fechaDesde?: string;
    fechaHasta?: string;
    incluirOrdenes?: boolean;
    incluirSuscripciones?: boolean;
    soloOrdenesCompletas?: boolean;
  };
  
  // Configuración de facturación
  tipoFactura?: InvoiceType;
  moneda?: Currency;
  enviarEmail?: boolean;
  procesarInmediatamente?: boolean;
  
  // Configuración específica para lotes grandes
  procesarEnLotes?: boolean;
  tamanoLote?: number;
}

interface AutoInvoiceResult {
  success: boolean;
  procesadas: number;
  exitosas: number;
  errores: number;
  detalles: Array<{
    ordenId?: string;
    facturaId?: string;
    folio?: string;
    status: 'exitosa' | 'error';
    error?: string;
  }>;
  estadisticas: {
    totalImporte: number;
    tiempoTotal: number;
    promedioPorFactura: number;
  };
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    // 1. Verificar autenticación
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    // 2. Verificar permisos para facturación automática
    const userRole = (session.user as any).role;
    const organizacionId = (session.user as any).organizacionId;
    const userId = (session.user as any).id;

    if (!['admin', 'dentista'].includes(userRole)) {
      return NextResponse.json(
        { error: 'No tiene permisos para facturación automática' },
        { status: 403 }
      );
    }

    if (!organizacionId) {
      return NextResponse.json(
        { error: 'Usuario sin organización asignada' },
        { status: 400 }
      );
    }

    // 3. Validar y procesar request
    const body: AutoInvoiceRequest = await request.json();
    
    const validationError = validateAutoInvoiceRequest(body);
    if (validationError) {
      return NextResponse.json(
        { error: validationError },
        { status: 400 }
      );
    }

    // 4. Obtener configuración de facturación
    const settings = await InvoiceSettings.findOne({ organizacionId });
    if (!settings || !settings.facturacionAutomatica.habilitada) {
      return NextResponse.json(
        { error: 'Facturación automática no está habilitada' },
        { status: 400 }
      );
    }

    // 5. Registrar inicio del proceso
    await InvoiceLog.create({
      organizacionId,
      usuarioId: userId,
      evento: 'FACTURACION_AUTOMATICA_INICIADA',
      severidad: 'info',
      descripcion: `Proceso de facturación automática iniciado. Modo: ${body.modo}`,
      metadata: {
        modo: body.modo,
        configuracion: body,
        userRole
      }
    });

    // 6. Procesar según el modo
    let result: AutoInvoiceResult;

    switch (body.modo) {
      case 'orden':
        result = await procesarOrdenIndividual(body, organizacionId, userId);
        break;

      case 'lote':
        result = await procesarLoteOrdenes(body, organizacionId, userId);
        break;

      case 'programado':
        result = await procesarFacturacionProgramada(body, organizacionId, userId);
        break;

      default:
        return NextResponse.json(
          { error: 'Modo de facturación no válido' },
          { status: 400 }
        );
    }

    // 7. Calcular estadísticas finales
    const endTime = Date.now();
    result.estadisticas.tiempoTotal = endTime - startTime;
    result.estadisticas.promedioPorFactura = result.exitosas > 0 
      ? result.estadisticas.tiempoTotal / result.exitosas 
      : 0;

    // 8. Registrar resultado del proceso
    await InvoiceLog.create({
      organizacionId,
      usuarioId: userId,
      evento: 'FACTURACION_AUTOMATICA_COMPLETADA',
      severidad: result.errores > 0 ? 'warning' : 'info',
      descripcion: `Proceso completado. Exitosas: ${result.exitosas}, Errores: ${result.errores}`,
      metadata: {
        modo: body.modo,
        resultado: result,
        tiempoTotal: result.estadisticas.tiempoTotal
      }
    });

    // 9. Respuesta exitosa
    return NextResponse.json({
      success: true,
      message: `Facturación automática completada`,
      data: result
    });

  } catch (error: any) {
    console.error('Error en POST /api/invoices/auto:', error);

    // Registrar error del proceso
    try {
      const organizacionId = (session?.user as any)?.organizacionId;
      const userId = (session?.user as any)?.id;
      
      if (organizacionId && userId) {
        await InvoiceLog.create({
          organizacionId,
          usuarioId: userId,
          evento: 'FACTURACION_AUTOMATICA_ERROR',
          severidad: 'error',
          descripcion: `Error en facturación automática: ${error.message}`,
          metadata: {
            error: error.message,
            stack: error.stack
          }
        });
      }
    } catch (logError) {
      console.warn('Error al registrar log de error:', logError);
    }
    
    return NextResponse.json({
      success: false,
      error: 'Error interno del servidor',
      message: 'Error en facturación automática'
    }, { status: 500 });
  }
}

// ✅ Validar request de facturación automática
function validateAutoInvoiceRequest(body: AutoInvoiceRequest): string | null {
  if (!body.modo || !['orden', 'lote', 'programado'].includes(body.modo)) {
    return 'Modo de facturación requerido y debe ser: orden, lote, o programado';
  }

  if (body.modo === 'orden' && !body.ordenId) {
    return 'Para modo "orden" se requiere ordenId';
  }

  if (body.modo === 'lote' && (!body.ordenIds || body.ordenIds.length === 0)) {
    return 'Para modo "lote" se requiere al menos una orden en ordenIds';
  }

  if (body.modo === 'lote' && body.ordenIds && body.ordenIds.length > 100) {
    return 'No se pueden procesar más de 100 órdenes en un lote';
  }

  if (body.tipoFactura && !Object.values(InvoiceType).includes(body.tipoFactura)) {
    return 'Tipo de factura no válido';
  }

  if (body.moneda && !Object.values(Currency).includes(body.moneda)) {
    return 'Moneda no válida';
  }

  if (body.tamanoLote && body.tamanoLote > 50) {
    return 'Tamaño de lote no puede ser mayor a 50';
  }

  return null;
}

// 📄 Procesar orden individual
async function procesarOrdenIndividual(
  body: AutoInvoiceRequest, 
  organizacionId: string, 
  userId: string
): Promise<AutoInvoiceResult> {
  const result: AutoInvoiceResult = {
    success: false,
    procesadas: 0,
    exitosas: 0,
    errores: 0,
    detalles: [],
    estadisticas: {
      totalImporte: 0,
      tiempoTotal: 0,
      promedioPorFactura: 0
    }
  };

  try {
    // Validar que la orden existe y pertenece a la organización
    const Order = mongoose.model('Order'); // Asumir que existe modelo Order
    const orden = await Order.findOne({
      _id: body.ordenId,
      organizacionId,
      status: 'completed' // Solo órdenes completadas
    });

    if (!orden) {
      result.detalles.push({
        ordenId: body.ordenId,
        status: 'error',
        error: 'Orden no encontrada o no completada'
      });
      result.errores = 1;
      return result;
    }

    result.procesadas = 1;

    // Crear factura usando InvoiceService
    const invoiceService = new InvoiceService();
    const facturaData = {
      organizacionId,
      usuarioId: userId,
      ordenId: body.ordenId,
      tipo: body.tipoFactura || InvoiceType.CFDI_INGRESO,
      moneda: body.moneda || Currency.MXN,
      esAutomatica: true,
      enviarEmail: body.enviarEmail !== false
    };

    const facturaResult = await invoiceService.crearFactura(facturaData);

    if (facturaResult.success) {
      result.exitosas = 1;
      result.estadisticas.totalImporte = facturaResult.factura.total;
      result.detalles.push({
        ordenId: body.ordenId,
        facturaId: facturaResult.factura.id,
        folio: facturaResult.factura.folio,
        status: 'exitosa'
      });
      result.success = true;
    } else {
      result.errores = 1;
      result.detalles.push({
        ordenId: body.ordenId,
        status: 'error',
        error: facturaResult.error
      });
    }

  } catch (error: any) {
    result.errores = 1;
    result.detalles.push({
      ordenId: body.ordenId,
      status: 'error',
      error: error.message
    });
  }

  return result;
}

// 📋 Procesar lote de órdenes
async function procesarLoteOrdenes(
  body: AutoInvoiceRequest, 
  organizacionId: string, 
  userId: string
): Promise<AutoInvoiceResult> {
  const result: AutoInvoiceResult = {
    success: false,
    procesadas: 0,
    exitosas: 0,
    errores: 0,
    detalles: [],
    estadisticas: {
      totalImporte: 0,
      tiempoTotal: 0,
      promedioPorFactura: 0
    }
  };

  const ordenIds = body.ordenIds || [];
  const tamanoLote = body.tamanoLote || 10;
  const invoiceService = new InvoiceService();

  // Procesar en lotes para evitar sobrecarga
  for (let i = 0; i < ordenIds.length; i += tamanoLote) {
    const loteActual = ordenIds.slice(i, i + tamanoLote);
    
    // Procesar lote actual en paralelo
    const promesasLote = loteActual.map(async (ordenId) => {
      try {
        const facturaData = {
          organizacionId,
          usuarioId: userId,
          ordenId,
          tipo: body.tipoFactura || InvoiceType.CFDI_INGRESO,
          moneda: body.moneda || Currency.MXN,
          esAutomatica: true,
          enviarEmail: body.enviarEmail !== false
        };

        const facturaResult = await invoiceService.crearFactura(facturaData);

        if (facturaResult.success) {
          result.exitosas++;
          result.estadisticas.totalImporte += facturaResult.factura.total;
          return {
            ordenId,
            facturaId: facturaResult.factura.id,
            folio: facturaResult.factura.folio,
            status: 'exitosa' as const
          };
        } else {
          result.errores++;
          return {
            ordenId,
            status: 'error' as const,
            error: facturaResult.error
          };
        }

      } catch (error: any) {
        result.errores++;
        return {
          ordenId,
          status: 'error' as const,
          error: error.message
        };
      }
    });

    // Esperar que termine el lote actual
    const resultadosLote = await Promise.all(promesasLote);
    result.detalles.push(...resultadosLote);
    result.procesadas += loteActual.length;

    // Pausa pequeña entre lotes para no sobrecargar
    if (i + tamanoLote < ordenIds.length) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  result.success = result.exitosas > 0;
  return result;
}

// ⏰ Procesar facturación programada
async function procesarFacturacionProgramada(
  body: AutoInvoiceRequest, 
  organizacionId: string, 
  userId: string
): Promise<AutoInvoiceResult> {
  const result: AutoInvoiceResult = {
    success: false,
    procesadas: 0,
    exitosas: 0,
    errores: 0,
    detalles: [],
    estadisticas: {
      totalImporte: 0,
      tiempoTotal: 0,
      promedioPorFactura: 0
    }
  };

  try {
    // Obtener configuración
    const config = body.configuracion || {};
    
    // Construir query para órdenes a facturar
    const Order = mongoose.model('Order');
    const query: any = {
      organizacionId,
      status: 'completed',
      facturada: { $ne: true } // Solo órdenes no facturadas
    };

    // Filtros de fecha
    if (config.fechaDesde || config.fechaHasta) {
      query.fechaCompletado = {};
      if (config.fechaDesde) {
        query.fechaCompletado.$gte = new Date(config.fechaDesde);
      }
      if (config.fechaHasta) {
        query.fechaCompletado.$lte = new Date(config.fechaHasta);
      }
    }

    // Obtener órdenes que cumplen criterios
    const ordenes = await Order.find(query)
      .select('_id numero total')
      .limit(100) // Límite de seguridad
      .lean();

    if (ordenes.length === 0) {
      result.success = true; // No hay error, simplemente no hay órdenes
      return result;
    }

    // Procesar cada orden
    const invoiceService = new InvoiceService();
    
    for (const orden of ordenes) {
      try {
        const facturaData = {
          organizacionId,
          usuarioId: userId,
          ordenId: orden._id.toString(),
          tipo: body.tipoFactura || InvoiceType.CFDI_INGRESO,
          moneda: body.moneda || Currency.MXN,
          esAutomatica: true,
          enviarEmail: body.enviarEmail !== false
        };

        const facturaResult = await invoiceService.crearFactura(facturaData);

        if (facturaResult.success) {
          result.exitosas++;
          result.estadisticas.totalImporte += facturaResult.factura.total;
          result.detalles.push({
            ordenId: orden._id.toString(),
            facturaId: facturaResult.factura.id,
            folio: facturaResult.factura.folio,
            status: 'exitosa'
          });

          // Marcar orden como facturada
          await Order.findByIdAndUpdate(orden._id, { facturada: true });

        } else {
          result.errores++;
          result.detalles.push({
            ordenId: orden._id.toString(),
            status: 'error',
            error: facturaResult.error
          });
        }

      } catch (error: any) {
        result.errores++;
        result.detalles.push({
          ordenId: orden._id.toString(),
          status: 'error',
          error: error.message
        });
      }

      result.procesadas++;
    }

    result.success = result.exitosas > 0;

  } catch (error: any) {
    console.error('Error en facturación programada:', error);
    throw error;
  }

  return result;
}

// 🚫 Otros métodos no permitidos
export async function GET() {
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
