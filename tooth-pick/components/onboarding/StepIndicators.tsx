'use client';

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  CheckCircle2, 
  Circle, 
  Lock, 
  Clock,
  Star,
  AlertCircle,
  User,
  Settings,
  Zap,
  Package,
  Rocket
} from 'lucide-react';

interface OnboardingStepData {
  id: string;
  title: string;
  description: string;
  component: string;
  isCompleted: boolean;
  isOptional: boolean;
  estimatedTime: number;
  prerequisites?: string[];
  category: 'profile' | 'setup' | 'integration' | 'configuration' | 'launch';
  priority: 'high' | 'medium' | 'low';
}

interface StepIndicatorsProps {
  steps: OnboardingStepData[];
  currentStepIndex: number;
  onStepClick: (index: number) => void;
}

const getCategoryIcon = (category: string) => {
  switch (category) {
    case 'profile':
      return User;
    case 'setup':
      return Settings;
    case 'integration':
      return Zap;
    case 'configuration':
      return Package;
    case 'launch':
      return Rocket;
    default:
      return Circle;
  }
};

const getCategoryColor = (category: string) => {
  switch (category) {
    case 'profile':
      return 'bg-blue-100 text-blue-600';
    case 'setup':
      return 'bg-purple-100 text-purple-600';
    case 'integration':
      return 'bg-green-100 text-green-600';
    case 'configuration':
      return 'bg-orange-100 text-orange-600';
    case 'launch':
      return 'bg-red-100 text-red-600';
    default:
      return 'bg-gray-100 text-gray-600';
  }
};

