// 💱 FASE 28: Servicio de Conversión de Monedas en Tiempo Real
// ✅ Conversión multimoneda con múltiples proveedores y cache

import { Currency } from '@/lib/models/InvoiceFase28';

// 🌐 Proveedores de API de conversión
export enum CurrencyProvider {
  EXCHANGE_RATE_API = 'exchangerate-api',
  FIXER_IO = 'fixer',
  CURRENCY_API = 'currencyapi',
  BANCO_MEXICO = 'banxico'
}

// 📊 Interface para tasa de cambio
export interface ExchangeRate {
  from: Currency;
  to: Currency;
  rate: number;
  timestamp: Date;
  provider: CurrencyProvider;
  inverseRate: number;
}

// 🎯 Resultado de conversión
export interface ConversionResult {
  success: boolean;
  amount: number;
  originalAmount: number;
  fromCurrency: Currency;
  toCurrency: Currency;
  exchangeRate: number;
  convertedAt: Date;
  provider: CurrencyProvider;
  error?: string;
}

// 💰 Cache de tasas de cambio
interface CachedRate {
  rate: number;
  timestamp: Date;
  expiresAt: Date;
  provider: CurrencyProvider;
}

export class CurrencyConversionService {
  private cache: Map<string, CachedRate> = new Map();
  private readonly CACHE_DURATION_HOURS = 1; // Cache por 1 hora
  private readonly DEFAULT_PROVIDER = CurrencyProvider.EXCHANGE_RATE_API;

  // 🔑 API Keys (desde variables de entorno)
  private apiKeys = {
    exchangeRateApi: process.env.EXCHANGE_RATE_API_KEY,
    fixerIo: process.env.FIXER_IO_API_KEY,
    currencyApi: process.env.CURRENCY_API_KEY,
    banxicoToken: process.env.BANXICO_TOKEN
  };

  // 🌐 URLs de APIs
  private apiUrls = {
    exchangeRateApi: 'https://v6.exchangerate-api.com/v6',
    fixerIo: 'https://api.fixer.io/v1',
    currencyApi: 'https://api.currencyapi.com/v3',
    banxico: 'https://www.banxico.org.mx/SieAPIRest/service/v1/series'
  };

  // 💱 Conversión principal
  async convertir(
    amount: number,
    fromCurrency: Currency,
    toCurrency: Currency,
    provider?: CurrencyProvider
  ): Promise<ConversionResult> {
    try {
      // Si las monedas son iguales, no hay conversión
      if (fromCurrency === toCurrency) {
        return {
          success: true,
          amount,
          originalAmount: amount,
          fromCurrency,
          toCurrency,
          exchangeRate: 1,
          convertedAt: new Date(),
          provider: provider || this.DEFAULT_PROVIDER
        };
      }

      // Obtener tasa de cambio
      const exchangeRate = await this.obtenerTipoCambio(fromCurrency, toCurrency, provider);
      
      const convertedAmount = amount * exchangeRate;

      return {
        success: true,
        amount: Number(convertedAmount.toFixed(2)),
        originalAmount: amount,
        fromCurrency,
        toCurrency,
        exchangeRate,
        convertedAt: new Date(),
        provider: provider || this.DEFAULT_PROVIDER
      };

    } catch (error: any) {
      console.error('Error en conversión de moneda:', error);
      
      return {
        success: false,
        amount: 0,
        originalAmount: amount,
        fromCurrency,
        toCurrency,
        exchangeRate: 0,
        convertedAt: new Date(),
        provider: provider || this.DEFAULT_PROVIDER,
        error: error.message
      };
    }
  }

  // 📈 Obtener tipo de cambio
  async obtenerTipoCambio(
    fromCurrency: Currency,
    toCurrency: Currency,
    provider?: CurrencyProvider
  ): Promise<number> {
    const cacheKey = `${fromCurrency}_${toCurrency}_${provider || this.DEFAULT_PROVIDER}`;
    
    // Verificar cache
    const cachedRate = this.getCachedRate(cacheKey);
    if (cachedRate) {
      return cachedRate.rate;
    }

    // Obtener tasa de API
    let rate: number;
    const selectedProvider = provider || this.DEFAULT_PROVIDER;

    switch (selectedProvider) {
      case CurrencyProvider.EXCHANGE_RATE_API:
        rate = await this.getExchangeRateFromAPI(fromCurrency, toCurrency);
        break;
      case CurrencyProvider.FIXER_IO:
        rate = await this.getFixerIORate(fromCurrency, toCurrency);
        break;
      case CurrencyProvider.CURRENCY_API:
        rate = await this.getCurrencyAPIRate(fromCurrency, toCurrency);
        break;
      case CurrencyProvider.BANCO_MEXICO:
        rate = await this.getBanxicoRate(fromCurrency, toCurrency);
        break;
      default:
        rate = await this.getExchangeRateFromAPI(fromCurrency, toCurrency);
    }

    // Guardar en cache
    this.setCachedRate(cacheKey, rate, selectedProvider);

    return rate;
  }

