// 🧪 FASE 28.2: MSW Server para mocking de APIs
// ✅ Servidor de mocking para pruebas de integración

import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';

// 🎭 Handlers para API de facturación
const handlers = [
  // GET /api/invoices - Lista de facturas
  http.get('/api/invoices', () => {
    return HttpResponse.json({
      success: true,
      data: {
        facturas: [
          {
            id: 'test-invoice-1',
            folio: '001',
            serie: 'A',
            folioCompleto: 'A-001',
            uuid: '12345678-1234-1234-1234-123456789012',
            tipo: 'ingreso',
            status: 'enviada',
            moneda: 'MXN',
            subtotal: 1000,
            descuento: 0,
            impuestos: 160,
            total: 1160,
            fechaEmision: new Date().toISOString(),
            emisor: {
              rfc: 'XAXX010101000',
              nombre: 'Test Emisor SA',
            },
            receptor: {
              rfc: 'XEXX010101000',
              nombre: 'Test Receptor SA',
              email: 'test@receptor.com',
            },
          },
        ],
        pagination: {
          currentPage: 1,
          totalPages: 1,
          total: 1,
          limit: 20,
        },
        stats: {
          total: 1,
          totalImporte: 1160,
        },
      },
    });
  }),

  // POST /api/invoices - Crear factura
  http.post('/api/invoices', async ({ request }) => {
    const body = await request.json() as any;
    
    return HttpResponse.json({
      success: true,
      data: {
        id: 'test-invoice-new',
        folio: '002',
        serie: 'A',
        folioCompleto: 'A-002',
        ...body,
        status: 'pendiente',
        fechaEmision: new Date().toISOString(),
      },
    });
  }),

  // GET /api/invoices/[id] - Detalle de factura
  http.get('/api/invoices/:id', ({ params }) => {
    const { id } = params;
    
    return HttpResponse.json({
      success: true,
      data: {
        factura: {
          id,
          folio: '001',
          serie: 'A',
          folioCompleto: 'A-001',
          uuid: '12345678-1234-1234-1234-123456789012',
          tipo: 'ingreso',
          status: 'enviada',
          moneda: 'MXN',
          subtotal: 1000,
          descuento: 0,
          impuestos: 160,
          total: 1160,
          fechaEmision: new Date().toISOString(),
          emisor: {
            rfc: 'XAXX010101000',
            nombre: 'Test Emisor SA',
          },
          receptor: {
            rfc: 'XEXX010101000',
            nombre: 'Test Receptor SA',
            email: 'test@receptor.com',
          },
          conceptos: [
            {
              descripcion: 'Test Concepto',
              cantidad: 1,
              valorUnitario: 1000,
              importe: 1000,
              unidad: 'PZA',
            },
          ],
        },
        logs: [],
        permissions: {
          canDownload: true,
          canResend: true,
          canCancel: true,
          canViewLogs: true,
        },
      },
    });
  }),

  // POST /api/invoices/cancel/[id] - Cancelar factura
  http.post('/api/invoices/cancel/:id', async ({ params, request }) => {
    const { id } = params;
    const body = await request.json() as any;
    
    return HttpResponse.json({
      success: true,
      data: {
        id,
        status: 'cancelada',
        cancelacion: {
          motivo: body.motivo,
          fecha: new Date().toISOString(),
          uuid: '12345678-1234-1234-1234-123456789012',
        },
      },
    });
  }),

  // POST /api/invoices/resend/[id] - Reenviar factura
  http.post('/api/invoices/resend/:id', ({ params }) => {
    const { id } = params;
    
    return HttpResponse.json({
      success: true,
      data: {
        id,
        emailStatus: 'enviado',
        emailDate: new Date().toISOString(),
      },
    });
  }),

  // GET /api/invoices/download/[id] - Descargar factura
  http.get('/api/invoices/download/:id', ({ params, request }) => {
    const { id } = params;
    const url = new URL(request.url);
    const tipo = url.searchParams.get('tipo') || 'pdf';
    
    // Mock file content
    const content = tipo === 'xml' ? 
      '<?xml version="1.0"?><xml>Mock XML content</xml>' :
      'Mock PDF content';
    
    return new Response(content, {
      headers: {
        'Content-Type': tipo === 'xml' ? 'application/xml' : 'application/pdf',
        'Content-Disposition': `attachment; filename="factura-${id}.${tipo}"`,
      },
    });
  }),

  // API externa de Facturama (mock)
  http.post('https://apisandbox.facturama.mx/api/cfdi', async ({ request }) => {
    const body = await request.json() as any;
    
    return HttpResponse.json({
      Id: 'facturama-id-123',
      Folio: body.Folio || '001',
      Serie: body.Serie || 'A',
      Date: new Date().toISOString(),
      CfdiType: 'I',
      PaymentForm: '01',
      PaymentMethod: 'PUE',
      ExpeditionPlace: '64000',
      Complement: {
        TaxStamp: {
          Uuid: '12345678-1234-1234-1234-123456789012',
          Date: new Date().toISOString(),
          CfdStamp: 'mock-stamp',
          SatStamp: 'mock-sat-stamp',
        },
      },
    });
  }),

  // Cancelación en Facturama
  http.delete('https://apisandbox.facturama.mx/api/cfdi/:id', ({ params }) => {
    return HttpResponse.json({
      success: true,
      message: 'CFDI cancelado exitosamente',
      uuid: params.id,
    });
  }),
];

// Crear servidor MSW
export const server = setupServer(...handlers);
