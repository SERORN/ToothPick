// ❌ FASE 28.1: Modal para Cancelar Facturas CFDI
// ✅ CancelInvoiceModal - Cancelación con motivos SAT

'use client';

import { useState } from 'react';
import { X, AlertTriangle, FileX, Loader2, Info } from 'lucide-react';
import { useInvoiceActions } from '@/lib/hooks/useInvoices';
import { InvoiceItem } from '@/lib/hooks/useInvoices';
import { formatCurrency, formatInvoiceDate, canCancelInvoice } from '@/lib/utils/invoiceUtils';

interface CancelInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  factura: InvoiceItem | null;
  onCancelComplete?: () => void;
}

// 📋 Motivos de cancelación según SAT
const MOTIVOS_CANCELACION = {
  '01': {
    codigo: '01',
    descripcion: 'Comprobante emitido con errores con relación',
    requiereSustitucion: true,
    explicacion: 'Se emitió una factura con errores y se va a emitir una nueva para corregirlos.'
  },
  '02': {
    codigo: '02', 
    descripcion: 'Comprobante emitido con errores sin relación',
    requiereSustitucion: false,
    explicacion: 'Se emitió una factura con errores pero NO se va a emitir una nueva.'
  },
  '03': {
    codigo: '03',
    descripcion: 'No se llevó a cabo la operación',
    requiereSustitucion: false,
    explicacion: 'La operación o venta nunca se realizó realmente.'
  },
  '04': {
    codigo: '04',
    descripcion: 'Nominativa relacionada en factura global',
    requiereSustitucion: false,
    explicacion: 'Para facturas globales que incluyen nómina.'
  }
};

