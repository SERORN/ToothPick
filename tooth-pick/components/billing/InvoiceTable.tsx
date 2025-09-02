// 📋 FASE 28.1: Componente de Tabla de Facturas
// ✅ InvoiceTable - Tabla reutilizable y responsive

'use client';

import { useState } from 'react';
import { 
  Download, 
  Eye, 
  Mail, 
  X, 
  ExternalLink, 
  FileText, 
  AlertCircle,
  CheckCircle,
  Clock,
  Ban
} from 'lucide-react';
import { InvoiceItem } from '@/lib/hooks/useInvoices';
import { useInvoiceActions } from '@/lib/hooks/useInvoices';
import {
  formatCurrency,
  formatCurrencyWithExchange,
  formatInvoiceDate,
  getStatusConfig,
  getTypeConfig,
  getAvailableActions,
  getTimeAgo
} from '@/lib/utils/invoiceUtils';
import Link from 'next/link';

interface InvoiceTableProps {
  facturas: InvoiceItem[];
  loading?: boolean;
  userRole?: string;
  showPaciente?: boolean;
  showUsuario?: boolean;
  onRefresh?: () => void;
}

export default function InvoiceTable({
  facturas,
  loading = false,
  userRole = 'paciente',
  showPaciente = false,
  showUsuario = false,
  onRefresh
}: InvoiceTableProps) {
  const { downloadInvoice, resendInvoice, loading: actionLoading } = useInvoiceActions();
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  // 📥 Manejar descarga
  const handleDownload = async (invoiceId: string, tipo: 'pdf' | 'xml' | 'zip' = 'pdf') => {
    const success = await downloadInvoice(invoiceId, tipo);
    if (success && onRefresh) {
      onRefresh();
    }
  };

  // 📧 Manejar reenvío
  const handleResend = async (invoiceId: string) => {
    const success = await resendInvoice(invoiceId);
    if (success && onRefresh) {
      onRefresh();
    }
  };

  // 🔄 Toggle expansión de fila
  const toggleExpanded = (invoiceId: string) => {
    setExpandedRow(expandedRow === invoiceId ? null : invoiceId);
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
        <div className="p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-gray-500 mt-4">Cargando facturas...</p>
        </div>
      </div>
    );
  }

  if (facturas.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
        <div className="p-8 text-center">
          <FileText className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-4 text-lg font-medium text-gray-900">No hay facturas</h3>
          <p className="text-gray-500">No se encontraron facturas con los filtros aplicados.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
      {/* Tabla desktop */}
      <div className="hidden lg:block overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Factura
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Receptor
              </th>
              {showPaciente && (
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Paciente
                </th>
              )}
              {showUsuario && (
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Usuario
                </th>
              )}
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Total
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Estado
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Fecha
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {facturas.map((factura) => (
              <TableRow
                key={factura.id}
                factura={factura}
                userRole={userRole}
                showPaciente={showPaciente}
                showUsuario={showUsuario}
                onDownload={handleDownload}
                onResend={handleResend}
                actionLoading={actionLoading}
              />
            ))}
          </tbody>
        </table>
      </div>

      {/* Cards móviles */}
      <div className="lg:hidden divide-y divide-gray-200">
        {facturas.map((factura) => (
          <MobileCard
            key={factura.id}
            factura={factura}
            userRole={userRole}
            showPaciente={showPaciente}
            showUsuario={showUsuario}
            onDownload={handleDownload}
            onResend={handleResend}
            actionLoading={actionLoading}
            expanded={expandedRow === factura.id}
            onToggleExpanded={() => toggleExpanded(factura.id)}
          />
        ))}
      </div>
    </div>
  );
}

