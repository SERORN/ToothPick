'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { 
  ArrowLeft,
  ArrowRight,
  CheckCircle,
  Clock,
  Play,
  Pause,
  Square,
  RotateCcw,
  Star,
  BookOpen,
  Video,
  FileText,
  Clipboard,
  HelpCircle,
  Target,
  Award,
  Lightbulb,
  ExternalLink,
  Download,
  Volume2,
  VolumeX,
  Maximize,
  Minimize
} from 'lucide-react';

interface Step {
  stepId: string;
  title: string;
  description: string;
  type: 'video' | 'task' | 'article' | 'quiz' | 'interactive';
  contentRef: string;
  content?: {
    text?: string;
    videoUrl?: string;
    articleId?: string;
    tasks?: Array<{
      id: string;
      title: string;
      description: string;
      type: 'action' | 'navigation' | 'form_completion' | 'feature_usage';
      targetElement?: string;
      validation?: {
        type: 'element_exists' | 'api_call' | 'manual_check';
        criteria: any;
      };
    }>;
    quiz?: {
      questions: Array<{
        id: string;
        question: string;
        type: 'multiple_choice' | 'true_false' | 'short_answer';
        options?: string[];
        correctAnswer: string | number;
        explanation?: string;
      }>;
      passingScore: number;
    };
  };
  required: boolean;
  order: number;
  estimatedMinutes: number;
  prerequisites?: string[];
  validation?: {
    type: 'automatic' | 'manual' | 'quiz_score' | 'time_spent';
    criteria?: any;
  };
  rewards?: {
    points: number;
    badge?: string;
    unlockFeature?: string;
  };
  resources?: Array<{
    title: string;
    url: string;
    type: 'article' | 'video' | 'download' | 'external';
  }>;
}

interface StepProgress {
  stepId: string;
  status: 'not_started' | 'in_progress' | 'completed';
  startedAt?: string;
  completedAt?: string;
  timeSpentMinutes: number;
  score?: number;
  attempts?: number;
  notes?: string;
}

interface StepViewerProps {
  step: Step;
  trackId: string;
  userId: string;
  progress?: StepProgress;
  onComplete?: (score?: number) => void;
  onNext?: () => void;
  onPrevious?: () => void;
  onBack?: () => void;
  hasNext?: boolean;
  hasPrevious?: boolean;
}

