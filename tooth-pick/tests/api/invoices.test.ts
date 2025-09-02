// 🧪 FASE 28.2: Pruebas API de Facturación Internacional
// ✅ Testing completo para endpoints de facturación con CFDI

import { NextRequest } from 'next/server';
import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { faker } from '@faker-js/faker';
import { createMocks } from 'node-mocks-http';
import handler from '../../app/api/invoices/route';
import { GET as getAllInvoices, POST as createInvoice } from '../../app/api/invoices/route';
import { PUT as updateInvoice, DELETE as deleteInvoice } from '../../app/api/invoices/[id]/route';
import { POST as cancelInvoice } from '../../app/api/invoices/[id]/cancel/route';
import { GET as downloadInvoice } from '../../app/api/invoices/[id]/download/route';

// 🎭 Mocks para servicios externos
jest.mock('../../lib/db', () => ({
  connectToDatabase: jest.fn().mockResolvedValue({
    db: {
      collection: jest.fn().mockReturnValue({
        find: jest.fn().mockReturnValue({
          toArray: jest.fn().mockResolvedValue([])
        }),
        findOne: jest.fn().mockResolvedValue(null),
        insertOne: jest.fn().mockResolvedValue({ insertedId: 'mock-id' }),
        updateOne: jest.fn().mockResolvedValue({ modifiedCount: 1 }),
        deleteOne: jest.fn().mockResolvedValue({ deletedCount: 1 })
      })
    }
  })
}));

jest.mock('../../lib/facturama', () => ({
  FacturamaService: {
    createCFDI: jest.fn(),
    cancelCFDI: jest.fn(),
    getCFDIStatus: jest.fn(),
    downloadCFDI: jest.fn()
  }
}));

jest.mock('next-auth', () => ({
  getServerSession: jest.fn()
}));

import { getServerSession } from 'next-auth';
import { FacturamaService } from '../../lib/facturama';
import { connectToDatabase } from '../../lib/db';

const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>;
const mockFacturamaService = FacturamaService as jest.Mocked<typeof FacturamaService>;
const mockConnectToDatabase = connectToDatabase as jest.MockedFunction<typeof connectToDatabase>;

