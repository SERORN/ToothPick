// 📋 FASE 28: API Endpoint para Obtener Factura Individual
// ✅ GET /api/invoices/[id] - Detalle completo de factura

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import InvoiceFase28 from '@/lib/models/InvoiceFase28';
import InvoiceLog from '@/lib/models/InvoiceLog';
import mongoose from 'mongoose';

interface Params {
  id: string;
}

export async function GET(
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

    // 3. Obtener organización del usuario
    const organizacionId = (session.user as any).organizacionId;
    const userRole = (session.user as any).role;
    const userId = (session.user as any).id;

    if (!organizacionId) {
      return NextResponse.json(
        { error: 'Usuario sin organización asignada' },
        { status: 400 }
      );
    }

    // 4. Construir query con permisos
    const query: any = {
      _id: invoiceId,
      organizacionId
    };

    // 5. Aplicar filtros de rol (pacientes solo ven sus facturas)
    if (userRole === 'paciente') {
      query.pacienteId = userId;
    }

    // 6. Buscar factura con populate completo
    const factura = await InvoiceFase28.findOne(query)
      .populate('usuarioId', 'nombre email telefono')
      .populate('pacienteId', 'nombre email telefono direccion')
      .populate('ordenId', 'numero total status fechaCreacion productos')
      .lean();

    if (!factura) {
      return NextResponse.json(
        { error: 'Factura no encontrada' },
        { status: 404 }
      );
    }

    // 7. Obtener historial de logs (solo para admin/dentista)
    let logs: any[] = [];
    if (userRole !== 'paciente') {
      logs = await InvoiceLog.find({ 
        facturaId: invoiceId 
      })
      .populate('usuarioId', 'nombre email')
      .sort({ timestamp: -1 })
      .limit(50)
      .lean();
    }

    // 8. Calcular estadísticas de la factura
    const stats = calculateInvoiceStats(factura);

    // 9. Preparar respuesta
    const response = {
      success: true,
      data: {
        factura: formatDetailedInvoiceResponse(factura),
        logs: logs.map(formatLogForResponse),
        stats,
        permissions: {
          canEdit: ['admin', 'dentista'].includes(userRole) && (factura as any).status === 'borrador',
          canCancel: ['admin', 'dentista'].includes(userRole) && ['emitida', 'enviada'].includes((factura as any).status),
          canDownload: true,
          canResend: ['admin', 'dentista'].includes(userRole) && (factura as any).status === 'emitida',
          canViewLogs: userRole !== 'paciente'
        }
      }
    };

    // 10. Registrar acceso (opcional)
    try {
      await InvoiceLog.create({
        facturaId: invoiceId,
        organizacionId,
        usuarioId: userId,
        evento: 'FACTURA_CONSULTADA',
        severidad: 'info',
        descripcion: `Factura consultada por ${session.user.email}`,
        metadata: {
          userRole,
          userAgent: request.headers.get('user-agent'),
          ip: request.headers.get('x-forwarded-for') || 'unknown'
        }
      });
    } catch (logError) {
      console.warn('Error al registrar log de consulta:', logError);
    }

    return NextResponse.json(response);

  } catch (error: any) {
    console.error('Error en GET /api/invoices/[id]:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Error interno del servidor',
      message: 'Error al obtener factura'
    }, { status: 500 });
  }
}

// 📊 Calcular estadísticas de la factura
function calculateInvoiceStats(factura: any) {
  const conceptos = factura.conceptos || [];
  
  return {
    totalConceptos: conceptos.length,
    cantidadTotal: conceptos.reduce((sum: number, concepto: any) => 
      sum + (concepto.cantidad || 0), 0
    ),
    descuentoPromedio: conceptos.length > 0 
      ? conceptos.reduce((sum: number, concepto: any) => 
          sum + (concepto.descuento || 0), 0) / conceptos.length
      : 0,
    margenBruto: factura.subtotal - (factura.descuento || 0),
    tasaImpuesto: factura.subtotal > 0 
      ? ((factura.impuestos || 0) / factura.subtotal) * 100 
      : 0,
    
    // Tiempos de procesamiento
    tiempoEmision: factura.fechaTimbrado && factura.fechaEmision
      ? new Date(factura.fechaTimbrado).getTime() - new Date(factura.fechaEmision).getTime()
      : null,
    
    // Status de archivos
    tieneXML: !!factura.xmlPath,
    tienePDF: !!factura.pdfPath,
    
    // Email
    emailEnviado: factura.emailEnviado,
    diasSinEnviar: !factura.emailEnviado && factura.fechaEmision
      ? Math.floor((Date.now() - new Date(factura.fechaEmision).getTime()) / (1000 * 60 * 60 * 24))
      : null
  };
}

