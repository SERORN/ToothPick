// 🧪 FASE 28.2: Pruebas de Componentes React - Tabla de Facturas
// ✅ Testing completo para InvoiceTable con filtros, paginación y acciones

import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { faker } from '@faker-js/faker';
import InvoiceTable from '../../components/InvoiceTable';

// 🎭 Mocks para dependencias
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    refresh: jest.fn()
  })
}));

jest.mock('../../lib/hooks/useInvoices', () => ({
  useInvoices: jest.fn()
}));

jest.mock('../../components/ui/toast', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn()
  }
}));

import { useInvoices } from '../../lib/hooks/useInvoices';
import { toast } from '../../components/ui/toast';

const mockUseInvoices = useInvoices as jest.MockedFunction<typeof useInvoices>;
const mockToast = toast as jest.Mocked<typeof toast>;

// 📋 Mock data para pruebas
const generateMockInvoice = (overrides = {}) => ({
  _id: faker.database.mongodbObjectId(),
  number: `INV-${faker.string.alphanumeric(6)}`,
  clientName: faker.company.name(),
  clientEmail: faker.internet.email(),
  clientRFC: 'XAXX010101000',
  amount: parseFloat(faker.commerce.price()),
  currency: faker.helpers.arrayElement(['MXN', 'USD', 'EUR']),
  status: faker.helpers.arrayElement(['draft', 'sent', 'paid', 'cancelled']),
  cfdiUuid: faker.string.uuid(),
  createdAt: faker.date.recent().toISOString(),
  dueDate: faker.date.future().toISOString(),
  items: [
    {
      description: faker.commerce.productName(),
      quantity: faker.number.int({ min: 1, max: 10 }),
      unitPrice: parseFloat(faker.commerce.price()),
      total: parseFloat(faker.commerce.price())
    }
  ],
  ...overrides
});

