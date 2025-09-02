'use client';

import { useState, useEffect, useCallback, createContext, useContext } from 'react';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import localizedFormat from 'dayjs/plugin/localizedFormat';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/es';
import 'dayjs/locale/en';
import 'dayjs/locale/pt-br';
import 'dayjs/locale/de';

// Extender dayjs con plugins
dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(localizedFormat);
dayjs.extend(relativeTime);

// Tipos para localización
export type LocaleCode = 'es' | 'en' | 'pt' | 'de';

// Configuración de formatos por región
export const localeFormats = {
  es: {
    code: 'es',
    dayjsLocale: 'es',
    dateFormat: 'DD/MM/YYYY',
    timeFormat: 'HH:mm',
    dateTimeFormat: 'DD/MM/YYYY HH:mm',
    shortDateFormat: 'DD/MM',
    longDateFormat: 'dddd, DD [de] MMMM [de] YYYY',
    timezone: 'America/Mexico_City',
    firstDayOfWeek: 1, // Lunes
    decimalSeparator: ',',
    thousandsSeparator: '.'
  },
  en: {
    code: 'en',
    dayjsLocale: 'en',
    dateFormat: 'MM/DD/YYYY',
    timeFormat: 'hh:mm A',
    dateTimeFormat: 'MM/DD/YYYY hh:mm A',
    shortDateFormat: 'MM/DD',
    longDateFormat: 'dddd, MMMM DD, YYYY',
    timezone: 'America/New_York',
    firstDayOfWeek: 0, // Domingo
    decimalSeparator: '.',
    thousandsSeparator: ','
  },
  pt: {
    code: 'pt',
    dayjsLocale: 'pt-br',
    dateFormat: 'DD/MM/YYYY',
    timeFormat: 'HH:mm',
    dateTimeFormat: 'DD/MM/YYYY HH:mm',
    shortDateFormat: 'DD/MM',
    longDateFormat: 'dddd, DD [de] MMMM [de] YYYY',
    timezone: 'America/Sao_Paulo',
    firstDayOfWeek: 0, // Domingo
    decimalSeparator: ',',
    thousandsSeparator: '.'
  },
  de: {
    code: 'de',
    dayjsLocale: 'de',
    dateFormat: 'DD.MM.YYYY',
    timeFormat: 'HH:mm',
    dateTimeFormat: 'DD.MM.YYYY HH:mm',
    shortDateFormat: 'DD.MM',
    longDateFormat: 'dddd, DD. MMMM YYYY',
    timezone: 'Europe/Berlin',
    firstDayOfWeek: 1, // Lunes
    decimalSeparator: ',',
    thousandsSeparator: '.'
  }
} as const;

// Contexto de localización
interface LocaleContextType {
  currentLocale: LocaleCode;
  setLocale: (locale: LocaleCode) => void;
  formatDate: (date: Date | string | dayjs.Dayjs, format?: string) => string;
  formatTime: (date: Date | string | dayjs.Dayjs) => string;
  formatDateTime: (date: Date | string | dayjs.Dayjs) => string;
  formatRelativeTime: (date: Date | string | dayjs.Dayjs) => string;
  formatNumber: (value: number, options?: Intl.NumberFormatOptions) => string;
  parseDate: (dateString: string) => dayjs.Dayjs | null;
  isToday: (date: Date | string | dayjs.Dayjs) => boolean;
  isYesterday: (date: Date | string | dayjs.Dayjs) => boolean;
  isTomorrow: (date: Date | string | dayjs.Dayjs) => boolean;
  getCalendarWeeks: (month: number, year: number) => dayjs.Dayjs[][];
  timezone: string;
  config: typeof localeFormats[LocaleCode];
}

const LocaleContext = createContext<LocaleContextType | undefined>(undefined);