  // 🔄 ExchangeRate-API.com
  private async getExchangeRateFromAPI(fromCurrency: Currency, toCurrency: Currency): Promise<number> {
    try {
      const url = this.apiKeys.exchangeRateApi 
        ? `${this.apiUrls.exchangeRateApi}/${this.apiKeys.exchangeRateApi}/pair/${fromCurrency}/${toCurrency}`
        : `${this.apiUrls.exchangeRateApi}/latest/${fromCurrency}`;

      const response = await fetch(url);
      const data = await response.json();

      if (data.result === 'success') {
        return this.apiKeys.exchangeRateApi 
          ? data.conversion_rate 
          : data.conversion_rates[toCurrency];
      } else {
        throw new Error(`ExchangeRate-API error: ${data.error_type}`);
      }
    } catch (error) {
      console.error('Error con ExchangeRate-API:', error);
      throw error;
    }
  }

  // 🔧 Fixer.io
  private async getFixerIORate(fromCurrency: Currency, toCurrency: Currency): Promise<number> {
    try {
      if (!this.apiKeys.fixerIo) {
        throw new Error('Fixer.io API key no configurada');
      }

      const url = `${this.apiUrls.fixerIo}/latest?access_key=${this.apiKeys.fixerIo}&base=${fromCurrency}&symbols=${toCurrency}`;
      
      const response = await fetch(url);
      const data = await response.json();

      if (data.success) {
        return data.rates[toCurrency];
      } else {
        throw new Error(`Fixer.io error: ${data.error.info}`);
      }
    } catch (error) {
      console.error('Error con Fixer.io:', error);
      throw error;
    }
  }

  // 🌐 CurrencyAPI
  private async getCurrencyAPIRate(fromCurrency: Currency, toCurrency: Currency): Promise<number> {
    try {
      if (!this.apiKeys.currencyApi) {
        throw new Error('CurrencyAPI key no configurada');
      }

      const url = `${this.apiUrls.currencyApi}/latest?apikey=${this.apiKeys.currencyApi}&base_currency=${fromCurrency}&currencies=${toCurrency}`;
      
      const response = await fetch(url);
      const data = await response.json();

      if (data.data && data.data[toCurrency]) {
        return data.data[toCurrency].value;
      } else {
        throw new Error('CurrencyAPI: Datos no disponibles');
      }
    } catch (error) {
      console.error('Error con CurrencyAPI:', error);
      throw error;
    }
  }

  // 🏦 Banco de México (para MXN)
  private async getBanxicoRate(fromCurrency: Currency, toCurrency: Currency): Promise<number> {
    try {
      if (!this.apiKeys.banxicoToken) {
        throw new Error('Token de Banxico no configurado');
      }

      // Solo soporta MXN como base o destino
      if (fromCurrency !== Currency.MXN && toCurrency !== Currency.MXN) {
        throw new Error('Banxico solo soporta conversiones con MXN');
      }

      // Mapeo de monedas a series de Banxico
      const seriesMap: Record<string, string> = {
        USD: 'SF63528', // Dólar estadounidense
        EUR: 'SF46410', // Euro
        // Agregar más series según sea necesario
      };

      const otherCurrency = fromCurrency === Currency.MXN ? toCurrency : fromCurrency;
      const serieId = seriesMap[otherCurrency];

      if (!serieId) {
        throw new Error(`Serie no disponible para ${otherCurrency} en Banxico`);
      }

      const url = `${this.apiUrls.banxico}/${serieId}/datos/oportuno?token=${this.apiKeys.banxicoToken}`;
      
      const response = await fetch(url);
      const data = await response.json();

      if (data.bmx && data.bmx.series && data.bmx.series[0].datos) {
        const latestRate = parseFloat(data.bmx.series[0].datos[0].dato);
        
        // Si convertimos DE MXN a otra moneda, dividimos
        // Si convertimos A MXN desde otra moneda, usamos la tasa directamente
        return fromCurrency === Currency.MXN ? (1 / latestRate) : latestRate;
      } else {
        throw new Error('Banxico: Datos no disponibles');
      }
    } catch (error) {
      console.error('Error con Banxico:', error);
      throw error;
    }
  }

