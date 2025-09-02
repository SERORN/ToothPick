// 🧾 FASE 28: API Endpoint para Crear Facturas
// ✅ POST /api/invoices/create - Generación y timbrado de facturas

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import InvoiceService, { CreateInvoiceData } from '@/lib/services/InvoiceService';
import InvoiceSettings from '@/lib/models/InvoiceSettings';
import { InvoiceType, Currency } from '@/lib/models/InvoiceFase28';

// 📋 Interface para request body
interface CreateInvoiceRequest {
  // Información básica
  tipo: InvoiceType;
  moneda: Currency;
  pacienteId?: string;
  ordenId?: string;
  
  // Datos del receptor
  receptor: {
    rfc: string;
    nombre: string;
    email?: string;
    usoCFDI?: string;
    codigoPostal: string;
    telefono?: string;
    direccion?: {
      calle?: string;
      numeroExterior?: string;
      numeroInterior?: string;
      colonia?: string;
      municipio?: string;
      estado?: string;
      pais?: string;
    };
  };
  
  // Conceptos/productos
  conceptos: Array<{
    descripcion: string;
    cantidad: number;
    valorUnitario: number;
    claveProdServ?: string;
    claveUnidad?: string;
    descuento?: number;
    unidad?: string;
  }>;
  
  // Configuración CFDI (México)
  metodoPago?: string;
  formaPago?: string;
  condicionesDePago?: string;
  
  // Metadatos
  notas?: string;
  referencias?: string;
  
  // Opciones de procesamiento
  enviarAutomaticamente?: boolean;
  generarPDF?: boolean;
  esAutomatica?: boolean;
}

export async function POST(request: NextRequest) {
  try {
    // 1. Verificar autenticación
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    // 2. Obtener datos del request
    const body: CreateInvoiceRequest = await request.json();

    // 3. Validar datos requeridos
    const validationErrors = validateCreateInvoiceRequest(body);
    if (validationErrors.length > 0) {
      return NextResponse.json(
        { 
          error: 'Datos inválidos',
          details: validationErrors
        },
        { status: 400 }
      );
    }

    // 4. Obtener organización del usuario (asumiendo que está en la sesión)
    const organizacionId = (session.user as any).organizacionId;
    if (!organizacionId) {
      return NextResponse.json(
        { error: 'Usuario sin organización asignada' },
        { status: 400 }
      );
    }

    // 5. Verificar configuración de facturación
    const configuracion = await InvoiceSettings.obtenerPorOrganizacion(organizacionId);
    if (!configuracion) {
      return NextResponse.json(
        { 
          error: 'Configuración de facturación no encontrada',
          message: 'Debe configurar los datos fiscales y PAC antes de generar facturas'
        },
        { status: 400 }
      );
    }

    // 6. Validar configuración completa
    const erroresConfig = configuracion.validarConfiguracion();
    if (erroresConfig.length > 0) {
      return NextResponse.json(
        { 
          error: 'Configuración de facturación incompleta',
          details: erroresConfig
        },
        { status: 400 }
      );
    }

    // 7. Construir datos para el servicio
    const createData: CreateInvoiceData = {
      organizacionId,
      usuarioId: (session.user as any).id,
      pacienteId: body.pacienteId,
      ordenId: body.ordenId,
      
      tipo: body.tipo,
      moneda: body.moneda,
      
      receptor: {
        rfc: body.receptor.rfc.toUpperCase(),
        nombre: body.receptor.nombre,
        email: body.receptor.email,
        usoCFDI: body.receptor.usoCFDI || 'G03',
        codigoPostal: body.receptor.codigoPostal,
        direccion: body.receptor.direccion
      },
      
      conceptos: body.conceptos.map(concepto => ({
        descripcion: concepto.descripcion,
        cantidad: concepto.cantidad,
        valorUnitario: concepto.valorUnitario,
        claveProdServ: concepto.claveProdServ || '01010101',
        claveUnidad: concepto.claveUnidad || 'H87',
        descuento: concepto.descuento || 0
      })),
      
      metodoPago: body.metodoPago,
      formaPago: body.formaPago,
      condicionesDePago: body.condicionesDePago,
      notas: body.notas,
      
      enviarAutomaticamente: body.enviarAutomaticamente !== false,
      generarPDF: body.generarPDF !== false,
      esAutomatica: body.esAutomatica || false
    };

    // 8. Crear factura usando el servicio
    const invoiceService = new InvoiceService();
    const resultado = await invoiceService.crearFactura(createData);

    // 9. Responder según el resultado
    if (resultado.success) {
      return NextResponse.json({
        success: true,
        message: 'Factura creada exitosamente',
        data: {
          facturaId: resultado.invoice._id,
          folio: resultado.invoice.folioCompleto,
          uuid: resultado.invoice.uuid,
          status: resultado.invoice.status,
          total: resultado.invoice.total,
          moneda: resultado.invoice.moneda,
          fechaEmision: resultado.invoice.fechaEmision,
          warnings: resultado.warnings
        }
      }, { status: 201 });
    } else {
      return NextResponse.json({
        success: false,
        error: resultado.error,
        details: resultado.details
      }, { status: 400 });
    }

  } catch (error: any) {
    console.error('Error en POST /api/invoices/create:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Error interno del servidor',
      message: 'Ocurrió un error al procesar la factura'
    }, { status: 500 });
  }
}

