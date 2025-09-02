// 🔐 FASE 29: Utilidades de Autenticación para API de Pagos
// ✅ Funciones auxiliares para autenticación y autorización

import { NextRequest } from 'next/server';
// import { auth } from '@/lib/auth'; // Descomentar cuando esté disponible

export interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  organizationId?: string;
}

export interface Organization {
  id: string;
  name: string;
  type: string;
  isActive: boolean;
}

/**
 * 👤 Obtener usuario desde request autenticado
 */
export async function getUserFromRequest(request: NextRequest): Promise<User | null> {
  try {
    // TODO: Implementar autenticación real con NextAuth
    // const session = await auth();
    
    // Por ahora retornamos un usuario mock para desarrollo
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return null;
    }

    // Mock user para desarrollo
    return {
      id: 'user_mock_123',
      email: 'user@toothpick.com',
      name: 'Usuario Ejemplo',
      role: 'admin',
      organizationId: 'org_mock_123'
    };
  } catch (error) {
    console.error('Error obteniendo usuario:', error);
    return null;
  }
}

/**
 * 🏢 Obtener organización del usuario
 */
export async function getUserOrganization(userId: string): Promise<Organization | null> {
  try {
    // Por ahora retornamos una organización mock
    // En producción, esto debería consultar la base de datos
    return {
      id: `org_${userId}`,
      name: 'Organización Ejemplo',
      type: 'dentist',
      isActive: true
    };
  } catch (error) {
    console.error('Error obteniendo organización:', error);
    return null;
  }
}

/**
 * 🔒 Verificar permisos de usuario
 */
export function hasPermission(user: User, permission: string): boolean {
  const rolePermissions: Record<string, string[]> = {
    'admin': ['payments:read', 'payments:write', 'payments:refund', 'payments:manage'],
    'manager': ['payments:read', 'payments:write', 'payments:refund'],
    'user': ['payments:read', 'payments:write'],
    'viewer': ['payments:read']
  };

  const userPermissions = rolePermissions[user.role] || [];
  return userPermissions.includes(permission);
}

/**
 * 💰 Verificar límites de transacción
 */
export function validateTransactionLimits(
  user: User,
  amount: number,
  currency: string
): { valid: boolean; error?: string } {
  const roleLimits: Record<string, Record<string, number>> = {
    'admin': { USD: 1000000, MXN: 20000000, EUR: 900000 },
    'manager': { USD: 100000, MXN: 2000000, EUR: 90000 },
    'user': { USD: 10000, MXN: 200000, EUR: 9000 },
    'viewer': { USD: 0, MXN: 0, EUR: 0 }
  };

  const userLimit = roleLimits[user.role]?.[currency] || 0;
  
  if (amount > userLimit) {
    return {
      valid: false,
      error: `Monto excede el límite de ${userLimit} ${currency} para el rol ${user.role}`
    };
  }

  return { valid: true };
}

/**
 * 📱 Extraer IP del request
 */
export function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const real = request.headers.get('x-real-ip');
  
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  
  if (real) {
    return real;
  }
  
  return 'unknown';
}

/**
 * 🌍 Detectar país desde IP (mock)
 */
export function getCountryFromIP(ip: string): string {
  // En producción, usar servicio de geolocalización
  const mockCountries = ['MX', 'US', 'BR', 'CA', 'ES'];
  return mockCountries[Math.floor(Math.random() * mockCountries.length)];
}

/**
 * 🔍 Validar organización activa
 */
export async function validateActiveOrganization(organizationId: string): Promise<boolean> {
  try {
    // En producción, consultar base de datos
    return true;
  } catch (error) {
    console.error('Error validando organización:', error);
    return false;
  }
}

/**
 * 📊 Log de actividad de pagos
 */
export async function logPaymentActivity(
  userId: string,
  organizationId: string,
  action: string,
  details: any,
  ip: string
): Promise<void> {
  try {
    const logEntry = {
      userId,
      organizationId,
      action,
      details,
      ip,
      timestamp: new Date(),
      userAgent: 'unknown' // Se podría extraer del request
    };

    // En producción, guardar en base de datos o sistema de logs
    console.log('Payment Activity Log:', logEntry);
  } catch (error) {
    console.error('Error logging payment activity:', error);
  }
}

/**
 * ⚡ Rate limiting por usuario
 */
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

export function checkRateLimit(
  userId: string,
  maxRequests: number = 100,
  windowMs: number = 60000 // 1 minuto
): { allowed: boolean; remaining: number; resetTime: number } {
  const now = Date.now();
  const userKey = `payments_${userId}`;
  const userLimit = rateLimitStore.get(userKey);

  if (!userLimit || now > userLimit.resetTime) {
    // Resetear límite
    rateLimitStore.set(userKey, {
      count: 1,
      resetTime: now + windowMs
    });
    
    return {
      allowed: true,
      remaining: maxRequests - 1,
      resetTime: now + windowMs
    };
  }

  if (userLimit.count >= maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetTime: userLimit.resetTime
    };
  }

  userLimit.count++;
  rateLimitStore.set(userKey, userLimit);

  return {
    allowed: true,
    remaining: maxRequests - userLimit.count,
    resetTime: userLimit.resetTime
  };
}

/**
 * 🛡️ Sanitizar entrada de datos
 */
export function sanitizeInput(input: any): any {
  if (typeof input === 'string') {
    return input.trim().replace(/[<>\"']/g, '');
  }
  
  if (typeof input === 'object' && input !== null) {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(input)) {
      sanitized[key] = sanitizeInput(value);
    }
    return sanitized;
  }
  
  return input;
}

/**
 * 💳 Validar formato de datos de pago
 */
export function validatePaymentData(data: any): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!data.amount || typeof data.amount !== 'number' || data.amount <= 0) {
    errors.push('Monto inválido');
  }

  if (!data.currency || typeof data.currency !== 'string' || !/^[A-Z]{3}$/.test(data.currency)) {
    errors.push('Moneda inválida');
  }

  if (!data.methodId || typeof data.methodId !== 'string') {
    errors.push('ID de método de pago inválido');
  }

  if (data.description && typeof data.description !== 'string') {
    errors.push('Descripción inválida');
  }

  if (data.returnUrl && typeof data.returnUrl !== 'string') {
    errors.push('URL de retorno inválida');
  }

  if (data.cancelUrl && typeof data.cancelUrl !== 'string') {
    errors.push('URL de cancelación inválida');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}
