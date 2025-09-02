// 📄 FASE 28.1: Página de Detalle de Factura Individual
// ✅ /invoice/[id] - Vista completa de factura

'use client';

import { useParams, useRouter } from 'next/navigation';
import { useState } from 'react';
import { 
  ArrowLeft, 
  Download, 
  Mail, 
  X, 
  FileText, 
  Calendar,
  DollarSign,
  User,
  Building,
  MapPin,
  Phone,
  Eye,
  AlertCircle,
  CheckCircle,
  Clock,
  Copy,
  ExternalLink
} from 'lucide-react';
import { useInvoice } from '@/lib/hooks/useInvoices';
import { 
  formatCurrency, 
  formatCurrencyWithExchange, 
  formatInvoiceDate, 
  getStatusConfig, 
  getTypeConfig,
  getTimeAgo 
} from '@/lib/utils/invoiceUtils';
import DownloadInvoiceButton from '@/components/billing/DownloadInvoiceButton';
import ResendInvoiceButton, { EmailStatus } from '@/components/billing/ResendInvoiceButton';
import CancelInvoiceModal from '@/components/billing/CancelInvoiceModal';
import Link from 'next/link';
import toast from 'react-hot-toast';

export default function InvoiceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const invoiceId = params.id as string;
  
  const { 
    factura, 
    logs, 
    stats, 
    permissions, 
    loading, 
    error, 
    refreshInvoice,
    hasFactura 
  } = useInvoice(invoiceId);

  const [showCancelModal, setShowCancelModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'detalles' | 'conceptos' | 'logs'>('detalles');

  // 📋 Copiar al portapapeles
  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copiado al portapapeles`);
  };

  // 🔄 Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
            <div className="animate-pulse">
              <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2 mb-8"></div>
              <div className="space-y-4">
                <div className="h-4 bg-gray-200 rounded"></div>
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ❌ Error state
  if (error || !hasFactura) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
            <AlertCircle className="mx-auto h-12 w-12 text-red-500 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {error || 'Factura no encontrada'}
            </h3>
            <p className="text-gray-500 mb-6">
              No se pudo cargar la información de la factura.
            </p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => router.back()}
                className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                <ArrowLeft className="w-4 h-4" />
                Volver
              </button>
              <button
                onClick={refreshInvoice}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Intentar nuevamente
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const statusConfig = getStatusConfig(factura.status);
  const typeConfig = getTypeConfig(factura.tipo);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.back()}
                className="p-2 text-gray-400 hover:text-gray-600"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-xl font-bold text-gray-900">
                  Factura {factura.folioCompleto}
                </h1>
                <p className="text-sm text-gray-500">
                  {formatInvoiceDate(factura.fechaEmision)} • {formatCurrency(factura.total, factura.moneda)}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Estado */}
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${statusConfig.color}`}>
                {statusConfig.icon} {statusConfig.label}
              </span>

              {/* Acciones principales */}
              {permissions.canDownload && (
                <DownloadInvoiceButton
                  invoiceId={factura.id}
                  hasXML={!!factura.xmlPath}
                  hasPDF={!!factura.pdfPath}
                  variant="dropdown"
                  onDownloadComplete={refreshInvoice}
                />
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Status banner */}
        <div className="mb-6">
          {factura.status === 'cancelada' && factura.cancelacion && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <X className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-sm font-medium text-red-800">Factura cancelada</h3>
                  <p className="text-sm text-red-700 mt-1">
                    Motivo: {factura.cancelacion.motivo} • {formatInvoiceDate(factura.cancelacion.fecha)}
                  </p>
                </div>
              </div>
            </div>
          )}

          {factura.status === 'error' && (
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-orange-500 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-sm font-medium text-orange-800">Error en la factura</h3>
                  <p className="text-sm text-orange-700 mt-1">
                    Hay problemas con esta factura. Contacte al soporte.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('detalles')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'detalles'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Detalles
              </button>
              <button
                onClick={() => setActiveTab('conceptos')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'conceptos'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Conceptos ({factura.conceptos?.length || 0})
              </button>
              {permissions.canViewLogs && logs.length > 0 && (
                <button
                  onClick={() => setActiveTab('logs')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'logs'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Historial ({logs.length})
                </button>
              )}
            </nav>
          </div>
        </div>

        {/* Contenido de tabs */}
        {activeTab === 'detalles' && (
          <div className="space-y-6">
            {/* Información principal */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* Información de la factura */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">
                    Información de la Factura
                  </h3>
                  <dl className="space-y-3">
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Folio</dt>
                      <dd className="text-sm text-gray-900 flex items-center gap-2">
                        {factura.folioCompleto}
                        <button
                          onClick={() => copyToClipboard(factura.folioCompleto, 'Folio')}
                          className="text-gray-400 hover:text-gray-600"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                      </dd>
                    </div>

                    <div>
                      <dt className="text-sm font-medium text-gray-500">Tipo</dt>
                      <dd className="text-sm text-gray-900">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${typeConfig.color}`}>
                          {typeConfig.flag} {typeConfig.label}
                        </span>
                      </dd>
                    </div>

                    {factura.uuid && (
                      <div>
                        <dt className="text-sm font-medium text-gray-500">UUID</dt>
                        <dd className="text-sm text-gray-900 font-mono flex items-center gap-2">
                          <span className="break-all">{factura.uuid}</span>
                          <button
                            onClick={() => copyToClipboard(factura.uuid!, 'UUID')}
                            className="text-gray-400 hover:text-gray-600 flex-shrink-0"
                          >
                            <Copy className="w-4 h-4" />
                          </button>
                        </dd>
                      </div>
                    )}

                    <div>
                      <dt className="text-sm font-medium text-gray-500">Fecha de emisión</dt>
                      <dd className="text-sm text-gray-900">
                        {formatInvoiceDate(factura.fechaEmision, true)}
                      </dd>
                    </div>

                    {factura.fechaTimbrado && (
                      <div>
                        <dt className="text-sm font-medium text-gray-500">Fecha de timbrado</dt>
                        <dd className="text-sm text-gray-900">
                          {formatInvoiceDate(factura.fechaTimbrado, true)}
                        </dd>
                      </div>
                    )}

                    <div>
                      <dt className="text-sm font-medium text-gray-500">Estado del email</dt>
                      <dd className="text-sm text-gray-900">
                        <EmailStatus factura={factura} showDetails={true} />
                      </dd>
                    </div>
                  </dl>
                </div>

                {/* Importes */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">
                    Importes
                  </h3>
                  <dl className="space-y-3">
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Subtotal</dt>
                      <dd className="text-sm text-gray-900">
                        {formatCurrency(factura.subtotal, factura.moneda)}
                      </dd>
                    </div>

                    {factura.descuento > 0 && (
                      <div>
                        <dt className="text-sm font-medium text-gray-500">Descuento</dt>
                        <dd className="text-sm text-red-600">
                          -{formatCurrency(factura.descuento, factura.moneda)}
                        </dd>
                      </div>
                    )}

                    <div>
                      <dt className="text-sm font-medium text-gray-500">Impuestos</dt>
                      <dd className="text-sm text-gray-900">
                        {formatCurrency(factura.impuestos, factura.moneda)}
                      </dd>
                    </div>

                    <div className="pt-3 border-t border-gray-200">
                      <dt className="text-base font-medium text-gray-900">Total</dt>
                      <dd className="text-lg font-bold text-gray-900">
                        {formatCurrencyWithExchange(
                          factura.total, 
                          factura.moneda, 
                          factura.tipoCambio
                        )}
                      </dd>
                    </div>

                    {factura.tipoCambio && factura.moneda !== 'MXN' && (
                      <div>
                        <dt className="text-sm font-medium text-gray-500">Tipo de cambio</dt>
                        <dd className="text-sm text-gray-900">
                          1 {factura.moneda} = {factura.tipoCambio.toFixed(4)} MXN
                        </dd>
                      </div>
                    )}
                  </dl>
                </div>
              </div>
            </div>

            {/* Emisor y Receptor */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* Emisor */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
                  <Building className="w-5 h-5" />
                  Emisor
                </h3>
                <dl className="space-y-3">
                  <div>
                    <dt className="text-sm font-medium text-gray-500">RFC</dt>
                    <dd className="text-sm text-gray-900 font-mono">
                      {factura.emisor.rfc}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Razón Social</dt>
                    <dd className="text-sm text-gray-900">
                      {factura.emisor.nombre}
                    </dd>
                  </div>
                  {factura.emisor.regimenFiscal && (
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Régimen Fiscal</dt>
                      <dd className="text-sm text-gray-900">
                        {factura.emisor.regimenFiscal}
                      </dd>
                    </div>
                  )}
                </dl>
              </div>

              {/* Receptor */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
                  <User className="w-5 h-5" />
                  Receptor
                </h3>
                <dl className="space-y-3">
                  <div>
                    <dt className="text-sm font-medium text-gray-500">RFC</dt>
                    <dd className="text-sm text-gray-900 font-mono">
                      {factura.receptor.rfc}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Nombre</dt>
                    <dd className="text-sm text-gray-900">
                      {factura.receptor.nombre}
                    </dd>
                  </div>
                  {factura.receptor.email && (
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Email</dt>
                      <dd className="text-sm text-gray-900">
                        {factura.receptor.email}
                      </dd>
                    </div>
                  )}
                  {factura.receptor.usoCFDI && (
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Uso CFDI</dt>
                      <dd className="text-sm text-gray-900">
                        {factura.receptor.usoCFDI}
                      </dd>
                    </div>
                  )}
                </dl>
              </div>
            </div>

            {/* Acciones */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Acciones</h3>
              <div className="flex flex-wrap gap-3">
                
                {/* Descargar */}
                {permissions.canDownload && (
                  <DownloadInvoiceButton
                    invoiceId={factura.id}
                    hasXML={!!factura.xmlPath}
                    hasPDF={!!factura.pdfPath}
                    variant="menu"
                  />
                )}

                {/* Reenviar */}
                {permissions.canResend && (
                  <ResendInvoiceButton
                    factura={factura}
                    variant="button"
                    onResendComplete={refreshInvoice}
                  />
                )}

                {/* Cancelar */}
                {permissions.canCancel && (
                  <button
                    onClick={() => setShowCancelModal(true)}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                  >
                    <X className="w-4 h-4" />
                    Cancelar
                  </button>
                )}

                {/* Ver orden relacionada */}
                {factura.orden && (
                  <Link
                    href={`/orders/${factura.orden.numero}`}
                    className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Ver orden #{factura.orden.numero}
                  </Link>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Tab de conceptos */}
        {activeTab === 'conceptos' && factura.conceptos && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">
                Conceptos ({factura.conceptos.length})
              </h3>
            </div>
            
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Descripción
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Cantidad
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Precio Unitario
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Importe
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {factura.conceptos.map((concepto: any, index: number) => (
                    <tr key={index}>
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900">
                          {concepto.descripcion}
                        </div>
                        {concepto.noIdentificacion && (
                          <div className="text-sm text-gray-500">
                            ID: {concepto.noIdentificacion}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {concepto.cantidad} {concepto.unidad}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatCurrency(concepto.valorUnitario, factura.moneda)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {formatCurrency(concepto.importe, factura.moneda)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab de logs */}
        {activeTab === 'logs' && permissions.canViewLogs && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">
                Historial de eventos ({logs.length})
              </h3>
            </div>
            
            <div className="divide-y divide-gray-200">
              {logs.map((log: any) => (
                <div key={log.id} className="px-6 py-4">
                  <div className="flex items-start gap-3">
                    <div className={`p-1 rounded-full ${
                      log.severidad === 'error' ? 'bg-red-100' :
                      log.severidad === 'warning' ? 'bg-orange-100' :
                      'bg-blue-100'
                    }`}>
                      {log.severidad === 'error' ? (
                        <AlertCircle className="w-4 h-4 text-red-600" />
                      ) : log.severidad === 'warning' ? (
                        <AlertCircle className="w-4 h-4 text-orange-600" />
                      ) : (
                        <CheckCircle className="w-4 h-4 text-blue-600" />
                      )}
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-medium text-gray-900">
                          {log.evento.replace(/_/g, ' ')}
                        </h4>
                        <span className="text-xs text-gray-500">
                          {getTimeAgo(log.timestamp)}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">
                        {log.descripcion}
                      </p>
                      {log.usuario && (
                        <p className="text-xs text-gray-500 mt-1">
                          Por: {log.usuario.nombre} ({log.usuario.email})
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Modal de cancelación */}
      <CancelInvoiceModal
        isOpen={showCancelModal}
        onClose={() => setShowCancelModal(false)}
        factura={factura}
        onCancelComplete={() => {
          setShowCancelModal(false);
          refreshInvoice();
        }}
      />
    </div>
  );
}
