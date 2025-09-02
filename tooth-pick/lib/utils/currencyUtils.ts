// 💱 FASE 29: Utilidades para Conversión de Monedas
// ✅ Funciones para manejo de tipos de cambio y conversiones

export interface ExchangeRate {
  from: string;
  to: string;
  rate: number;
  timestamp: Date;
  source: string;
}

export interface CurrencyConversion {
  originalAmount: number;
  originalCurrency: string;
  convertedAmount: number;
  convertedCurrency: string;
  exchangeRate: number;
  timestamp: Date;
  source: string;
}

// Cache de tipos de cambio (en producción usar Redis)
const exchangeRateCache = new Map<string, ExchangeRate>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutos

/**
 * 💱 Obtener tipo de cambio entre dos monedas
 */
export async function getCurrencyExchangeRate(
  from: string,
  to: string
): Promise<ExchangeRate> {
  const cacheKey = `${from}-${to}`;
  const cached = exchangeRateCache.get(cacheKey);

  // Verificar cache
  if (cached && (Date.now() - cached.timestamp.getTime()) < CACHE_DURATION) {
    return cached;
  }

  try {
    // En producción, usar API real como exchangerate-api.com, fixer.io, etc.
    const rate = await fetchExchangeRateFromAPI(from, to);
    
    const exchangeRate: ExchangeRate = {
      from,
      to,
      rate,
      timestamp: new Date(),
      source: 'mock-api'
    };

    // Guardar en cache
    exchangeRateCache.set(cacheKey, exchangeRate);

    return exchangeRate;

  } catch (error) {
    console.error('Error obteniendo tipo de cambio:', error);
    
    // Fallback a tipos de cambio fijos
    const fallbackRate = getFallbackExchangeRate(from, to);
    return {
      from,
      to,
      rate: fallbackRate,
      timestamp: new Date(),
      source: 'fallback'
    };
  }
}

/**
 * 📊 Simular API de tipos de cambio
 */
async function fetchExchangeRateFromAPI(from: string, to: string): Promise<number> {
  // Mock de tipos de cambio para desarrollo
  const mockRates: Record<string, Record<string, number>> = {
    'USD': {
      'MXN': 17.5,
      'EUR': 0.85,
      'GBP': 0.73,
      'CAD': 1.25,
      'BRL': 5.2,
      'ARS': 350.0,
      'COP': 4000.0,
      'CLP': 800.0,
      'PEN': 3.7,
      'UYU': 39.0
    },
    'EUR': {
      'USD': 1.18,
      'MXN': 20.6,
      'GBP': 0.86,
      'BRL': 6.1
    },
    'MXN': {
      'USD': 0.057,
      'EUR': 0.049,
      'BRL': 0.3
    },
    'BRL': {
      'USD': 0.19,
      'EUR': 0.16,
      'MXN': 3.37
    }
  };

  if (from === to) {
    return 1.0;
  }

  const rate = mockRates[from]?.[to];
  if (rate) {
    // Agregar variación aleatoria pequeña para simular fluctuación
    return rate * (0.98 + Math.random() * 0.04);
  }

  // Si no hay tasa directa, intentar conversion inversa
  const inverseRate = mockRates[to]?.[from];
  if (inverseRate) {
    return (1 / inverseRate) * (0.98 + Math.random() * 0.04);
  }

  throw new Error(`Exchange rate not available for ${from} to ${to}`);
}

/**
 * 🛡️ Tipos de cambio de fallback
 */
function getFallbackExchangeRate(from: string, to: string): number {
  const fallbackRates: Record<string, Record<string, number>> = {
    'USD': {
      'MXN': 17.0,
      'EUR': 0.85,
      'GBP': 0.73,
      'CAD': 1.25,
      'BRL': 5.0,
      'ARS': 300.0,
      'COP': 4000.0
    },
    'EUR': {
      'USD': 1.18,
      'MXN': 20.0
    },
    'MXN': {
      'USD': 0.059,
      'EUR': 0.05
    }
  };

  if (from === to) {
    return 1.0;
  }

  return fallbackRates[from]?.[to] || 1.0;
}

/**
 * 💰 Convertir monto entre monedas
 */
export async function convertCurrency(
  amount: number,
  fromCurrency: string,
  toCurrency: string
): Promise<CurrencyConversion> {
  if (fromCurrency === toCurrency) {
    return {
      originalAmount: amount,
      originalCurrency: fromCurrency,
      convertedAmount: amount,
      convertedCurrency: toCurrency,
      exchangeRate: 1.0,
      timestamp: new Date(),
      source: 'no-conversion'
    };
  }

  const exchangeRate = await getCurrencyExchangeRate(fromCurrency, toCurrency);
  const convertedAmount = Math.round((amount * exchangeRate.rate) * 100) / 100;

  return {
    originalAmount: amount,
    originalCurrency: fromCurrency,
    convertedAmount,
    convertedCurrency: toCurrency,
    exchangeRate: exchangeRate.rate,
    timestamp: new Date(),
    source: exchangeRate.source
  };
}

/**
 * 🌍 Obtener moneda por país
 */
