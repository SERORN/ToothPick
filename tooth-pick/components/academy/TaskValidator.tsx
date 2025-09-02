'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  CheckCircle,
  XCircle,
  Clock,
  Eye,
  MousePointer,
  Keyboard,
  Target,
  RefreshCw,
  PlayCircle,
  AlertCircle,
  Settings,
  User,
  ShoppingCart,
  Calendar,
  FileText,
  Search
} from 'lucide-react';

interface ValidationRule {
  type: 'element_exists' | 'api_call' | 'page_navigation' | 'form_submission' | 'feature_usage' | 'manual_check';
  criteria: {
    selector?: string;
    endpoint?: string;
    url?: string;
    formId?: string;
    action?: string;
    value?: any;
    timeout?: number;
  };
}

interface Task {
  id: string;
  title: string;
  description: string;
  type: 'action' | 'navigation' | 'form_completion' | 'feature_usage';
  targetElement?: string;
  validation?: ValidationRule;
  instructions?: string[];
  hints?: string[];
}

interface TaskValidatorProps {
  tasks: Task[];
  onTaskComplete: (taskId: string) => void;
  onAllTasksComplete: () => void;
  className?: string;
}

export default function TaskValidator({
  tasks,
  onTaskComplete,
  onAllTasksComplete,
  className = ''
}: TaskValidatorProps) {
  const [taskStatuses, setTaskStatuses] = useState<Record<string, 'pending' | 'validating' | 'completed' | 'failed'>>({});
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    // Inicializar estados de tareas
    const initialStatuses: Record<string, 'pending' | 'validating' | 'completed' | 'failed'> = {};
    tasks.forEach(task => {
      initialStatuses[task.id] = 'pending';
    });
    setTaskStatuses(initialStatuses);
  }, [tasks]);

  useEffect(() => {
    // Verificar si todas las tareas están completadas
    const allCompleted = tasks.every(task => taskStatuses[task.id] === 'completed');
    if (allCompleted && tasks.length > 0) {
      onAllTasksComplete();
    }
  }, [taskStatuses, tasks, onAllTasksComplete]);

  const validateElementExists = async (selector: string, timeout = 5000): Promise<boolean> => {
    return new Promise((resolve) => {
      const startTime = Date.now();
      
      const checkElement = () => {
        const element = document.querySelector(selector);
        if (element) {
          resolve(true);
          return;
        }
        
        if (Date.now() - startTime > timeout) {
          resolve(false);
          return;
        }
        
        setTimeout(checkElement, 100);
      };
      
      checkElement();
    });
  };

  const validateApiCall = async (endpoint: string, expectedData?: any): Promise<boolean> => {
    try {
      const response = await fetch(endpoint);
      const data = await response.json();
      
      if (expectedData) {
        return JSON.stringify(data).includes(JSON.stringify(expectedData));
      }
      
      return response.ok;
    } catch {
      return false;
    }
  };

  const validatePageNavigation = (expectedUrl: string): boolean => {
    return window.location.href.includes(expectedUrl) || window.location.pathname.includes(expectedUrl);
  };

  const validateFormSubmission = (formId: string): boolean => {
    const form = document.getElementById(formId) as HTMLFormElement;
    if (!form) return false;
    
    // Verificar si el formulario tiene datos válidos
    const formData = new FormData(form);
    const hasData = Array.from(formData.entries()).length > 0;
    
    return hasData;
  };

  const validateTask = async (task: Task) => {
    setTaskStatuses(prev => ({
      ...prev,
      [task.id]: 'validating'
    }));

    setValidationErrors(prev => ({
      ...prev,
      [task.id]: ''
    }));

    try {
      let isValid = false;
      
      if (!task.validation) {
        // Sin validación específica, marcar como completado manualmente
        isValid = true;
      } else {
        switch (task.validation.type) {
          case 'element_exists':
            if (task.validation.criteria.selector) {
              isValid = await validateElementExists(
                task.validation.criteria.selector,
                task.validation.criteria.timeout
              );
            }
            break;
            
          case 'api_call':
            if (task.validation.criteria.endpoint) {
              isValid = await validateApiCall(
                task.validation.criteria.endpoint,
                task.validation.criteria.value
              );
            }
            break;
            
          case 'page_navigation':
            if (task.validation.criteria.url) {
              isValid = validatePageNavigation(task.validation.criteria.url);
            }
            break;
            
          case 'form_submission':
            if (task.validation.criteria.formId) {
              isValid = validateFormSubmission(task.validation.criteria.formId);
            }
            break;
            
          case 'feature_usage':
            // Para validación de uso de características, podríamos verificar localStorage, cookies, etc.
            const featureKey = task.validation.criteria.action;
            if (featureKey) {
              isValid = !!localStorage.getItem(`used_${featureKey}`) || 
                       !!sessionStorage.getItem(`used_${featureKey}`);
            }
            break;
            
          case 'manual_check':
            // Validación manual - requiere confirmación del usuario
            isValid = true;
            break;
            
          default:
            isValid = false;
        }
      }

      setTaskStatuses(prev => ({
        ...prev,
        [task.id]: isValid ? 'completed' : 'failed'
      }));

      if (isValid) {
        onTaskComplete(task.id);
      } else {
        setValidationErrors(prev => ({
          ...prev,
          [task.id]: 'No se pudo validar la tarea automáticamente. Revisa las instrucciones.'
        }));
      }
    } catch (error) {
      setTaskStatuses(prev => ({
        ...prev,
        [task.id]: 'failed'
      }));
      
      setValidationErrors(prev => ({
        ...prev,
        [task.id]: `Error de validación: ${error instanceof Error ? error.message : 'Error desconocido'}`
      }));
    }
  };

  const manualComplete = (taskId: string) => {
    setTaskStatuses(prev => ({
      ...prev,
      [taskId]: 'completed'
    }));
    
    setValidationErrors(prev => ({
      ...prev,
      [taskId]: ''
    }));
    
    onTaskComplete(taskId);
  };

  const getTaskTypeIcon = (type: string) => {
    switch (type) {
      case 'action': return <MousePointer className="h-5 w-5" />;
      case 'navigation': return <Target className="h-5 w-5" />;
      case 'form_completion': return <Keyboard className="h-5 w-5" />;
      case 'feature_usage': return <Settings className="h-5 w-5" />;
      default: return <CheckCircle className="h-5 w-5" />;
    }
  };

  const getTaskTypeLabel = (type: string) => {
    switch (type) {
      case 'action': return 'Acción';
      case 'navigation': return 'Navegación';
      case 'form_completion': return 'Formulario';
      case 'feature_usage': return 'Uso de Función';
      default: return 'Tarea';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'validating':
        return <RefreshCw className="h-5 w-5 text-blue-600 animate-spin" />;
      case 'failed':
        return <XCircle className="h-5 w-5 text-red-600" />;
      default:
        return <Clock className="h-5 w-5 text-gray-400" />;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'completed': return 'Completada';
      case 'validating': return 'Validando...';
      case 'failed': return 'Error';
      default: return 'Pendiente';
    }
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="h-5 w-5" />
          Tareas Prácticas
        </CardTitle>
        <CardDescription>
          Completa estas tareas en orden para continuar. El sistema validará automáticamente tu progreso.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {tasks.map((task, index) => {
            const status = taskStatuses[task.id] || 'pending';
            const error = validationErrors[task.id];
            const isActive = index === currentStep;
            const isAvailable = index <= currentStep || status === 'completed';

            return (
              <div
                key={task.id}
                className={`border rounded-lg p-4 transition-all ${
                  status === 'completed' ? 'border-green-200 bg-green-50' :
                  status === 'failed' ? 'border-red-200 bg-red-50' :
                  isActive ? 'border-blue-200 bg-blue-50' :
                  'border-gray-200'
                } ${!isAvailable ? 'opacity-60' : ''}`}
              >
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 mt-1">
                    {getStatusIcon(status)}
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="font-semibold">{task.title}</h4>
                      <Badge variant="outline" className="text-xs">
                        {getTaskTypeIcon(task.type)}
                        <span className="ml-1">{getTaskTypeLabel(task.type)}</span>
                      </Badge>
                      <Badge variant={
                        status === 'completed' ? 'default' :
                        status === 'failed' ? 'destructive' :
                        status === 'validating' ? 'secondary' :
                        'outline'
                      }>
                        {getStatusLabel(status)}
                      </Badge>
                    </div>
                    
                    <p className="text-sm text-gray-600 mb-3">{task.description}</p>
                    
                    {task.instructions && task.instructions.length > 0 && (
                      <div className="mb-3">
                        <p className="text-sm font-medium mb-1">Instrucciones:</p>
                        <ol className="text-sm text-gray-600 list-decimal list-inside space-y-1">
                          {task.instructions.map((instruction, idx) => (
                            <li key={idx}>{instruction}</li>
                          ))}
                        </ol>
                      </div>
                    )}
                    
                    {task.hints && task.hints.length > 0 && status !== 'completed' && (
                      <div className="mb-3">
                        <p className="text-sm font-medium mb-1">💡 Consejos:</p>
                        <ul className="text-sm text-gray-600 list-disc list-inside space-y-1">
                          {task.hints.map((hint, idx) => (
                            <li key={idx}>{hint}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    
                    {error && (
                      <div className="mb-3 p-2 bg-red-100 border border-red-200 rounded text-sm text-red-700">
                        <AlertCircle className="h-4 w-4 inline mr-1" />
                        {error}
                      </div>
                    )}
                    
                    {isAvailable && status !== 'completed' && (
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => validateTask(task)}
                          disabled={status === 'validating'}
                        >
                          {status === 'validating' ? (
                            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                          ) : (
                            <Eye className="h-4 w-4 mr-2" />
                          )}
                          Validar Automáticamente
                        </Button>
                        
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => manualComplete(task.id)}
                        >
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Marcar como Completada
                        </Button>
                      </div>
                    )}
                    
                    {status === 'completed' && (
                      <div className="flex items-center gap-2 text-sm text-green-700">
                        <CheckCircle className="h-4 w-4" />
                        Tarea completada exitosamente
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        
        {tasks.length > 0 && (
          <div className="mt-6 pt-4 border-t">
            <div className="flex items-center justify-between text-sm text-gray-600">
              <span>
                Progreso: {Object.values(taskStatuses).filter(s => s === 'completed').length} de {tasks.length} tareas
              </span>
              <span>
                {Math.round((Object.values(taskStatuses).filter(s => s === 'completed').length / tasks.length) * 100)}% completado
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{
                  width: `${(Object.values(taskStatuses).filter(s => s === 'completed').length / tasks.length) * 100}%`
                }}
              />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
