import NextAuth from 'next-auth';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      role: 'admin' | 'provider' | 'distributor' | 'customer' | 'dentist' | 'patient';
      // 🌐 Campos de internacionalización
      preferredLanguage?: 'es' | 'en' | 'pt' | 'de';
      preferredCurrency?: 'MXN' | 'USD' | 'BRL' | 'ARS' | 'COP' | 'CLP' | 'EUR';
      timezone?: string;
      dateFormat?: string;
      numberFormat?: {
        decimal: string;
        thousands: string;
      };
    };
  }

  interface User {
    id: string;
    email: string;
    name: string;
    role: 'admin' | 'provider' | 'distributor' | 'customer' | 'dentist' | 'patient';
    // 🌐 Campos de internacionalización
    preferredLanguage?: 'es' | 'en' | 'pt' | 'de';
    preferredCurrency?: 'MXN' | 'USD' | 'BRL' | 'ARS' | 'COP' | 'CLP' | 'EUR';
    timezone?: string;
    dateFormat?: string;
    numberFormat?: {
      decimal: string;
      thousands: string;
    };
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    role: 'admin' | 'provider' | 'distributor' | 'customer' | 'dentist' | 'patient';
    // 🌐 Campos de internacionalización
    preferredLanguage?: 'es' | 'en' | 'pt' | 'de';
    preferredCurrency?: 'MXN' | 'USD' | 'BRL' | 'ARS' | 'COP' | 'CLP' | 'EUR';
    timezone?: string;
    dateFormat?: string;
    numberFormat?: {
      decimal: string;
      thousands: string;
    };
  }
}
