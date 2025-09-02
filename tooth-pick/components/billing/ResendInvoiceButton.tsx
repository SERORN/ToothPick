// 📧 FASE 28.1: Componente de Reenvío de Facturas
// ✅ ResendInvoiceButton - Reenvío por email con confirmación

'use client';

import { useState } from 'react';
import { Mail, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { useInvoiceActions } from '@/lib/hooks/useInvoices';
import { InvoiceItem } from '@/lib/hooks/useInvoices';
import { canResendEmail, formatInvoiceDate } from '@/lib/utils/invoiceUtils';

interface ResendInvoiceButtonProps {
  factura: InvoiceItem;
  variant?: 'button' | 'icon' | 'menu';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  onResendComplete?: () => void;
  showConfirmation?: boolean;
}

export default function ResendInvoiceButton({
  factura,
  variant = 'button',
  size = 'md',
  className = '',
  onResendComplete,
  showConfirmation = true
}: ResendInvoiceButtonProps) {
  const { resendInvoice, loading } = useInvoiceActions();
  const [showModal, setShowModal] = useState(false);
  const [lastSentTime, setLastSentTime] = useState<string | null>(null);

  // 🔄 Verificar si se puede reenviar
  const canResend = canResendEmail(factura);

  // 📧 Manejar reenvío
  const handleResend = async () => {
    if (!canResend) return;

    if (showConfirmation) {
      setShowModal(true);
    } else {
      await performResend();
    }
  };

  // 📨 Realizar reenvío
  const performResend = async () => {
    const success = await resendInvoice(factura.id);
    
    if (success) {
      setLastSentTime(new Date().toISOString());
      setShowModal(false);
      if (onResendComplete) {
        onResendComplete();
      }
    }
  };

  // 🎨 Estilos según tamaño
  const sizeClasses = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-2 text-sm',
    lg: 'px-4 py-3 text-base'
  };

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5'
  };

  // 🔘 Botón de icono solamente
  if (variant === 'icon') {
    return (
      <>
        <button
          onClick={handleResend}
          disabled={!canResend || loading}
          className={`p-2 text-gray-400 hover:text-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${className}`}
          title={canResend ? 'Reenviar por email' : 'No se puede reenviar'}
        >
          {loading ? (
            <Loader2 className={`${iconSizes[size]} animate-spin`} />
          ) : (
            <Mail className={iconSizes[size]} />
          )}
        </button>

        {showModal && (
          <ResendConfirmationModal
            factura={factura}
            onConfirm={performResend}
            onCancel={() => setShowModal(false)}
            loading={loading}
          />
        )}
      </>
    );
  }

  // 📋 Opción de menú
  if (variant === 'menu') {
    return (
      <>
        <button
          onClick={handleResend}
          disabled={!canResend || loading}
          className="flex items-center gap-3 w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
          ) : (
            <Mail className="w-4 h-4 text-blue-500" />
          )}
          <div>
            <div className="font-medium">
              {canResend ? 'Reenviar por email' : 'No disponible'}
            </div>
            <div className="text-xs text-gray-500">
              {canResend 
                ? `Enviar a ${factura.receptor.email}`
                : 'No se puede reenviar esta factura'
              }
            </div>
          </div>
          {factura.emailEnviado && (
            <CheckCircle className="w-4 h-4 text-green-500 ml-auto" />
          )}
        </button>

        {showModal && (
          <ResendConfirmationModal
            factura={factura}
            onConfirm={performResend}
            onCancel={() => setShowModal(false)}
            loading={loading}
          />
        )}
      </>
    );
  }

  // 🔘 Botón completo (por defecto)
  return (
    <>
      <button
        onClick={handleResend}
        disabled={!canResend || loading}
        className={`inline-flex items-center gap-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${sizeClasses[size]} ${className}`}
      >
        {loading ? (
          <Loader2 className={`${iconSizes[size]} animate-spin`} />
        ) : (
          <Mail className={iconSizes[size]} />
        )}
        
        {canResend ? 'Reenviar' : 'No disponible'}
        
        {factura.emailEnviado && !lastSentTime && (
          <CheckCircle className="w-3 h-3" />
        )}
      </button>

      {showModal && (
        <ResendConfirmationModal
          factura={factura}
          onConfirm={performResend}
          onCancel={() => setShowModal(false)}
          loading={loading}
        />
      )}
    </>
  );
}

