// ❌ FASE 28: API Endpoint para Cancelar Facturas
// ✅ POST /api/invoices/cancel/[id] - Cancelación de CFDI

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import InvoiceFase28, { InvoiceStatus } from '@/lib/models/InvoiceFase28';
import InvoiceLog from '@/lib/models/InvoiceLog';
import InvoiceSettings from '@/lib/models/InvoiceSettings';
import FacturamaService from '@/lib/services/FacturamaService';
import mongoose from 'mongoose';

interface Params {
  id: string;
}

// Motivos de cancelación según SAT
enum MotivoCancelacion {
  COMPROBANTE_EMITIDO_ERRORES = '01', // Comprobante emitido con errores con relación
  COMPROBANTE_EMITIDO_ERRORES_SIN_RELACION = '02', // Comprobante emitido con errores sin relación
  NO_SE_LLEVO_A_CABO_OPERACION = '03', // No se llevó a cabo la operación
  NOMINATIVA_RELACIONADA_GLOBAL = '04' // Nomina relacionada en factura global
}

interface CancelInvoiceRequest {
  motivo: MotivoCancelacion;
  folioSustitucion?: string;
  observaciones?: string;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Params }
) {
  try {
    // 1. Verificar autenticación
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    // 2. Validar ID de factura
    const invoiceId = params.id;
    if (!invoiceId || !mongoose.Types.ObjectId.isValid(invoiceId)) {
      return NextResponse.json(
        { error: 'ID de factura inválido' },
        { status: 400 }
      );
    }

    // 3. Obtener y validar datos de cancelación
    const body: CancelInvoiceRequest = await request.json();
    
    const validationError = validateCancelRequest(body);
    if (validationError) {
      return NextResponse.json(
        { error: validationError },
        { status: 400 }
      );
    }

    // 4. Verificar permisos del usuario
    const organizacionId = (session.user as any).organizacionId;
    const userRole = (session.user as any).role;
    const userId = (session.user as any).id;

    if (!organizacionId) {
      return NextResponse.json(
        { error: 'Usuario sin organización asignada' },
        { status: 400 }
      );
    }

    // Solo admin y dentista pueden cancelar
    if (!['admin', 'dentista'].includes(userRole)) {
      return NextResponse.json(
        { error: 'No tiene permisos para cancelar facturas' },
        { status: 403 }
      );
    }

    // 5. Buscar factura
    const factura = await InvoiceFase28.findOne({
      _id: invoiceId,
      organizacionId
    });

    if (!factura) {
      return NextResponse.json(
        { error: 'Factura no encontrada' },
        { status: 404 }
      );
    }

    // 6. Verificar que la factura se puede cancelar
    const canCancelResult = canCancelInvoice(factura);
    if (!canCancelResult.canCancel) {
      return NextResponse.json(
        { error: canCancelResult.reason },
        { status: 400 }
      );
    }

    // 7. Obtener configuración de facturación
    const settings = await InvoiceSettings.findOne({ organizacionId });
    if (!settings) {
      return NextResponse.json(
        { error: 'Configuración de facturación no encontrada' },
        { status: 400 }
      );
    }

    // 8. Realizar cancelación según el tipo de factura
    let cancelacionResult: any;

    if (factura.tipo.startsWith('CFDI')) {
      // Cancelar CFDI a través de Facturama
      cancelacionResult = await cancelCFDI(factura, body, settings);
    } else {
      // Cancelar factura internacional (solo en base de datos)
      cancelacionResult = await cancelInternationalInvoice(factura, body);
    }

    if (!cancelacionResult.success) {
      // Registrar error de cancelación
      await InvoiceLog.create({
        facturaId: invoiceId,
        organizacionId,
        usuarioId: userId,
        evento: 'CANCELACION_ERROR',
        severidad: 'error',
        descripcion: `Error al cancelar factura: ${cancelacionResult.error}`,
        metadata: {
          motivo: body.motivo,
          error: cancelacionResult.error,
          tipo: factura.tipo
        }
      });

      return NextResponse.json({
        success: false,
        error: cancelacionResult.error
      }, { status: 400 });
    }

    // 9. Actualizar factura en base de datos
    const updateData: any = {
      status: InvoiceStatus.CANCELADA,
      cancelacion: {
        motivo: body.motivo,
        fecha: new Date(),
        usuario: userId,
        observaciones: body.observaciones,
        uuid: cancelacionResult.uuid,
        acuse: cancelacionResult.acuse
      },
      updatedAt: new Date()
    };

    await InvoiceFase28.findByIdAndUpdate(invoiceId, updateData);

    // 10. Registrar cancelación exitosa
    await InvoiceLog.create({
      facturaId: invoiceId,
      organizacionId,
      usuarioId: userId,
      evento: 'FACTURA_CANCELADA',
      severidad: 'warning',
      descripcion: `Factura cancelada. Motivo: ${getMotivoCancelacionText(body.motivo)}`,
      metadata: {
        motivo: body.motivo,
        motivoTexto: getMotivoCancelacionText(body.motivo),
        observaciones: body.observaciones,
        folioSustitucion: body.folioSustitucion,
        uuid: cancelacionResult.uuid,
        tipo: factura.tipo
      }
    });

    // 11. Respuesta exitosa
    return NextResponse.json({
      success: true,
      message: 'Factura cancelada exitosamente',
      data: {
        facturaId: invoiceId,
        status: InvoiceStatus.CANCELADA,
        cancelacion: {
          motivo: body.motivo,
          motivoTexto: getMotivoCancelacionText(body.motivo),
          fecha: new Date(),
          uuid: cancelacionResult.uuid,
          observaciones: body.observaciones
        }
      }
    });

  } catch (error: any) {
    console.error('Error en POST /api/invoices/cancel/[id]:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Error interno del servidor',
      message: 'Error al cancelar factura'
    }, { status: 500 });
  }
}

