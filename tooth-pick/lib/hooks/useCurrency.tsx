'use client';

import { useState, useEffect, useCallback, createContext, useContext } from 'react';
import { useSession } from 'next-auth/react';
import currency from 'currency.js';

// Tipos de monedas soportadas
export type CurrencyCode = 'MXN' | 'USD' | 'BRL' | 'ARS' | 'COP' | 'CLP' | 'EUR';

// Configuración de monedas
export const currencyConfig = {
  MXN: {
    code: 'MXN',
    symbol: '$',
    name: 'Mexican Peso',
    precision: 2,
    separator: ',',
    delimiter: '.',
    format: '%s%v MXN',
    locale: 'es-MX'
  },
  USD: {
    code: 'USD',
    symbol: '$',
    name: 'US Dollar',
    precision: 2,
    separator: '.',
    delimiter: ',',
    format: '%s%v USD',
    locale: 'en-US'
  },
  BRL: {
    code: 'BRL',
    symbol: 'R$',
    name: 'Brazilian Real',
    precision: 2,
    separator: ',',
    delimiter: '.',
    format: '%s%v BRL',
    locale: 'pt-BR'
  },
  ARS: {
    code: 'ARS',
    symbol: '$',
    name: 'Argentine Peso',
    precision: 2,
    separator: ',',
    delimiter: '.',
    format: '%s%v ARS',
    locale: 'es-AR'
  },
  COP: {
    code: 'COP',
    symbol: '$',
    name: 'Colombian Peso',
    precision: 0,
    separator: ',',
    delimiter: '.',
    format: '%s%v COP',
    locale: 'es-CO'
  },
  CLP: {
    code: 'CLP',
    symbol: '$',
    name: 'Chilean Peso',
    precision: 0,
    separator: ',',
    delimiter: '.',
    format: '%s%v CLP',
    locale: 'es-CL'
  },
  EUR: {
    code: 'EUR',
    symbol: '€',
    name: 'Euro',
    precision: 2,
    separator: ',',
    delimiter: '.',
    format: '%s%v EUR',
    locale: 'de-DE'
  }
} as const;

// Tasas de cambio (se actualizarían con API externa)
export interface ExchangeRates {
  [key: string]: number;
}

// Contexto de moneda
interface CurrencyContextType {
  currentCurrency: CurrencyCode;
  exchangeRates: ExchangeRates;
  isLoading: boolean;
  setCurrency: (currency: CurrencyCode) => void;
  formatCurrency: (value: number, currencyCode?: CurrencyCode) => string;
  convertCurrency: (value: number, from: CurrencyCode, to: CurrencyCode) => number;
  getUserCurrency: () => CurrencyCode;
  refreshRates: () => Promise<void>;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

// Proveedor de contexto de moneda
export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();
  const [currentCurrency, setCurrentCurrency] = useState<CurrencyCode>('MXN');
  const [exchangeRates, setExchangeRates] = useState<ExchangeRates>({});
  const [isLoading, setIsLoading] = useState(true);

  // Obtener moneda del usuario
  const getUserCurrency = useCallback((): CurrencyCode => {
    // 1. Verificar preferencia del usuario en sesión
    if (session?.user?.preferredCurrency) {
      return session.user.preferredCurrency as CurrencyCode;
    }

    // 2. Verificar localStorage
    const savedCurrency = localStorage.getItem('preferredCurrency') as CurrencyCode;
    if (savedCurrency && currencyConfig[savedCurrency]) {
      return savedCurrency;
    }

    // 3. Detectar por navegador/región
    const locale = navigator.language.toLowerCase();
    if (locale.includes('en-us')) return 'USD';
    if (locale.includes('pt-br')) return 'BRL';
    if (locale.includes('es-ar')) return 'ARS';
    if (locale.includes('es-co')) return 'COP';
    if (locale.includes('es-cl')) return 'CLP';
    if (locale.includes('de')) return 'EUR';

    // 4. Por defecto MXN
    return 'MXN';
  }, [session]);