// 💬 Modal de confirmación
function ResendConfirmationModal({
  factura,
  onConfirm,
  onCancel,
  loading
}: {
  factura: InvoiceItem;
  onConfirm: () => void;
  onCancel: () => void;
  loading: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        {/* Overlay */}
        <div 
          className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
          onClick={onCancel}
        />

        {/* Modal */}
        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-md sm:w-full">
          
          {/* Header */}
          <div className="bg-white px-6 pt-6 pb-4">
            <div className="flex items-center gap-3">
              <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-blue-100">
                <Mail className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <h3 className="text-lg leading-6 font-medium text-gray-900">
                  Reenviar factura
                </h3>
                <p className="text-sm text-gray-500">
                  Confirme el reenvío por email
                </p>
              </div>
            </div>
          </div>

          {/* Contenido */}
          <div className="px-6 pb-6">
            <div className="space-y-4">
              
              {/* Información de la factura */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="text-sm font-medium text-gray-900 mb-2">
                  Detalles del envío
                </h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Factura:</span>
                    <span className="font-medium">{factura.folioCompleto}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Destinatario:</span>
                    <span className="font-medium">{factura.receptor.email}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Receptor:</span>
                    <span className="font-medium">{factura.receptor.nombre}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Fecha emisión:</span>
                    <span>{formatInvoiceDate(factura.fechaEmision)}</span>
                  </div>
                </div>
              </div>

              {/* Estado actual del email */}
              {factura.emailEnviado && factura.emailFecha && (
                <div className="bg-green-50 border border-green-200 p-4 rounded-lg">
                  <div className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-sm font-medium text-green-800">
                        Factura ya enviada
                      </h4>
                      <p className="text-sm text-green-700 mt-1">
                        Esta factura ya fue enviada por email el {formatInvoiceDate(factura.emailFecha, true)}.
                        Se enviará nuevamente.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Información sobre el contenido */}
              <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
                <div className="flex items-start gap-3">
                  <Mail className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-medium text-blue-800">
                      Contenido del email
                    </h4>
                    <ul className="text-sm text-blue-700 mt-1 space-y-1">
                      <li>• Archivo PDF de la factura</li>
                      {factura.tipo.startsWith('CFDI') && (
                        <li>• Archivo XML del CFDI (si disponible)</li>
                      )}
                      <li>• Información fiscal y de contacto</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Botones */}
              <div className="flex gap-3 pt-4">
                <button
                  onClick={onCancel}
                  disabled={loading}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={onConfirm}
                  disabled={loading}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Enviando...
                    </>
                  ) : (
                    <>
                      <Mail className="w-4 h-4" />
                      Reenviar
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// 📊 Componente de estado de email
export function EmailStatus({ 
  factura,
  showDetails = false 
}: { 
  factura: InvoiceItem;
  showDetails?: boolean;
}) {
  if (!factura.receptor.email) {
    return (
      <span className="inline-flex items-center px-2 py-1 rounded text-xs bg-gray-100 text-gray-600">
        <AlertCircle className="w-3 h-3 mr-1" />
        Sin email
      </span>
    );
  }

  if (factura.emailEnviado) {
    return (
      <div className="flex items-center gap-1">
        <span className="inline-flex items-center px-2 py-1 rounded text-xs bg-green-100 text-green-800">
          <CheckCircle className="w-3 h-3 mr-1" />
          Enviado
        </span>
        {showDetails && factura.emailFecha && (
          <span className="text-xs text-gray-500">
            {formatInvoiceDate(factura.emailFecha, true)}
          </span>
        )}
      </div>
    );
  }

  return (
    <span className="inline-flex items-center px-2 py-1 rounded text-xs bg-orange-100 text-orange-800">
      <Mail className="w-3 h-3 mr-1" />
      Pendiente
    </span>
  );
}
