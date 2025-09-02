'use client';

import React, { useState } from 'react';
import { Globe, ChevronDown, Check } from 'lucide-react';
import { useCurrency, type CurrencyCode, currencyConfig } from '@/lib/hooks/useCurrency';
import { useLocale, type LocaleCode, localeFormats } from '@/lib/hooks/useLocale';

// Configuración de idiomas disponibles
const availableLanguages = [
  { code: 'es' as LocaleCode, name: 'Español', flag: '🇪🇸' },
  { code: 'en' as LocaleCode, name: 'English', flag: '🇺🇸' },
  { code: 'pt' as LocaleCode, name: 'Português', flag: '🇧🇷' },
  { code: 'de' as LocaleCode, name: 'Deutsch', flag: '🇩🇪' }
];

// Configuración de monedas disponibles
const availableCurrencies: Array<{
  code: CurrencyCode;
  name: string;
  symbol: string;
  flag: string;
}> = [
  { code: 'MXN', name: 'Peso Mexicano', symbol: '$', flag: '🇲🇽' },
  { code: 'USD', name: 'US Dollar', symbol: '$', flag: '🇺🇸' },
  { code: 'BRL', name: 'Real Brasileiro', symbol: 'R$', flag: '🇧🇷' },
  { code: 'ARS', name: 'Peso Argentino', symbol: '$', flag: '🇦🇷' },
  { code: 'COP', name: 'Peso Colombiano', symbol: '$', flag: '🇨🇴' },
  { code: 'CLP', name: 'Peso Chileno', symbol: '$', flag: '🇨🇱' },
  { code: 'EUR', name: 'Euro', symbol: '€', flag: '🇪🇺' }
];

// Componente Selector de Idioma
export function LanguageSelector({ className = '' }: { className?: string }) {
  const { currentLocale, setLocale } = useLocale();
  const [isOpen, setIsOpen] = useState(false);

  const currentLanguage = availableLanguages.find(lang => lang.code === currentLocale);

  const handleLanguageChange = (newLocale: LocaleCode) => {
    setLocale(newLocale);
    setIsOpen(false);
    
    // Mostrar notificación de cambio
    if (typeof window !== 'undefined') {
      // TODO: Usar sistema de notificaciones de la app
      console.log(`Language changed to ${newLocale}`);
    }
  };

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
        aria-label="Cambiar idioma"
      >
        <Globe className="h-4 w-4" />
        <span className="hidden sm:inline">{currentLanguage?.name}</span>
        <span className="sm:hidden">{currentLanguage?.flag}</span>
        <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <>
          {/* Overlay para cerrar el dropdown */}
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => setIsOpen(false)}
          />
          
          {/* Dropdown menu */}
          <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-20">
            <div className="py-1">
              {availableLanguages.map((language) => (
                <button
                  key={language.code}
                  onClick={() => handleLanguageChange(language.code)}
                  className={`w-full flex items-center justify-between px-4 py-2 text-sm hover:bg-gray-50 transition-colors ${
                    currentLocale === language.code ? 'bg-blue-50 text-blue-700' : 'text-gray-700'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-lg">{language.flag}</span>
                    <span>{language.name}</span>
                  </div>
                  {currentLocale === language.code && (
                    <Check className="h-4 w-4 text-blue-600" />
                  )}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// Componente Selector de Moneda
export function CurrencySelector({ className = '' }: { className?: string }) {
  const { currentCurrency, setCurrency, isLoading } = useCurrency();
  const [isOpen, setIsOpen] = useState(false);

  const currentCurrencyInfo = availableCurrencies.find(curr => curr.code === currentCurrency);

  const handleCurrencyChange = (newCurrency: CurrencyCode) => {
    setCurrency(newCurrency);
    setIsOpen(false);
    
    // Mostrar notificación de cambio
    if (typeof window !== 'undefined') {
      // TODO: Usar sistema de notificaciones de la app
      console.log(`Currency changed to ${newCurrency}`);
    }
  };

  if (isLoading) {
    return (
      <div className={`${className} animate-pulse`}>
        <div className="h-10 w-24 bg-gray-200 rounded-lg"></div>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
        aria-label="Cambiar moneda"
      >
        <span className="text-lg">{currentCurrencyInfo?.flag}</span>
        <span className="font-mono">{currentCurrencyInfo?.symbol}</span>
        <span className="hidden sm:inline font-mono text-xs">{currentCurrency}</span>
        <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <>
          {/* Overlay para cerrar el dropdown */}
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => setIsOpen(false)}
          />
          
          {/* Dropdown menu */}
          <div className="absolute right-0 mt-2 w-56 bg-white border border-gray-200 rounded-lg shadow-lg z-20">
            <div className="py-1">
              {availableCurrencies.map((currency) => (
                <button
                  key={currency.code}
                  onClick={() => handleCurrencyChange(currency.code)}
                  className={`w-full flex items-center justify-between px-4 py-2 text-sm hover:bg-gray-50 transition-colors ${
                    currentCurrency === currency.code ? 'bg-blue-50 text-blue-700' : 'text-gray-700'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-lg">{currency.flag}</span>
                    <div className="flex flex-col items-start">
                      <span className="font-medium">{currency.code}</span>
                      <span className="text-xs text-gray-500">{currency.name}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm">{currency.symbol}</span>
                    {currentCurrency === currency.code && (
                      <Check className="h-4 w-4 text-blue-600" />
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// Componente Combinado para Configuración Rápida
export function LocaleQuickSettings({ 
  showCurrency = true, 
  showLanguage = true,
  className = '' 
}: { 
  showCurrency?: boolean;
  showLanguage?: boolean;
  className?: string;
}) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {showLanguage && <LanguageSelector />}
      {showCurrency && <CurrencySelector />}
    </div>
  );
}

// Componente de Estado de Configuración Regional
export function LocaleStatus() {
  const { currentLocale, timezone, config } = useLocale();
  const { currentCurrency, exchangeRates, isLoading } = useCurrency();

  const currentLanguage = availableLanguages.find(lang => lang.code === currentLocale);
  const currentCurrencyInfo = availableCurrencies.find(curr => curr.code === currentCurrency);

  return (
    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
      <h3 className="text-sm font-medium text-gray-900 mb-3">Configuración Regional</h3>
      
      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-600">Idioma:</span>
          <span className="font-medium flex items-center gap-1">
            {currentLanguage?.flag} {currentLanguage?.name}
          </span>
        </div>
        
        <div className="flex justify-between">
          <span className="text-gray-600">Moneda:</span>
          <span className="font-medium flex items-center gap-1">
            {currentCurrencyInfo?.flag} {currentCurrency}
          </span>
        </div>
        
        <div className="flex justify-between">
          <span className="text-gray-600">Formato de fecha:</span>
          <span className="font-mono text-xs">{config.dateFormat}</span>
        </div>
        
        <div className="flex justify-between">
          <span className="text-gray-600">Zona horaria:</span>
          <span className="font-mono text-xs">{timezone}</span>
        </div>
        
        {!isLoading && exchangeRates[currentCurrency] && (
          <div className="flex justify-between">
            <span className="text-gray-600">Tasa vs USD:</span>
            <span className="font-mono text-xs">
              1 USD = {exchangeRates[currentCurrency]?.toFixed(2)} {currentCurrency}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

// Hook personalizado para usar ambos selectores en componentes
export function useLocaleSelectors() {
  const locale = useLocale();
  const currency = useCurrency();
  
  return {
    ...locale,
    ...currency,
    LanguageSelector,
    CurrencySelector,
    LocaleQuickSettings,
    LocaleStatus
  };
}
