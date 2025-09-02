// 🧾 FASE 28.1: Hook para Gestión de Facturas
// ✅ useInvoices - Hook principal para consultar facturas por rol

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import toast from 'react-hot-toast';

// 📋 Tipos para filtros de facturas
export interface InvoiceFilters {
  status?: string | string[];
  tipo?: string | string[];
  moneda?: string;
  fechaDesde?: string;
  fechaHasta?: string;
  pacienteId?: string;
  ordenId?: string;
  folio?: string;
  uuid?: string;
  rfcReceptor?: string;
  esAutomatica?: boolean;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// 📄 Tipo para factura resumida
export interface InvoiceItem {
  id: string;
  folio: string;
  serie: string;
  folioCompleto: string;
  uuid?: string;
  tipo: string;
  status: string;
  moneda: string;
  tipoCambio?: number;
  subtotal: number;
  descuento: number;
  impuestos: number;
  total: number;
  emisor: {
    rfc: string;
    nombre: string;
  };
  receptor: {
    rfc: string;
    nombre: string;
    email?: string;
  };
  usuario?: {
    nombre: string;
    email: string;
  };
  paciente?: {
    nombre: string;
    email: string;
  };
  orden?: {
    numero: string;
    total: number;
    status: string;
  };
  xmlPath?: string;
  pdfPath?: string;
  pais: string;
  notas?: string;
  esAutomatica: boolean;
  emailEnviado: boolean;
  emailFecha?: string;
  cancelacion?: {
    motivo: string;
    fecha: string;
    usuario: string;
  };
  fechaEmision: string;
  fechaTimbrado?: string;
  createdAt: string;
  updatedAt: string;
}

// 📊 Tipo para paginación
export interface Pagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

// 📈 Tipo para estadísticas
export interface InvoiceStats {
  total: number;
  totalImporte: number;
  statusCounts: Record<string, number>;
  monedas: string[];
}

// 🎯 Respuesta de la API
export interface InvoicesResponse {
  success: boolean;
  data: {
    facturas: InvoiceItem[];
    pagination: Pagination;
    stats: InvoiceStats;
    filters: InvoiceFilters;
  };
  error?: string;
}

// 🔧 Hook principal
export function useInvoices(initialFilters: InvoiceFilters = {}) {
  const { data: session } = useSession();
  const [facturas, setFacturas] = useState<InvoiceItem[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 20,
    total: 0,
    pages: 0,
    hasNext: false,
    hasPrev: false
  });
  const [stats, setStats] = useState<InvoiceStats>({
    total: 0,
    totalImporte: 0,
    statusCounts: {},
    monedas: []
  });
  const [filters, setFilters] = useState<InvoiceFilters>(initialFilters);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 🔍 Función para cargar facturas
  const loadInvoices = useCallback(async (newFilters?: InvoiceFilters) => {
    if (!session?.user) return;

    setLoading(true);
    setError(null);

    try {
      const activeFilters = { ...filters, ...newFilters };
      const searchParams = new URLSearchParams();

      // Agregar filtros a la URL
      Object.entries(activeFilters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          if (Array.isArray(value)) {
            searchParams.append(key, value.join(','));
          } else {
            searchParams.append(key, value.toString());
          }
        }
      });

      const response = await fetch(`/api/invoices?${searchParams.toString()}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }

      const data: InvoicesResponse = await response.json();

      if (data.success) {
        setFacturas(data.data.facturas);
        setPagination(data.data.pagination);
        setStats(data.data.stats);
        setFilters(activeFilters);
      } else {
        throw new Error(data.error || 'Error al cargar facturas');
      }

    } catch (err: any) {
      console.error('Error cargando facturas:', err);
      setError(err.message);
      toast.error('Error al cargar facturas');
    } finally {
      setLoading(false);
    }
  }, [session, filters]);

  // 🔄 Refrescar facturas
  const refreshInvoices = useCallback(() => {
    loadInvoices();
  }, [loadInvoices]);

  // 📄 Ir a página específica
  const goToPage = useCallback((page: number) => {
    loadInvoices({ page });
  }, [loadInvoices]);

  // 🔍 Aplicar filtros
  const applyFilters = useCallback((newFilters: InvoiceFilters) => {
    loadInvoices({ ...newFilters, page: 1 }); // Reset a página 1
  }, [loadInvoices]);

  // 🧹 Limpiar filtros
  const clearFilters = useCallback(() => {
    const defaultFilters: InvoiceFilters = {
      page: 1,
      limit: 20,
      sortBy: 'fechaEmision',
      sortOrder: 'desc'
    };
    setFilters(defaultFilters);
    loadInvoices(defaultFilters);
  }, [loadInvoices]);

  // 📊 Cambiar límite de resultados
  const changeLimit = useCallback((limit: number) => {
    loadInvoices({ limit, page: 1 });
  }, [loadInvoices]);

  // 🔀 Cambiar ordenamiento
  const changeSorting = useCallback((sortBy: string, sortOrder: 'asc' | 'desc') => {
    loadInvoices({ sortBy, sortOrder });
  }, [loadInvoices]);

  // 🔍 Buscar por texto
  const searchByText = useCallback((searchText: string) => {
    const searchFilters: InvoiceFilters = {
      page: 1
    };

    // Detectar tipo de búsqueda
    if (searchText.includes('-')) {
      // Posible UUID
      searchFilters.uuid = searchText;
    } else if (/^[A-Z]{3,4}[0-9]{6}[A-Z0-9]{3}$/.test(searchText.toUpperCase())) {
      // Posible RFC
      searchFilters.rfcReceptor = searchText;
    } else if (/^\d+$/.test(searchText)) {
      // Posible folio
      searchFilters.folio = searchText;
    } else {
      // Búsqueda general por folio
      searchFilters.folio = searchText;
    }

    loadInvoices(searchFilters);
  }, [loadInvoices]);

  // 🎯 Efectos
  useEffect(() => {
    if (session?.user) {
      loadInvoices();
    }
  }, [session]);

  // 📤 Return del hook
  return {
    // Datos
    facturas,
    pagination,
    stats,
    filters,
    
    // Estados
    loading,
    error,
    
    // Acciones
    loadInvoices,
    refreshInvoices,
    goToPage,
    applyFilters,
    clearFilters,
    changeLimit,
    changeSorting,
    searchByText,
    
    // Utilidades
    hasFacturas: facturas.length > 0,
    isEmpty: !loading && facturas.length === 0,
    userRole: (session?.user as any)?.role,
    canManageInvoices: ['admin', 'dentista'].includes((session?.user as any)?.role || '')
  };
}

// 🔧 Hook para factura individual
export function useInvoice(invoiceId: string) {
  const { data: session } = useSession();
  const [factura, setFactura] = useState<any>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [stats, setStats] = useState<any>({});
  const [permissions, setPermissions] = useState<any>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 📥 Cargar factura
  const loadInvoice = useCallback(async () => {
    if (!session?.user || !invoiceId) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/invoices/${invoiceId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.success) {
        setFactura(data.data.factura);
        setLogs(data.data.logs);
        setStats(data.data.stats);
        setPermissions(data.data.permissions);
      } else {
        throw new Error(data.error || 'Error al cargar factura');
      }

    } catch (err: any) {
      console.error('Error cargando factura:', err);
      setError(err.message);
      toast.error('Error al cargar factura');
    } finally {
      setLoading(false);
    }
  }, [session, invoiceId]);

  // 🔄 Refrescar factura
  const refreshInvoice = useCallback(() => {
    loadInvoice();
  }, [loadInvoice]);

  useEffect(() => {
    if (session?.user && invoiceId) {
      loadInvoice();
    }
  }, [session, invoiceId]);

  return {
    factura,
    logs,
    stats,
    permissions,
    loading,
    error,
    refreshInvoice,
    hasFactura: !!factura
  };
}

// 🛠️ Hook para acciones de factura
export function useInvoiceActions() {
  const [loading, setLoading] = useState(false);

  // 📧 Reenviar factura por email
  const resendInvoice = useCallback(async (invoiceId: string) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/invoices/resend/${invoiceId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Factura reenviada exitosamente');
        return true;
      } else {
        toast.error(data.error || 'Error al reenviar factura');
        return false;
      }
    } catch (error: any) {
      console.error('Error reenviando factura:', error);
      toast.error('Error al reenviar factura');
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  // ❌ Cancelar factura
  const cancelInvoice = useCallback(async (invoiceId: string, cancelData: any) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/invoices/cancel/${invoiceId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(cancelData),
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Factura cancelada exitosamente');
        return true;
      } else {
        toast.error(data.error || 'Error al cancelar factura');
        return false;
      }
    } catch (error: any) {
      console.error('Error cancelando factura:', error);
      toast.error('Error al cancelar factura');
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  // 📥 Descargar factura
  const downloadInvoice = useCallback(async (invoiceId: string, tipo: 'pdf' | 'xml' | 'zip' = 'pdf', inline: boolean = false) => {
    try {
      const params = new URLSearchParams({
        tipo,
        inline: inline.toString()
      });

      const response = await fetch(`/api/invoices/download/${invoiceId}?${params.toString()}`, {
        method: 'GET',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al descargar archivo');
      }

      // Obtener nombre del archivo del header
      const contentDisposition = response.headers.get('Content-Disposition');
      let fileName = `factura.${tipo}`;
      
      if (contentDisposition) {
        const fileNameMatch = contentDisposition.match(/filename="([^"]+)"/);
        if (fileNameMatch) {
          fileName = fileNameMatch[1];
        }
      }

      // Descargar archivo
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      
      if (inline && tipo === 'pdf') {
        // Abrir PDF en nueva ventana
        window.open(url, '_blank');
      } else {
        // Descargar archivo
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }
      
      window.URL.revokeObjectURL(url);
      toast.success(`Archivo ${tipo.toUpperCase()} descargado`);
      return true;

    } catch (error: any) {
      console.error('Error descargando factura:', error);
      toast.error(error.message || 'Error al descargar archivo');
      return false;
    }
  }, []);

  return {
    loading,
    resendInvoice,
    cancelInvoice,
    downloadInvoice
  };
}