// ✅ Validar datos de cancelación
function validateCancelRequest(body: CancelInvoiceRequest): string | null {
  if (!body.motivo) {
    return 'Motivo de cancelación es requerido';
  }

  if (!Object.values(MotivoCancelacion).includes(body.motivo)) {
    return 'Motivo de cancelación no válido';
  }

  // Para motivo 01, se requiere folio de sustitución
  if (body.motivo === MotivoCancelacion.COMPROBANTE_EMITIDO_ERRORES && !body.folioSustitucion) {
    return 'Para el motivo "01" se requiere el folio de sustitución';
  }

  if (body.observaciones && body.observaciones.length > 1000) {
    return 'Las observaciones no pueden exceder 1000 caracteres';
  }

  return null;
}

// 🔍 Verificar si la factura se puede cancelar
function canCancelInvoice(factura: any): { canCancel: boolean; reason?: string } {
  // Solo se pueden cancelar facturas emitidas o enviadas
  if (!['emitida', 'enviada'].includes(factura.status)) {
    return {
      canCancel: false,
      reason: `No se puede cancelar una factura con status "${factura.status}"`
    };
  }

  // Verificar que no esté ya cancelada
  if (factura.status === 'cancelada') {
    return {
      canCancel: false,
      reason: 'La factura ya está cancelada'
    };
  }

  // Para CFDI, verificar que tenga UUID
  if (factura.tipo.startsWith('CFDI') && !factura.uuid) {
    return {
      canCancel: false,
      reason: 'No se puede cancelar un CFDI sin UUID'
    };
  }

  // Verificar tiempo límite (72 horas para CFDI según SAT)
  if (factura.tipo.startsWith('CFDI') && factura.fechaTimbrado) {
    const horasTranscurridas = (Date.now() - new Date(factura.fechaTimbrado).getTime()) / (1000 * 60 * 60);
    if (horasTranscurridas > 72) {
      return {
        canCancel: false,
        reason: 'No se puede cancelar un CFDI después de 72 horas de timbrado'
      };
    }
  }

  return { canCancel: true };
}

// 🇲🇽 Cancelar CFDI a través de Facturama
async function cancelCFDI(factura: any, body: CancelInvoiceRequest, settings: any) {
  try {
    const facturamaService = new FacturamaService(settings);

    const cancelacionData = {
      uuid: factura.uuid,
      motivo: body.motivo,
      folioSustitucion: body.folioSustitucion
    };

    const result = await facturamaService.cancelarFactura(cancelacionData);

    return {
      success: true,
      uuid: factura.uuid,
      acuse: result.acuse
    };

  } catch (error: any) {
    console.error('Error cancelando CFDI:', error);
    return {
      success: false,
      error: `Error en PAC: ${error.message}`
    };
  }
}

// 🌍 Cancelar factura internacional
async function cancelInternationalInvoice(factura: any, body: CancelInvoiceRequest) {
  try {
    // Para facturas internacionales, solo se actualiza el status en BD
    return {
      success: true,
      uuid: factura.uuid || null
    };

  } catch (error: any) {
    console.error('Error cancelando factura internacional:', error);
    return {
      success: false,
      error: `Error al cancelar: ${error.message}`
    };
  }
}

// 📝 Obtener texto descriptivo del motivo
function getMotivoCancelacionText(motivo: MotivoCancelacion): string {
  const motivos: Record<MotivoCancelacion, string> = {
    [MotivoCancelacion.COMPROBANTE_EMITIDO_ERRORES]: 'Comprobante emitido con errores con relación',
    [MotivoCancelacion.COMPROBANTE_EMITIDO_ERRORES_SIN_RELACION]: 'Comprobante emitido con errores sin relación',
    [MotivoCancelacion.NO_SE_LLEVO_A_CABO_OPERACION]: 'No se llevó a cabo la operación',
    [MotivoCancelacion.NOMINATIVA_RELACIONADA_GLOBAL]: 'Nómina relacionada en factura global'
  };

  return motivos[motivo] || 'Motivo desconocido';
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