// ✅ Validar datos del request
function validateCreateInvoiceRequest(body: CreateInvoiceRequest): string[] {
  const errors: string[] = [];

  // Validar tipo y moneda
  if (!body.tipo) errors.push('Tipo de factura requerido');
  if (!body.moneda) errors.push('Moneda requerida');

  // Validar receptor
  if (!body.receptor) {
    errors.push('Datos del receptor requeridos');
  } else {
    if (!body.receptor.rfc) errors.push('RFC del receptor requerido');
    if (!body.receptor.nombre) errors.push('Nombre del receptor requerido');
    if (!body.receptor.codigoPostal) errors.push('Código postal del receptor requerido');
    
    // Validar formato básico de RFC
    if (body.receptor.rfc) {
      const rfcRegex = /^[A-ZÑ&]{3,4}[0-9]{6}[A-Z0-9]{3}$/;
      if (!rfcRegex.test(body.receptor.rfc.toUpperCase())) {
        errors.push('Formato de RFC inválido');
      }
    }
    
    // Validar código postal (5 dígitos)
    if (body.receptor.codigoPostal) {
      const cpRegex = /^[0-9]{5}$/;
      if (!cpRegex.test(body.receptor.codigoPostal)) {
        errors.push('Código postal debe tener 5 dígitos');
      }
    }
  }

  // Validar conceptos
  if (!body.conceptos || body.conceptos.length === 0) {
    errors.push('Al menos un concepto requerido');
  } else {
    body.conceptos.forEach((concepto, index) => {
      if (!concepto.descripcion) {
        errors.push(`Descripción requerida en concepto ${index + 1}`);
      }
      if (!concepto.cantidad || concepto.cantidad <= 0) {
        errors.push(`Cantidad inválida en concepto ${index + 1}`);
      }
      if (!concepto.valorUnitario || concepto.valorUnitario <= 0) {
        errors.push(`Valor unitario inválido en concepto ${index + 1}`);
      }
      if (concepto.descuento && concepto.descuento < 0) {
        errors.push(`Descuento no puede ser negativo en concepto ${index + 1}`);
      }
    });
  }

  // Validar CFDI específicos (si aplica)
  if (body.tipo?.startsWith('cfdi_')) {
    if (!body.metodoPago) errors.push('Método de pago requerido para CFDI');
    if (!body.formaPago) errors.push('Forma de pago requerida para CFDI');
  }

  return errors;
}

// 🚫 Métodos no permitidos
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
