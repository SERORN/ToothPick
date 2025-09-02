import { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import AdminVerificationDashboard from '@/components/verification/admin/AdminVerificationDashboard';

export const metadata: Metadata = {
  title: 'Gestión de Verificaciones | Admin - Tooth Pick',
  description: 'Dashboard administrativo para gestionar verificaciones de proveedores',
};

export default async function AdminVerificationPage() {
  const session = await getServerSession();

  if (!session?.user) {
    redirect('/login?callbackUrl=/admin/verification');
  }

  // En un escenario real, aquí verificarías si el usuario tiene rol de admin
  // if (session.user.role !== 'admin') {
  //   redirect('/dashboard');
  // }

  return <AdminVerificationDashboard />;
}
