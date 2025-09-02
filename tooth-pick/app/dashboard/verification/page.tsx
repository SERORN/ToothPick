import { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import VerificationDashboard from '@/components/verification/VerificationDashboard';

export const metadata: Metadata = {
  title: 'Verificación de Proveedor | Tooth Pick',
  description: 'Completa tu proceso de verificación para vender en la plataforma',
};

export default async function VerificationPage() {
  const session = await getServerSession();

  if (!session?.user) {
    redirect('/login?callbackUrl=/dashboard/verification');
  }

  return <VerificationDashboard />;
}
