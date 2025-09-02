'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  CheckCircle, 
  Circle, 
  ArrowLeft, 
  ArrowRight, 
  Save,
  RotateCcw,
  Sparkles,
  Info,
  Clock,
  Star
} from 'lucide-react';

import OnboardingStep from './OnboardingStep';
import StepIndicators from './StepIndicators';

interface OnboardingStepData {
  id: string;
  title: string;
  description: string;
  component: string;
  isCompleted: boolean;
  isOptional: boolean;
  estimatedTime: number; // minutos
  prerequisites?: string[];
  category: 'profile' | 'setup' | 'integration' | 'configuration' | 'launch';
  priority: 'high' | 'medium' | 'low';
}

interface OnboardingFlow {
  userRole: 'provider' | 'distributor' | 'clinic' | 'admin';
  currentStep: string;
  completedSteps: string[];
  totalSteps: number;
  estimatedTotalTime: number;
  steps: OnboardingStepData[];
}

interface OnboardingFlowProps {
  userId?: string;
  userRole?: 'provider' | 'distributor' | 'clinic' | 'admin';
  onComplete?: () => void;
  onSaveProgress?: (stepId: string) => void;
  autoSave?: boolean;
}

export function OnboardingFlow({ 
  userId, 
  userRole, 
  onComplete, 
  onSaveProgress,
  autoSave = true 
}: OnboardingFlowProps) {
  const [flow, setFlow] = useState<OnboardingFlow | null>(null);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  
  const router = useRouter();

  // Cargar el flujo de onboarding del usuario
  useEffect(() => {
    fetchOnboardingFlow();
  }, [userId, userRole]);

  // Auto-save cuando cambia el paso
  useEffect(() => {
    if (autoSave && flow && currentStepIndex > 0) {
      handleSaveProgress();
    }
  }, [currentStepIndex]);

  const fetchOnboardingFlow = async () => {
    try {
      setIsLoading(true);
      
      const params = new URLSearchParams();
      if (userId) params.append('userId', userId);
      if (userRole) params.append('role', userRole);
      
      const response = await fetch(`/api/onboarding/flow?${params}`);
      
      if (!response.ok) {
        throw new Error('Error loading onboarding flow');
      }
      
      const flowData = await response.json();
      setFlow(flowData.flow);
      
      // Encontrar el índice del paso actual
      const currentIndex = flowData.flow.steps.findIndex(
        (step: OnboardingStepData) => step.id === flowData.flow.currentStep
      );
      setCurrentStepIndex(Math.max(0, currentIndex));
      
    } catch (error) {
      console.error('Error fetching onboarding flow:', error);
      // Crear un flujo básico de fallback
      createFallbackFlow();
    } finally {
      setIsLoading(false);
    }
  };

  const createFallbackFlow = () => {
    const fallbackFlow: OnboardingFlow = {
      userRole: userRole || 'provider',
      currentStep: 'welcome',
      completedSteps: [],
      totalSteps: 3,
      estimatedTotalTime: 15,
      steps: [
        {
          id: 'welcome',
          title: 'Bienvenido a ToothPick',
          description: 'Comencemos configurando tu cuenta',
          component: 'WelcomeStep',
          isCompleted: false,
          isOptional: false,
          estimatedTime: 2,
          category: 'profile',
          priority: 'high'
        },
        {
          id: 'profile',
          title: 'Completa tu Perfil',
          description: 'Información básica de tu empresa',
          component: 'ProfileStep',
          isCompleted: false,
          isOptional: false,
          estimatedTime: 8,
          category: 'profile',
          priority: 'high'
        },
        {
          id: 'complete',
          title: 'Todo Listo',
          description: 'Tu cuenta está configurada',
          component: 'CompletionStep',
          isCompleted: false,
          isOptional: false,
          estimatedTime: 5,
          category: 'launch',
          priority: 'high'
        }
      ]
    };
    setFlow(fallbackFlow);
  };

  const handleSaveProgress = async () => {
    if (!flow || isSaving) return;
    
    try {
      setIsSaving(true);
      setSaveStatus('saving');
      
      const currentStep = flow.steps[currentStepIndex];
      
      const response = await fetch('/api/onboarding/step/complete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          stepId: currentStep.id,
          progress: {
            currentStepIndex,
            completedSteps: flow.completedSteps
          }
        }),
      });
      
      if (!response.ok) {
        throw new Error('Error saving progress');
      }
      
      setSaveStatus('saved');
      
      if (onSaveProgress) {
        onSaveProgress(currentStep.id);
      }
      
      // Auto-hide save status after 2 seconds
      setTimeout(() => setSaveStatus('idle'), 2000);
      
    } catch (error) {
      console.error('Error saving progress:', error);
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } finally {
      setIsSaving(false);
    }
  };

  const handleStepComplete = async (stepId: string, stepData?: any) => {
    if (!flow) return;
    
    // Marcar step como completado
    const updatedSteps = flow.steps.map(step => 
      step.id === stepId ? { ...step, isCompleted: true } : step
    );
    
    const updatedCompletedSteps = [...flow.completedSteps];
    if (!updatedCompletedSteps.includes(stepId)) {
      updatedCompletedSteps.push(stepId);
    }
    
    const updatedFlow = {
      ...flow,
      steps: updatedSteps,
      completedSteps: updatedCompletedSteps
    };
    
    setFlow(updatedFlow);
    
    // Guardar en base de datos
    try {
      await fetch('/api/onboarding/step/complete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          stepId,
          stepData,
          completed: true
        }),
      });
    } catch (error) {
      console.error('Error marking step as complete:', error);
    }
    
    // Avanzar al siguiente paso o mostrar completado
    if (currentStepIndex < flow.steps.length - 1) {
      setCurrentStepIndex(currentStepIndex + 1);
    } else {
      // Onboarding completado
      setShowCompletionModal(true);
      if (onComplete) {
        onComplete();
      }
    }
  };

  const handlePreviousStep = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(currentStepIndex - 1);
    }
  };

  const handleNextStep = () => {
    if (currentStepIndex < (flow?.steps.length || 0) - 1) {
      setCurrentStepIndex(currentStepIndex + 1);
    }
  };

  const handleSkipStep = async () => {
    const currentStep = flow?.steps[currentStepIndex];
    if (currentStep?.isOptional) {
      await handleStepComplete(currentStep.id, { skipped: true });
    }
  };

  const calculateProgress = (): number => {
    if (!flow) return 0;
    return Math.round((flow.completedSteps.length / flow.totalSteps) * 100);
  };

  const getTimeRemaining = (): number => {
    if (!flow) return 0;
    const remainingSteps = flow.steps.slice(currentStepIndex);
    return remainingSteps.reduce((total, step) => total + step.estimatedTime, 0);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <h2 className="text-xl font-semibold mb-2">Preparando tu experiencia</h2>
            <p className="text-gray-600">Cargando tu flujo de configuración personalizado...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!flow) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-pink-100 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <div className="text-red-500 mb-4">
              <Circle className="h-12 w-12 mx-auto" />
            </div>
            <h2 className="text-xl font-semibold mb-2">Error al cargar</h2>
            <p className="text-gray-600 mb-4">No pudimos cargar tu flujo de configuración</p>
            <Button onClick={fetchOnboardingFlow} variant="outline">
              <RotateCcw className="h-4 w-4 mr-2" />
              Reintentar
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const currentStep = flow.steps[currentStepIndex];
  const progress = calculateProgress();
  const timeRemaining = getTimeRemaining();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      {/* Header con progreso */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Sparkles className="h-6 w-6 text-blue-600" />
              <h1 className="text-xl font-semibold text-gray-900">
                Configuración de ToothPick
              </h1>
              <Badge variant="outline" className="capitalize">
                {flow.userRole}
              </Badge>
            </div>
            
            <div className="flex items-center gap-4">
              {/* Tiempo restante */}
              <div className="flex items-center gap-1 text-sm text-gray-600">
                <Clock className="h-4 w-4" />
                <span>{timeRemaining} min restantes</span>
              </div>
              
              {/* Estado de guardado */}
              {saveStatus !== 'idle' && (
                <div className="flex items-center gap-1 text-sm">
                  {saveStatus === 'saving' && (
                    <>
                      <div className="animate-spin h-3 w-3 border border-blue-600 border-t-transparent rounded-full"></div>
                      <span className="text-blue-600">Guardando...</span>
                    </>
                  )}
                  {saveStatus === 'saved' && (
                    <>
                      <CheckCircle className="h-3 w-3 text-green-600" />
                      <span className="text-green-600">Guardado</span>
                    </>
                  )}
                  {saveStatus === 'error' && (
                    <>
                      <Circle className="h-3 w-3 text-red-600" />
                      <span className="text-red-600">Error al guardar</span>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
          
          {/* Barra de progreso */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">
                Paso {currentStepIndex + 1} de {flow.totalSteps}
              </span>
              <span className="font-medium text-blue-600">
                {progress}% completado
              </span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        </div>
      </div>

      {/* Contenido principal */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          
          {/* Sidebar con indicadores */}
          <div className="lg:col-span-1">
            <StepIndicators
              steps={flow.steps}
              currentStepIndex={currentStepIndex}
              onStepClick={(index: number) => {
                // Solo permitir navegar a pasos completados o el actual
                const targetStep = flow.steps[index];
                if (targetStep.isCompleted || index <= currentStepIndex) {
                  setCurrentStepIndex(index);
                }
              }}
            />
          </div>

          {/* Contenido del paso actual */}
          <div className="lg:col-span-3">
            <Card className="shadow-lg">
              <CardHeader className="pb-4">
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Badge 
                        variant={currentStep.priority === 'high' ? 'default' : 'secondary'}
                        className="capitalize"
                      >
                        {currentStep.category}
                      </Badge>
                      {currentStep.isOptional && (
                        <Badge variant="outline">Opcional</Badge>
                      )}
                    </div>
                    <CardTitle className="text-2xl text-gray-900">
                      {currentStep.title}
                    </CardTitle>
                    <p className="text-gray-600 text-lg">
                      {currentStep.description}
                    </p>
                  </div>
                  
                  <div className="text-right text-sm text-gray-500">
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      <span>{currentStep.estimatedTime} min</span>
                    </div>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="pt-0">
                {/* Componente del paso actual */}
                <OnboardingStep
                  step={currentStep}
                  userRole={flow.userRole}
                  onComplete={(stepData: any) => handleStepComplete(currentStep.id, stepData)}
                  onSave={handleSaveProgress}
                />

                {/* Navegación */}
                <div className="flex items-center justify-between mt-8 pt-6 border-t">
                  <Button
                    variant="outline"
                    onClick={handlePreviousStep}
                    disabled={currentStepIndex === 0}
                  >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Anterior
                  </Button>

                  <div className="flex items-center gap-3">
                    {currentStep.isOptional && (
                      <Button variant="ghost" onClick={handleSkipStep}>
                        Omitir paso
                      </Button>
                    )}
                    
                    <Button onClick={handleSaveProgress} variant="outline">
                      <Save className="h-4 w-4 mr-2" />
                      Guardar progreso
                    </Button>

                    <Button
                      onClick={handleNextStep}
                      disabled={currentStepIndex === flow.steps.length - 1}
                    >
                      Siguiente
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Modal de completación */}
      {showCompletionModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-md">
            <CardContent className="p-8 text-center">
              <div className="text-green-500 mb-4">
                <Star className="h-16 w-16 mx-auto" />
              </div>
              <h2 className="text-2xl font-bold mb-2">¡Felicitaciones!</h2>
              <p className="text-gray-600 mb-6">
                Has completado la configuración inicial de ToothPick. 
                Ahora puedes comenzar a aprovechar todas las funcionalidades de la plataforma.
              </p>
              <div className="space-y-3">
                <Button 
                  onClick={() => router.push('/dashboard')}
                  className="w-full"
                >
                  Ir al Dashboard
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => setShowCompletionModal(false)}
                  className="w-full"
                >
                  Revisar configuración
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

export default OnboardingFlow;