describe('🧪 InvoiceTable Component - Tests Completos', () => {
  const mockInvoices = Array.from({ length: 15 }, () => generateMockInvoice());
  const defaultProps = {
    invoices: mockInvoices,
    isLoading: false,
    error: null,
    pagination: {
      page: 1,
      limit: 10,
      total: 15,
      totalPages: 2
    },
    onRefresh: jest.fn(),
    onEdit: jest.fn(),
    onDelete: jest.fn(),
    onCancel: jest.fn(),
    onDownload: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockUseInvoices.mockReturnValue({
      invoices: mockInvoices,
      isLoading: false,
      error: null,
      fetchInvoices: jest.fn(),
      createInvoice: jest.fn(),
      updateInvoice: jest.fn(),
      deleteInvoice: jest.fn(),
      cancelInvoice: jest.fn(),
      downloadInvoice: jest.fn()
    });
  });

  describe('🎨 Renderizado y UI', () => {
    it('✅ Debería renderizar la tabla con facturas', () => {
      render(<InvoiceTable {...defaultProps} />);
      
      expect(screen.getByText('Facturas')).toBeInTheDocument();
      expect(screen.getByText('Total: 15 facturas')).toBeInTheDocument();
      
      // Verificar headers de la tabla
      expect(screen.getByText('No. Factura')).toBeInTheDocument();
      expect(screen.getByText('Cliente')).toBeInTheDocument();
      expect(screen.getByText('Monto')).toBeInTheDocument();
      expect(screen.getByText('Estado')).toBeInTheDocument();
      expect(screen.getByText('Fecha')).toBeInTheDocument();
      expect(screen.getByText('Acciones')).toBeInTheDocument();
    });

    it('🔄 Debería mostrar loading state', () => {
      render(<InvoiceTable {...defaultProps} isLoading={true} />);
      
      expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
      expect(screen.getByText('Cargando facturas...')).toBeInTheDocument();
    });

    it('❌ Debería mostrar mensaje de error', () => {
      const error = 'Error al cargar facturas';
      render(<InvoiceTable {...defaultProps} error={error} />);
      
      expect(screen.getByText(error)).toBeInTheDocument();
      expect(screen.getByText('Reintentar')).toBeInTheDocument();
    });

    it('📭 Debería mostrar mensaje cuando no hay facturas', () => {
      render(<InvoiceTable {...defaultProps} invoices={[]} />);
      
      expect(screen.getByText('No se encontraron facturas')).toBeInTheDocument();
      expect(screen.getByText('Crear primera factura')).toBeInTheDocument();
    });
  });

  describe('🔍 Filtros y Búsqueda', () => {
    it('✅ Debería filtrar por número de factura', async () => {
      const user = userEvent.setup();
      render(<InvoiceTable {...defaultProps} />);
      
      const searchInput = screen.getByPlaceholderText('Buscar por número, cliente o RFC...');
      await user.type(searchInput, 'INV-123');
      
      expect(searchInput).toHaveValue('INV-123');
      
      // Verificar que se llama la función de búsqueda
      await waitFor(() => {
        expect(defaultProps.onRefresh).toHaveBeenCalledWith(
          expect.objectContaining({
            search: 'INV-123'
          })
        );
      });
    });

    it('📊 Debería filtrar por estado', async () => {
      const user = userEvent.setup();
      render(<InvoiceTable {...defaultProps} />);
      
      const statusFilter = screen.getByLabelText('Filtrar por estado');
      await user.selectOptions(statusFilter, 'paid');
      
      expect(statusFilter).toHaveValue('paid');
      expect(defaultProps.onRefresh).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'paid'
        })
      );
    });

    it('💱 Debería filtrar por moneda', async () => {
      const user = userEvent.setup();
      render(<InvoiceTable {...defaultProps} />);
      
      const currencyFilter = screen.getByLabelText('Filtrar por moneda');
      await user.selectOptions(currencyFilter, 'USD');
      
      expect(currencyFilter).toHaveValue('USD');
      expect(defaultProps.onRefresh).toHaveBeenCalledWith(
        expect.objectContaining({
          currency: 'USD'
        })
      );
    });

    it('📅 Debería filtrar por rango de fechas', async () => {
      const user = userEvent.setup();
      render(<InvoiceTable {...defaultProps} />);
      
      const startDate = screen.getByLabelText('Fecha inicio');
      const endDate = screen.getByLabelText('Fecha fin');
      
      await user.type(startDate, '2024-01-01');
      await user.type(endDate, '2024-01-31');
      
      expect(startDate).toHaveValue('2024-01-01');
      expect(endDate).toHaveValue('2024-01-31');
      
      expect(defaultProps.onRefresh).toHaveBeenCalledWith(
        expect.objectContaining({
          startDate: '2024-01-01',
          endDate: '2024-01-31'
        })
      );
    });

    it('🗑️ Debería limpiar todos los filtros', async () => {
      const user = userEvent.setup();
      render(<InvoiceTable {...defaultProps} />);
      
      // Aplicar algunos filtros
      const searchInput = screen.getByPlaceholderText('Buscar por número, cliente o RFC...');
      await user.type(searchInput, 'test');
      
      const statusFilter = screen.getByLabelText('Filtrar por estado');
      await user.selectOptions(statusFilter, 'paid');
      
      // Limpiar filtros
      const clearButton = screen.getByText('Limpiar filtros');
      await user.click(clearButton);
      
      expect(searchInput).toHaveValue('');
      expect(statusFilter).toHaveValue('');
      expect(defaultProps.onRefresh).toHaveBeenCalledWith({});
    });
  });

  describe('📄 Paginación', () => {
    it('✅ Debería mostrar información de paginación', () => {
      render(<InvoiceTable {...defaultProps} />);
      
      expect(screen.getByText('Página 1 de 2')).toBeInTheDocument();
      expect(screen.getByText('Mostrando 10 de 15 facturas')).toBeInTheDocument();
    });

    it('⏭️ Debería navegar a la siguiente página', async () => {
      const user = userEvent.setup();
      render(<InvoiceTable {...defaultProps} />);
      
      const nextButton = screen.getByLabelText('Página siguiente');
      await user.click(nextButton);
      
      expect(defaultProps.onRefresh).toHaveBeenCalledWith(
        expect.objectContaining({
          page: 2
        })
      );
    });

    it('⏮️ Debería navegar a la página anterior', async () => {
      const user = userEvent.setup();
      const props = {
        ...defaultProps,
        pagination: { ...defaultProps.pagination, page: 2 }
      };
      render(<InvoiceTable {...props} />);
      
      const prevButton = screen.getByLabelText('Página anterior');
      await user.click(prevButton);
      
      expect(defaultProps.onRefresh).toHaveBeenCalledWith(
        expect.objectContaining({
          page: 1
        })
      );
    });

    it('🔢 Debería cambiar el tamaño de página', async () => {
      const user = userEvent.setup();
      render(<InvoiceTable {...defaultProps} />);
      
      const pageSizeSelect = screen.getByLabelText('Facturas por página');
      await user.selectOptions(pageSizeSelect, '25');
      
      expect(defaultProps.onRefresh).toHaveBeenCalledWith(
        expect.objectContaining({
          limit: 25,
          page: 1
        })
      );
    });
  });

  describe('🔧 Acciones en Facturas', () => {
    it('👁️ Debería abrir modal de detalles', async () => {
      const user = userEvent.setup();
      render(<InvoiceTable {...defaultProps} />);
      
      const viewButtons = screen.getAllByLabelText('Ver detalles');
      await user.click(viewButtons[0]);
      
      expect(screen.getByText('Detalles de Factura')).toBeInTheDocument();
      expect(screen.getByText(mockInvoices[0].number)).toBeInTheDocument();
    });

    it('✏️ Debería llamar función de editar', async () => {
      const user = userEvent.setup();
      render(<InvoiceTable {...defaultProps} />);
      
      const editButtons = screen.getAllByLabelText('Editar factura');
      await user.click(editButtons[0]);
      
      expect(defaultProps.onEdit).toHaveBeenCalledWith(mockInvoices[0]);
    });

    it('🗑️ Debería mostrar confirmación antes de eliminar', async () => {
      const user = userEvent.setup();
      render(<InvoiceTable {...defaultProps} />);
      
      const deleteButtons = screen.getAllByLabelText('Eliminar factura');
      await user.click(deleteButtons[0]);
      
      expect(screen.getByText('¿Eliminar factura?')).toBeInTheDocument();
      expect(screen.getByText('Esta acción no se puede deshacer')).toBeInTheDocument();
      
      const confirmButton = screen.getByText('Eliminar');
      await user.click(confirmButton);
      
      expect(defaultProps.onDelete).toHaveBeenCalledWith(mockInvoices[0]._id);
    });

    it('❌ Debería cancelar CFDI con motivo', async () => {
      const user = userEvent.setup();
      const invoiceWithCFDI = generateMockInvoice({
        status: 'sent',
        cfdiUuid: faker.string.uuid()
      });
      
      render(<InvoiceTable {...defaultProps} invoices={[invoiceWithCFDI]} />);
      
      const cancelButton = screen.getByLabelText('Cancelar CFDI');
      await user.click(cancelButton);
      
      expect(screen.getByText('Cancelar CFDI')).toBeInTheDocument();
      
      const reasonSelect = screen.getByLabelText('Motivo de cancelación');
      await user.selectOptions(reasonSelect, '02');
      
      const confirmButton = screen.getByText('Confirmar cancelación');
      await user.click(confirmButton);
      
      expect(defaultProps.onCancel).toHaveBeenCalledWith(
        invoiceWithCFDI._id,
        expect.objectContaining({
          reason: '02'
        })
      );
    });

    it('📄 Debería descargar PDF', async () => {
      const user = userEvent.setup();
      render(<InvoiceTable {...defaultProps} />);
      
      const downloadButton = screen.getAllByLabelText('Descargar PDF')[0];
      await user.click(downloadButton);
      
      expect(defaultProps.onDownload).toHaveBeenCalledWith(
        mockInvoices[0]._id,
        'pdf'
      );
    });

    it('📧 Debería descargar XML', async () => {
      const user = userEvent.setup();
      render(<InvoiceTable {...defaultProps} />);
      
      // Abrir menú de descarga
      const moreButton = screen.getAllByLabelText('Más opciones')[0];
      await user.click(moreButton);
      
      const downloadXmlButton = screen.getByText('Descargar XML');
      await user.click(downloadXmlButton);
      
      expect(defaultProps.onDownload).toHaveBeenCalledWith(
        mockInvoices[0]._id,
        'xml'
      );
    });
  });

  describe('🎨 Estados Visuales', () => {
    it('✅ Debería mostrar badge correcto para estado "paid"', () => {
      const paidInvoice = generateMockInvoice({ status: 'paid' });
      render(<InvoiceTable {...defaultProps} invoices={[paidInvoice]} />);
      
      const badge = screen.getByText('Pagada');
      expect(badge).toHaveClass('bg-green-100', 'text-green-800');
    });

    it('⏰ Debería mostrar badge correcto para estado "pending"', () => {
      const pendingInvoice = generateMockInvoice({ status: 'pending' });
      render(<InvoiceTable {...defaultProps} invoices={[pendingInvoice]} />);
      
      const badge = screen.getByText('Pendiente');
      expect(badge).toHaveClass('bg-yellow-100', 'text-yellow-800');
    });

    it('❌ Debería mostrar badge correcto para estado "cancelled"', () => {
      const cancelledInvoice = generateMockInvoice({ status: 'cancelled' });
      render(<InvoiceTable {...defaultProps} invoices={[cancelledInvoice]} />);
      
      const badge = screen.getByText('Cancelada');
      expect(badge).toHaveClass('bg-red-100', 'text-red-800');
    });

    it('💰 Debería formatear montos correctamente', () => {
      const invoiceUSD = generateMockInvoice({
        amount: 1234.56,
        currency: 'USD'
      });
      const invoiceMXN = generateMockInvoice({
        amount: 25000.00,
        currency: 'MXN'
      });
      
      render(<InvoiceTable {...defaultProps} invoices={[invoiceUSD, invoiceMXN]} />);
      
      expect(screen.getByText('$1,234.56 USD')).toBeInTheDocument();
      expect(screen.getByText('$25,000.00 MXN')).toBeInTheDocument();
    });

    it('⚠️ Debería destacar facturas vencidas', () => {
      const overdueInvoice = generateMockInvoice({
        dueDate: faker.date.past().toISOString(),
        status: 'sent'
      });
      
      render(<InvoiceTable {...defaultProps} invoices={[overdueInvoice]} />);
      
      const row = screen.getByTestId(`invoice-row-${overdueInvoice._id}`);
      expect(row).toHaveClass('bg-red-50', 'border-red-200');
      
      expect(screen.getByText('Vencida')).toBeInTheDocument();
    });
  });

  describe('♿ Accesibilidad', () => {
    it('🎯 Debería tener labels apropiados', () => {
      render(<InvoiceTable {...defaultProps} />);
      
      expect(screen.getByLabelText('Buscar facturas')).toBeInTheDocument();
      expect(screen.getByLabelText('Filtrar por estado')).toBeInTheDocument();
      expect(screen.getByLabelText('Filtrar por moneda')).toBeInTheDocument();
    });

    it('⌨️ Debería ser navegable por teclado', async () => {
      const user = userEvent.setup();
      render(<InvoiceTable {...defaultProps} />);
      
      const searchInput = screen.getByPlaceholderText('Buscar por número, cliente o RFC...');
      
      // Navegar con Tab
      await user.tab();
      expect(searchInput).toHaveFocus();
      
      await user.tab();
      expect(screen.getByLabelText('Filtrar por estado')).toHaveFocus();
    });

    it('📱 Debería ser responsive', () => {
      // Mock window.matchMedia
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: jest.fn().mockImplementation(query => ({
          matches: query.includes('max-width: 768px'),
          media: query,
          onchange: null,
          addListener: jest.fn(),
          removeListener: jest.fn(),
          addEventListener: jest.fn(),
          removeEventListener: jest.fn(),
          dispatchEvent: jest.fn(),
        })),
      });
      
      render(<InvoiceTable {...defaultProps} />);
      
      // En mobile, algunas columnas deberían estar ocultas
      expect(screen.queryByText('RFC')).not.toBeInTheDocument();
      expect(screen.queryByText('Fecha de vencimiento')).not.toBeInTheDocument();
    });
  });

  describe('🔄 Actualizaciones en Tiempo Real', () => {
    it('✅ Debería actualizar cuando cambian las props', () => {
      const { rerender } = render(<InvoiceTable {...defaultProps} />);
      
      expect(screen.getByText('Total: 15 facturas')).toBeInTheDocument();
      
      const newProps = {
        ...defaultProps,
        invoices: [...mockInvoices, generateMockInvoice()],
        pagination: { ...defaultProps.pagination, total: 16 }
      };
      
      rerender(<InvoiceTable {...newProps} />);
      
      expect(screen.getByText('Total: 16 facturas')).toBeInTheDocument();
    });

    it('🔄 Debería refrescar automáticamente', async () => {
      jest.useFakeTimers();
      
      render(<InvoiceTable {...defaultProps} autoRefresh={true} />);
      
      // Avanzar el timer
      jest.advanceTimersByTime(30000); // 30 segundos
      
      expect(defaultProps.onRefresh).toHaveBeenCalled();
      
      jest.useRealTimers();
    });
  });

  describe('🚨 Manejo de Errores', () => {
    it('❌ Debería mostrar toast de error en operaciones fallidas', async () => {
      const user = userEvent.setup();
      const onDeleteWithError = jest.fn().mockRejectedValue(new Error('Error al eliminar'));
      
      render(<InvoiceTable {...defaultProps} onDelete={onDeleteWithError} />);
      
      const deleteButton = screen.getAllByLabelText('Eliminar factura')[0];
      await user.click(deleteButton);
      
      const confirmButton = screen.getByText('Eliminar');
      await user.click(confirmButton);
      
      await waitFor(() => {
        expect(mockToast.error).toHaveBeenCalledWith('Error al eliminar la factura');
      });
    });

    it('📱 Debería manejar errores de red gracefulmente', async () => {
      const user = userEvent.setup();
      
      // Simular error de red
      const onRefreshWithError = jest.fn().mockRejectedValue(
        new Error('Network error')
      );
      
      render(<InvoiceTable {...defaultProps} onRefresh={onRefreshWithError} />);
      
      const refreshButton = screen.getByLabelText('Actualizar');
      await user.click(refreshButton);
      
      await waitFor(() => {
        expect(screen.getByText('Error de conexión')).toBeInTheDocument();
        expect(screen.getByText('Reintentar')).toBeInTheDocument();
      });
    });
  });
});
