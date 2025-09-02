// tests/ExportService.test.ts
// Pruebas unitarias para ExportService
// Cobertura: funcionalidades de exportación de datos

import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import ExportService from '../lib/services/ExportService';

describe('ExportService', () => {
  let mongoServer: MongoMemoryServer;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri(), {});
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  describe('exportData', () => {
    it('debería exportar datos en formato CSV', async () => {
      const mockData = [
        { id: 1, name: 'Test Product', price: 100 },
        { id: 2, name: 'Another Product', price: 200 }
      ];

      const result = await ExportService.exportToCsv(mockData, 'products');
      expect(result).toBeTruthy();
      expect(typeof result).toBe('string');
      expect(result).toContain('Test Product');
    });

    it('debería exportar datos en formato Excel', async () => {
      const mockData = [
        { id: 1, name: 'Test Product', price: 100 }
      ];

      const result = await ExportService.exportToExcel(mockData, 'products');
      expect(result).toBeTruthy();
      expect(Buffer.isBuffer(result)).toBe(true);
    });

    it('debería manejar errores en exportación', async () => {
      const invalidData = null;

      await expect(
        ExportService.exportToCsv(invalidData as any, 'test')
      ).rejects.toThrow();
    });
  });

  describe('backup operations', () => {
    it('debería crear backup de la base de datos', async () => {
      const result = await ExportService.createBackup('test_backup');
      expect(result).toBeTruthy();
      expect(result.success).toBe(true);
    });

    it('debería manejar errores en backup', async () => {
      // Simular error de conexión
      await mongoose.disconnect();
      
      const result = await ExportService.createBackup('test_backup');
      expect(result.success).toBe(false);
      
      // Reconectar
      await mongoose.connect(mongoServer.getUri(), {});
    });
  });
});

// TODO: Agregar pruebas para diferentes formatos de exportación
// TODO: Agregar pruebas de validación de datos
