// 🧪 FASE 28.2: Pruebas de Servicios - InvoiceService
// ✅ Testing completo para lógica de negocio de facturación

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { faker } from '@faker-js/faker';
import { InvoiceService } from '../../lib/services/InvoiceService';
import { FacturamaService } from '../../lib/facturama';

// 🎭 Mocks para dependencias externas
jest.mock('../../lib/facturama');
jest.mock('../../lib/db');

const mockFacturamaService = FacturamaService as jest.Mocked<typeof FacturamaService>;

describe('🧪 InvoiceService - Tests Completos', () => {
  let invoiceService: InvoiceService;
  let mockDbCollection: any;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock database collection
    mockDbCollection = {
      find: jest.fn().mockReturnValue({
        toArray: jest.fn().mockResolvedValue([]),
        limit: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis()
      }),
      findOne: jest.fn().mockResolvedValue(null),
      insertOne: jest.fn().mockResolvedValue({ 
        insertedId: faker.database.mongodbObjectId(),
        acknowledged: true
      }),
      updateOne: jest.fn().mockResolvedValue({ 
        modifiedCount: 1,
        acknowledged: true
      }),
      deleteOne: jest.fn().mockResolvedValue({ 
        deletedCount: 1,
        acknowledged: true
      }),
      countDocuments: jest.fn().mockResolvedValue(0)
    };

    invoiceService = new InvoiceService(mockDbCollection);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('📋 Creación de Facturas', () => {
    it('✅ Debería crear factura con CFDI exitosamente', async () => {
      const invoiceData = {
        clientName: faker.company.name(),
        clientEmail: faker.internet.email(),
        clientRFC: 'XAXX010101000',
        items: [
          {
            description: faker.commerce.productName(),
            quantity: 2,
            unitPrice: 500,
            total: 1000
          }
        ],
        currency: 'MXN',
        subtotal: 1000,
        tax: 160,
        total: 1160,
        organizationId: faker.database.mongodbObjectId()
      };

      const mockCFDIResponse = {
        Id: faker.string.uuid(),
        Folio: 'A001',
        Serie: 'INV',
        Total: 1160,
        Status: 'active',
        Uuid: faker.string.uuid()
      };

      mockFacturamaService.createCFDI.mockResolvedValue(mockCFDIResponse);

      const result = await invoiceService.createInvoice(invoiceData);

      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty('cfdiUuid', mockCFDIResponse.Uuid);
      expect(result.data).toHaveProperty('number');
      expect(mockDbCollection.insertOne).toHaveBeenCalledWith(
        expect.objectContaining({
          clientRFC: 'XAXX010101000',
          total: 1160,
          status: 'active'
        })
      );
    });

    it('🚫 Debería fallar con RFC inválido', async () => {
      const invalidData = {
        clientName: faker.company.name(),
        clientRFC: 'INVALID-RFC',
        items: [{ description: 'Test', quantity: 1, unitPrice: 100, total: 100 }],
        currency: 'MXN',
        total: 100
      };

      const result = await invoiceService.createInvoice(invalidData);

      expect(result.success).toBe(false);
      expect(result.error).toContain('RFC inválido');
      expect(mockDbCollection.insertOne).not.toHaveBeenCalled();
    });

    it('💰 Debería calcular totales automáticamente', async () => {
      const invoiceData = {
        clientName: faker.company.name(),
        clientRFC: 'XAXX010101000',
        items: [
          { description: 'Item 1', quantity: 2, unitPrice: 100, total: 200 },
          { description: 'Item 2', quantity: 1, unitPrice: 300, total: 300 }
        ],
        currency: 'MXN',
        taxRate: 0.16
      };

      mockFacturamaService.createCFDI.mockResolvedValue({
        Id: faker.string.uuid(),
        Uuid: faker.string.uuid(),
        Status: 'active'
      });

      const result = await invoiceService.createInvoice(invoiceData);

      expect(result.success).toBe(true);
      expect(result.data.subtotal).toBe(500); // 200 + 300
      expect(result.data.tax).toBe(80); // 500 * 0.16
      expect(result.data.total).toBe(580); // 500 + 80
    });

    it('🔢 Debería generar número de factura único', async () => {
      const existingInvoices = [
        { number: 'INV-2024-001' },
        { number: 'INV-2024-002' }
      ];

      mockDbCollection.find.mockReturnValue({
        toArray: jest.fn().mockResolvedValue(existingInvoices),
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis()
      });

      mockFacturamaService.createCFDI.mockResolvedValue({
        Id: faker.string.uuid(),
        Uuid: faker.string.uuid(),
        Status: 'active'
      });

      const invoiceData = {
        clientName: faker.company.name(),
        clientRFC: 'XAXX010101000',
        items: [{ description: 'Test', quantity: 1, unitPrice: 100, total: 100 }],
        currency: 'MXN',
        total: 100
      };

      const result = await invoiceService.createInvoice(invoiceData);

      expect(result.success).toBe(true);
      expect(result.data.number).toBe('INV-2024-003');
    });
  });

  describe('🔍 Consulta de Facturas', () => {
    it('✅ Debería obtener facturas con paginación', async () => {
      const mockInvoices = Array.from({ length: 25 }, () => ({
        _id: faker.database.mongodbObjectId(),
        number: `INV-${faker.string.alphanumeric(6)}`,
        clientName: faker.company.name(),
        total: parseFloat(faker.commerce.price()),
        status: faker.helpers.arrayElement(['draft', 'sent', 'paid'])
      }));

      mockDbCollection.find.mockReturnValue({
        toArray: jest.fn().mockResolvedValue(mockInvoices.slice(0, 10)),
        limit: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis()
      });

      mockDbCollection.countDocuments.mockResolvedValue(25);

      const result = await invoiceService.getInvoices({
        page: 1,
        limit: 10,
        organizationId: faker.database.mongodbObjectId()
      });

      expect(result.success).toBe(true);
      expect(result.data.invoices).toHaveLength(10);
      expect(result.data.pagination).toEqual({
        page: 1,
        limit: 10,
        total: 25,
        totalPages: 3
      });
    });

    it('🔍 Debería filtrar por múltiples criterios', async () => {
      const filters = {
        status: 'paid',
        currency: 'USD',
        clientName: 'Acme Corp',
        startDate: '2024-01-01',
        endDate: '2024-12-31',
        organizationId: faker.database.mongodbObjectId()
      };

      await invoiceService.getInvoices(filters);

      expect(mockDbCollection.find).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'paid',
          currency: 'USD',
          clientName: { $regex: 'Acme Corp', $options: 'i' },
          createdAt: {
            $gte: expect.any(Date),
            $lte: expect.any(Date)
          },
          organizationId: filters.organizationId
        })
      );
    });

    it('🔒 Debería respetar permisos por organización', async () => {
      const userOrgId = faker.database.mongodbObjectId();
      
      await invoiceService.getInvoices({
        organizationId: userOrgId,
        userRole: 'user'
      });

      expect(mockDbCollection.find).toHaveBeenCalledWith(
        expect.objectContaining({
          organizationId: userOrgId
        })
      );
    });
  });

  describe('✏️ Actualización de Facturas', () => {
    it('✅ Debería actualizar factura draft', async () => {
      const invoiceId = faker.database.mongodbObjectId();
      const existingInvoice = {
        _id: invoiceId,
        status: 'draft',
        total: 1000,
        cfdiUuid: null
      };

      const updateData = {
        clientName: 'New Client Name',
        total: 1200,
        notes: 'Updated notes'
      };

      mockDbCollection.findOne.mockResolvedValue(existingInvoice);

      const result = await invoiceService.updateInvoice(invoiceId, updateData);

      expect(result.success).toBe(true);
      expect(mockDbCollection.updateOne).toHaveBeenCalledWith(
        { _id: invoiceId },
        {
          $set: expect.objectContaining({
            ...updateData,
            updatedAt: expect.any(Date)
          })
        }
      );
    });

    it('🚫 No debería actualizar factura con CFDI activo', async () => {
      const invoiceId = faker.database.mongodbObjectId();
      const activeInvoice = {
        _id: invoiceId,
        status: 'active',
        cfdiUuid: faker.string.uuid()
      };

      mockDbCollection.findOne.mockResolvedValue(activeInvoice);

      const result = await invoiceService.updateInvoice(invoiceId, {
        total: 2000
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('No se puede modificar');
      expect(mockDbCollection.updateOne).not.toHaveBeenCalled();
    });

    it('🔄 Debería recalcular totales al actualizar items', async () => {
      const invoiceId = faker.database.mongodbObjectId();
      const draftInvoice = {
        _id: invoiceId,
        status: 'draft',
        items: [{ description: 'Old item', quantity: 1, unitPrice: 100, total: 100 }]
      };

      const newItems = [
        { description: 'Item 1', quantity: 2, unitPrice: 150, total: 300 },
        { description: 'Item 2', quantity: 1, unitPrice: 200, total: 200 }
      ];

      mockDbCollection.findOne.mockResolvedValue(draftInvoice);

      const result = await invoiceService.updateInvoice(invoiceId, {
        items: newItems
      });

      expect(result.success).toBe(true);
      expect(mockDbCollection.updateOne).toHaveBeenCalledWith(
        { _id: invoiceId },
        {
          $set: expect.objectContaining({
            items: newItems,
            subtotal: 500, // 300 + 200
            tax: 80, // 500 * 0.16
            total: 580 // 500 + 80
          })
        }
      );
    });
  });

  describe('❌ Cancelación de CFDI', () => {
    it('✅ Debería cancelar CFDI exitosamente', async () => {
      const invoiceId = faker.database.mongodbObjectId();
      const activeInvoice = {
        _id: invoiceId,
        status: 'active',
        cfdiUuid: faker.string.uuid(),
        total: 1160
      };

      const cancellationData = {
        reason: '02', // Devolución de mercancía
        replacementUuid: faker.string.uuid()
      };

      mockDbCollection.findOne.mockResolvedValue(activeInvoice);
      mockFacturamaService.cancelCFDI.mockResolvedValue({
        Status: 'cancelled',
        CancellationDate: new Date().toISOString()
      });

      const result = await invoiceService.cancelInvoice(invoiceId, cancellationData);

      expect(result.success).toBe(true);
      expect(mockFacturamaService.cancelCFDI).toHaveBeenCalledWith(
        activeInvoice.cfdiUuid,
        cancellationData.reason,
        cancellationData.replacementUuid
      );
      expect(mockDbCollection.updateOne).toHaveBeenCalledWith(
        { _id: invoiceId },
        {
          $set: expect.objectContaining({
            status: 'cancelled',
            cancellationReason: cancellationData.reason,
            cancelledAt: expect.any(Date)
          })
        }
      );
    });

    it('🚫 No debería cancelar factura ya cancelada', async () => {
      const invoiceId = faker.database.mongodbObjectId();
      const cancelledInvoice = {
        _id: invoiceId,
        status: 'cancelled',
        cfdiUuid: faker.string.uuid()
      };

      mockDbCollection.findOne.mockResolvedValue(cancelledInvoice);

      const result = await invoiceService.cancelInvoice(invoiceId, {
        reason: '02'
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('ya está cancelada');
      expect(mockFacturamaService.cancelCFDI).not.toHaveBeenCalled();
    });

    it('⏰ Debería validar tiempo límite de cancelación', async () => {
      const invoiceId = faker.database.mongodbObjectId();
      const oldInvoice = {
        _id: invoiceId,
        status: 'active',
        cfdiUuid: faker.string.uuid(),
        createdAt: new Date(Date.now() - 75 * 24 * 60 * 60 * 1000) // 75 días atrás
      };

      mockDbCollection.findOne.mockResolvedValue(oldInvoice);

      const result = await invoiceService.cancelInvoice(invoiceId, {
        reason: '02'
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('tiempo límite');
      expect(mockFacturamaService.cancelCFDI).not.toHaveBeenCalled();
    });
  });

  describe('🗑️ Eliminación de Facturas', () => {
    it('✅ Debería eliminar factura draft', async () => {
      const invoiceId = faker.database.mongodbObjectId();
      const draftInvoice = {
        _id: invoiceId,
        status: 'draft',
        cfdiUuid: null
      };

      mockDbCollection.findOne.mockResolvedValue(draftInvoice);

      const result = await invoiceService.deleteInvoice(invoiceId);

      expect(result.success).toBe(true);
      expect(mockDbCollection.deleteOne).toHaveBeenCalledWith({ _id: invoiceId });
    });

    it('🚫 No debería eliminar factura con CFDI', async () => {
      const invoiceId = faker.database.mongodbObjectId();
      const activeInvoice = {
        _id: invoiceId,
        status: 'active',
        cfdiUuid: faker.string.uuid()
      };

      mockDbCollection.findOne.mockResolvedValue(activeInvoice);

      const result = await invoiceService.deleteInvoice(invoiceId);

      expect(result.success).toBe(false);
      expect(result.error).toContain('No se puede eliminar');
      expect(mockDbCollection.deleteOne).not.toHaveBeenCalled();
    });
  });

  describe('📄 Descarga de Documentos', () => {
    it('✅ Debería generar PDF de factura', async () => {
      const invoiceId = faker.database.mongodbObjectId();
      const invoice = {
        _id: invoiceId,
        cfdiUuid: faker.string.uuid(),
        status: 'active'
      };

      const mockPdfBuffer = Buffer.from('PDF content');

      mockDbCollection.findOne.mockResolvedValue(invoice);
      mockFacturamaService.downloadCFDI.mockResolvedValue(mockPdfBuffer);

      const result = await invoiceService.downloadInvoice(invoiceId, 'pdf');

      expect(result.success).toBe(true);
      expect(result.data.buffer).toEqual(mockPdfBuffer);
      expect(result.data.mimeType).toBe('application/pdf');
      expect(mockFacturamaService.downloadCFDI).toHaveBeenCalledWith(
        invoice.cfdiUuid,
        'pdf'
      );
    });

    it('📧 Debería generar XML de factura', async () => {
      const invoiceId = faker.database.mongodbObjectId();
      const invoice = {
        _id: invoiceId,
        cfdiUuid: faker.string.uuid(),
        status: 'active'
      };

      const mockXmlBuffer = Buffer.from('<xml>CFDI content</xml>');

      mockDbCollection.findOne.mockResolvedValue(invoice);
      mockFacturamaService.downloadCFDI.mockResolvedValue(mockXmlBuffer);

      const result = await invoiceService.downloadInvoice(invoiceId, 'xml');

      expect(result.success).toBe(true);
      expect(result.data.buffer).toEqual(mockXmlBuffer);
      expect(result.data.mimeType).toBe('application/xml');
    });
  });

  describe('💱 Manejo de Monedas', () => {
    it('✅ Debería manejar conversión de USD a MXN', async () => {
      const invoiceData = {
        clientName: faker.company.name(),
        clientRFC: 'XAXX010101000',
        items: [{ description: 'Test', quantity: 1, unitPrice: 100, total: 100 }],
        currency: 'USD',
        exchangeRate: 20.5,
        total: 100
      };

      mockFacturamaService.createCFDI.mockResolvedValue({
        Id: faker.string.uuid(),
        Uuid: faker.string.uuid(),
        Status: 'active'
      });

      const result = await invoiceService.createInvoice(invoiceData);

      expect(result.success).toBe(true);
      expect(mockFacturamaService.createCFDI).toHaveBeenCalledWith(
        expect.objectContaining({
          TipoCambio: '20.5000',
          Moneda: 'USD'
        })
      );
    });

    it('💰 Debería obtener tipo de cambio actual', async () => {
      const exchangeRate = await invoiceService.getCurrentExchangeRate('USD', 'MXN');

      expect(exchangeRate).toBeGreaterThan(0);
      expect(typeof exchangeRate).toBe('number');
    });
  });

  describe('📊 Estadísticas y Reportes', () => {
    it('📈 Debería generar resumen de facturas por período', async () => {
      const mockStats = [
        { _id: 'paid', count: 15, total: 50000 },
        { _id: 'pending', count: 8, total: 25000 },
        { _id: 'cancelled', count: 2, total: 5000 }
      ];

      mockDbCollection.aggregate = jest.fn().mockReturnValue({
        toArray: jest.fn().mockResolvedValue(mockStats)
      });

      const result = await invoiceService.getInvoiceStats({
        startDate: '2024-01-01',
        endDate: '2024-12-31',
        organizationId: faker.database.mongodbObjectId()
      });

      expect(result.success).toBe(true);
      expect(result.data.totalInvoices).toBe(25);
      expect(result.data.totalAmount).toBe(80000);
      expect(result.data.byStatus).toHaveLength(3);
    });

    it('💹 Debería generar reporte por moneda', async () => {
      const mockCurrencyStats = [
        { _id: 'MXN', count: 20, total: 400000 },
        { _id: 'USD', count: 5, total: 5000 }
      ];

      mockDbCollection.aggregate = jest.fn().mockReturnValue({
        toArray: jest.fn().mockResolvedValue(mockCurrencyStats)
      });

      const result = await invoiceService.getCurrencyStats({
        organizationId: faker.database.mongodbObjectId()
      });

      expect(result.success).toBe(true);
      expect(result.data.byCurrency).toHaveLength(2);
      expect(result.data.byCurrency[0]).toEqual({
        currency: 'MXN',
        count: 20,
        total: 400000
      });
    });
  });

  describe('🚨 Manejo de Errores', () => {
    it('❌ Debería manejar errores de base de datos', async () => {
      mockDbCollection.find.mockImplementation(() => {
        throw new Error('Database connection failed');
      });

      const result = await invoiceService.getInvoices({
        organizationId: faker.database.mongodbObjectId()
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Error de base de datos');
    });

    it('🔄 Debería manejar errores de Facturama con retry', async () => {
      const invoiceData = {
        clientName: faker.company.name(),
        clientRFC: 'XAXX010101000',
        items: [{ description: 'Test', quantity: 1, unitPrice: 100, total: 100 }],
        currency: 'MXN',
        total: 100
      };

      // Primer intento falla, segundo exitoso
      mockFacturamaService.createCFDI
        .mockRejectedValueOnce(new Error('Service temporarily unavailable'))
        .mockResolvedValueOnce({
          Id: faker.string.uuid(),
          Uuid: faker.string.uuid(),
          Status: 'active'
        });

      const result = await invoiceService.createInvoice(invoiceData);

      expect(result.success).toBe(true);
      expect(mockFacturamaService.createCFDI).toHaveBeenCalledTimes(2);
    });

    it('⚠️ Debería validar datos de entrada', async () => {
      const invalidData = {
        // Falta clientName
        clientRFC: 'XAXX010101000',
        items: [], // Array vacío
        currency: 'INVALID'
      };

      const result = await invoiceService.createInvoice(invalidData);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Datos inválidos');
      expect(mockDbCollection.insertOne).not.toHaveBeenCalled();
    });
  });
});
