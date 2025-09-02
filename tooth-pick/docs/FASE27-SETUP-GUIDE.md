# 🔧 Guía de Configuración Final - FASE 27

## 📦 Instalación de Dependencias Pendientes

Para completar la configuración de internacionalización, ejecuta los siguientes comandos:

```bash
# Instalar dependencias principales
npm install next-intl currency.js dayjs

# Instalar plugins de dayjs para localización
npm install dayjs/plugin/timezone dayjs/plugin/utc dayjs/plugin/relativeTime dayjs/plugin/localizedFormat
```

## ⚙️ Activación del Middleware

Una vez instaladas las dependencias, actualiza `middleware.ts`:

```typescript
// Descomenta estas líneas:
import createIntlMiddleware from 'next-intl/middleware';
import { locales, defaultLocale } from './i18n';

// Descomenta la configuración:
const intlMiddleware = createIntlMiddleware({
  locales,
  defaultLocale,
  localePrefix: 'as-needed'
});
```

## 🔗 Integración en Layout Principal

Agrega los providers en `app/layout.tsx`:

```typescript
import { LocaleProvider } from '@/lib/hooks/useLocale';
import { CurrencyProvider } from '@/lib/hooks/useCurrency';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html>
      <body>
        <LocaleProvider>
          <CurrencyProvider>
            {children}
          </CurrencyProvider>
        </LocaleProvider>
      </body>
    </html>
  );
}
```

## 🎯 Testing de Funcionalidades

1. **Accede a la demo**: `/demo/localization`
2. **Cambia idioma**: Usa el selector de idioma
3. **Cambia moneda**: Usa el selector de moneda
4. **Verifica conversiones**: Revisa que los precios se actualicen
5. **Verifica fechas**: Confirma formato regional correcto

## 🌐 URLs de Testing

- Demo completa: `http://localhost:3000/demo/localization`
- API de preferencias: `http://localhost:3000/api/user/locale`
- Selector de idioma: Disponible en componentes de UI

## 📝 Verificación Final

- [ ] Dependencias instaladas correctamente
- [ ] Middleware activado sin errores
- [ ] Providers integrados en layout
- [ ] Demo funcionando completamente
- [ ] API respondiendo correctamente
- [ ] Selectores de UI operativos
- [ ] Conversiones de moneda activas
- [ ] Formateo de fechas regional
- [ ] Persistencia de preferencias

Una vez completados estos pasos, el sistema de internacionalización estará 100% operativo.

## 🚀 Estado Post-Configuración

**FASE 27 SERÁ COMPLETAMENTE FUNCIONAL** ✅

¡El sistema de internacionalización estará listo para producción!
