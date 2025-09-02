import { notFound } from 'next/navigation';
// TEMPORAL: Comentado hasta resolver compatibilidad con Next.js 15.4.3
// import { getRequestConfig } from 'next-intl/server';

// Idiomas soportados
export const locales = ['es', 'en', 'pt', 'de'] as const;
export type Locale = typeof locales[number];

// Idioma por defecto
export const defaultLocale: Locale = 'es';

// Configuración de localización por país/región
export const localeConfig = {
  es: {
    name: 'Español',
    flag: '🇪🇸',
    currency: 'MXN',
    dateFormat: 'DD/MM/YYYY',
    timeFormat: 'HH:mm',
    numberFormat: {
      decimal: ',',
      thousands: '.',
    },
    region: 'es-MX'
  },
  en: {
    name: 'English',
    flag: '🇺🇸',
    currency: 'USD',
    dateFormat: 'MM/DD/YYYY',
    timeFormat: 'hh:mm A',
    numberFormat: {
      decimal: '.',
      thousands: ',',
    },
    region: 'en-US'
  },
  pt: {
    name: 'Português',
    flag: '🇧🇷',
    currency: 'BRL',
    dateFormat: 'DD/MM/YYYY',
    timeFormat: 'HH:mm',
    numberFormat: {
      decimal: ',',
      thousands: '.',
    },
    region: 'pt-BR'
  },
  de: {
    name: 'Deutsch',
    flag: '🇩🇪',
    currency: 'EUR',
    dateFormat: 'DD.MM.YYYY',
    timeFormat: 'HH:mm',
    numberFormat: {
      decimal: ',',
      thousands: '.',
    },
    region: 'de-DE'
  }
} as const;

// TEMPORAL: Comentado hasta resolver compatibilidad con Next.js 15.4.3
// export default getRequestConfig(async ({ locale }) => {
//   // Validar que el locale existe
//   if (!locales.includes(locale as Locale)) {
//     notFound();
//   }

//   try {
//     return {
//       messages: (await import(`../messages/${locale}.json`)).default,
//       timeZone: 'America/Mexico_City', // Zona horaria por defecto
//     };
//   } catch (error) {
//     console.error(`Error loading messages for locale ${locale}:`, error);
//     notFound();
//   }
// });

// Función temporal para obtener mensajes
export async function getMessages(locale: Locale) {
  try {
    return (await import(`./messages/${locale}.json`)).default;
  } catch {
    return (await import(`./messages/${defaultLocale}.json`)).default;
  }
}
