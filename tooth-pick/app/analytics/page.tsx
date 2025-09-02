// 📊 FASE 39: Página principal del dashboard de analytics
// Punto de entrada para todas las vistas de analytics

import React from 'react';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { redirect } from 'next/navigation';
import AdminDashboard from '@/components/AdminDashboard';
import AnalyticsDashboard from '@/components/AnalyticsDashboard';

export default async function AnalyticsPage() {
  const session = await getServerSession(authOptions);

  // Redirigir si no está autenticado
  if (!session?.user) {
    redirect('/login');
  }

  // Determinar qué dashboard mostrar según el rol
  const userRole = session.user.role;

  // Si es proveedor (temporalmente como admin), mostrar AdminDashboard
  if (userRole === 'provider') {
    return <AdminDashboard />;
  }

  // Para otros roles, mostrar el dashboard general
  return <AnalyticsDashboard />;
}

export const metadata = {
  title: 'Analytics Dashboard - ToothPick',
  description: 'Centro de métricas y business intelligence para ToothPick',
};
