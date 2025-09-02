// 📄 FASE 28: API Endpoint para Descargar Archivos de Factura
// ✅ GET /api/invoices/download/[id] - Descarga XML/PDF

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import InvoiceFase28 from '@/lib/models/InvoiceFase28';
import InvoiceLog from '@/lib/models/InvoiceLog';
import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';

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

    // 3. Obtener parámetros de consulta
    const { searchParams } = new URL(request.url);
    const tipo = searchParams.get('tipo') || 'pdf'; // pdf, xml, zip
    const inline = searchParams.get('inline') === 'true'; // Para preview en navegador

    // 4. Validar tipo de archivo
    if (!['pdf', 'xml', 'zip'].includes(tipo)) {
      return NextResponse.json(
        { error: 'Tipo de archivo no válido. Use: pdf, xml, zip' },
        { status: 400 }
      );
    }

    // 5. Obtener organización y rol del usuario
    const organizacionId = (session.user as any).organizacionId;
    const userRole = (session.user as any).role;
    const userId = (session.user as any).id;

    if (!organizacionId) {
      return NextResponse.json(
        { error: 'Usuario sin organización asignada' },
        { status: 400 }
      );
    }

    // 6. Construir query con permisos
    const query: any = {
      _id: invoiceId,
      organizacionId
    };

    // Pacientes solo pueden ver sus facturas
    if (userRole === 'paciente') {
      query.pacienteId = userId;
    }

    // 7. Buscar factura
    const factura = await InvoiceFase28.findOne(query).lean();

    if (!factura) {
      return NextResponse.json(
        { error: 'Factura no encontrada' },
        { status: 404 }
      );
    }

    // 8. Verificar que la factura esté timbrada para descargas
    if (['xml', 'pdf'].includes(tipo) && (factura as any).status === 'borrador') {
      return NextResponse.json(
        { error: 'La factura debe estar timbrada para poder descargarla' },
        { status: 400 }
      );
    }

    // 9. Procesar según tipo de descarga
    let filePath: string;
    let fileName: string;
    let contentType: string;

    switch (tipo) {
      case 'xml':
        filePath = (factura as any).xmlPath;
        fileName = `factura_${(factura as any).folio}.xml`;
        contentType = 'application/xml';
        break;

      case 'pdf':
        filePath = (factura as any).pdfPath;
        fileName = `factura_${(factura as any).folio}.pdf`;
        contentType = 'application/pdf';
        break;

      case 'zip':
        // Para ZIP, vamos a crear un archivo temporal con XML y PDF
        const zipResult = await createZipFile(factura);
        filePath = zipResult.path;
        fileName = zipResult.name;
        contentType = 'application/zip';
        break;

      default:
        return NextResponse.json(
          { error: 'Tipo de archivo no soportado' },
          { status: 400 }
        );
    }

    // 10. Verificar que el archivo existe
    if (!filePath || !fs.existsSync(filePath)) {
      return NextResponse.json(
        { error: `Archivo ${tipo.toUpperCase()} no encontrado` },
        { status: 404 }
      );
    }

    // 11. Leer archivo
    const fileBuffer = fs.readFileSync(filePath);
    
    // 12. Configurar headers de respuesta
    const headers = new Headers();
    headers.set('Content-Type', contentType);
    headers.set('Content-Length', fileBuffer.length.toString());
    
    if (inline) {
      headers.set('Content-Disposition', `inline; filename="${fileName}"`);
    } else {
      headers.set('Content-Disposition', `attachment; filename="${fileName}"`);
    }

    // Headers adicionales para caching
    headers.set('Cache-Control', 'private, no-cache, no-store, must-revalidate');
    headers.set('Pragma', 'no-cache');
    headers.set('Expires', '0');

    // 13. Registrar descarga en logs
    try {
      await InvoiceLog.create({
        facturaId: invoiceId,
        organizacionId,
        usuarioId: userId,
        evento: 'ARCHIVO_DESCARGADO',
        severidad: 'info',
        descripcion: `Archivo ${tipo.toUpperCase()} descargado por ${session.user.email}`,
        metadata: {
          tipoArchivo: tipo,
          fileName,
          userRole,
          inline,
          userAgent: request.headers.get('user-agent'),
          ip: request.headers.get('x-forwarded-for') || 'unknown'
        }
      });
    } catch (logError) {
      console.warn('Error al registrar log de descarga:', logError);
    }

    // 14. Limpiar archivo temporal ZIP si existe
    if (tipo === 'zip' && filePath.includes('temp')) {
      setTimeout(() => {
        try {
          fs.unlinkSync(filePath);
        } catch (cleanupError) {
          console.warn('Error al limpiar archivo temporal:', cleanupError);
        }
      }, 5000); // Limpiar después de 5 segundos
    }

    // 15. Retornar archivo
    return new NextResponse(fileBuffer, { headers });

  } catch (error: any) {
    console.error('Error en GET /api/invoices/download/[id]:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Error interno del servidor',
      message: 'Error al descargar archivo'
    }, { status: 500 });
  }
}