const StepIndicators: React.FC<StepIndicatorsProps> = ({ 
  steps, 
  currentStepIndex, 
  onStepClick 
}) => {
  const getStepStatus = (index: number) => {
    const step = steps[index];
    
    if (step.isCompleted) return 'completed';
    if (index === currentStepIndex) return 'current';
    if (index < currentStepIndex) return 'accessible';
    
    // Verificar prerequisitos
    if (step.prerequisites) {
      const hasPrerequisites = step.prerequisites.every(prereqId => 
        steps.find(s => s.id === prereqId)?.isCompleted
      );
      if (!hasPrerequisites) return 'locked';
    }
    
    return 'upcoming';
  };

  const getStepIcon = (step: OnboardingStepData, status: string) => {
    const CategoryIcon = getCategoryIcon(step.category);
    
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="h-5 w-5 text-green-600" />;
      case 'current':
        return <CategoryIcon className="h-5 w-5 text-blue-600" />;
      case 'locked':
        return <Lock className="h-5 w-5 text-gray-400" />;
      default:
        return <Circle className="h-5 w-5 text-gray-400" />;
    }
  };

  const canClickStep = (index: number, status: string) => {
    return status === 'completed' || status === 'current' || status === 'accessible';
  };

  // Agrupar pasos por categoría
  const stepsByCategory = steps.reduce((acc, step, index) => {
    if (!acc[step.category]) {
      acc[step.category] = [];
    }
    acc[step.category].push({ ...step, originalIndex: index });
    return acc;
  }, {} as Record<string, Array<OnboardingStepData & { originalIndex: number }>>);

  const categoryOrder = ['profile', 'setup', 'integration', 'configuration', 'launch'];
  const totalEstimatedTime = steps.reduce((total, step) => total + step.estimatedTime, 0);
  const completedSteps = steps.filter(step => step.isCompleted).length;

  return (
    <div className="space-y-6">
      {/* Resumen del progreso */}
      <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
        <CardContent className="p-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">Tu Progreso</h3>
              <Badge variant="outline">
                {completedSteps}/{steps.length}
              </Badge>
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Completado</span>
                <span className="font-medium">
                  {Math.round((completedSteps / steps.length) * 100)}%
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${(completedSteps / steps.length) * 100}%` }}
                />
              </div>
            </div>
            
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Clock className="h-4 w-4" />
              <span>~{totalEstimatedTime} min total</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lista de pasos por categoría */}
      <div className="space-y-6">
        {categoryOrder.map(category => {
          const categorySteps = stepsByCategory[category];
          if (!categorySteps || categorySteps.length === 0) return null;

          const CategoryIcon = getCategoryIcon(category);
          const categoryColorClass = getCategoryColor(category);
          
          return (
            <div key={category}>
              {/* Header de categoría */}
              <div className="flex items-center gap-2 mb-3">
                <div className={`p-1.5 rounded-lg ${categoryColorClass}`}>
                  <CategoryIcon className="h-4 w-4" />
                </div>
                <h4 className="font-medium text-gray-900 capitalize">
                  {category === 'profile' && 'Perfil'}
                  {category === 'setup' && 'Configuración'}
                  {category === 'integration' && 'Integración'}
                  {category === 'configuration' && 'Configuración'}
                  {category === 'launch' && 'Lanzamiento'}
                </h4>
              </div>

              {/* Pasos de la categoría */}
              <div className="space-y-2">
                {categorySteps.map((step, idx) => {
                  const status = getStepStatus(step.originalIndex);
                  const isCurrent = step.originalIndex === currentStepIndex;
                  const canClick = canClickStep(step.originalIndex, status);
                  
                  return (
                    <div key={step.id} className="relative">
                      {/* Línea conectora */}
                      {idx < categorySteps.length - 1 && (
                        <div className="absolute left-6 top-12 bottom-0 w-px bg-gray-200" />
                      )}
                      
                      <Button
                        variant="ghost"
                        className={`
                          w-full justify-start h-auto p-3 text-left
                          ${isCurrent ? 'bg-blue-50 border-2 border-blue-200' : ''}
                          ${canClick ? 'hover:bg-gray-50' : 'cursor-not-allowed opacity-60'}
                        `}
                        onClick={() => canClick && onStepClick(step.originalIndex)}
                        disabled={!canClick}
                      >
                        <div className="flex items-start gap-3 w-full">
                          {/* Icono del paso */}
                          <div className="flex-shrink-0 mt-0.5">
                            {getStepIcon(step, status)}
                          </div>
                          
                          {/* Contenido del paso */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h5 className={`
                                text-sm font-medium truncate
                                ${isCurrent ? 'text-blue-900' : 'text-gray-900'}
                              `}>
                                {step.title}
                              </h5>
                              
                              {/* Badges */}
                              <div className="flex gap-1 flex-shrink-0">
                                {step.isOptional && (
                                  <Badge variant="outline" className="text-xs">
                                    Opcional
                                  </Badge>
                                )}
                                {step.priority === 'high' && (
                                  <Badge variant="destructive" className="text-xs">
                                    <Star className="h-2 w-2 mr-1" />
                                  </Badge>
                                )}
                              </div>
                            </div>
                            
                            <p className={`
                              text-xs truncate
                              ${isCurrent ? 'text-blue-700' : 'text-gray-600'}
                            `}>
                              {step.description}
                            </p>
                            
                            <div className="flex items-center gap-2 mt-1">
                              <div className="flex items-center gap-1 text-xs text-gray-500">
                                <Clock className="h-3 w-3" />
                                <span>{step.estimatedTime} min</span>
                              </div>
                              
                              {status === 'locked' && step.prerequisites && (
                                <div className="flex items-center gap-1 text-xs text-orange-600">
                                  <AlertCircle className="h-3 w-3" />
                                  <span>Requiere pasos anteriores</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </Button>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Consejos y ayuda */}
      <Card className="bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0">
              <div className="p-1 bg-green-100 rounded-full">
                <Star className="h-4 w-4 text-green-600" />
              </div>
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-medium text-green-900">
                Consejo
              </h4>
              <p className="text-xs text-green-700">
                Puedes guardar tu progreso en cualquier momento y continuar después. 
                Los pasos opcionales se pueden omitir.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default StepIndicators;
