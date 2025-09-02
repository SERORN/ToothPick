import React from 'react';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { redirect } from 'next/navigation';
import SupportTicketDetail from '@/components/SupportTicketDetail';

interface SupportTicketPageProps {
  params: {
    id: string;
  };
}

export default async function SupportTicketPage({ params }: SupportTicketPageProps) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    redirect('/login');
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb */}
        <nav className="mb-6">
          <ol className="flex items-center space-x-2 text-sm text-gray-500">
            <li>
              <a href="/support" className="hover:text-blue-600">
                Soporte
              </a>
            </li>
            <li>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </li>
            <li className="text-gray-900 font-medium">
              Ticket #{params.id}
            </li>
          </ol>
        </nav>

        {/* Ticket Detail */}
        <SupportTicketDetail ticketId={params.id} />
      </div>
    </div>
  );
}
