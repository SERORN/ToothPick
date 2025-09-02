import React from 'react';
import { Metadata } from 'next';
import NotificationDemo from '@/components/notifications/NotificationDemo';

export const metadata: Metadata = {
  title: 'Demo - Sistema de Notificaciones | ToothPick',
  description: 'Prueba el sistema de notificaciones en tiempo real de ToothPick. Ve ejemplos de notificaciones de pedidos, verificación, soporte y más.',
  keywords: ['demo', 'notificaciones', 'prueba', 'sistema', 'tiempo real']
};

export default function NotificationDemoPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto py-8">
        <NotificationDemo />
      </div>
    </div>
  );
}