export default function CancelInvoiceModal({
  isOpen,
  onClose,
  factura,
  onCancelComplete
}: CancelInvoiceModalProps) {
  const { cancelInvoice, loading } = useInvoiceActions();
  const [motivo, setMotivo] = useState('');
  const [folioSustitucion, setFolioSustitucion] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [confirmacion, setConfirmacion] = useState('');
  const [showConfirmation, setShowConfirmation] = useState(false);

  // 🔄 Reset del form
  const resetForm = () => {
    setMotivo('');
    setFolioSustitucion('');
    setObservaciones('');
    setConfirmacion('');
    setShowConfirmation(false);
  };

  // 🚫 Cerrar modal
  const handleClose = () => {
    if (!loading) {
      resetForm();
      onClose();
    }
  };

  // ✅ Proceder a confirmación
  const handleProceed = () => {
    if (!motivo) return;
    
    const motivoSeleccionado = MOTIVOS_CANCELACION[motivo as keyof typeof MOTIVOS_CANCELACION];
    if (motivoSeleccionado?.requiereSustitucion && !folioSustitucion.trim()) {
      return;
    }

    setShowConfirmation(true);
  };

  // ❌ Cancelar factura
  const handleCancel = async () => {
    if (!factura || confirmacion !== factura.folioCompleto) return;

    const cancelData = {
      motivo,
      folioSustitucion: folioSustitucion.trim() || undefined,
      observaciones: observaciones.trim() || undefined
    };

    const success = await cancelInvoice(factura.id, cancelData);
    
    if (success) {
      resetForm();
      onClose();
      if (onCancelComplete) {
        onCancelComplete();
      }
    }
  };

  // 🔒 Verificar si se puede cancelar
  const canCancel = factura ? canCancelInvoice(factura) : false;
  const motivoSeleccionado = motivo ? MOTIVOS_CANCELACION[motivo as keyof typeof MOTIVOS_CANCELACION] : null;
  const isFormValid = motivo && (!motivoSeleccionado?.requiereSustitucion || folioSustitucion.trim());
  const isConfirmationValid = confirmacion === factura?.folioCompleto;

  if (!isOpen || !factura) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        {/* Overlay */}
        <div 
          className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
          onClick={handleClose}
        />

        {/* Modal */}
        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
          
          {/* Header */}
          <div className="bg-white px-6 pt-6 pb-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
                  <FileX className="h-6 w-6 text-red-600" />
                </div>
                <div>
                  <h3 className="text-lg leading-6 font-medium text-gray-900">
                    Cancelar Factura
                  </h3>
                  <p className="text-sm text-gray-500">
                    {factura.folioCompleto} • {formatCurrency(factura.total, factura.moneda)}
                  </p>
                </div>
              </div>
              
              <button
                onClick={handleClose}
                disabled={loading}
                className="text-gray-400 hover:text-gray-600 disabled:cursor-not-allowed"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Advertencia si no se puede cancelar */}
            {!canCancel && (
              <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-medium text-red-800">
                      No se puede cancelar esta factura
                    </h4>
                    <p className="text-sm text-red-700 mt-1">
                      {factura.tipo.startsWith('CFDI') 
                        ? 'Han pasado más de 72 horas desde el timbrado o la factura ya está cancelada.'
                        : 'Esta factura no se puede cancelar en su estado actual.'
                      }
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Contenido */}
          {canCancel && (
            <div className="px-6 pb-6">
              {!showConfirmation ? (
                // Formulario de cancelación
                <div className="space-y-4">
                  {/* Información de la factura */}
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="text-sm font-medium text-gray-900 mb-2">
                      Información de la factura
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                      <div>
                        <span className="text-gray-500">Folio:</span>
                        <span className="ml-2 font-medium">{factura.folioCompleto}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Total:</span>
                        <span className="ml-2 font-medium">
                          {formatCurrency(factura.total, factura.moneda)}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-500">Emisión:</span>
                        <span className="ml-2">{formatInvoiceDate(factura.fechaEmision)}</span>
                      </div>
                      {factura.uuid && (
                        <div>
                          <span className="text-gray-500">UUID:</span>
                          <span className="ml-2 font-mono text-xs">
                            {factura.uuid.slice(0, 8)}...
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Motivo de cancelación */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Motivo de cancelación según SAT *
                    </label>
                    <select
                      value={motivo}
                      onChange={(e) => setMotivo(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                      required
                    >
                      <option value="">Seleccionar motivo...</option>
                      {Object.values(MOTIVOS_CANCELACION).map((m) => (
                        <option key={m.codigo} value={m.codigo}>
                          {m.codigo} - {m.descripcion}
                        </option>
                      ))}
                    </select>

                    {/* Explicación del motivo */}
                    {motivoSeleccionado && (
                      <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <div className="flex items-start gap-2">
                          <Info className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
                          <p className="text-sm text-blue-700">
                            {motivoSeleccionado.explicacion}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Folio de sustitución (si es requerido) */}
                  {motivoSeleccionado?.requiereSustitucion && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Folio de sustitución *
                      </label>
                      <input
                        type="text"
                        value={folioSustitucion}
                        onChange={(e) => setFolioSustitucion(e.target.value)}
                        placeholder="Folio de la nueva factura que sustituye"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                        required
                      />
                      <p className="mt-1 text-xs text-gray-500">
                        Ingrese el folio de la nueva factura que corrige los errores.
                      </p>
                    </div>
                  )}

                  {/* Observaciones */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Observaciones (opcional)
                    </label>
                    <textarea
                      value={observaciones}
                      onChange={(e) => setObservaciones(e.target.value)}
                      placeholder="Comentarios adicionales sobre la cancelación..."
                      rows={3}
                      maxLength={1000}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none"
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      {observaciones.length}/1000 caracteres
                    </p>
                  </div>

                  {/* Advertencia */}
                  <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
                      <div>
                        <h4 className="text-sm font-medium text-yellow-800">
                          Advertencia importante
                        </h4>
                        <p className="text-sm text-yellow-700 mt-1">
                          La cancelación de un CFDI es un proceso irreversible. 
                          Una vez cancelada, la factura no podrá ser reactivada.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Botones */}
                  <div className="flex gap-3 pt-4">
                    <button
                      onClick={handleClose}
                      disabled={loading}
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={handleProceed}
                      disabled={!isFormValid || loading}
                      className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Continuar
                    </button>
                  </div>
                </div>
              ) : (
                // Confirmación final
                <div className="space-y-4">
                  <div className="text-center">
                    <AlertTriangle className="mx-auto h-12 w-12 text-red-500" />
                    <h4 className="text-lg font-medium text-gray-900 mt-4">
                      Confirmar cancelación
                    </h4>
                    <p className="text-sm text-gray-500 mt-2">
                      Esta acción no se puede deshacer. La factura será cancelada permanentemente.
                    </p>
                  </div>

                  {/* Resumen de la cancelación */}
                  <div className="bg-red-50 p-4 rounded-lg">
                    <h5 className="text-sm font-medium text-red-800 mb-2">
                      Resumen de la cancelación:
                    </h5>
                    <ul className="text-sm text-red-700 space-y-1">
                      <li>• Factura: {factura.folioCompleto}</li>
                      <li>• Motivo: {motivoSeleccionado?.descripcion}</li>
                      {folioSustitucion && (
                        <li>• Folio sustitución: {folioSustitucion}</li>
                      )}
                      {observaciones && (
                        <li>• Observaciones: {observaciones}</li>
                      )}
                    </ul>
                  </div>

                  {/* Campo de confirmación */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Para confirmar, escriba el folio completo: <strong>{factura.folioCompleto}</strong>
                    </label>
                    <input
                      type="text"
                      value={confirmacion}
                      onChange={(e) => setConfirmacion(e.target.value)}
                      placeholder={factura.folioCompleto}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    />
                  </div>

                  {/* Botones de confirmación */}
                  <div className="flex gap-3 pt-4">
                    <button
                      onClick={() => setShowConfirmation(false)}
                      disabled={loading}
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                    >
                      Atrás
                    </button>
                    <button
                      onClick={handleCancel}
                      disabled={!isConfirmationValid || loading}
                      className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Cancelando...
                        </>
                      ) : (
                        'Cancelar Factura'
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Footer para casos no cancelables */}
          {!canCancel && (
            <div className="px-6 pb-6">
              <button
                onClick={handleClose}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Cerrar
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
