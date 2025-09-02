// 💰 FASE 28.1: Utilidades para Formateo de Facturas
// ✅ Funciones helper para mostrar datos de facturación

import { InvoiceItem } from '@/lib/hooks/useInvoices';

// 🌍 Símbolos de moneda
export const CURRENCY_SYMBOLS: Record<string, string> = {
  MXN: '$',
  USD: '$',
  EUR: '€',
  GBP: '£',
  CAD: 'C$',
  BRL: 'R$',
  PHP: '₱',
};

// 🏳️ Banderas de países por moneda
export const CURRENCY_FLAGS: Record<string, string> = {
  MXN: '🇲🇽',
  USD: '🇺🇸',
  EUR: '🇪🇺',
  GBP: '🇬🇧',
  CAD: '🇨🇦',
  BRL: '🇧🇷',
  PHP: '🇵🇭',
};

// 📊 Estados de factura con colores
export const INVOICE_STATUS_CONFIG = {
  borrador: {
    label: 'Borrador',
    color: 'bg-gray-100 text-gray-800',
    badge: 'gray',
    icon: '📝'
  },
  emitida: {
    label: 'Emitida',
    color: 'bg-green-100 text-green-800',
    badge: 'green',
    icon: '✅'
  },
  enviada: {
    label: 'Enviada',
    color: 'bg-blue-100 text-blue-800',
    badge: 'blue',
    icon: '📧'
  },
  cancelada: {
    label: 'Cancelada',
    color: 'bg-red-100 text-red-800',
    badge: 'red',
    icon: '❌'
  },
  error: {
    label: 'Error',
    color: 'bg-orange-100 text-orange-800',
    badge: 'orange',
    icon: '⚠️'
  }
};

// 📄 Tipos de factura con descripciones
export const INVOICE_TYPE_CONFIG = {
  CFDI_INGRESO: {
    label: 'CFDI Ingreso',
    description: 'Comprobante Fiscal Digital por Internet',
    flag: '🇲🇽',
    color: 'bg-emerald-100 text-emerald-800'
  },
  CFDI_EGRESO: {
    label: 'CFDI Egreso',
    description: 'Nota de crédito CFDI',
    flag: '🇲🇽',
    color: 'bg-red-100 text-red-800'
  },
  CFDI_TRASLADO: {
    label: 'CFDI Traslado',
    description: 'Comprobante de traslado',
    flag: '🇲🇽',
    color: 'bg-blue-100 text-blue-800'
  },
  CFDI_NOMINA: {
    label: 'CFDI Nómina',
    description: 'Recibo de nómina',
    flag: '🇲🇽',
    color: 'bg-purple-100 text-purple-800'
  },
  CFDI_PAGO: {
    label: 'CFDI Pago',
    description: 'Complemento de pago',
    flag: '🇲🇽',
    color: 'bg-yellow-100 text-yellow-800'
  },
  INTERNACIONAL: {
    label: 'Internacional',
    description: 'Factura internacional',
    flag: '🌍',
    color: 'bg-indigo-100 text-indigo-800'
  },
  PROFORMA: {
    label: 'Proforma',
    description: 'Factura proforma',
    flag: '📋',
    color: 'bg-gray-100 text-gray-800'
  },
  EXPORTACION: {
    label: 'Exportación',
    description: 'Factura de exportación',
    flag: '📦',
    color: 'bg-cyan-100 text-cyan-800'
  }
};