  // 💾 Manejo de cache
  private getCachedRate(cacheKey: string): CachedRate | null {
    const cached = this.cache.get(cacheKey);
    
    if (cached && cached.expiresAt > new Date()) {
      return cached;
    }
    
    // Limpiar cache expirado
    if (cached) {
      this.cache.delete(cacheKey);
    }
    
    return null;
  }

  private setCachedRate(cacheKey: string, rate: number, provider: CurrencyProvider): void {
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + this.CACHE_DURATION_HOURS);

    this.cache.set(cacheKey, {
      rate,
      timestamp: new Date(),
      expiresAt,
      provider
    });
  }

  // 🧹 Limpiar cache
  public limpiarCache(): void {
    this.cache.clear();
  }

  // 📊 Obtener múltiples tasas
  async obtenerTasasMultiples(
    baseCurrency: Currency,
    targetCurrencies: Currency[],
    provider?: CurrencyProvider
  ): Promise<Record<string, number>> {
    const rates: Record<string, number> = {};

    const promises = targetCurrencies.map(async (targetCurrency) => {
      try {
        const rate = await this.obtenerTipoCambio(baseCurrency, targetCurrency, provider);
        rates[targetCurrency] = rate;
      } catch (error) {
        console.error(`Error obteniendo tasa para ${targetCurrency}:`, error);
        rates[targetCurrency] = 0;
      }
    });

    await Promise.all(promises);
    return rates;
  }

  // 🏺 Conversión histórica (placeholder para futuro)
  async obtenerTasaHistorica(
    fromCurrency: Currency,
    toCurrency: Currency,
    fecha: Date,
    provider?: CurrencyProvider
  ): Promise<number> {
    // Placeholder - implementar APIs históricas según el proveedor
    console.warn('Conversión histórica no implementada, usando tasa actual');
    return this.obtenerTipoCambio(fromCurrency, toCurrency, provider);
  }

  // 💹 Obtener tendencia de moneda (placeholder)
  async obtenerTendencia(
    fromCurrency: Currency,
    toCurrency: Currency,
    dias: number = 30
  ): Promise<{ fechas: Date[], tasas: number[] }> {
    // Placeholder para análisis de tendencias
    const fechas: Date[] = [];
    const tasas: number[] = [];
    
    console.warn('Análisis de tendencias no implementado');
    
    return { fechas, tasas };
  }

  // 🎯 Formatear moneda según configuración
  static formatearMoneda(
    amount: number,
    currency: Currency,
    locale: string = 'es-MX'
  ): string {
    try {
      return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency: currency,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }).format(amount);
    } catch (error) {
      // Fallback si la moneda no es soportada por Intl
      const symbols: Record<Currency, string> = {
        [Currency.MXN]: '$',
        [Currency.USD]: '$',
        [Currency.EUR]: '€',
        [Currency.BRL]: 'R$',
        [Currency.ARS]: '$',
        [Currency.COP]: '$',
        [Currency.CLP]: '$'
      };

      const symbol = symbols[currency] || currency;
      return `${symbol} ${amount.toLocaleString(locale, { minimumFractionDigits: 2 })}`;
    }
  }

  // 📊 Obtener estadísticas del cache
  public obtenerEstadisticasCache(): {
    totalEntradas: number;
    entradasValidas: number;
    entradasExpiradas: number;
    proveedores: Record<CurrencyProvider, number>;
  } {
    const ahora = new Date();
    let entradasValidas = 0;
    let entradasExpiradas = 0;
    const proveedores: Record<CurrencyProvider, number> = {
      [CurrencyProvider.EXCHANGE_RATE_API]: 0,
      [CurrencyProvider.FIXER_IO]: 0,
      [CurrencyProvider.CURRENCY_API]: 0,
      [CurrencyProvider.BANCO_MEXICO]: 0
    };

    for (const cached of this.cache.values()) {
      if (cached.expiresAt > ahora) {
        entradasValidas++;
      } else {
        entradasExpiradas++;
      }
      proveedores[cached.provider]++;
    }

    return {
      totalEntradas: this.cache.size,
      entradasValidas,
      entradasExpiradas,
      proveedores
    };
  }
}

export default CurrencyConversionService;
