// 🧪 FASE 28.2: Pruebas de Utilidades - invoiceUtils
// ✅ Testing completo para funciones auxiliares de facturación

import { describe, it, expect } from '@jest/globals';
import { faker } from '@faker-js/faker';
import {
  formatCurrency,
  validateRFC,
  calculateTotals,
  generateInvoiceNumber,
  formatDate,
  isValidEmail,
  getTaxRate,
  convertCurrency,
  validateCFDIData,
  formatInvoiceStatus,
  calculateDueDate,
  isInvoiceOverdue
} from '../../lib/utils/invoiceUtils';

describe('🧪 InvoiceUtils - Tests Completos', () => {
  describe('💰 Formateo de Monedas', () => {
    it('✅ Debería formatear pesos mexicanos correctamente', () => {
      expect(formatCurrency(1234.56, 'MXN')).toBe('$1,234.56 MXN');
      expect(formatCurrency(1000000, 'MXN')).toBe('$1,000,000.00 MXN');
      expect(formatCurrency(0, 'MXN')).toBe('$0.00 MXN');
    });

    it('💵 Debería formatear dólares correctamente', () => {
      expect(formatCurrency(1234.56, 'USD')).toBe('$1,234.56 USD');
      expect(formatCurrency(999.99, 'USD')).toBe('$999.99 USD');
    });

    it('💶 Debería formatear euros correctamente', () => {
      expect(formatCurrency(1234.56, 'EUR')).toBe('€1,234.56 EUR');
      expect(formatCurrency(500.75, 'EUR')).toBe('€500.75 EUR');
    });

    it('🔢 Debería manejar números negativos', () => {
      expect(formatCurrency(-100, 'MXN')).toBe('-$100.00 MXN');
      expect(formatCurrency(-1234.56, 'USD')).toBe('-$1,234.56 USD');
    });

    it('🚫 Debería manejar valores inválidos', () => {
      expect(formatCurrency(NaN, 'MXN')).toBe('$0.00 MXN');
      expect(formatCurrency(null, 'USD')).toBe('$0.00 USD');
      expect(formatCurrency(undefined, 'EUR')).toBe('€0.00 EUR');
    });

    it('⚠️ Debería usar moneda por defecto si no se especifica', () => {
      expect(formatCurrency(100)).toBe('$100.00 MXN');
    });
  });

  describe('🏛️ Validación de RFC', () => {
    it('✅ Debería validar RFC de persona física correcto', () => {
      expect(validateRFC('XAXX010101000')).toBe(true);
      expect(validateRFC('GODE561231GR8')).toBe(true);
      expect(validateRFC('PEPJ800101NP1')).toBe(true);
    });

    it('🏢 Debería validar RFC de persona moral correcto', () => {
      expect(validateRFC('AME010101AAA')).toBe(true);
      expect(validateRFC('ABC123456789')).toBe(true);
      expect(validateRFC('XYZ010101XYZ')).toBe(true);
    });

    it('🚫 Debería rechazar RFC inválido', () => {
      expect(validateRFC('')).toBe(false);
      expect(validateRFC('123')).toBe(false);
      expect(validateRFC('INVALID-RFC')).toBe(false);
      expect(validateRFC('XAXX010101')).toBe(false); // Muy corto
      expect(validateRFC('XAXX010101000123')).toBe(false); // Muy largo
      expect(validateRFC('XXXX000000XXX')).toBe(false); // Fecha inválida
    });

    it('⚠️ Debería manejar valores null/undefined', () => {
      expect(validateRFC(null)).toBe(false);
      expect(validateRFC(undefined)).toBe(false);
    });

    it('🔤 Debería ser case insensitive', () => {
      expect(validateRFC('xaxx010101000')).toBe(true);
      expect(validateRFC('XaXx010101000')).toBe(true);
    });
  });

  describe('🧮 Cálculo de Totales', () => {
    it('✅ Debería calcular totales correctamente', () => {
      const items = [
        { quantity: 2, unitPrice: 100, total: 200 },
        { quantity: 1, unitPrice: 300, total: 300 },
        { quantity: 3, unitPrice: 50, total: 150 }
      ];

      const result = calculateTotals(items, 0.16);

      expect(result.subtotal).toBe(650);
      expect(result.tax).toBe(104); // 650 * 0.16
      expect(result.total).toBe(754);
    });

    it('💰 Debería manejar diferentes tasas de impuesto', () => {
      const items = [{ quantity: 1, unitPrice: 1000, total: 1000 }];

      const result8 = calculateTotals(items, 0.08);
      expect(result8.tax).toBe(80);
      expect(result8.total).toBe(1080);

      const result0 = calculateTotals(items, 0);
      expect(result0.tax).toBe(0);
      expect(result0.total).toBe(1000);
    });

    it('🔢 Debería redondear a 2 decimales', () => {
      const items = [{ quantity: 3, unitPrice: 33.33, total: 99.99 }];
      
      const result = calculateTotals(items, 0.16);

      expect(result.subtotal).toBe(99.99);
      expect(result.tax).toBe(16.00); // 99.99 * 0.16 = 15.9984, redondeado a 16.00
      expect(result.total).toBe(115.99);
    });

    it('📋 Debería manejar array vacío', () => {
      const result = calculateTotals([], 0.16);

      expect(result.subtotal).toBe(0);
      expect(result.tax).toBe(0);
      expect(result.total).toBe(0);
    });

    it('⚠️ Debería manejar items inválidos', () => {
      const items = [
        { quantity: 2, unitPrice: 100, total: 200 },
        { quantity: null, unitPrice: 50, total: 0 }, // Item inválido
        { quantity: 1, unitPrice: undefined, total: 0 } // Item inválido
      ];

      const result = calculateTotals(items, 0.16);

      expect(result.subtotal).toBe(200); // Solo el primer item válido
      expect(result.tax).toBe(32);
      expect(result.total).toBe(232);
    });
  });

  describe('🔢 Generación de Números de Factura', () => {
    it('✅ Debería generar número único', () => {
      const existingNumbers = ['INV-2024-001', 'INV-2024-002'];
      const newNumber = generateInvoiceNumber(existingNumbers);

      expect(newNumber).toBe('INV-2024-003');
    });

    it('📅 Debería usar año actual', () => {
      const currentYear = new Date().getFullYear();
      const number = generateInvoiceNumber([]);

      expect(number).toContain(`INV-${currentYear}-`);
    });

    it('🔄 Debería manejar año diferente', () => {
      const existingNumbers = ['INV-2023-999'];
      const number = generateInvoiceNumber(existingNumbers);

      expect(number).toBe('INV-2024-001'); // Nuevo año, reinicia contador
    });

    it('🎯 Debería formatear con ceros a la izquierda', () => {
      const existingNumbers = Array.from(
        { length: 5 }, 
        (_, i) => `INV-2024-${String(i + 1).padStart(3, '0')}`
      );
      
      const newNumber = generateInvoiceNumber(existingNumbers);

      expect(newNumber).toBe('INV-2024-006');
    });

    it('📋 Debería manejar lista vacía', () => {
      const number = generateInvoiceNumber([]);

      expect(number).toBe('INV-2024-001');
    });

    it('🔍 Debería ignorar formatos diferentes', () => {
      const existingNumbers = [
        'INV-2024-001',
        'FACTURA-001', // Formato diferente, debe ignorarse
        'INV-2024-002',
        'OLD-FORMAT' // Formato diferente, debe ignorarse
      ];
      
      const newNumber = generateInvoiceNumber(existingNumbers);

      expect(newNumber).toBe('INV-2024-003');
    });
  });

  describe('📅 Formateo de Fechas', () => {
    it('✅ Debería formatear fecha correctamente', () => {
      const date = new Date('2024-03-15T10:30:00Z');
      
      expect(formatDate(date)).toBe('15/03/2024');
      expect(formatDate(date, 'en')).toBe('03/15/2024');
      expect(formatDate(date, 'es', true)).toBe('15/03/2024 10:30');
    });

    it('📝 Debería formatear string de fecha', () => {
      expect(formatDate('2024-12-25')).toBe('25/12/2024');
      expect(formatDate('2024-01-01T00:00:00Z')).toBe('01/01/2024');
    });

    it('⚠️ Debería manejar fechas inválidas', () => {
      expect(formatDate(null)).toBe('');
      expect(formatDate(undefined)).toBe('');
      expect(formatDate('invalid-date')).toBe('');
    });

    it('🌐 Debería respetar configuración de zona horaria', () => {
      const date = new Date('2024-03-15T23:30:00Z');
      
      // Asumiendo timezone de México (UTC-6)
      const formatted = formatDate(date, 'es', true, 'America/Mexico_City');
      expect(formatted).toContain('17:30'); // 23:30 UTC - 6 horas
    });
  });

  describe('📧 Validación de Email', () => {
    it('✅ Debería validar emails correctos', () => {
      expect(isValidEmail('test@example.com')).toBe(true);
      expect(isValidEmail('user.name@domain.org')).toBe(true);
      expect(isValidEmail('test+tag@example.co.uk')).toBe(true);
      expect(isValidEmail('123@456.789')).toBe(true);
    });

    it('🚫 Debería rechazar emails inválidos', () => {
      expect(isValidEmail('')).toBe(false);
      expect(isValidEmail('invalid-email')).toBe(false);
      expect(isValidEmail('@domain.com')).toBe(false);
      expect(isValidEmail('user@')).toBe(false);
      expect(isValidEmail('user..name@domain.com')).toBe(false);
    });

    it('⚠️ Debería manejar valores null/undefined', () => {
      expect(isValidEmail(null)).toBe(false);
      expect(isValidEmail(undefined)).toBe(false);
    });
  });

  describe('💸 Tasas de Impuesto', () => {
    it('✅ Debería obtener tasa correcta por país', () => {
      expect(getTaxRate('MX')).toBe(0.16); // IVA México
      expect(getTaxRate('US')).toBe(0.08); // Sales tax promedio
      expect(getTaxRate('ES')).toBe(0.21); // IVA España
    });

    it('📍 Debería usar tasa por defecto para países no configurados', () => {
      expect(getTaxRate('XX')).toBe(0.16); // Default a México
      expect(getTaxRate('')).toBe(0.16);
    });

    it('🎯 Debería manejar diferentes tipos de producto', () => {
      expect(getTaxRate('MX', 'standard')).toBe(0.16);
      expect(getTaxRate('MX', 'food')).toBe(0.00); // Alimentos exentos
      expect(getTaxRate('MX', 'medicine')).toBe(0.00); // Medicinas exentas
    });
  });

  describe('💱 Conversión de Monedas', () => {
    it('✅ Debería convertir USD a MXN', async () => {
      const amount = 100;
      const rate = 20.5;
      
      const converted = convertCurrency(amount, rate);
      
      expect(converted).toBe(2050); // 100 * 20.5
    });

    it('🔢 Debería redondear a 2 decimales', () => {
      const converted = convertCurrency(33.33, 20.123);
      
      expect(converted).toBe(670.43); // 33.33 * 20.123 = 670.4266, redondeado
    });

    it('⚠️ Debería manejar valores inválidos', () => {
      expect(convertCurrency(null, 20)).toBe(0);
      expect(convertCurrency(100, null)).toBe(0);
      expect(convertCurrency(100, 0)).toBe(0);
    });
  });

  describe('📋 Validación de Datos CFDI', () => {
    it('✅ Debería validar datos CFDI completos', () => {
      const cfdiData = {
        emisor: {
          rfc: 'AME010101AAA',
          nombre: 'Empresa Test',
          regimenFiscal: '601'
        },
        receptor: {
          rfc: 'XAXX010101000',
          nombre: 'Cliente Test',
          usoCFDI: 'G01'
        },
        conceptos: [
          {
            claveProdServ: '10101504',
            descripcion: 'Producto test',
            cantidad: 1,
            unidad: 'PZA',
            valorUnitario: 1000,
            importe: 1000
          }
        ],
        total: 1160,
        moneda: 'MXN'
      };

      const result = validateCFDIData(cfdiData);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('🚫 Debería detectar errores en datos CFDI', () => {
      const invalidCfdiData = {
        emisor: {
          rfc: 'INVALID-RFC', // RFC inválido
          nombre: '',  // Nombre vacío
          regimenFiscal: '999' // Régimen inválido
        },
        receptor: {
          rfc: '', // RFC vacío
          nombre: 'Cliente Test',
          usoCFDI: 'XXX' // Uso CFDI inválido
        },
        conceptos: [], // Sin conceptos
        total: -100, // Total negativo
        moneda: 'XXX' // Moneda inválida
      };

      const result = validateCFDIData(invalidCfdiData);

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors).toContain('RFC del emisor inválido');
      expect(result.errors).toContain('Debe incluir al menos un concepto');
    });

    it('💰 Debería validar totales coincidan', () => {
      const cfdiData = {
        emisor: { rfc: 'AME010101AAA', nombre: 'Test', regimenFiscal: '601' },
        receptor: { rfc: 'XAXX010101000', nombre: 'Test', usoCFDI: 'G01' },
        conceptos: [
          { claveProdServ: '10101504', descripcion: 'Test', cantidad: 1, unidad: 'PZA', valorUnitario: 1000, importe: 1000 }
        ],
        subtotal: 1000,
        impuestos: { totalTraslados: 160 },
        total: 1200, // Total incorrecto, debería ser 1160
        moneda: 'MXN'
      };

      const result = validateCFDIData(cfdiData);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('El total no coincide con subtotal + impuestos');
    });
  });

  describe('🏷️ Formateo de Estados', () => {
    it('✅ Debería formatear estados en español', () => {
      expect(formatInvoiceStatus('draft', 'es')).toBe('Borrador');
      expect(formatInvoiceStatus('sent', 'es')).toBe('Enviada');
      expect(formatInvoiceStatus('paid', 'es')).toBe('Pagada');
      expect(formatInvoiceStatus('cancelled', 'es')).toBe('Cancelada');
      expect(formatInvoiceStatus('overdue', 'es')).toBe('Vencida');
    });

    it('🌐 Debería formatear estados en inglés', () => {
      expect(formatInvoiceStatus('draft', 'en')).toBe('Draft');
      expect(formatInvoiceStatus('sent', 'en')).toBe('Sent');
      expect(formatInvoiceStatus('paid', 'en')).toBe('Paid');
      expect(formatInvoiceStatus('cancelled', 'en')).toBe('Cancelled');
      expect(formatInvoiceStatus('overdue', 'en')).toBe('Overdue');
    });

    it('⚠️ Debería manejar estados desconocidos', () => {
      expect(formatInvoiceStatus('unknown', 'es')).toBe('Desconocido');
      expect(formatInvoiceStatus('unknown', 'en')).toBe('Unknown');
    });
  });

  describe('📅 Cálculo de Fecha de Vencimiento', () => {
    it('✅ Debería calcular fecha de vencimiento correctamente', () => {
      const issueDate = new Date('2024-03-15');
      const dueDate = calculateDueDate(issueDate, 30);

      expect(dueDate.getDate()).toBe(14); // 15 + 30 - 1 = 14 de abril
      expect(dueDate.getMonth()).toBe(3); // Abril (0-indexed)
    });

    it('📅 Debería manejar diferentes términos de pago', () => {
      const issueDate = new Date('2024-01-01');

      expect(calculateDueDate(issueDate, 15).getDate()).toBe(16);
      expect(calculateDueDate(issueDate, 60).getMonth()).toBe(2); // Marzo
    });

    it('⚠️ Debería usar término por defecto', () => {
      const issueDate = new Date('2024-03-15');
      const dueDate = calculateDueDate(issueDate);

      expect(dueDate.getDate()).toBe(14); // 30 días por defecto
      expect(dueDate.getMonth()).toBe(3);
    });
  });

  describe('⏰ Verificación de Vencimiento', () => {
    it('✅ Debería detectar factura vencida', () => {
      const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000); // Ayer
      
      expect(isInvoiceOverdue(pastDate, 'sent')).toBe(true);
      expect(isInvoiceOverdue(pastDate, 'pending')).toBe(true);
    });

    it('📅 Debería detectar factura no vencida', () => {
      const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000); // Mañana
      
      expect(isInvoiceOverdue(futureDate, 'sent')).toBe(false);
      expect(isInvoiceOverdue(futureDate, 'pending')).toBe(false);
    });

    it('✅ Facturas pagadas no deberían estar vencidas', () => {
      const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
      
      expect(isInvoiceOverdue(pastDate, 'paid')).toBe(false);
      expect(isInvoiceOverdue(pastDate, 'cancelled')).toBe(false);
    });

    it('📝 Borradores no pueden estar vencidos', () => {
      const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
      
      expect(isInvoiceOverdue(pastDate, 'draft')).toBe(false);
    });
  });

  describe('🔒 Casos Edge y Seguridad', () => {
    it('🛡️ Debería sanitizar entrada de RFC', () => {
      // Test para injection attempts
      expect(validateRFC('<script>alert("xss")</script>')).toBe(false);
      expect(validateRFC('DROP TABLE users;')).toBe(false);
      expect(validateRFC('../../etc/passwd')).toBe(false);
    });

    it('🧮 Debería manejar números muy grandes', () => {
      const bigNumber = Number.MAX_SAFE_INTEGER;
      const result = formatCurrency(bigNumber, 'MXN');
      
      expect(result).toContain('MXN');
      expect(typeof result).toBe('string');
    });

    it('⚡ Debería ser performante con listas grandes', () => {
      const largeList = Array.from(
        { length: 10000 }, 
        (_, i) => `INV-2024-${String(i + 1).padStart(5, '0')}`
      );

      const start = performance.now();
      const newNumber = generateInvoiceNumber(largeList);
      const end = performance.now();

      expect(newNumber).toBe('INV-2024-10001');
      expect(end - start).toBeLessThan(100); // Menos de 100ms
    });

    it('🔄 Debería ser idempotente', () => {
      const data = { quantity: 1, unitPrice: 100, total: 100 };
      
      const result1 = calculateTotals([data], 0.16);
      const result2 = calculateTotals([data], 0.16);
      
      expect(result1).toEqual(result2);
    });
  });
});