describe('🧪 API Invoices - Tests Completos', () => {
  let mockDb: any;
  let mockCollection: any;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Setup database mocks
    mockCollection = {
      find: jest.fn().mockReturnValue({
        toArray: jest.fn().mockResolvedValue([])
      }),
      findOne: jest.fn().mockResolvedValue(null),
      insertOne: jest.fn().mockResolvedValue({ insertedId: faker.database.mongodbObjectId() }),
      updateOne: jest.fn().mockResolvedValue({ modifiedCount: 1 }),
      deleteOne: jest.fn().mockResolvedValue({ deletedCount: 1 })
    };

    mockDb = {
      collection: jest.fn().mockReturnValue(mockCollection)
    };

    mockConnectToDatabase.mockResolvedValue({ db: mockDb });
    
    // Setup authentication mock
    mockGetServerSession.mockResolvedValue({
      user: {
        id: faker.database.mongodbObjectId(),
        email: faker.internet.email(),
        role: 'admin',
        organizationId: faker.database.mongodbObjectId()
      }
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('🔍 GET /api/invoices', () => {
    it('✅ Debería obtener todas las facturas con paginación', async () => {
      const mockInvoices = [
        {
          _id: faker.database.mongodbObjectId(),
          number: 'INV-001',
          clientName: faker.company.name(),
          amount: parseFloat(faker.commerce.price()),
          currency: 'MXN',
          status: 'paid',
          cfdiUuid: faker.string.uuid(),
          createdAt: new Date()
        },
        {
          _id: faker.database.mongodbObjectId(),
          number: 'INV-002',
          clientName: faker.company.name(),
          amount: parseFloat(faker.commerce.price()),
          currency: 'USD',
          status: 'pending',
          cfdiUuid: faker.string.uuid(),
          createdAt: new Date()
        }
      ];

      mockCollection.find.mockReturnValue({
        toArray: jest.fn().mockResolvedValue(mockInvoices)
      });

      const request = new NextRequest('http://localhost:3000/api/invoices?page=1&limit=10');
      const response = await getAllInvoices(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toHaveLength(2);
      expect(data.data[0]).toHaveProperty('number', 'INV-001');
      expect(data.data[1]).toHaveProperty('currency', 'USD');
    });

    it('🔒 Debería fallar sin autenticación', async () => {
      mockGetServerSession.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/invoices');
      const response = await getAllInvoices(request);

      expect(response.status).toBe(401);
    });

    it('📊 Debería filtrar por estado y moneda', async () => {
      const mockInvoices = [
        {
          _id: faker.database.mongodbObjectId(),
          number: 'INV-USD-001',
          status: 'paid',
          currency: 'USD',
          amount: 1000
        }
      ];

      mockCollection.find.mockReturnValue({
        toArray: jest.fn().mockResolvedValue(mockInvoices)
      });

      const request = new NextRequest('http://localhost:3000/api/invoices?status=paid&currency=USD');
      const response = await getAllInvoices(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data).toHaveLength(1);
      expect(data.data[0].currency).toBe('USD');
      expect(data.data[0].status).toBe('paid');
    });
  });

  describe('➕ POST /api/invoices', () => {
    it('✅ Debería crear factura con CFDI exitosamente', async () => {
      const newInvoice = {
        clientName: faker.company.name(),
        clientEmail: faker.internet.email(),
        clientRFC: 'XAXX010101000',
        items: [
          {
            description: faker.commerce.productName(),
            quantity: faker.number.int({ min: 1, max: 10 }),
            unitPrice: parseFloat(faker.commerce.price()),
            total: 1000
          }
        ],
        currency: 'MXN',
        subtotal: 1000,
        tax: 160,
        total: 1160
      };

      // Mock successful CFDI creation
      mockFacturamaService.createCFDI.mockResolvedValue({
        Id: faker.string.uuid(),
        Folio: 'A001',
        Serie: 'INV',
        Total: 1160,
        Status: 'active'
      });

      const { req } = createMocks({
        method: 'POST',
        body: newInvoice
      });

      const request = new NextRequest('http://localhost:3000/api/invoices', {
        method: 'POST',
        body: JSON.stringify(newInvoice),
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await createInvoice(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.data).toHaveProperty('cfdiUuid');
      expect(mockFacturamaService.createCFDI).toHaveBeenCalledWith(
        expect.objectContaining({
          Receptor: expect.objectContaining({
            Rfc: 'XAXX010101000'
          })
        })
      );
    });

    it('🚫 Debería fallar con RFC inválido', async () => {
      const invalidInvoice = {
        clientName: faker.company.name(),
        clientEmail: faker.internet.email(),
        clientRFC: 'INVALID-RFC',
        items: [{ description: 'Test', quantity: 1, unitPrice: 100, total: 100 }],
        currency: 'MXN',
        total: 100
      };

      const request = new NextRequest('http://localhost:3000/api/invoices', {
        method: 'POST',
        body: JSON.stringify(invalidInvoice),
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await createInvoice(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('RFC inválido');
    });

    it('💱 Debería manejar múltiples monedas correctamente', async () => {
      const currencies = ['MXN', 'USD', 'EUR'];
      
      for (const currency of currencies) {
        const invoice = {
          clientName: faker.company.name(),
          clientRFC: 'XAXX010101000',
          items: [{ description: 'Test', quantity: 1, unitPrice: 100, total: 100 }],
          currency,
          total: 100
        };

        mockFacturamaService.createCFDI.mockResolvedValue({
          Id: faker.string.uuid(),
          Folio: 'A001',
          Total: 100,
          Status: 'active'
        });

        const request = new NextRequest('http://localhost:3000/api/invoices', {
          method: 'POST',
          body: JSON.stringify(invoice),
          headers: { 'Content-Type': 'application/json' }
        });

        const response = await createInvoice(request);
        const data = await response.json();

        expect(response.status).toBe(201);
        expect(data.success).toBe(true);
      }
    });

    it('🔄 Debería manejar error de Facturama', async () => {
      const invoice = {
        clientName: faker.company.name(),
        clientRFC: 'XAXX010101000',
        items: [{ description: 'Test', quantity: 1, unitPrice: 100, total: 100 }],
        currency: 'MXN',
        total: 100
      };

      mockFacturamaService.createCFDI.mockRejectedValue(
        new Error('Error en servicio Facturama')
      );

      const request = new NextRequest('http://localhost:3000/api/invoices', {
        method: 'POST',
        body: JSON.stringify(invoice),
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await createInvoice(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Error creando CFDI');
    });
  });

  describe('✏️ PUT /api/invoices/[id]', () => {
    it('✅ Debería actualizar factura existente', async () => {
      const invoiceId = faker.database.mongodbObjectId();
      const existingInvoice = {
        _id: invoiceId,
        number: 'INV-001',
        status: 'draft',
        total: 1000
      };

      const updateData = {
        status: 'sent',
        notes: 'Factura enviada al cliente'
      };

      mockCollection.findOne.mockResolvedValue(existingInvoice);

      const request = new NextRequest(`http://localhost:3000/api/invoices/${invoiceId}`, {
        method: 'PUT',
        body: JSON.stringify(updateData),
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await updateInvoice(request, { params: { id: invoiceId } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(mockCollection.updateOne).toHaveBeenCalledWith(
        { _id: invoiceId },
        { $set: expect.objectContaining(updateData) }
      );
    });

    it('🚫 Debería fallar al actualizar factura no existente', async () => {
      const invoiceId = faker.database.mongodbObjectId();
      mockCollection.findOne.mockResolvedValue(null);

      const request = new NextRequest(`http://localhost:3000/api/invoices/${invoiceId}`, {
        method: 'PUT',
        body: JSON.stringify({ status: 'sent' }),
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await updateInvoice(request, { params: { id: invoiceId } });

      expect(response.status).toBe(404);
    });
  });

  describe('🗑️ DELETE /api/invoices/[id]', () => {
    it('✅ Debería eliminar factura draft', async () => {
      const invoiceId = faker.database.mongodbObjectId();
      const draftInvoice = {
        _id: invoiceId,
        status: 'draft',
        cfdiUuid: null
      };

      mockCollection.findOne.mockResolvedValue(draftInvoice);

      const request = new NextRequest(`http://localhost:3000/api/invoices/${invoiceId}`, {
        method: 'DELETE'
      });

      const response = await deleteInvoice(request, { params: { id: invoiceId } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(mockCollection.deleteOne).toHaveBeenCalledWith({ _id: invoiceId });
    });

    it('🚫 No debería eliminar factura con CFDI activo', async () => {
      const invoiceId = faker.database.mongodbObjectId();
      const activeInvoice = {
        _id: invoiceId,
        status: 'active',
        cfdiUuid: faker.string.uuid()
      };

      mockCollection.findOne.mockResolvedValue(activeInvoice);

      const request = new NextRequest(`http://localhost:3000/api/invoices/${invoiceId}`, {
        method: 'DELETE'
      });

      const response = await deleteInvoice(request, { params: { id: invoiceId } });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('No se puede eliminar');
    });
  });

  describe('❌ POST /api/invoices/[id]/cancel', () => {
    it('✅ Debería cancelar CFDI exitosamente', async () => {
      const invoiceId = faker.database.mongodbObjectId();
      const activeInvoice = {
        _id: invoiceId,
        cfdiUuid: faker.string.uuid(),
        status: 'active',
        total: 1160
      };

      const cancellationData = {
        reason: '02', // Devolución de mercancía
        uuid: faker.string.uuid()
      };

      mockCollection.findOne.mockResolvedValue(activeInvoice);
      mockFacturamaService.cancelCFDI.mockResolvedValue({
        Status: 'cancelled',
        CancellationDate: new Date().toISOString()
      });

      const request = new NextRequest(`http://localhost:3000/api/invoices/${invoiceId}/cancel`, {
        method: 'POST',
        body: JSON.stringify(cancellationData),
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await cancelInvoice(request, { params: { id: invoiceId } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(mockFacturamaService.cancelCFDI).toHaveBeenCalledWith(
        activeInvoice.cfdiUuid,
        cancellationData.reason,
        cancellationData.uuid
      );
    });

    it('🚫 No debería cancelar factura ya cancelada', async () => {
      const invoiceId = faker.database.mongodbObjectId();
      const cancelledInvoice = {
        _id: invoiceId,
        status: 'cancelled',
        cfdiUuid: faker.string.uuid()
      };

      mockCollection.findOne.mockResolvedValue(cancelledInvoice);

      const request = new NextRequest(`http://localhost:3000/api/invoices/${invoiceId}/cancel`, {
        method: 'POST',
        body: JSON.stringify({ reason: '02' }),
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await cancelInvoice(request, { params: { id: invoiceId } });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('ya está cancelada');
    });
  });

  describe('📄 GET /api/invoices/[id]/download', () => {
    it('✅ Debería descargar PDF de factura', async () => {
      const invoiceId = faker.database.mongodbObjectId();
      const invoice = {
        _id: invoiceId,
        cfdiUuid: faker.string.uuid(),
        status: 'active'
      };

      const mockPdfBuffer = Buffer.from('PDF content');

      mockCollection.findOne.mockResolvedValue(invoice);
      mockFacturamaService.downloadCFDI.mockResolvedValue(mockPdfBuffer);

      const request = new NextRequest(`http://localhost:3000/api/invoices/${invoiceId}/download?format=pdf`);

      const response = await downloadInvoice(request, { params: { id: invoiceId } });

      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toBe('application/pdf');
      expect(mockFacturamaService.downloadCFDI).toHaveBeenCalledWith(
        invoice.cfdiUuid,
        'pdf'
      );
    });

    it('📧 Debería descargar XML de factura', async () => {
      const invoiceId = faker.database.mongodbObjectId();
      const invoice = {
        _id: invoiceId,
        cfdiUuid: faker.string.uuid(),
        status: 'active'
      };

      const mockXmlBuffer = Buffer.from('<xml>CFDI content</xml>');

      mockCollection.findOne.mockResolvedValue(invoice);
      mockFacturamaService.downloadCFDI.mockResolvedValue(mockXmlBuffer);

      const request = new NextRequest(`http://localhost:3000/api/invoices/${invoiceId}/download?format=xml`);

      const response = await downloadInvoice(request, { params: { id: invoiceId } });

      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toBe('application/xml');
    });
  });

  describe('🔐 Pruebas de Seguridad y Permisos', () => {
    it('🚫 Admin no debería acceder a facturas de otra organización', async () => {
      mockGetServerSession.mockResolvedValue({
        user: {
          id: faker.database.mongodbObjectId(),
          role: 'admin',
          organizationId: 'org-1'
        }
      });

      const mockInvoices = [
        {
          _id: faker.database.mongodbObjectId(),
          organizationId: 'org-2', // Diferente organización
          number: 'INV-001'
        }
      ];

      mockCollection.find.mockReturnValue({
        toArray: jest.fn().mockResolvedValue([])
      });

      const request = new NextRequest('http://localhost:3000/api/invoices');
      const response = await getAllInvoices(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data).toHaveLength(0);
    });

    it('👤 Usuario regular solo debería ver sus propias facturas', async () => {
      const userId = faker.database.mongodbObjectId();
      mockGetServerSession.mockResolvedValue({
        user: {
          id: userId,
          role: 'user',
          organizationId: 'org-1'
        }
      });

      const request = new NextRequest('http://localhost:3000/api/invoices');
      await getAllInvoices(request);

      expect(mockCollection.find).toHaveBeenCalledWith(
        expect.objectContaining({
          $or: [
            { userId },
            { createdBy: userId }
          ]
        })
      );
    });
  });

  describe('🌐 Pruebas de Internacionalización', () => {
    it('💰 Debería manejar conversión de monedas', async () => {
      const invoice = {
        clientName: faker.company.name(),
        clientRFC: 'XAXX010101000',
        items: [{ description: 'Test', quantity: 1, unitPrice: 100, total: 100 }],
        currency: 'USD',
        exchangeRate: 20.5, // USD a MXN
        total: 100
      };

      mockFacturamaService.createCFDI.mockResolvedValue({
        Id: faker.string.uuid(),
        Total: 2050, // 100 USD * 20.5
        Status: 'active'
      });

      const request = new NextRequest('http://localhost:3000/api/invoices', {
        method: 'POST',
        body: JSON.stringify(invoice),
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await createInvoice(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      expect(mockFacturamaService.createCFDI).toHaveBeenCalledWith(
        expect.objectContaining({
          TipoCambio: '20.5000'
        })
      );
    });
  });

  describe('📊 Pruebas de Performance y Límites', () => {
    it('⏱️ Debería manejar paginación eficientemente', async () => {
      const mockInvoices = Array.from({ length: 100 }, () => ({
        _id: faker.database.mongodbObjectId(),
        number: faker.string.alphanumeric(8),
        total: parseFloat(faker.commerce.price())
      }));

      mockCollection.find.mockReturnValue({
        toArray: jest.fn().mockResolvedValue(mockInvoices.slice(0, 10))
      });

      const request = new NextRequest('http://localhost:3000/api/invoices?page=1&limit=10');
      const response = await getAllInvoices(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data).toHaveLength(10);
      expect(data.pagination).toHaveProperty('page', 1);
      expect(data.pagination).toHaveProperty('limit', 10);
    });

    it('🔢 Debería limitar el número máximo de items por factura', async () => {
      const invoice = {
        clientName: faker.company.name(),
        clientRFC: 'XAXX010101000',
        items: Array.from({ length: 101 }, () => ({ // Más de 100 items
          description: faker.commerce.productName(),
          quantity: 1,
          unitPrice: 100,
          total: 100
        })),
        currency: 'MXN',
        total: 10100
      };

      const request = new NextRequest('http://localhost:3000/api/invoices', {
        method: 'POST',
        body: JSON.stringify(invoice),
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await createInvoice(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('máximo de items');
    });
  });
});