export default function StepViewer({
  step,
  trackId,
  userId,
  progress,
  onComplete,
  onNext,
  onPrevious,
  onBack,
  hasNext = false,
  hasPrevious = false
}: StepViewerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [quizAnswers, setQuizAnswers] = useState<Record<string, any>>({});
  const [quizScore, setQuizScore] = useState<number | null>(null);
  const [taskStatuses, setTaskStatuses] = useState<Record<string, boolean>>({});
  const [notes, setNotes] = useState(progress?.notes || '');
  const [startTime] = useState(Date.now());
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    if (step.type === 'task' && step.content?.tasks) {
      // Inicializar estado de tareas
      const initialStatuses: Record<string, boolean> = {};
      step.content.tasks.forEach(task => {
        initialStatuses[task.id] = false;
      });
      setTaskStatuses(initialStatuses);
    }
  }, [step]);

  const markStepComplete = async (score?: number) => {
    setActionLoading(true);
    try {
      const timeSpent = Math.floor((Date.now() - startTime) / 60000);
      
      const response = await fetch('/api/onboarding/progress', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'complete_step',
          userId,
          trackId,
          stepId: step.stepId,
          timeSpentMinutes: timeSpent,
          score,
          notes: notes.trim() || undefined
        })
      });

      if (response.ok) {
        onComplete?.(score);
      }
    } catch (error) {
      console.error('Error completando paso:', error);
    } finally {
      setActionLoading(false);
    }
  };

  const handleQuizSubmit = () => {
    if (!step.content?.quiz) return;

    let correct = 0;
    const total = step.content.quiz.questions.length;

    step.content.quiz.questions.forEach(question => {
      const userAnswer = quizAnswers[question.id];
      if (userAnswer === question.correctAnswer) {
        correct++;
      }
    });

    const score = Math.round((correct / total) * 100);
    setQuizScore(score);

    if (score >= step.content.quiz.passingScore) {
      markStepComplete(score);
    }
  };

  const validateTask = async (taskId: string) => {
    const task = step.content?.tasks?.find(t => t.id === taskId);
    if (!task?.validation) return;

    try {
      // Aquí implementarías la lógica de validación específica
      // Por ahora, simulamos validación automática
      setTaskStatuses(prev => ({
        ...prev,
        [taskId]: true
      }));

      // Si todas las tareas están completadas, marcar paso como completo
      const allCompleted = step.content?.tasks?.every(t => 
        t.id === taskId || taskStatuses[t.id]
      );
      
      if (allCompleted) {
        markStepComplete();
      }
    } catch (error) {
      console.error('Error validando tarea:', error);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getStepTypeIcon = () => {
    switch (step.type) {
      case 'video': return <Video className="h-5 w-5" />;
      case 'task': return <Clipboard className="h-5 w-5" />;
      case 'article': return <BookOpen className="h-5 w-5" />;
      case 'quiz': return <HelpCircle className="h-5 w-5" />;
      case 'interactive': return <Target className="h-5 w-5" />;
      default: return <FileText className="h-5 w-5" />;
    }
  };

  const getStepTypeLabel = () => {
    switch (step.type) {
      case 'video': return 'Video Tutorial';
      case 'task': return 'Tarea Práctica';
      case 'article': return 'Artículo';
      case 'quiz': return 'Evaluación';
      case 'interactive': return 'Práctica Interactiva';
      default: return 'Contenido';
    }
  };

  const renderVideoContent = () => (
    <Card>
      <CardContent className="p-0">
        <div className="relative bg-black rounded-t-lg">
          <video
            className="w-full h-auto max-h-96"
            controls
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
            onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
          >
            <source src={step.content?.videoUrl} type="video/mp4" />
            Tu navegador no soporta el elemento de video.
          </video>
        </div>
        <div className="p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="text-sm text-gray-600">
              {formatTime(currentTime)} / {formatTime(duration)}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsMuted(!isMuted)}
              >
                {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsFullscreen(!isFullscreen)}
              >
                {isFullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
              </Button>
            </div>
          </div>
          <Progress value={(currentTime / duration) * 100} className="mb-4" />
          <Button
            onClick={() => markStepComplete()}
            disabled={actionLoading || currentTime < duration * 0.8}
            className="w-full"
          >
            <CheckCircle className="h-4 w-4 mr-2" />
            {currentTime < duration * 0.8 ? 
              `Ver al menos 80% del video (${Math.round((currentTime / duration) * 100)}%)` :
              'Marcar como Completado'
            }
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  const renderTaskContent = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clipboard className="h-5 w-5" />
          Tareas a Completar
        </CardTitle>
        <CardDescription>
          Completa las siguientes tareas para continuar
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {step.content?.tasks?.map((task, index) => {
            const isCompleted = taskStatuses[task.id];
            
            return (
              <div
                key={task.id}
                className={`border rounded-lg p-4 ${
                  isCompleted ? 'border-green-200 bg-green-50' : 'border-gray-200'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 mt-1">
                    {isCompleted ? (
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    ) : (
                      <div className="h-5 w-5 rounded-full border-2 border-gray-300 flex items-center justify-center">
                        <span className="text-xs font-medium">{index + 1}</span>
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold mb-1">{task.title}</h4>
                    <p className="text-sm text-gray-600 mb-3">{task.description}</p>
                    {!isCompleted && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => validateTask(task.id)}
                      >
                        <Target className="h-4 w-4 mr-2" />
                        Validar Tarea
                      </Button>
                    )}
                    {isCompleted && (
                      <Badge variant="default" className="bg-green-600">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Completada
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );

  const renderArticleContent = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BookOpen className="h-5 w-5" />
          Artículo
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="prose max-w-none mb-6">
          {step.content?.text ? (
            <div dangerouslySetInnerHTML={{ __html: step.content.text }} />
          ) : (
            <p>Contenido del artículo no disponible.</p>
          )}
        </div>
        <Button
          onClick={() => markStepComplete()}
          disabled={actionLoading}
          className="w-full"
        >
          <CheckCircle className="h-4 w-4 mr-2" />
          Marcar como Leído
        </Button>
      </CardContent>
    </Card>
  );

  const renderQuizContent = () => {
    const quiz = step.content?.quiz;
    if (!quiz) return null;

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HelpCircle className="h-5 w-5" />
            Evaluación
          </CardTitle>
          <CardDescription>
            Responde correctamente al menos {quiz.passingScore}% para aprobar
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {quiz.questions.map((question, index) => (
              <div key={question.id} className="border rounded-lg p-4">
                <h4 className="font-semibold mb-3">
                  {index + 1}. {question.question}
                </h4>
                
                {question.type === 'multiple_choice' && question.options && (
                  <div className="space-y-2">
                    {question.options.map((option, optionIndex) => (
                      <label key={optionIndex} className="flex items-center gap-2">
                        <input
                          type="radio"
                          name={question.id}
                          value={optionIndex}
                          onChange={(e) => setQuizAnswers(prev => ({
                            ...prev,
                            [question.id]: parseInt(e.target.value)
                          }))}
                          disabled={quizScore !== null}
                        />
                        <span>{option}</span>
                      </label>
                    ))}
                  </div>
                )}

                {question.type === 'true_false' && (
                  <div className="space-y-2">
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        name={question.id}
                        value="true"
                        onChange={(e) => setQuizAnswers(prev => ({
                          ...prev,
                          [question.id]: e.target.value
                        }))}
                        disabled={quizScore !== null}
                      />
                      <span>Verdadero</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        name={question.id}
                        value="false"
                        onChange={(e) => setQuizAnswers(prev => ({
                          ...prev,
                          [question.id]: e.target.value
                        }))}
                        disabled={quizScore !== null}
                      />
                      <span>Falso</span>
                    </label>
                  </div>
                )}

                {quizScore !== null && question.explanation && (
                  <div className="mt-3 p-3 bg-blue-50 rounded border border-blue-200">
                    <div className="flex items-start gap-2">
                      <Lightbulb className="h-4 w-4 text-blue-600 mt-0.5" />
                      <div className="text-sm text-blue-800">
                        <strong>Explicación:</strong> {question.explanation}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}

            {quizScore === null ? (
              <Button
                onClick={handleQuizSubmit}
                disabled={Object.keys(quizAnswers).length !== quiz.questions.length}
                className="w-full"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Enviar Respuestas
              </Button>
            ) : (
              <div className={`p-4 rounded-lg border text-center ${
                quizScore >= quiz.passingScore 
                  ? 'border-green-200 bg-green-50' 
                  : 'border-red-200 bg-red-50'
              }`}>
                <div className={`text-2xl font-bold mb-2 ${
                  quizScore >= quiz.passingScore ? 'text-green-600' : 'text-red-600'
                }`}>
                  {quizScore}%
                </div>
                <p className={
                  quizScore >= quiz.passingScore ? 'text-green-800' : 'text-red-800'
                }>
                  {quizScore >= quiz.passingScore 
                    ? '¡Felicidades! Has aprobado la evaluación' 
                    : `Necesitas ${quiz.passingScore}% para aprobar. ¡Inténtalo de nuevo!`
                  }
                </p>
                {quizScore < quiz.passingScore && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setQuizScore(null);
                      setQuizAnswers({});
                    }}
                    className="mt-3"
                  >
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Intentar de Nuevo
                  </Button>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderStepContent = () => {
    switch (step.type) {
      case 'video':
        return renderVideoContent();
      case 'task':
        return renderTaskContent();
      case 'article':
        return renderArticleContent();
      case 'quiz':
        return renderQuizContent();
      default:
        return (
          <Card>
            <CardContent>
              <p>Tipo de contenido no soportado: {step.type}</p>
            </CardContent>
          </Card>
        );
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Volver al Curso
        </Button>
        
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="flex items-center gap-1">
            {getStepTypeIcon()}
            {getStepTypeLabel()}
          </Badge>
          {step.required && (
            <Badge variant="destructive">Requerido</Badge>
          )}
        </div>
      </div>

      {/* Step Info */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <CardTitle className="text-2xl mb-2">{step.title}</CardTitle>
              <CardDescription className="text-base mb-4">
                {step.description}
              </CardDescription>
              <div className="flex items-center gap-4 text-sm text-gray-600">
                <span className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  {step.estimatedMinutes} min
                </span>
                {step.rewards && (
                  <span className="flex items-center gap-1">
                    <Star className="h-4 w-4 text-yellow-500" />
                    {step.rewards.points} puntos
                  </span>
                )}
                {progress?.status === 'completed' && (
                  <Badge variant="default" className="bg-green-600">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Completado
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Main Content */}
      {renderStepContent()}

      {/* Resources */}
      {step.resources && step.resources.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Recursos Adicionales</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {step.resources.map((resource, index) => (
                <a
                  key={index}
                  href={resource.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex-shrink-0">
                    {resource.type === 'download' ? (
                      <Download className="h-5 w-5 text-blue-600" />
                    ) : (
                      <ExternalLink className="h-5 w-5 text-blue-600" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="font-medium">{resource.title}</div>
                    <div className="text-sm text-gray-600 capitalize">
                      {resource.type}
                    </div>
                  </div>
                </a>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Notes */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Notas Personales</CardTitle>
          <CardDescription>
            Agrega notas o comentarios sobre este paso
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            placeholder="Escribe tus notas aquí..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="min-h-20"
          />
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          onClick={onPrevious}
          disabled={!hasPrevious}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Paso Anterior
        </Button>
        
        <Button
          onClick={onNext}
          disabled={!hasNext || progress?.status !== 'completed'}
        >
          Siguiente Paso
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}
