// 📥 FASE 28.1: Componente de Descarga de Facturas
// ✅ DownloadInvoiceButton - Botón con opciones múltiples

'use client';

import { useState } from 'react';
import { Download, FileText, File, Archive, Eye, Loader2 } from 'lucide-react';
import { useInvoiceActions } from '@/lib/hooks/useInvoices';

interface DownloadInvoiceButtonProps {
  invoiceId: string;
  hasXML?: boolean;
  hasPDF?: boolean;
  variant?: 'button' | 'dropdown' | 'menu';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  onDownloadComplete?: () => void;
}

export default function DownloadInvoiceButton({
  invoiceId,
  hasXML = true,
  hasPDF = true,
  variant = 'dropdown',
  size = 'md',
  className = '',
  onDownloadComplete
}: DownloadInvoiceButtonProps) {
  const { downloadInvoice, loading } = useInvoiceActions();
  const [showDropdown, setShowDropdown] = useState(false);

  // 📥 Manejar descarga
  const handleDownload = async (tipo: 'pdf' | 'xml' | 'zip', inline: boolean = false) => {
    const success = await downloadInvoice(invoiceId, tipo, inline);
    if (success && onDownloadComplete) {
      onDownloadComplete();
    }
    setShowDropdown(false);
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

  // 🔘 Botón simple (solo PDF)
  if (variant === 'button') {
    return (
      <button
        onClick={() => handleDownload('pdf')}
        disabled={loading}
        className={`inline-flex items-center gap-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${sizeClasses[size]} ${className}`}
      >
        {loading ? (
          <Loader2 className={`${iconSizes[size]} animate-spin`} />
        ) : (
          <Download className={iconSizes[size]} />
        )}
        Descargar
      </button>
    );
  }

  // 📋 Menú de opciones
  if (variant === 'menu') {
    return (
      <div className="space-y-1">
        {/* PDF */}
        {hasPDF && (
          <>
            <button
              onClick={() => handleDownload('pdf')}
              disabled={loading}
              className="flex items-center gap-3 w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 disabled:opacity-50"
            >
              <FileText className="w-4 h-4 text-red-500" />
              <div>
                <div className="font-medium">Descargar PDF</div>
                <div className="text-xs text-gray-500">Factura en formato PDF</div>
              </div>
            </button>

            <button
              onClick={() => handleDownload('pdf', true)}
              disabled={loading}
              className="flex items-center gap-3 w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 disabled:opacity-50"
            >
              <Eye className="w-4 h-4 text-blue-500" />
              <div>
                <div className="font-medium">Ver PDF</div>
                <div className="text-xs text-gray-500">Abrir en nueva ventana</div>
              </div>
            </button>
          </>
        )}

        {/* XML */}
        {hasXML && (
          <button
            onClick={() => handleDownload('xml')}
            disabled={loading}
            className="flex items-center gap-3 w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 disabled:opacity-50"
          >
            <File className="w-4 h-4 text-green-500" />
            <div>
              <div className="font-medium">Descargar XML</div>
              <div className="text-xs text-gray-500">Archivo XML del CFDI</div>
            </div>
          </button>
        )}

        {/* ZIP */}
        {(hasPDF || hasXML) && (
          <button
            onClick={() => handleDownload('zip')}
            disabled={loading}
            className="flex items-center gap-3 w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 disabled:opacity-50"
          >
            <Archive className="w-4 h-4 text-purple-500" />
            <div>
              <div className="font-medium">Descargar ZIP</div>
              <div className="text-xs text-gray-500">PDF + XML en un archivo</div>
            </div>
          </button>
        )}

        {loading && (
          <div className="flex items-center justify-center py-2">
            <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
            <span className="text-xs text-gray-500 ml-2">Descargando...</span>
          </div>
        )}
      </div>
    );
  }

  // 📤 Dropdown (por defecto)
  return (
    <div className="relative">
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        disabled={loading}
        className={`inline-flex items-center gap-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${sizeClasses[size]} ${className}`}
      >
        {loading ? (
          <Loader2 className={`${iconSizes[size]} animate-spin`} />
        ) : (
          <Download className={iconSizes[size]} />
        )}
        Descargar
        <svg className="w-3 h-3 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown menu */}
      {showDropdown && (
        <>
          {/* Overlay para cerrar */}
          <div 
            className="fixed inset-0 z-10"
            onClick={() => setShowDropdown(false)}
          />
          
          {/* Menú */}
          <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 z-20">
            <div className="py-2">
              {/* Header */}
              <div className="px-4 py-2 border-b border-gray-200">
                <h3 className="text-sm font-medium text-gray-900">Opciones de descarga</h3>
              </div>

              {/* PDF Options */}
              {hasPDF && (
                <div className="px-2 py-1">
                  <div className="text-xs font-medium text-gray-500 px-2 py-1 uppercase tracking-wider">
                    PDF
                  </div>
                  
                  <button
                    onClick={() => handleDownload('pdf')}
                    disabled={loading}
                    className="flex items-center gap-3 w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 rounded disabled:opacity-50"
                  >
                    <FileText className="w-4 h-4 text-red-500" />
                    <div className="flex-1">
                      <div className="font-medium">Descargar PDF</div>
                      <div className="text-xs text-gray-500">Factura en formato PDF</div>
                    </div>
                  </button>

                  <button
                    onClick={() => handleDownload('pdf', true)}
                    disabled={loading}
                    className="flex items-center gap-3 w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 rounded disabled:opacity-50"
                  >
                    <Eye className="w-4 h-4 text-blue-500" />
                    <div className="flex-1">
                      <div className="font-medium">Ver en navegador</div>
                      <div className="text-xs text-gray-500">Abrir PDF en nueva ventana</div>
                    </div>
                  </button>
                </div>
              )}

              {/* XML Options */}
              {hasXML && (
                <div className="px-2 py-1">
                  <div className="text-xs font-medium text-gray-500 px-2 py-1 uppercase tracking-wider">
                    CFDI
                  </div>
                  
                  <button
                    onClick={() => handleDownload('xml')}
                    disabled={loading}
                    className="flex items-center gap-3 w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 rounded disabled:opacity-50"
                  >
                    <File className="w-4 h-4 text-green-500" />
                    <div className="flex-1">
                      <div className="font-medium">Descargar XML</div>
                      <div className="text-xs text-gray-500">Archivo XML del CFDI</div>
                    </div>
                  </button>
                </div>
              )}

              {/* ZIP Option */}
              {(hasPDF || hasXML) && (
                <div className="px-2 py-1 border-t border-gray-100 mt-1">
                  <button
                    onClick={() => handleDownload('zip')}
                    disabled={loading}
                    className="flex items-center gap-3 w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 rounded disabled:opacity-50"
                  >
                    <Archive className="w-4 h-4 text-purple-500" />
                    <div className="flex-1">
                      <div className="font-medium">Descargar todo (ZIP)</div>
                      <div className="text-xs text-gray-500">
                        PDF{hasXML ? ' + XML' : ''} en un archivo comprimido
                      </div>
                    </div>
                  </button>
                </div>
              )}

              {/* Loading indicator */}
              {loading && (
                <div className="px-4 py-3 border-t border-gray-100">
                  <div className="flex items-center justify-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
                    <span className="text-sm text-gray-600">Procesando descarga...</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// 🎯 Botón simple para solo PDF
export function DownloadPDFButton({
  invoiceId,
  size = 'md',
  className = '',
  children,
  onDownloadComplete
}: {
  invoiceId: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  children?: React.ReactNode;
  onDownloadComplete?: () => void;
}) {
  const { downloadInvoice, loading } = useInvoiceActions();

  const handleClick = async () => {
    const success = await downloadInvoice(invoiceId, 'pdf');
    if (success && onDownloadComplete) {
      onDownloadComplete();
    }
  };

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

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className={`inline-flex items-center gap-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${sizeClasses[size]} ${className}`}
    >
      {loading ? (
        <Loader2 className={`${iconSizes[size]} animate-spin`} />
      ) : (
        <FileText className={iconSizes[size]} />
      )}
      {children || 'PDF'}
    </button>
  );
}

// 📁 Botón simple para solo XML
export function DownloadXMLButton({
  invoiceId,
  size = 'md',
  className = '',
  children,
  onDownloadComplete
}: {
  invoiceId: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  children?: React.ReactNode;
  onDownloadComplete?: () => void;
}) {
  const { downloadInvoice, loading } = useInvoiceActions();

  const handleClick = async () => {
    const success = await downloadInvoice(invoiceId, 'xml');
    if (success && onDownloadComplete) {
      onDownloadComplete();
    }
  };

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

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className={`inline-flex items-center gap-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${sizeClasses[size]} ${className}`}
    >
      {loading ? (
        <Loader2 className={`${iconSizes[size]} animate-spin`} />
      ) : (
        <File className={iconSizes[size]} />
      )}
      {children || 'XML'}
    </button>
  );
}