  // Cargar tasas de cambio desde API externa
  const fetchExchangeRates = useCallback(async () => {
    try {
      setIsLoading(true);
      
      // Usar exchangerate.host como API gratuita
      const response = await fetch('https://api.exchangerate.host/latest?base=USD');
      const data = await response.json();
      
      if (data.success && data.rates) {
        // Convertir todas las tasas a base USD
        const rates: ExchangeRates = {
          USD: 1,
          MXN: data.rates.MXN || 20.5,
          BRL: data.rates.BRL || 5.2,
          ARS: data.rates.ARS || 1000,
          COP: data.rates.COP || 4500,
          CLP: data.rates.CLP || 950,
          EUR: data.rates.EUR || 0.85
        };
        
        setExchangeRates(rates);
        localStorage.setItem('exchangeRates', JSON.stringify(rates));
        localStorage.setItem('ratesLastUpdate', Date.now().toString());
      } else {
        throw new Error('Invalid response from exchange rate API');
      }
    } catch (error) {
      console.warn('Error fetching exchange rates, using cached or default rates:', error);
      
      // Cargar tasas desde localStorage o usar por defecto
      const cachedRates = localStorage.getItem('exchangeRates');
      if (cachedRates) {
        setExchangeRates(JSON.parse(cachedRates));
      } else {
        // Tasas por defecto (aproximadas)
        setExchangeRates({
          USD: 1,
          MXN: 20.5,
          BRL: 5.2,
          ARS: 1000,
          COP: 4500,
          CLP: 950,
          EUR: 0.85
        });
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Refrescar tasas si son muy antiguas (más de 1 hora)
  const shouldRefreshRates = useCallback(() => {
    const lastUpdate = localStorage.getItem('ratesLastUpdate');
    if (!lastUpdate) return true;
    
    const oneHour = 60 * 60 * 1000;
    return (Date.now() - parseInt(lastUpdate)) > oneHour;
  }, []);

  // Inicializar
  useEffect(() => {
    const initCurrency = getUserCurrency();
    setCurrentCurrency(initCurrency);

    // Cargar tasas si es necesario
    if (shouldRefreshRates()) {
      fetchExchangeRates();
    } else {
      const cachedRates = localStorage.getItem('exchangeRates');
      if (cachedRates) {
        setExchangeRates(JSON.parse(cachedRates));
      }
      setIsLoading(false);
    }
  }, [getUserCurrency, shouldRefreshRates, fetchExchangeRates]);

  // Cambiar moneda
  const setCurrency = useCallback((newCurrency: CurrencyCode) => {
    setCurrentCurrency(newCurrency);
    localStorage.setItem('preferredCurrency', newCurrency);
    
    // TODO: Actualizar en el backend si el usuario está logueado
    if (session?.user?.id) {
      fetch('/api/user/preferences', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ preferredCurrency: newCurrency })
      }).catch(console.error);
    }
  }, [session]);

  // Formatear moneda
  const formatCurrency = useCallback((
    value: number, 
    currencyCode: CurrencyCode = currentCurrency
  ): string => {
    const config = currencyConfig[currencyCode];
    
    return currency(value, {
      symbol: config.symbol,
      precision: config.precision,
      separator: config.separator,
      format: config.format as any // Temporary fix for format type compatibility
    }).format();
  }, [currentCurrency]);

  // Convertir entre monedas
  const convertCurrency = useCallback((
    value: number,
    from: CurrencyCode,
    to: CurrencyCode
  ): number => {
    if (from === to) return value;
    
    const fromRate = exchangeRates[from] || 1;
    const toRate = exchangeRates[to] || 1;
    
    // Convertir a USD primero, luego a la moneda destino
    const usdValue = value / fromRate;
    return usdValue * toRate;
  }, [exchangeRates]);

  const refreshRates = useCallback(async () => {
    await fetchExchangeRates();
  }, [fetchExchangeRates]);

  const value: CurrencyContextType = {
    currentCurrency,
    exchangeRates,
    isLoading,
    setCurrency,
    formatCurrency,
    convertCurrency,
    getUserCurrency,
    refreshRates
  };

  return (
    <CurrencyContext.Provider value={value}>
      {children}
    </CurrencyContext.Provider>
  );
}

// Hook para usar el contexto de moneda
export function useCurrency() {
  const context = useContext(CurrencyContext);
  if (context === undefined) {
    throw new Error('useCurrency must be used within a CurrencyProvider');
  }
  return context;
}

// Hook simplificado para formateo rápido
export function useCurrencyFormatter() {
  const { formatCurrency, convertCurrency, currentCurrency } = useCurrency();
  
  return {
    format: formatCurrency,
    convert: convertCurrency,
    currency: currentCurrency
  };
}

// Función utilitaria para detectar moneda por IP (opcional)
export async function detectCurrencyByLocation(): Promise<CurrencyCode> {
  try {
    const response = await fetch('https://ipapi.co/json/');
    const data = await response.json();
    
    const countryCode = data.country_code?.toLowerCase();
    
    switch (countryCode) {
      case 'us': return 'USD';
      case 'br': return 'BRL';
      case 'ar': return 'ARS';
      case 'co': return 'COP';
      case 'cl': return 'CLP';
      case 'de':
      case 'fr':
      case 'it':
      case 'es': return 'EUR';
      case 'mx':
      default: return 'MXN';
    }
  } catch (error) {
    console.warn('Error detecting location for currency:', error);
    return 'MXN';
  }
}