// 📱 Fila de tabla desktop
function TableRow({
  factura,
  userRole,
  showPaciente,
  showUsuario,
  onDownload,
  onResend,
  actionLoading
}: {
  factura: InvoiceItem;
  userRole: string;
  showPaciente: boolean;
  showUsuario: boolean;
  onDownload: (id: string, tipo: 'pdf' | 'xml' | 'zip') => void;
  onResend: (id: string) => void;
  actionLoading: boolean;
}) {
  const statusConfig = getStatusConfig(factura.status);
  const typeConfig = getTypeConfig(factura.tipo);
  const actions = getAvailableActions(factura, userRole);

  return (
    <tr className="hover:bg-gray-50">
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-900">
              {factura.folioCompleto}
            </span>
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${typeConfig.color}`}>
              {typeConfig.flag} {typeConfig.label}
            </span>
          </div>
          {factura.uuid && (
            <span className="text-xs text-gray-500 font-mono">
              {factura.uuid.slice(0, 8)}...
            </span>
          )}
        </div>
      </td>

      <td className="px-6 py-4 whitespace-nowrap">
        <div className="flex flex-col">
          <div className="text-sm font-medium text-gray-900">
            {factura.receptor.nombre}
          </div>
          <div className="text-sm text-gray-500">
            {factura.receptor.rfc}
          </div>
        </div>
      </td>

      {showPaciente && (
        <td className="px-6 py-4 whitespace-nowrap">
          {factura.paciente ? (
            <div className="flex flex-col">
              <div className="text-sm text-gray-900">{factura.paciente.nombre}</div>
              <div className="text-sm text-gray-500">{factura.paciente.email}</div>
            </div>
          ) : (
            <span className="text-sm text-gray-400">—</span>
          )}
        </td>
      )}

      {showUsuario && (
        <td className="px-6 py-4 whitespace-nowrap">
          {factura.usuario ? (
            <div className="flex flex-col">
              <div className="text-sm text-gray-900">{factura.usuario.nombre}</div>
              <div className="text-sm text-gray-500">{factura.usuario.email}</div>
            </div>
          ) : (
            <span className="text-sm text-gray-400">—</span>
          )}
        </td>
      )}

      <td className="px-6 py-4 whitespace-nowrap">
        <div className="flex flex-col">
          <span className="text-sm font-medium text-gray-900">
            {formatCurrency(factura.total, factura.moneda)}
          </span>
          {factura.tipoCambio && factura.moneda !== 'MXN' && (
            <span className="text-xs text-gray-500">
              {formatCurrency(factura.total * factura.tipoCambio, 'MXN', true, false)}
            </span>
          )}
        </div>
      </td>

      <td className="px-6 py-4 whitespace-nowrap">
        <div className="flex flex-col gap-1">
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusConfig.color}`}>
            {statusConfig.icon} {statusConfig.label}
          </span>
          {factura.esAutomatica && (
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-purple-100 text-purple-800">
              🤖 Auto
            </span>
          )}
          {factura.emailEnviado && (
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-green-100 text-green-800">
              ✉️ Enviada
            </span>
          )}
        </div>
      </td>

      <td className="px-6 py-4 whitespace-nowrap">
        <div className="flex flex-col">
          <span className="text-sm text-gray-900">
            {formatInvoiceDate(factura.fechaEmision)}
          </span>
          <span className="text-xs text-gray-500">
            {getTimeAgo(factura.fechaEmision)}
          </span>
        </div>
      </td>

      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
        <div className="flex items-center justify-end gap-1">
          {/* Ver detalles */}
          {actions.canView && (
            <Link href={`/invoice/${factura.id}`}>
              <button className="p-1 text-gray-400 hover:text-blue-600">
                <Eye className="w-4 h-4" />
              </button>
            </Link>
          )}

          {/* Descargar */}
          {actions.canDownload && (
            <div className="relative group">
              <button 
                onClick={() => onDownload(factura.id, 'pdf')}
                disabled={actionLoading}
                className="p-1 text-gray-400 hover:text-green-600 disabled:opacity-50"
              >
                <Download className="w-4 h-4" />
              </button>
              <div className="absolute right-0 top-8 bg-black text-white text-xs rounded px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                Descargar PDF
              </div>
            </div>
          )}

          {/* Reenviar email */}
          {actions.canResend && (
            <button 
              onClick={() => onResend(factura.id)}
              disabled={actionLoading}
              className="p-1 text-gray-400 hover:text-blue-600 disabled:opacity-50"
            >
              <Mail className="w-4 h-4" />
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}

// 📱 Card móvil
function MobileCard({
  factura,
  userRole,
  showPaciente,
  showUsuario,
  onDownload,
  onResend,
  actionLoading,
  expanded,
  onToggleExpanded
}: {
  factura: InvoiceItem;
  userRole: string;
  showPaciente: boolean;
  showUsuario: boolean;
  onDownload: (id: string, tipo: 'pdf' | 'xml' | 'zip') => void;
  onResend: (id: string) => void;
  actionLoading: boolean;
  expanded: boolean;
  onToggleExpanded: () => void;
}) {
  const statusConfig = getStatusConfig(factura.status);
  const typeConfig = getTypeConfig(factura.tipo);
  const actions = getAvailableActions(factura, userRole);

  return (
    <div className="p-4">
      {/* Header del card */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-medium text-gray-900">
              {factura.folioCompleto}
            </span>
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${typeConfig.color}`}>
              {typeConfig.flag}
            </span>
          </div>
          <div className="text-sm text-gray-600">
            {factura.receptor.nombre}
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusConfig.color}`}>
            {statusConfig.icon}
          </span>
          <button
            onClick={onToggleExpanded}
            className="p-1 text-gray-400 hover:text-gray-600"
          >
            {expanded ? <X className="w-4 h-4" /> : <ExternalLink className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Total y fecha */}
      <div className="flex items-center justify-between mb-3">
        <div className="text-lg font-semibold text-gray-900">
          {formatCurrency(factura.total, factura.moneda)}
        </div>
        <div className="text-sm text-gray-500">
          {formatInvoiceDate(factura.fechaEmision)}
        </div>
      </div>

      {/* Detalles expandidos */}
      {expanded && (
        <div className="mt-4 pt-4 border-t border-gray-200 space-y-3">
          {factura.uuid && (
            <div>
              <span className="text-xs font-medium text-gray-500">UUID:</span>
              <div className="text-sm font-mono text-gray-900 break-all">
                {factura.uuid}
              </div>
            </div>
          )}

          {showPaciente && factura.paciente && (
            <div>
              <span className="text-xs font-medium text-gray-500">Paciente:</span>
              <div className="text-sm text-gray-900">
                {factura.paciente.nombre} • {factura.paciente.email}
              </div>
            </div>
          )}

          {showUsuario && factura.usuario && (
            <div>
              <span className="text-xs font-medium text-gray-500">Usuario:</span>
              <div className="text-sm text-gray-900">
                {factura.usuario.nombre} • {factura.usuario.email}
              </div>
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            {factura.esAutomatica && (
              <span className="inline-flex items-center px-2 py-1 rounded text-xs bg-purple-100 text-purple-800">
                🤖 Automática
              </span>
            )}
            {factura.emailEnviado && (
              <span className="inline-flex items-center px-2 py-1 rounded text-xs bg-green-100 text-green-800">
                ✉️ Email enviado
              </span>
            )}
          </div>
        </div>
      )}

      {/* Acciones */}
      <div className="flex items-center justify-end gap-3 mt-4 pt-4 border-t border-gray-200">
        {actions.canView && (
          <Link href={`/invoice/${factura.id}`}>
            <button className="flex items-center gap-1 px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50 rounded">
              <Eye className="w-4 h-4" />
              Ver
            </button>
          </Link>
        )}

        {actions.canDownload && (
          <button 
            onClick={() => onDownload(factura.id, 'pdf')}
            disabled={actionLoading}
            className="flex items-center gap-1 px-3 py-1.5 text-sm text-green-600 hover:bg-green-50 rounded disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            Descargar
          </button>
        )}

        {actions.canResend && (
          <button 
            onClick={() => onResend(factura.id)}
            disabled={actionLoading}
            className="flex items-center gap-1 px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50 rounded disabled:opacity-50"
          >
            <Mail className="w-4 h-4" />
            Reenviar
          </button>
        )}
      </div>
    </div>
  );
}