// Proveedor de contexto de localización
export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const [currentLocale, setCurrentLocale] = useState<LocaleCode>('es');

  // Detectar locale del navegador
  const detectLocale = useCallback((): LocaleCode => {
    const browserLang = navigator.language.toLowerCase();
    
    if (browserLang.startsWith('en')) return 'en';
    if (browserLang.startsWith('pt')) return 'pt';
    if (browserLang.startsWith('de')) return 'de';
    return 'es'; // Default
  }, []);

  // Inicializar locale
  useEffect(() => {
    const savedLocale = localStorage.getItem('preferredLocale') as LocaleCode;
    const locale = savedLocale || detectLocale();
    
    setCurrentLocale(locale);
    dayjs.locale(localeFormats[locale].dayjsLocale);
  }, [detectLocale]);

  // Cambiar locale
  const setLocale = useCallback((newLocale: LocaleCode) => {
    setCurrentLocale(newLocale);
    dayjs.locale(localeFormats[newLocale].dayjsLocale);
    localStorage.setItem('preferredLocale', newLocale);
  }, []);

  const config = localeFormats[currentLocale];

  // Formatear fecha
  const formatDate = useCallback((
    date: Date | string | dayjs.Dayjs, 
    format?: string
  ): string => {
    const dayjsDate = dayjs(date).tz(config.timezone);
    return dayjsDate.format(format || config.dateFormat);
  }, [config]);

  // Formatear hora
  const formatTime = useCallback((date: Date | string | dayjs.Dayjs): string => {
    const dayjsDate = dayjs(date).tz(config.timezone);
    return dayjsDate.format(config.timeFormat);
  }, [config]);

  // Formatear fecha y hora
  const formatDateTime = useCallback((date: Date | string | dayjs.Dayjs): string => {
    const dayjsDate = dayjs(date).tz(config.timezone);
    return dayjsDate.format(config.dateTimeFormat);
  }, [config]);

  // Formatear tiempo relativo
  const formatRelativeTime = useCallback((date: Date | string | dayjs.Dayjs): string => {
    const dayjsDate = dayjs(date).tz(config.timezone);
    return dayjsDate.fromNow();
  }, [config]);

  // Formatear número según configuración regional
  const formatNumber = useCallback((
    value: number, 
    options: Intl.NumberFormatOptions = {}
  ): string => {
    const locale = config.code === 'pt' ? 'pt-BR' : config.code;
    return new Intl.NumberFormat(locale, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
      ...options
    }).format(value);
  }, [config]);

  // Parsear fecha según formato local
  const parseDate = useCallback((dateString: string): dayjs.Dayjs | null => {
    // Intentar parsear con el formato local
    let parsed = dayjs(dateString, config.dateFormat, true);
    
    if (!parsed.isValid()) {
      // Intentar con formato ISO
      parsed = dayjs(dateString);
    }
    
    return parsed.isValid() ? parsed.tz(config.timezone) : null;
  }, [config]);

  // Verificar si es hoy
  const isToday = useCallback((date: Date | string | dayjs.Dayjs): boolean => {
    const dayjsDate = dayjs(date).tz(config.timezone);
    const today = dayjs().tz(config.timezone);
    return dayjsDate.isSame(today, 'day');
  }, [config]);

  // Verificar si es ayer
  const isYesterday = useCallback((date: Date | string | dayjs.Dayjs): boolean => {
    const dayjsDate = dayjs(date).tz(config.timezone);
    const yesterday = dayjs().tz(config.timezone).subtract(1, 'day');
    return dayjsDate.isSame(yesterday, 'day');
  }, [config]);

  // Verificar si es mañana
  const isTomorrow = useCallback((date: Date | string | dayjs.Dayjs): boolean => {
    const dayjsDate = dayjs(date).tz(config.timezone);
    const tomorrow = dayjs().tz(config.timezone).add(1, 'day');
    return dayjsDate.isSame(tomorrow, 'day');
  }, [config]);

  // Obtener semanas del calendario para un mes
  const getCalendarWeeks = useCallback((month: number, year: number): dayjs.Dayjs[][] => {
    const firstDay = dayjs().year(year).month(month).date(1).tz(config.timezone);
    const lastDay = firstDay.endOf('month');
    
    // Ajustar al primer día de la semana según configuración
    const startCalendar = firstDay.startOf('week').add(config.firstDayOfWeek, 'day');
    
    const weeks: dayjs.Dayjs[][] = [];
    let currentWeek: dayjs.Dayjs[] = [];
    let currentDay = startCalendar;
    
    // Generar 6 semanas para cubrir todos los casos
    for (let week = 0; week < 6; week++) {
      currentWeek = [];
      for (let day = 0; day < 7; day++) {
        currentWeek.push(currentDay);
        currentDay = currentDay.add(1, 'day');
      }
      weeks.push(currentWeek);
      
      // Si ya pasamos el último día del mes y la semana está vacía del mes actual
      if (currentDay.isAfter(lastDay) && 
          currentWeek.every(d => d.month() !== month)) {
        break;
      }
    }
    
    return weeks;
  }, [config]);

  const value: LocaleContextType = {
    currentLocale,
    setLocale,
    formatDate,
    formatTime,
    formatDateTime,
    formatRelativeTime,
    formatNumber,
    parseDate,
    isToday,
    isYesterday,
    isTomorrow,
    getCalendarWeeks,
    timezone: config.timezone,
    config
  };

  return (
    <LocaleContext.Provider value={value}>
      {children}
    </LocaleContext.Provider>
  );
}

// Hook para usar localización
export function useLocale() {
  const context = useContext(LocaleContext);
  if (context === undefined) {
    throw new Error('useLocale must be used within a LocaleProvider');
  }
  return context;
}

// Hook simplificado para formateo de fechas
export function useDateFormatter() {
  const { formatDate, formatTime, formatDateTime, formatRelativeTime } = useLocale();
  
  return {
    date: formatDate,
    time: formatTime,
    dateTime: formatDateTime,
    relative: formatRelativeTime
  };
}

// Utilidades de fecha
export const dateUtils = {
  // Formatear fecha para input HTML
  toInputDate: (date: Date | string | dayjs.Dayjs): string => {
    return dayjs(date).format('YYYY-MM-DD');
  },
  
  // Formatear hora para input HTML
  toInputTime: (date: Date | string | dayjs.Dayjs): string => {
    return dayjs(date).format('HH:mm');
  },
  
  // Obtener rango de fechas
  getDateRange: (start: dayjs.Dayjs, end: dayjs.Dayjs): dayjs.Dayjs[] => {
    const dates: dayjs.Dayjs[] = [];
    let current = start.startOf('day');
    
    while (current.isBefore(end) || current.isSame(end, 'day')) {
      dates.push(current);
      current = current.add(1, 'day');
    }
    
    return dates;
  },
  
  // Calcular edad
  calculateAge: (birthDate: Date | string | dayjs.Dayjs): number => {
    return dayjs().diff(dayjs(birthDate), 'year');
  },
  
  // Verificar si es día laboral
  isWorkday: (date: Date | string | dayjs.Dayjs): boolean => {
    const day = dayjs(date).day();
    return day >= 1 && day <= 5; // Lunes a Viernes
  }
};