// 💰 Formatear moneda
export function formatCurrency(
  amount: number = 0,
  currency: string = 'MXN',
  showSymbol: boolean = true,
  showFlag: boolean = false
): string {
  // Manejar valores inválidos
  if (isNaN(amount) || amount === null || amount === undefined) {
    amount = 0;
  }
  
  const symbol = CURRENCY_SYMBOLS[currency] || currency;
  const flag = CURRENCY_FLAGS[currency] || '';
  
  const isNegative = amount < 0;
  const absoluteAmount = Math.abs(amount);
  
  const formatted = new Intl.NumberFormat('es-MX', {
    style: 'decimal',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(absoluteAmount);

  let result = '';
  
  if (showFlag && flag) {
    result += `${flag} `;
  }
  
  if (isNegative) {
    result += '-';
  }
  
  if (showSymbol) {
    result += `${symbol}${formatted}`;
  } else {
    result += `${formatted}`;
  }
  
  // Agregar código de moneda al final para los tests
  if (!showFlag) {
    result += ` ${currency}`;
  }

  return result;
}

// 💱 Formatear con tipo de cambio
export function formatCurrencyWithExchange(
  amount: number,
  currency: string,
  exchangeRate?: number,
  baseCurrency: string = 'MXN'
): string {
  const originalFormatted = formatCurrency(amount, currency);
  
  if (!exchangeRate || currency === baseCurrency) {
    return originalFormatted;
  }

  const convertedAmount = amount * exchangeRate;
  const convertedFormatted = formatCurrency(convertedAmount, baseCurrency, true, false);
  
  return `${originalFormatted} (${convertedFormatted})`;
}

// 📅 Formatear fecha
export function formatInvoiceDate(dateString: string, includeTime: boolean = false): string {
  const date = new Date(dateString);
  
  const options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    timeZone: 'America/Mexico_City'
  };

  if (includeTime) {
    options.hour = '2-digit';
    options.minute = '2-digit';
  }

  return date.toLocaleDateString('es-MX', options);
}

// 🏷️ Obtener configuración de status
export function getStatusConfig(status: string) {
  return INVOICE_STATUS_CONFIG[status as keyof typeof INVOICE_STATUS_CONFIG] || {
    label: status,
    color: 'bg-gray-100 text-gray-800',
    badge: 'gray',
    icon: '❓'
  };
}

// 📋 Obtener configuración de tipo
export function getTypeConfig(tipo: string) {
  return INVOICE_TYPE_CONFIG[tipo as keyof typeof INVOICE_TYPE_CONFIG] || {
    label: tipo,
    description: 'Tipo de factura',
    flag: '📄',
    color: 'bg-gray-100 text-gray-800'
  };
}

// 🔍 Generar texto de búsqueda para factura
export function getInvoiceSearchText(factura: InvoiceItem): string {
  return [
    factura.folioCompleto,
    factura.uuid,
    factura.receptor.rfc,
    factura.receptor.nombre,
    factura.emisor.rfc,
    factura.emisor.nombre,
    factura.orden?.numero,
    factura.notas
  ].filter(Boolean).join(' ').toLowerCase();
}

// 📊 Calcular resumen de estadísticas
export function calculateInvoiceSummary(facturas: InvoiceItem[]) {
  const summary = {
    total: facturas.length,
    totalImporte: 0,
    porStatus: {} as Record<string, number>,
    porTipo: {} as Record<string, number>,
    porMoneda: {} as Record<string, { count: number; total: number }>,
    automaticas: 0,
    conEmail: 0
  };

  facturas.forEach(factura => {
    // Total importe
    summary.totalImporte += factura.total;

    // Por status
    summary.porStatus[factura.status] = (summary.porStatus[factura.status] || 0) + 1;

    // Por tipo
    summary.porTipo[factura.tipo] = (summary.porTipo[factura.tipo] || 0) + 1;

    // Por moneda
    if (!summary.porMoneda[factura.moneda]) {
      summary.porMoneda[factura.moneda] = { count: 0, total: 0 };
    }
    summary.porMoneda[factura.moneda].count++;
    summary.porMoneda[factura.moneda].total += factura.total;

    // Contadores especiales
    if (factura.esAutomatica) summary.automaticas++;
    if (factura.emailEnviado) summary.conEmail++;
  });

  return summary;
}

// 🔗 Generar URL de descarga
export function getDownloadUrl(invoiceId: string, tipo: 'pdf' | 'xml' | 'zip', inline: boolean = false): string {
  const params = new URLSearchParams({
    tipo,
    inline: inline.toString()
  });
  
  return `/api/invoices/download/${invoiceId}?${params.toString()}`;
}

// 📋 Validar RFC
export function validateRFC(rfc: string | null | undefined): boolean {
  if (!rfc) return false;
  
  const cleanRFC = rfc.toUpperCase().trim();
  
  // Verificar longitud correcta
  if (cleanRFC.length < 12 || cleanRFC.length > 13) {
    return false;
  }
  
  // Verificar formato básico
  const rfcPattern = /^[A-Z&Ñ]{3,4}[0-9]{6}[A-Z0-9]{3}$/;
  if (!rfcPattern.test(cleanRFC)) {
    return false;
  }
  
  // Verificar que no sean valores obviously inválidos como 000000
  const datePart = cleanRFC.slice(-9, -3);
  if (datePart === '000000') {
    return false;
  }
  
  return true;
}

// 🔢 Validar UUID
export function validateUUID(uuid: string): boolean {
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidPattern.test(uuid);
}

// 📱 Detectar tipo de búsqueda
export function detectSearchType(query: string): {
  type: 'rfc' | 'uuid' | 'folio' | 'text';
  suggestion: string;
} {
  const cleanQuery = query.trim().toUpperCase();

  if (validateRFC(cleanQuery)) {
    return { type: 'rfc', suggestion: 'RFC válido' };
  }

  if (validateUUID(cleanQuery)) {
    return { type: 'uuid', suggestion: 'UUID de CFDI' };
  }

  if (/^\d+$/.test(cleanQuery)) {
    return { type: 'folio', suggestion: 'Número de folio' };
  }

  return { type: 'text', suggestion: 'Búsqueda general' };
}

// 🎨 Obtener color para gráficas por moneda
export function getCurrencyColor(currency: string): string {
  const colors: Record<string, string> = {
    MXN: '#10b981', // green-500
    USD: '#3b82f6', // blue-500
    EUR: '#8b5cf6', // violet-500
    GBP: '#f59e0b', // amber-500
    CAD: '#ef4444', // red-500
    BRL: '#06b6d4', // cyan-500
    PHP: '#84cc16', // lime-500
  };

  return colors[currency] || '#6b7280'; // gray-500
}

// 📈 Formatear números para gráficas
export function formatChartNumber(value: number): string {
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}K`;
  }
  return value.toString();
}

// 🕐 Calcular tiempo transcurrido
export function getTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffMinutes = Math.floor(diffMs / (1000 * 60));

  if (diffDays > 0) {
    return `hace ${diffDays} día${diffDays > 1 ? 's' : ''}`;
  }
  if (diffHours > 0) {
    return `hace ${diffHours} hora${diffHours > 1 ? 's' : ''}`;
  }
  if (diffMinutes > 0) {
    return `hace ${diffMinutes} minuto${diffMinutes > 1 ? 's' : ''}`;
  }
  return 'hace un momento';
}

// 📧 Verificar si puede reenviar email
export function canResendEmail(factura: InvoiceItem): boolean {
  const hasEmail = !!factura.receptor.email;
  const isValidStatus = ['emitida', 'enviada'].includes(factura.status);
  const emailNotSent = !factura.emailEnviado;
  const emailTimeExpired = factura.emailFecha ? 
    new Date().getTime() - new Date(factura.emailFecha).getTime() > 5 * 60 * 1000 : 
    true;
  
  return isValidStatus && hasEmail && (emailNotSent || emailTimeExpired);
}

// ❌ Verificar si puede cancelar
export function canCancelInvoice(factura: InvoiceItem): boolean {
  if (!['emitida', 'enviada'].includes(factura.status)) {
    return false;
  }

  // Para CFDI, verificar tiempo límite (72 horas)
  if (factura.tipo.startsWith('CFDI') && factura.fechaTimbrado) {
    const horasTranscurridas = (Date.now() - new Date(factura.fechaTimbrado).getTime()) / (1000 * 60 * 60);
    return horasTranscurridas <= 72;
  }

  // Para facturas internacionales, siempre se puede cancelar
  return true;
}

// 🎯 Obtener acciones disponibles para una factura
export function getAvailableActions(factura: InvoiceItem, userRole: string) {
  const actions = {
    canView: true,
    canDownload: ['emitida', 'enviada', 'cancelada'].includes(factura.status),
    canEdit: false,
    canCancel: false,
    canResend: false,
    canDelete: false
  };

  // Permisos administrativos
  if (['admin', 'dentista'].includes(userRole)) {
    actions.canEdit = factura.status === 'borrador';
    actions.canCancel = canCancelInvoice(factura);
    actions.canResend = canResendEmail(factura);
    actions.canDelete = factura.status === 'borrador';
  }

  return actions;
}

// 🧮 Calcular totales de factura
export function calculateTotals(items: { quantity: number; unitPrice: number; total: number }[], taxRate: number = 0.16) {
  const subtotal = items.reduce((sum, item) => sum + item.total, 0);
  const tax = Math.round(subtotal * taxRate * 100) / 100; // Redondear a 2 decimales
  const total = Math.round((subtotal + tax) * 100) / 100; // Redondear a 2 decimales
  
  return {
    subtotal,
    tax,
    total
  };
}

// 🔢 Generar número de factura
export function generateInvoiceNumber(existingNumbers: string[] = []): string {
  const currentYear = new Date().getFullYear();
  
  // Si hay números existentes, usar el año más reciente, pero no menor al año actual
  let targetYear = currentYear;
  
  if (existingNumbers.length > 0) {
    // Extraer años de los números existentes
    const years = existingNumbers
      .map(num => {
        const match = num.match(/INV-(\d{4})-/);
        return match ? parseInt(match[1]) : null;
      })
      .filter(year => year !== null)
      .sort((a, b) => b - a); // Ordenar descendente
    
    if (years.length > 0) {
      const latestYear = years[0];
      // Solo usar el año de los números existentes si es el año actual o posterior
      if (latestYear >= currentYear) {
        targetYear = latestYear;
      }
      // Si el año más reciente es anterior al actual, usar el año actual
    }
  }
  
  const prefix = `INV-${targetYear}-`;
  
  // Encontrar el número más alto existente para ese año
  let maxNumber = 0;
  existingNumbers.forEach(number => {
    if (number.startsWith(prefix)) {
      const numPart = parseInt(number.replace(prefix, ''));
      if (!isNaN(numPart) && numPart > maxNumber) {
        maxNumber = numPart;
      }
    }
  });
  
  const nextNumber = maxNumber + 1;
  return `${prefix}${nextNumber.toString().padStart(3, '0')}`;
}

// 📅 Formatear fecha con idioma
export function formatDate(date: Date | string | null | undefined, locale: string = 'es', includeTime: boolean = false): string {
  if (!date) {
    return '';
  }
  
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  if (isNaN(dateObj.getTime())) {
    return '';
  }
  
  const day = dateObj.getUTCDate().toString().padStart(2, '0');
  const month = (dateObj.getUTCMonth() + 1).toString().padStart(2, '0');
  const year = dateObj.getUTCFullYear();
  
  let dateStr = '';
  if (locale === 'es') {
    dateStr = `${day}/${month}/${year}`;
  } else {
    dateStr = `${month}/${day}/${year}`;
  }
  
  if (includeTime) {
    const hours = dateObj.getUTCHours().toString().padStart(2, '0');
    const minutes = dateObj.getUTCMinutes().toString().padStart(2, '0');
    dateStr += ` ${hours}:${minutes}`;
  }
  
  return dateStr;
}

// 📧 Validar email
export function isValidEmail(email: string | null | undefined): boolean {
  if (!email || typeof email !== 'string') return false;
  
  const trimmedEmail = email.trim();
  if (trimmedEmail.length === 0) return false;
  
  // Verificar formato básico
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(trimmedEmail)) return false;
  
  // Verificaciones adicionales
  const parts = trimmedEmail.split('@');
  if (parts.length !== 2) return false;
  
  const [local, domain] = parts;
  
  // Verificar parte local (antes del @)
  if (local.length === 0 || local.length > 64) return false;
  if (local.startsWith('.') || local.endsWith('.')) return false;
  if (local.includes('..')) return false;
  
  // Verificar dominio
  if (domain.length === 0 || domain.length > 255) return false;
  if (domain.startsWith('.') || domain.endsWith('.')) return false;
  if (domain.includes('..')) return false;
  if (!domain.includes('.')) return false;
  
  // Verificar que el dominio tenga al menos un punto y no termine en punto
  const domainParts = domain.split('.');
  if (domainParts.length < 2) return false;
  if (domainParts.some(part => part.length === 0)) return false;
  
  return true;
}

// 💸 Obtener tasa de impuesto
export function getTaxRate(country: string, productType: string = 'standard'): number {
  const taxRates: Record<string, Record<string, number>> = {
    MX: {
      standard: 0.16,
      medical: 0.00,  // Medicinas exentas
      food: 0.00
    },
    US: {
      standard: 0.08,
      medical: 0.00,
      food: 0.06
    },
    EU: {
      standard: 0.21,
      medical: 0.10,
      food: 0.10
    }
  };
  
  // Para países no configurados, retornar 0
  if (!taxRates[country]) {
    return 0;
  }
  
  return taxRates[country][productType] || taxRates[country].standard;
}

// 💱 Convertir moneda
export function convertCurrency(amount: number, exchangeRate: number): number {
  if (isNaN(amount) || isNaN(exchangeRate) || exchangeRate <= 0) {
    return 0;
  }
  
  return amount * exchangeRate;
}

// 📄 Validar datos CFDI
export function validateCFDIData(data: any): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!data.emisor?.rfc) {
    errors.push('RFC del emisor es requerido');
  } else if (!validateRFC(data.emisor.rfc)) {
    errors.push('RFC del emisor inválido');
  }
  
  if (!data.receptor?.rfc) {
    errors.push('RFC del receptor es requerido');
  } else if (!validateRFC(data.receptor.rfc)) {
    errors.push('RFC del receptor inválido');
  }
  
  if (!data.conceptos || data.conceptos.length === 0) {
    errors.push('Debe incluir al menos un concepto');
  }
  
  if (!data.total || data.total <= 0) {
    errors.push('El total debe ser mayor a cero');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

// 🏷️ Formatear estado de factura
export function formatInvoiceStatus(status: string, locale: string = 'es'): string {
  const statuses: Record<string, Record<string, string>> = {
    es: {
      draft: 'Borrador',
      sent: 'Enviada',
      paid: 'Pagada',
      cancelled: 'Cancelada',
      overdue: 'Vencida'
    },
    en: {
      draft: 'Draft',
      sent: 'Sent',
      paid: 'Paid',
      cancelled: 'Cancelled',
      overdue: 'Overdue'
    }
  };
  
  return statuses[locale]?.[status] || (locale === 'es' ? 'Desconocido' : 'Unknown');
}

// 📅 Calcular fecha de vencimiento
export function calculateDueDate(issueDate: Date, paymentTerms: number = 30): Date {
  const dueDate = new Date(issueDate);
  dueDate.setDate(dueDate.getDate() + paymentTerms);
  return dueDate;
}

// ⏰ Verificar si factura está vencida
export function isInvoiceOverdue(dueDate: Date | string, status: string = 'sent'): boolean {
  if (status === 'paid' || status === 'cancelled') {
    return false;
  }
  
  const dueDateObj = typeof dueDate === 'string' ? new Date(dueDate) : dueDate;
  const now = new Date();
  
  return dueDateObj < now;
}
