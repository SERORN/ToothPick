// 🎯 FASE 30: Página Principal del Dashboard de Analytics
// ✅ Dashboard completo de analytics y reportes con todos los componentes

import AnalyticsDashboard from '@/components/analytics/AnalyticsDashboard';

export default function AnalyticsPage() {
  // En producción, estos valores vendrían de la sesión del usuario
  const organizationId = 'org-1'; // Mock organization ID
  const userRole = 'admin' as const; // Mock user role

  return (
    <AnalyticsDashboard 
      organizationId={organizationId}
      userRole={userRole}
    />
  );
}
