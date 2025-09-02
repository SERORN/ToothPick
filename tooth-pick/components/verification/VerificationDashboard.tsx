'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import VerificationForm from '@/components/verification/VerificationForm';
import VerificationStatus from '@/components/verification/VerificationStatus';

export default function VerificationDashboard() {
  const [activeTab, setActiveTab] = useState('status');
  const [hasVerificationRequest, setHasVerificationRequest] = useState<boolean | null>(null);

  useEffect(() => {
    // Verificar si el usuario ya tiene una solicitud
    const checkVerificationStatus = async () => {
      try {
        const response = await fetch('/api/verification/status');
        const result = await response.json();
        
        if (response.ok) {
          setHasVerificationRequest(result.data.hasRequest);
        }
      } catch (error) {
        console.error('Error checking verification status:', error);
      }
    };

    checkVerificationStatus();
  }, []);

  const handleRequestSubmit = () => {
    setActiveTab('submit');
  };

  const handleSubmissionSuccess = () => {
    setHasVerificationRequest(true);
    setActiveTab('status');
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Verificación de Proveedor/Distribuidor</h1>
        <p className="text-gray-600">
          Completa tu proceso de verificación para poder vender productos en la plataforma
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="status">Estado de Verificación</TabsTrigger>
          <TabsTrigger value="submit">
            {hasVerificationRequest ? 'Nueva Solicitud' : 'Enviar Solicitud'}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="status" className="space-y-6">
          <VerificationStatus onRequestSubmit={handleRequestSubmit} />
        </TabsContent>

        <TabsContent value="submit" className="space-y-6">
          <VerificationForm onSubmissionSuccess={handleSubmissionSuccess} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
