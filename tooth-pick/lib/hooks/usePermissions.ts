'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';

export interface PermissionKey {
  // Gestión de usuarios y roles
  MANAGE_USERS: 'MANAGE_USERS';
  VIEW_USERS: 'VIEW_USERS';
  ASSIGN_ROLES: 'ASSIGN_ROLES';
  
  // Gestión de pedidos
  VIEW_ORDERS: 'VIEW_ORDERS';
  MANAGE_ORDERS: 'MANAGE_ORDERS';
  PROCESS_ORDERS: 'PROCESS_ORDERS';
  CANCEL_ORDERS: 'CANCEL_ORDERS';
  
  // Gestión de productos
  VIEW_PRODUCTS: 'VIEW_PRODUCTS';
  MANAGE_PRODUCTS: 'MANAGE_PRODUCTS';
  EDIT_PRICES: 'EDIT_PRICES';
  MANAGE_INVENTORY: 'MANAGE_INVENTORY';
  
  // Citas y programación
  VIEW_APPOINTMENTS: 'VIEW_APPOINTMENTS';
  MANAGE_APPOINTMENTS: 'MANAGE_APPOINTMENTS';
  SCHEDULE_APPOINTMENTS: 'SCHEDULE_APPOINTMENTS';
  
  // Finanzas y facturación
  VIEW_FINANCIAL_REPORTS: 'VIEW_FINANCIAL_REPORTS';
  MANAGE_INVOICES: 'MANAGE_INVOICES';
  PROCESS_PAYMENTS: 'PROCESS_PAYMENTS';
  
  // Configuración organizacional
  MANAGE_ORGANIZATION_SETTINGS: 'MANAGE_ORGANIZATION_SETTINGS';
  VIEW_ANALYTICS: 'VIEW_ANALYTICS';
  MANAGE_STAFF: 'MANAGE_STAFF';
  
  // Sistema de gamificación
  ACCESS_GAMIFICATION: 'ACCESS_GAMIFICATION';
  MANAGE_REWARDS: 'MANAGE_REWARDS';
  VIEW_LEADERBOARD: 'VIEW_LEADERBOARD';
  
  // Marketing y promociones
  MANAGE_PROMOTIONS: 'MANAGE_PROMOTIONS';
  VIEW_MARKETING_ANALYTICS: 'VIEW_MARKETING_ANALYTICS';
  SEND_NOTIFICATIONS: 'SEND_NOTIFICATIONS';
}

export interface UserPermissions {
  organizationId: string;
  permissions: string[];
  role: string;
  isOwner: boolean;
}

export function usePermissions(organizationId?: string) {
  const { data: session } = useSession();
  const [permissions, setPermissions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string>('');
  const [isOwner, setIsOwner] = useState(false);

  const loadPermissions = useCallback(async () => {
    if (!session?.user?.id || !organizationId) {
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(`/api/organizations/${organizationId}/permissions/${session.user.id}`);
      if (response.ok) {
        const data: UserPermissions = await response.json();
        setPermissions(data.permissions);
        setUserRole(data.role);
        setIsOwner(data.isOwner);
      } else {
        console.error('Error loading permissions');
        setPermissions([]);
      }
    } catch (error) {
      console.error('Error loading permissions:', error);
      setPermissions([]);
    } finally {
      setLoading(false);
    }
  }, [session?.user?.id, organizationId]);

  useEffect(() => {
    loadPermissions();
  }, [loadPermissions]);

  const hasPermission = useCallback((permission: keyof PermissionKey): boolean => {
    return isOwner || permissions.includes(permission);
  }, [permissions, isOwner]);

  const hasAnyPermission = useCallback((requiredPermissions: (keyof PermissionKey)[]): boolean => {
    return isOwner || requiredPermissions.some(permission => permissions.includes(permission));
  }, [permissions, isOwner]);

  const hasAllPermissions = useCallback((requiredPermissions: (keyof PermissionKey)[]): boolean => {
    return isOwner || requiredPermissions.every(permission => permissions.includes(permission));
  }, [permissions, isOwner]);

  // Permisos por categorías
  const canManageUsers = hasAnyPermission(['MANAGE_USERS', 'ASSIGN_ROLES']);
  const canManageOrders = hasAnyPermission(['MANAGE_ORDERS', 'PROCESS_ORDERS']);
  const canManageProducts = hasAnyPermission(['MANAGE_PRODUCTS', 'EDIT_PRICES']);
  const canViewFinancials = hasAnyPermission(['VIEW_FINANCIAL_REPORTS', 'MANAGE_INVOICES']);
  const canManageSettings = hasPermission('MANAGE_ORGANIZATION_SETTINGS');
  const canAccessGamification = hasPermission('ACCESS_GAMIFICATION');

  return {
    permissions,
    userRole,
    isOwner,
    loading,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    // Permisos específicos comunes
    canManageUsers,
    canManageOrders,
    canManageProducts,
    canViewFinancials,
    canManageSettings,
    canAccessGamification,
    // Funciones de utilidad
    reload: loadPermissions
  };
}

// Hook para verificar permisos sin cargar automáticamente
export function usePermissionChecker() {
  const checkPermissions = useCallback(async (userId: string, organizationId: string): Promise<UserPermissions | null> => {
    try {
      const response = await fetch(`/api/organizations/${organizationId}/permissions/${userId}`);
      if (response.ok) {
        return await response.json();
      }
      return null;
    } catch (error) {
      console.error('Error checking permissions:', error);
      return null;
    }
  }, []);

  return { checkPermissions };
}

// Componente HOC para proteger rutas con permisos
export function withPermissions<T extends object>(
  Component: React.ComponentType<T>,
  requiredPermissions: (keyof PermissionKey)[],
  organizationId?: string
) {
  return function ProtectedComponent(props: T) {
    const { hasAnyPermission, loading } = usePermissions(organizationId);

    if (loading) {
      return (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      );
    }

    if (!hasAnyPermission(requiredPermissions)) {
      return (
        <div className="flex flex-col items-center justify-center h-64 text-center">
          <div className="text-gray-400 mb-4">
            <svg className="h-16 w-16 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Acceso restringido
          </h3>
          <p className="text-gray-500">
            No tienes permisos para acceder a esta sección
          </p>
        </div>
      );
    }

    return <Component {...props} />;
  };
}
