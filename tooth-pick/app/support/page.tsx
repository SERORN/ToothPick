import React from 'react';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { redirect } from 'next/navigation';
import SupportTicketList from '@/components/SupportTicketList';
import FAQList from '@/components/FAQList';

export default async function SupportPage() {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    redirect('/login');
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Centro de Soporte
          </h1>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Encuentra respuestas rápidas en nuestras preguntas frecuentes o crea un ticket para recibir ayuda personalizada.
          </p>
        </div>

        {/* Acciones rápidas */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <a
            href="/support/new"
            className="bg-white border-2 border-dashed border-blue-300 rounded-lg p-6 hover:border-blue-400 hover:bg-blue-50 transition-colors"
          >
            <div className="text-center">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Crear Ticket
              </h3>
              <p className="text-gray-600 text-sm">
                ¿Necesitas ayuda específica? Crea un ticket y nuestro equipo te ayudará.
              </p>
            </div>
          </a>

          <a
            href="/faq"
            className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow"
          >
            <div className="text-center">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Preguntas Frecuentes
              </h3>
              <p className="text-gray-600 text-sm">
                Encuentra respuestas inmediatas a las preguntas más comunes.
              </p>
            </div>
          </a>

          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <div className="text-center">
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Contacto Directo
              </h3>
              <p className="text-gray-600 text-sm mb-3">
                Para consultas urgentes, contáctanos directamente.
              </p>
              <a 
                href="mailto:support@toothpick.com"
                className="text-purple-600 hover:text-purple-800 text-sm font-medium"
              >
                support@toothpick.com
              </a>
            </div>
          </div>
        </div>

        {/* Contenido principal en dos columnas */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Mis tickets */}
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-900">
                Mis Tickets
              </h2>
              <a
                href="/support/new"
                className="text-blue-600 hover:text-blue-800 text-sm font-medium"
              >
                Crear nuevo →
              </a>
            </div>
            <SupportTicketList showFilters={false} limit={5} />
          </div>

          {/* FAQs destacadas */}
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-900">
                Preguntas Frecuentes
              </h2>
              <a
                href="/faq"
                className="text-blue-600 hover:text-blue-800 text-sm font-medium"
              >
                Ver todas →
              </a>
            </div>
            <FAQList limit={5} />
          </div>
        </div>

        {/* Información adicional */}
        <div className="mt-12 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <div className="text-center">
            <h3 className="text-lg font-semibold text-blue-900 mb-2">
              ¿Necesitas ayuda inmediata?
            </h3>
            <p className="text-blue-700 mb-4">
              Nuestro equipo de soporte está disponible de lunes a viernes de 9:00 AM a 6:00 PM.
            </p>
            <div className="flex justify-center space-x-4">
              <span className="text-blue-600 text-sm">
                📞 +1 (555) 123-4567
              </span>
              <span className="text-blue-600 text-sm">
                ✉️ support@toothpick.com
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