export function getCurrencyByCountry(countryCode: string): string {
  const currencyMap: Record<string, string> = {
    'US': 'USD',
    'CA': 'CAD',
    'MX': 'MXN',
    'BR': 'BRL',
    'AR': 'ARS',
    'CO': 'COP',
    'CL': 'CLP',
    'PE': 'PEN',
    'UY': 'UYU',
    'GB': 'GBP',
    'EU': 'EUR',
    'DE': 'EUR',
    'FR': 'EUR',
    'ES': 'EUR',
    'IT': 'EUR',
    'NL': 'EUR',
    'PT': 'EUR',
    'JP': 'JPY',
    'AU': 'AUD',
    'IN': 'INR',
    'CN': 'CNY'
  };

  return currencyMap[countryCode] || 'USD';
}

/**
 * 💵 Formatear monto con moneda
 */
export function formatCurrency(
  amount: number,
  currency: string,
  locale?: string
): string {
  const localeMap: Record<string, string> = {
    'USD': 'en-US',
    'CAD': 'en-CA',
    'MXN': 'es-MX',
    'BRL': 'pt-BR',
    'ARS': 'es-AR',
    'COP': 'es-CO',
    'CLP': 'es-CL',
    'PEN': 'es-PE',
    'UYU': 'es-UY',
    'EUR': 'de-DE',
    'GBP': 'en-GB',
    'JPY': 'ja-JP',
    'AUD': 'en-AU'
  };

  const targetLocale = locale || localeMap[currency] || 'en-US';

  return new Intl.NumberFormat(targetLocale, {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: currency === 'JPY' ? 0 : 2,
    maximumFractionDigits: currency === 'JPY' ? 0 : 2
  }).format(amount);
}

/**
 * 📈 Obtener lista de monedas soportadas
 */
export function getSupportedCurrencies(): Array<{
  code: string;
  name: string;
  symbol: string;
  countries: string[];
}> {
  return [
    {
      code: 'USD',
      name: 'US Dollar',
      symbol: '$',
      countries: ['US', 'EC', 'PA']
    },
    {
      code: 'EUR',
      name: 'Euro',
      symbol: '€',
      countries: ['DE', 'FR', 'ES', 'IT', 'NL', 'PT']
    },
    {
      code: 'MXN',
      name: 'Mexican Peso',
      symbol: '$',
      countries: ['MX']
    },
    {
      code: 'BRL',
      name: 'Brazilian Real',
      symbol: 'R$',
      countries: ['BR']
    },
    {
      code: 'CAD',
      name: 'Canadian Dollar',
      symbol: 'C$',
      countries: ['CA']
    },
    {
      code: 'GBP',
      name: 'British Pound',
      symbol: '£',
      countries: ['GB']
    },
    {
      code: 'ARS',
      name: 'Argentine Peso',
      symbol: '$',
      countries: ['AR']
    },
    {
      code: 'COP',
      name: 'Colombian Peso',
      symbol: '$',
      countries: ['CO']
    },
    {
      code: 'CLP',
      name: 'Chilean Peso',
      symbol: '$',
      countries: ['CL']
    },
    {
      code: 'PEN',
      name: 'Peruvian Sol',
      symbol: 'S/',
      countries: ['PE']
    },
    {
      code: 'UYU',
      name: 'Uruguayan Peso',
      symbol: '$U',
      countries: ['UY']
    },
    {
      code: 'JPY',
      name: 'Japanese Yen',
      symbol: '¥',
      countries: ['JP']
    },
    {
      code: 'AUD',
      name: 'Australian Dollar',
      symbol: 'A$',
      countries: ['AU']
    }
  ];
}

/**
 * ✅ Validar código de moneda
 */
export function isValidCurrency(currencyCode: string): boolean {
  const supportedCurrencies = getSupportedCurrencies();
  return supportedCurrencies.some(currency => currency.code === currencyCode);
}

/**
 * 🔍 Detectar moneda preferida por país e IP
 */
export function getPreferredCurrency(
  countryCode?: string,
  userAgent?: string
): string {
  if (countryCode) {
    return getCurrencyByCountry(countryCode);
  }

  // Fallback a USD si no se puede determinar
  return 'USD';
}

/**
 * 📊 Calcular comisiones por conversión de moneda
 */
export function calculateCurrencyConversionFee(
  amount: number,
  fromCurrency: string,
  toCurrency: string,
  feePercentage: number = 0.025 // 2.5% por defecto
): number {
  if (fromCurrency === toCurrency) {
    return 0;
  }

  return Math.round((amount * feePercentage) * 100) / 100;
}

/**
 * 📅 Obtener histórico de tipos de cambio (mock)
 */
export async function getExchangeRateHistory(
  from: string,
  to: string,
  days: number = 30
): Promise<Array<{ date: string; rate: number }>> {
  // Mock de histórico para desarrollo
  const history: Array<{ date: string; rate: number }> = [];
  const baseRate = await getCurrencyExchangeRate(from, to);
  
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    
    // Variación aleatoria del ±5%
    const variation = 0.95 + Math.random() * 0.1;
    const rate = baseRate.rate * variation;
    
    history.push({
      date: date.toISOString().split('T')[0],
      rate: Math.round(rate * 10000) / 10000
    });
  }

  return history;
}
