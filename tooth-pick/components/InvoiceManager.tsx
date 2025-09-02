'use client';

import React, { useState, useEffect } from 'react';

interface Invoice {
  id: string;
  uuid: string;
  serie: string;
  folio: string;
  fullNumber: string;
  type: 'saas' | 'tratamiento' | 'marketplace' | 'toothpay';
  receiverRfc: string;
  receiverName: string;
  receiverEmail?: string;
  subtotal: number;
  iva: number;
  total: number;
  currency: string;
  status: 'draft' | 'sent' | 'active' | 'cancelled';
  isCancelled: boolean;
  isValid: boolean;
  xmlUrl?: string;
  pdfUrl?: string;
  issueDate: string;
  createdAt: string;
  relatedEntityType?: string;
  itemsCount: number;
  firstItemDescription: string;
}

interface InvoiceManagerProps {
  userRfc?: string;
  clinicId?: string;
  showCreateButton?: boolean;
  allowCancel?: boolean;
  allowResend?: boolean;
}

const InvoiceManager: React.FC<InvoiceManagerProps> = ({
  userRfc,
  clinicId,
  showCreateButton = false,
  allowCancel = false,
  allowResend = true
}) => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedInvoices, setSelectedInvoices] = useState<string[]>([]);
  const [filters, setFilters] = useState({
    type: '',
    status: '',
    startDate: '',
    endDate: '',
    rfc: userRfc || ''
  });
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    itemsPerPage: 20
  });
  const [statistics, setStatistics] = useState({
    totalAmount: 0,
    activeCount: 0,
    cancelledCount: 0,
    totalCount: 0
  });

  // Estados para modales
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showResendModal, setShowResendModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [resendEmail, setResendEmail] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    loadInvoices();
  }, [filters, pagination.currentPage]);

  const loadInvoices = async () => {
    try {
      setLoading(true);
      
      const params = new URLSearchParams({
        page: pagination.currentPage.toString(),
        limit: pagination.itemsPerPage.toString()
      });

      // Agregar filtros
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value);
      });

      const response = await fetch(`/api/invoice?${params.toString()}`);
      const data = await response.json();

      if (data.success) {
        setInvoices(data.invoices);
        setPagination(data.pagination);
        setStatistics(data.statistics);
      } else {
        console.error('Error loading invoices:', data.error);
      }
    } catch (error) {
      console.error('Error loading invoices:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPagination(prev => ({ ...prev, currentPage: 1 }));
  };

  const handleSelectInvoice = (invoiceId: string) => {
    setSelectedInvoices(prev => 
      prev.includes(invoiceId) 
        ? prev.filter(id => id !== invoiceId)
        : [...prev, invoiceId]
    );
  };

  const handleSelectAll = () => {
    if (selectedInvoices.length === invoices.length) {
      setSelectedInvoices([]);
    } else {
      setSelectedInvoices(invoices.map(inv => inv.id));
    }
  };

  const openCancelModal = (invoice?: Invoice) => {
    if (invoice) {
      setSelectedInvoice(invoice);
      setSelectedInvoices([invoice.id]);
    }
    setShowCancelModal(true);
  };

  const openResendModal = (invoice?: Invoice) => {
    if (invoice) {
      setSelectedInvoice(invoice);
      setSelectedInvoices([invoice.id]);
      setResendEmail(invoice.receiverEmail || '');
    }
    setShowResendModal(true);
  };

  const openDetailsModal = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setShowDetailsModal(true);
  };

  const handleCancelInvoices = async () => {
    if (!cancelReason.trim()) {
      alert('Por favor ingresa un motivo de cancelación');
      return;
    }

    try {
      setActionLoading(true);

      if (selectedInvoices.length === 1) {
        // Cancelar una sola factura
        const response = await fetch(`/api/invoice/${selectedInvoices[0]}`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reason: cancelReason })
        });

        const result = await response.json();
        if (result.success) {
          alert('Factura cancelada exitosamente');
        } else {
          alert(`Error: ${result.error}`);
        }
      } else {
        // Cancelar múltiples facturas
        const response = await fetch('/api/invoice/bulk-operations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            operation: 'cancel',
            invoiceIds: selectedInvoices,
            data: { reason: cancelReason }
          })
        });

        const result = await response.json();
        if (result.success) {
          alert(result.message);
        } else {
          alert(`Error: ${result.error}`);
        }
      }

      setShowCancelModal(false);
      setCancelReason('');
      setSelectedInvoices([]);
      await loadInvoices();

    } catch (error) {
      console.error('Error cancelling invoices:', error);
      alert('Error interno al cancelar facturas');
    } finally {
      setActionLoading(false);
    }
  };

  const handleResendInvoices = async () => {
    if (!resendEmail.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(resendEmail)) {
      alert('Por favor ingresa un email válido');
      return;
    }

    try {
      setActionLoading(true);

      if (selectedInvoices.length === 1) {
        // Reenviar una sola factura
        const response = await fetch(`/api/invoice/${selectedInvoices[0]}/resend`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: resendEmail })
        });

        const result = await response.json();
        if (result.success) {
          alert('Factura reenviada exitosamente');
        } else {
          alert(`Error: ${result.error}`);
        }
      } else {
        // Reenviar múltiples facturas
        const response = await fetch('/api/invoice/bulk-operations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            operation: 'resend',
            invoiceIds: selectedInvoices,
            data: { email: resendEmail }
          })
        });

        const result = await response.json();
        if (result.success) {
          alert(result.message);
        } else {
          alert(`Error: ${result.error}`);
        }
      }

      setShowResendModal(false);
      setResendEmail('');
      setSelectedInvoices([]);

    } catch (error) {
      console.error('Error resending invoices:', error);
      alert('Error interno al reenviar facturas');
    } finally {
      setActionLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getStatusBadge = (status: string, isCancelled: boolean) => {
    if (isCancelled) {
      return <span className="px-2 py-1 rounded-full text-xs bg-red-100 text-red-800">Cancelada</span>;
    }

    const statusClasses = {
      active: 'bg-green-100 text-green-800',
      sent: 'bg-blue-100 text-blue-800',
      draft: 'bg-gray-100 text-gray-800'
    };

    const statusTexts = {
      active: 'Activa',
      sent: 'Enviada',
      draft: 'Borrador'
    };

    return (
      <span className={`px-2 py-1 rounded-full text-xs ${statusClasses[status as keyof typeof statusClasses] || 'bg-gray-100 text-gray-800'}`}>
        {statusTexts[status as keyof typeof statusTexts] || status}
      </span>
    );
  };

  const getTypeBadge = (type: string) => {
    const typeClasses = {
      saas: 'bg-purple-100 text-purple-800',
      tratamiento: 'bg-blue-100 text-blue-800',
      marketplace: 'bg-green-100 text-green-800',
      toothpay: 'bg-orange-100 text-orange-800'
    };

    const typeTexts = {
      saas: 'SaaS',
      tratamiento: 'Tratamiento',
      marketplace: 'Marketplace',
      toothpay: 'ToothPay'
    };

    return (
      <span className={`px-2 py-1 rounded-full text-xs ${typeClasses[type as keyof typeof typeClasses] || 'bg-gray-100 text-gray-800'}`}>
        {typeTexts[type as keyof typeof typeTexts] || type}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500">Total Facturado</h3>
          <p className="text-2xl font-bold text-gray-900">{formatCurrency(statistics.totalAmount)}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500">Facturas Activas</h3>
          <p className="text-2xl font-bold text-green-600">{statistics.activeCount}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500">Facturas Canceladas</h3>
          <p className="text-2xl font-bold text-red-600">{statistics.cancelledCount}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500">Total Facturas</h3>
          <p className="text-2xl font-bold text-gray-900">{statistics.totalCount}</p>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white p-4 rounded-lg shadow">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Filtros</h3>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">RFC</label>
            <input
              type="text"
              value={filters.rfc}
              onChange={(e) => handleFilterChange('rfc', e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              placeholder="RFC del receptor"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
            <select
              value={filters.type}
              onChange={(e) => handleFilterChange('type', e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            >
              <option value="">Todos</option>
              <option value="saas">SaaS</option>
              <option value="tratamiento">Tratamiento</option>
              <option value="marketplace">Marketplace</option>
              <option value="toothpay">ToothPay</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
            <select
              value={filters.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            >
              <option value="">Todos</option>
              <option value="active">Activa</option>
              <option value="sent">Enviada</option>
              <option value="cancelled">Cancelada</option>
              <option value="draft">Borrador</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Fecha Desde</label>
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => handleFilterChange('startDate', e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Fecha Hasta</label>
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) => handleFilterChange('endDate', e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            />
          </div>
        </div>
      </div>

      {/* Acciones en lote */}
      {selectedInvoices.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-blue-700">
              {selectedInvoices.length} factura(s) seleccionada(s)
            </span>
            <div className="space-x-2">
              {allowResend && (
                <button
                  onClick={() => openResendModal()}
                  className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                >
                  Reenviar
                </button>
              )}
              {allowCancel && (
                <button
                  onClick={() => openCancelModal()}
                  className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
                >
                  Cancelar
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tabla de facturas */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={selectedInvoices.length === invoices.length && invoices.length > 0}
                    onChange={handleSelectAll}
                    className="rounded border-gray-300"
                  />
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Folio</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tipo</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Receptor</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Acciones</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {invoices.map((invoice) => (
                <tr key={invoice.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selectedInvoices.includes(invoice.id)}
                      onChange={() => handleSelectInvoice(invoice.id)}
                      className="rounded border-gray-300"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{invoice.fullNumber}</div>
                      <div className="text-xs text-gray-500">UUID: {invoice.uuid.slice(0, 8)}...</div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {getTypeBadge(invoice.type)}
                  </td>
                  <td className="px-4 py-3">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{invoice.receiverName}</div>
                      <div className="text-xs text-gray-500">{invoice.receiverRfc}</div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900">
                    {formatCurrency(invoice.total)}
                  </td>
                  <td className="px-4 py-3">
                    {getStatusBadge(invoice.status, invoice.isCancelled)}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900">
                    {formatDate(invoice.issueDate)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => openDetailsModal(invoice)}
                        className="text-blue-600 hover:text-blue-800 text-sm"
                      >
                        Ver
                      </button>
                      {invoice.xmlUrl && (
                        <a
                          href={invoice.xmlUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-green-600 hover:text-green-800 text-sm"
                        >
                          XML
                        </a>
                      )}
                      {invoice.pdfUrl && (
                        <a
                          href={invoice.pdfUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-red-600 hover:text-red-800 text-sm"
                        >
                          PDF
                        </a>
                      )}
                      {allowResend && (
                        <button
                          onClick={() => openResendModal(invoice)}
                          className="text-purple-600 hover:text-purple-800 text-sm"
                        >
                          Reenviar
                        </button>
                      )}
                      {allowCancel && !invoice.isCancelled && (
                        <button
                          onClick={() => openCancelModal(invoice)}
                          className="text-red-600 hover:text-red-800 text-sm"
                        >
                          Cancelar
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Paginación */}
        {pagination.totalPages > 1 && (
          <div className="bg-white px-4 py-3 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-700">
                Mostrando {((pagination.currentPage - 1) * pagination.itemsPerPage) + 1} a{' '}
                {Math.min(pagination.currentPage * pagination.itemsPerPage, pagination.totalItems)} de{' '}
                {pagination.totalItems} resultados
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => setPagination(prev => ({ ...prev, currentPage: prev.currentPage - 1 }))}
                  disabled={!pagination.hasPrevPage}
                  className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Anterior
                </button>
                <span className="px-3 py-1 text-sm">
                  Página {pagination.currentPage} de {pagination.totalPages}
                </span>
                <button
                  onClick={() => setPagination(prev => ({ ...prev, currentPage: prev.currentPage + 1 }))}
                  disabled={!pagination.hasNextPage}
                  className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Siguiente
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modal de cancelación */}
      {showCancelModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Cancelar {selectedInvoices.length === 1 ? 'factura' : 'facturas'}
            </h3>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Motivo de cancelación
              </label>
              <textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
                rows={3}
                placeholder="Ingresa el motivo de la cancelación..."
              />
            </div>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowCancelModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleCancelInvoices}
                disabled={actionLoading}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
              >
                {actionLoading ? 'Procesando...' : 'Confirmar Cancelación'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de reenvío */}
      {showResendModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Reenviar {selectedInvoices.length === 1 ? 'factura' : 'facturas'}
            </h3>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email de destino
              </label>
              <input
                type="email"
                value={resendEmail}
                onChange={(e) => setResendEmail(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
                placeholder="correo@ejemplo.com"
              />
            </div>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowResendModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleResendInvoices}
                disabled={actionLoading}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {actionLoading ? 'Enviando...' : 'Reenviar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de detalles */}
      {showDetailsModal && selectedInvoice && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">
                Detalles de Factura {selectedInvoice.fullNumber}
              </h3>
              <button
                onClick={() => setShowDetailsModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-500">UUID</label>
                  <p className="text-sm text-gray-900 font-mono">{selectedInvoice.uuid}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500">Estado</label>
                  {getStatusBadge(selectedInvoice.status, selectedInvoice.isCancelled)}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500">Tipo</label>
                  {getTypeBadge(selectedInvoice.type)}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500">Fecha de Emisión</label>
                  <p className="text-sm text-gray-900">{formatDate(selectedInvoice.issueDate)}</p>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-500">Receptor</label>
                <p className="text-sm text-gray-900">{selectedInvoice.receiverName}</p>
                <p className="text-sm text-gray-500">{selectedInvoice.receiverRfc}</p>
                {selectedInvoice.receiverEmail && (
                  <p className="text-sm text-gray-500">{selectedInvoice.receiverEmail}</p>
                )}
              </div>
              
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-500">Subtotal</label>
                  <p className="text-sm text-gray-900">{formatCurrency(selectedInvoice.subtotal)}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500">IVA</label>
                  <p className="text-sm text-gray-900">{formatCurrency(selectedInvoice.iva)}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500">Total</label>
                  <p className="text-lg font-bold text-gray-900">{formatCurrency(selectedInvoice.total)}</p>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-500">Descripción</label>
                <p className="text-sm text-gray-900">{selectedInvoice.firstItemDescription}</p>
              </div>
              
              <div className="flex space-x-4 pt-4">
                {selectedInvoice.xmlUrl && (
                  <a
                    href={selectedInvoice.xmlUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                  >
                    Descargar XML
                  </a>
                )}
                {selectedInvoice.pdfUrl && (
                  <a
                    href={selectedInvoice.pdfUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                  >
                    Descargar PDF
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InvoiceManager;