// 📦 Crear archivo ZIP con XML y PDF
async function createZipFile(factura: any): Promise<{ path: string; name: string }> {
  const JSZip = require('jszip');
  const zip = new JSZip();

  const folioCompleto = `${factura.serie}${factura.folio}`;
  
  try {
    // Agregar XML si existe
    if (factura.xmlPath && fs.existsSync(factura.xmlPath)) {
      const xmlContent = fs.readFileSync(factura.xmlPath);
      zip.file(`${folioCompleto}.xml`, xmlContent);
    }

    // Agregar PDF si existe
    if (factura.pdfPath && fs.existsSync(factura.pdfPath)) {
      const pdfContent = fs.readFileSync(factura.pdfPath);
      zip.file(`${folioCompleto}.pdf`, pdfContent);
    }

    // Agregar archivo de información
    const infoContent = createInfoFile(factura);
    zip.file('info.txt', infoContent);

    // Generar ZIP
    const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' });

    // Crear archivo temporal
    const tempDir = path.join(process.cwd(), 'temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    const tempPath = path.join(tempDir, `factura_${folioCompleto}_${Date.now()}.zip`);
    fs.writeFileSync(tempPath, zipBuffer);

    return {
      path: tempPath,
      name: `factura_${folioCompleto}.zip`
    };

  } catch (error) {
    console.error('Error creando archivo ZIP:', error);
    throw new Error('Error al crear archivo ZIP');
  }
}

// 📝 Crear archivo de información para el ZIP
function createInfoFile(factura: any): string {
  const info = [
    '='.repeat(50),
    '    INFORMACIÓN DE FACTURA',
    '='.repeat(50),
    '',
    `Folio: ${factura.serie}${factura.folio}`,
    `UUID: ${factura.uuid || 'N/A'}`,
    `Tipo: ${factura.tipo}`,
    `Status: ${factura.status}`,
    `Moneda: ${factura.moneda}`,
    `Total: ${factura.total}`,
    '',
    '--- EMISOR ---',
    `RFC: ${factura.emisor?.rfc || 'N/A'}`,
    `Nombre: ${factura.emisor?.nombre || 'N/A'}`,
    '',
    '--- RECEPTOR ---',
    `RFC: ${factura.receptor?.rfc || 'N/A'}`,
    `Nombre: ${factura.receptor?.nombre || 'N/A'}`,
    `Email: ${factura.receptor?.email || 'N/A'}`,
    '',
    '--- FECHAS ---',
    `Emisión: ${factura.fechaEmision ? new Date(factura.fechaEmision).toLocaleString('es-MX') : 'N/A'}`,
    `Timbrado: ${factura.fechaTimbrado ? new Date(factura.fechaTimbrado).toLocaleString('es-MX') : 'N/A'}`,
    '',
    '--- ARCHIVOS INCLUIDOS ---',
    factura.xmlPath ? '✓ XML' : '✗ XML no disponible',
    factura.pdfPath ? '✓ PDF' : '✗ PDF no disponible',
    '',
    `Generado: ${new Date().toLocaleString('es-MX')}`,
    ''
  ];

  return info.join('\n');
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