// 🎨 Formatear factura detallada para respuesta
function formatDetailedInvoiceResponse(factura: any) {
  return {
    // Información básica
    id: factura._id,
    folio: factura.folio,
    serie: factura.serie,
    folioCompleto: `${factura.serie}${factura.folio}`,
    uuid: factura.uuid,
    
    // Tipo y status
    tipo: factura.tipo,
    status: factura.status,
    moneda: factura.moneda,
    tipoCambio: factura.tipoCambio,
    pais: factura.pais,
    
    // Importes completos
    subtotal: factura.subtotal,
    descuento: factura.descuento,
    impuestos: factura.impuestos,
    total: factura.total,
    
    // Emisor completo
    emisor: {
      rfc: factura.emisor?.rfc,
      nombre: factura.emisor?.nombre,
      regimenFiscal: factura.emisor?.regimenFiscal,
      direccion: factura.emisor?.direccion,
      telefono: factura.emisor?.telefono,
      email: factura.emisor?.email,
      certificado: factura.emisor?.certificado
    },
    
    // Receptor completo
    receptor: {
      rfc: factura.receptor?.rfc,
      nombre: factura.receptor?.nombre,
      regimenFiscal: factura.receptor?.regimenFiscal,
      usoCFDI: factura.receptor?.usoCFDI,
      direccion: factura.receptor?.direccion,
      telefono: factura.receptor?.telefono,
      email: factura.receptor?.email,
      pais: factura.receptor?.pais
    },
    
    // Conceptos detallados
    conceptos: factura.conceptos?.map((concepto: any) => ({
      cantidad: concepto.cantidad,
      unidad: concepto.unidad,
      claveProdServ: concepto.claveProdServ,
      claveUnidad: concepto.claveUnidad,
      descripcion: concepto.descripcion,
      valorUnitario: concepto.valorUnitario,
      importe: concepto.importe,
      descuento: concepto.descuento,
      impuestos: concepto.impuestos,
      noIdentificacion: concepto.noIdentificacion,
      categoria: concepto.categoria
    })) || [],
    
    // Información CFDI específica
    cfdi: factura.tipo.startsWith('CFDI') ? {
      metodoPago: factura.cfdi?.metodoPago,
      formaPago: factura.cfdi?.formaPago,
      condicionesPago: factura.cfdi?.condicionesPago,
      lugarExpedicion: factura.cfdi?.lugarExpedicion,
      confirmacion: factura.cfdi?.confirmacion,
      relacionados: factura.cfdi?.relacionados
    } : null,
    
    // Referencias
    usuario: factura.usuarioId,
    paciente: factura.pacienteId,
    orden: factura.ordenId,
    
    // Archivos y documentos
    xmlPath: factura.xmlPath,
    pdfPath: factura.pdfPath,
    xmlContent: factura.xmlContent,
    
    // Email
    emailEnviado: factura.emailEnviado,
    emailFecha: factura.emailFecha,
    emailError: factura.emailError,
    
    // Cancelación
    cancelacion: factura.cancelacion ? {
      motivo: factura.cancelacion.motivo,
      uuid: factura.cancelacion.uuid,
      fecha: factura.cancelacion.fecha,
      usuario: factura.cancelacion.usuario
    } : null,
    
    // Metadatos
    notas: factura.notas,
    esAutomatica: factura.esAutomatica,
    metadata: factura.metadata,
    
    // Fechas
    fechaEmision: factura.fechaEmision,
    fechaTimbrado: factura.fechaTimbrado,
    fechaVencimiento: factura.fechaVencimiento,
    createdAt: factura.createdAt,
    updatedAt: factura.updatedAt
  };
}

// 📝 Formatear log para respuesta
function formatLogForResponse(log: any) {
  return {
    id: log._id,
    evento: log.evento,
    severidad: log.severidad,
    descripcion: log.descripcion,
    usuario: log.usuarioId ? {
      nombre: log.usuarioId.nombre,
      email: log.usuarioId.email
    } : null,
    metadata: log.metadata,
    timestamp: log.timestamp
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
