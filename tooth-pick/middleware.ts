import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
// TEMPORAL: Comentado hasta resolver compatibilidad con Next.js 15.4.3
// import createIntlMiddleware from 'next-intl/middleware';
import { SubscriptionMiddleware } from '@/lib/middleware/subscription-edge';
// TEMPORAL: Importamos directamente las constantes
// import { locales, defaultLocale } from './i18n';

// 🌐 CONFIGURACIÓN DE LOCALIZACIÓN (MANUAL MIENTRAS SE RESUELVE next-intl)
const locales = ['es', 'en', 'pt', 'de'];
const defaultLocale = 'es';

// Configuración de i18n middleware (comentado hasta instalar next-intl)
// const intlMiddleware = createIntlMiddleware({
//   locales,
//   defaultLocale,
//   localePrefix: 'as-needed'
// });

// Configuración de protección de rutas
interface RouteProtection {
  requiredPlan?: 'Pro' | 'Elite';
  feature?: string;
}

// Rutas que requieren validación de suscripción
const PROTECTED_ROUTES: Record<string, RouteProtection> = {
  // Rutas que requieren plan Pro o superior
  '/admin/analytics': { requiredPlan: 'Pro' },
  '/admin/marketplace': { requiredPlan: 'Pro' },
  '/admin/export': { requiredPlan: 'Pro' },
  
  // Rutas que requieren plan Elite
  '/admin/custom-website': { requiredPlan: 'Elite' },
  '/admin/marketing-automation': { requiredPlan: 'Elite' },
  '/admin/white-label': { requiredPlan: 'Elite' },
  
  // Rutas que requieren características específicas
  '/api/appointments/create': { feature: 'create_appointment' },
  '/api/appointments/bulk': { requiredPlan: 'Pro' },
  '/api/analytics': { feature: 'advanced_analytics', requiredPlan: 'Pro' },
  '/api/export': { feature: 'export_data', requiredPlan: 'Pro' },
};

// Rutas públicas que no requieren validación
const PUBLIC_ROUTES = [
  '/',
  '/login',
  '/register',
  '/api/auth',
  '/subscription',
  '/api/subscription',
  '/pricing'
];

/**
 * Obtiene el userId de la request (simulado para desarrollo)
 */
function getUserIdFromRequest(request: NextRequest): string | null {
  // TODO: Implementar extracción real del userId desde JWT o session
  // Por ahora retornamos un usuario demo para testing
  return 'demo-user-id';
}

/**
 * 🌐 Detecta el locale preferido del usuario
 */
function getLocaleFromRequest(request: NextRequest): string {
  // 1. Intentar obtener desde cookie
  const cookieLocale = request.cookies.get('locale')?.value;
  if (cookieLocale && locales.includes(cookieLocale)) {
    return cookieLocale;
  }
  
  // 2. Intentar obtener desde Accept-Language header
  const acceptLanguage = request.headers.get('accept-language');
  if (acceptLanguage) {
    const browserLocale = acceptLanguage.split(',')[0].split('-')[0];
    
    if (locales.includes(browserLocale)) {
      return browserLocale;
    }
    
    // Mapeo de códigos específicos
    const localeMapping: Record<string, string> = {
      'pt-BR': 'pt',
      'pt-PT': 'pt',
      'en-US': 'en',
      'en-GB': 'en',
      'es-ES': 'es',
      'es-MX': 'es',
      'de-DE': 'de',
      'de-AT': 'de'
    };
    
    const fullLocale = acceptLanguage.split(',')[0];
    if (localeMapping[fullLocale]) {
      return localeMapping[fullLocale];
    }
  }
  
  // 3. Fallback al locale por defecto
  return defaultLocale;
}

/**
 * Verifica si una ruta es pública
 */
function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTES.some(route => 
    pathname === route || 
    pathname.startsWith(route + '/') ||
    pathname.startsWith('/api/auth/')
  );
}

/**
 * Obtiene la configuración de protección para una ruta
 */
function getRouteProtection(pathname: string): RouteProtection | null {
  // Buscar coincidencia exacta
  if (PROTECTED_ROUTES[pathname]) {
    return PROTECTED_ROUTES[pathname];
  }
  
  // Buscar coincidencias con patrones
  for (const [route, config] of Object.entries(PROTECTED_ROUTES)) {
    if (pathname.startsWith(route)) {
      return config;
    }
  }
  
  return null;
}

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  
  // 🌐 MANEJO DE LOCALIZACIÓN
  // Detectar y establecer locale si no está presente
  const locale = getLocaleFromRequest(request);
  const response = NextResponse.next();
  
  // Establecer cookie de locale si no existe o es diferente
  const currentLocale = request.cookies.get('locale')?.value;
  if (!currentLocale || currentLocale !== locale) {
    response.cookies.set('locale', locale, {
      maxAge: 31536000, // 1 año
      path: '/',
      sameSite: 'lax'
    });
  }
  
  // Agregar headers de localización
  response.headers.set('X-Locale', locale);
  response.headers.set('X-Default-Locale', defaultLocale);
  
  // Saltar rutas públicas
  if (isPublicRoute(pathname)) {
    return response;
  }
  
  // Obtener userId (en producción vendría del token JWT)
  const userId = getUserIdFromRequest(request);
  
  if (!userId) {
    // Redirigir a login si no hay usuario autenticado
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }
  
  // Verificar si la ruta requiere validación de suscripción
  const protection = getRouteProtection(pathname);
  
  if (!protection) {
    // Ruta no protegida por suscripción
    return response;
  }
  
  // Validar acceso según suscripción
  try {
    const validation = await SubscriptionMiddleware.validateFeatureAccess(
      userId,
      protection.feature || 'basic',
      protection.requiredPlan as any
    );
    
    if (!validation.hasAccess) {
      // Si es una API route, retornar JSON
      if (pathname.startsWith('/api/')) {
        return NextResponse.json({
          error: 'Acceso denegado',
          reason: validation.reason,
          upgradeRequired: validation.upgradeRequired,
          limitExceeded: validation.limitExceeded,
          trialExpired: validation.trialExpired,
          subscription: {
            plan: validation.subscription?.plan,
            status: validation.subscription?.status
          }
        }, { status: 403 });
      }
      
      // Para rutas de página, redirigir a upgrade
      const upgradeUrl = new URL('/subscription', request.url);
      upgradeUrl.searchParams.set('reason', validation.reason || 'upgrade_required');
      upgradeUrl.searchParams.set('from', pathname);
      
      if (validation.upgradeRequired) {
        upgradeUrl.searchParams.set('action', 'upgrade');
      }
      
      return NextResponse.redirect(upgradeUrl);
    }
    
    // Acceso permitido - agregar información de suscripción y locale a headers
    response.headers.set('X-User-Plan', validation.subscription?.plan || 'Free');
    response.headers.set('X-User-Subscription-Status', validation.subscription?.status || 'unknown');
    
    return response;
    
  } catch (error) {
    console.error('Error in subscription middleware:', error);
    
    // En caso de error, permitir acceso pero log el error
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({
        error: 'Error interno del servidor'
      }, { status: 500 });
    }
    
    return NextResponse.next();
  }
}

export const config = {
  /*
   * Aplicar middleware a todas las rutas excepto:
   * - _next/static (archivos estáticos)
   * - _next/image (optimización de imágenes)
   * - favicon.ico
   * - public folder
   */
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|public).*)',
  ],
};
