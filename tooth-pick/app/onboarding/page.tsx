'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { 
  ArrowLeft, 
  Home, 
  RefreshCw, 
  AlertTriangle,
  CheckCircle,
  Clock,
  Users
} from 'lucide-react';

import OnboardingFlow from '@/components/onboarding/OnboardingFlow';

interface OnboardingPageState {
  isLoading: boolean;
  error: string | null;
  hasAccess: boolean;
  userRole: 'provider' | 'distributor' | 'clinic' | 'admin' | null;
  isCompleted: boolean;
}

export default function OnboardingPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [state, setState] = useState<OnboardingPageState>({
    isLoading: true,
    error: null,
    hasAccess: false,
    userRole: null,
    isCompleted: false
  });

  // Parámetros de URL
  const userId = searchParams.get('userId');
  const forceRole = searchParams.get('role') as 'provider' | 'distributor' | 'clinic' | 'admin' | null;
  const restart = searchParams.get('restart') === 'true';

  useEffect(() => {
    if (status === 'loading') return;
    
    if (status === 'unauthenticated') {
      router.push('/login?redirect=/onboarding');
      return;
    }

    if (!session?.user) {
      setState(prev => ({ ...prev, error: 'Sesión no válida', isLoading: false }));
      return;
    }

    // Verificar acceso
    const targetUserId = userId || session.user.id;
    const hasAccess = targetUserId === session.user.id || session.user.role === 'admin';
    
    if (!hasAccess) {
      setState(prev => ({ 
        ...prev, 
        error: 'No tienes permisos para acceder a este onboarding',
        isLoading: false 
      }));
      return;
    }

    const userRole = forceRole || session.user.role || 'provider';
    
    setState(prev => ({
      ...prev,
      hasAccess: true,
      userRole: userRole as 'provider' | 'distributor' | 'clinic' | 'admin',
      isLoading: false
    }));

    // Si se solicita reiniciar, hacerlo
    if (restart) {
      handleRestart();
    }

  }, [session, status, userId, forceRole, restart, router]);

  const handleRestart = async () => {
    try {
      setState(prev => ({ ...prev, isLoading: true }));
      
      const targetUserId = userId || session?.user?.id;
      const response = await fetch(`/api/onboarding/flow?userId=${targetUserId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error('Error al reiniciar onboarding');
      }

      // Remover parámetro restart de URL
      const newSearchParams = new URLSearchParams(searchParams.toString());
      newSearchParams.delete('restart');
      router.replace(`/onboarding?${newSearchParams.toString()}`);
      
      setState(prev => ({ ...prev, isLoading: false, isCompleted: false }));
      
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        error: error instanceof Error ? error.message : 'Error al reiniciar',
        isLoading: false 
      }));
    }
  };

  const handleOnboardingComplete = () => {
    setState(prev => ({ ...prev, isCompleted: true }));
  };

  const handleSaveProgress = async (stepId: string) => {
    try {
      // Lógica adicional para guardar progreso si es necesario
      console.log('Progreso guardado para paso:', stepId);
    } catch (error) {
      console.error('Error guardando progreso:', error);
    }
  };

  const getRoleDisplayName = (role: string) => {
    switch (role) {
      case 'provider':
        return 'Proveedor';
      case 'distributor':
        return 'Distribuidor';
      case 'clinic':
        return 'Clínica';
      case 'admin':
        return 'Administrador';
      default:
        return role;
    }
  };

  // Estados de carga y error
  if (status === 'loading' || state.isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <h2 className="text-xl font-semibold mb-2">Cargando onboarding</h2>
            <p className="text-gray-600">Preparando tu experiencia personalizada...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (state.error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-pink-100 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-700">
              <AlertTriangle className="h-5 w-5" />
              Error de Acceso
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Alert className="mb-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{state.error}</AlertDescription>
            </Alert>
            
            <div className="flex gap-3 justify-center">
              <Button onClick={() => router.push('/dashboard')} variant="outline">
                <Home className="h-4 w-4 mr-2" />
                Ir al Dashboard
              </Button>
              
              <Button onClick={() => window.location.reload()} variant="default">
                <RefreshCw className="h-4 w-4 mr-2" />
                Reintentar
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!state.hasAccess || !state.userRole) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <AlertTriangle className="h-12 w-12 text-orange-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Acceso Denegado</h2>
            <p className="text-gray-600 mb-4">
              No tienes permisos para acceder a este onboarding.
            </p>
            <Button onClick={() => router.push('/dashboard')}>
              <Home className="h-4 w-4 mr-2" />
              Volver al Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Mostrar mensaje de completado si ya terminó
  if (state.isCompleted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">¡Felicitaciones!</h2>
            <p className="text-gray-600 mb-6">
              Has completado exitosamente el proceso de configuración de ToothPick.
            </p>
            
            <div className="space-y-3">
              <Button onClick={() => router.push('/dashboard')} className="w-full">
                <Home className="h-4 w-4 mr-2" />
                Ir al Dashboard
              </Button>
              
              <Button 
                onClick={() => router.push('/onboarding?restart=true')} 
                variant="outline"
                className="w-full"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Revisar Configuración
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Renderizar componente principal de onboarding
  return (
    <div className="min-h-screen bg-gray-50">
      
      {/* Header con información contextual */}
      <div className="bg-white border-b">
        <div className="max-w-4xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => router.push('/dashboard')}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Dashboard
              </Button>
              
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-semibold">Configuración Inicial</h1>
                <Badge variant="outline" className="capitalize">
                  {getRoleDisplayName(state.userRole)}
                </Badge>
              </div>
            </div>

            {/* Información adicional para admins */}
            {session?.user?.role === 'admin' && userId && userId !== session.user.id && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Users className="h-4 w-4" />
                <span>Gestionando usuario: {userId}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Componente principal */}
      <OnboardingFlow
        userId={userId || session?.user?.id}
        userRole={state.userRole}
        onComplete={handleOnboardingComplete}
        onSaveProgress={handleSaveProgress}
        autoSave={true}
      />

    </div>
  );
}
