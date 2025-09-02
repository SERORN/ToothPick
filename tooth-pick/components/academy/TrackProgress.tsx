'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  ArrowLeft,
  CheckCircle,
  Clock,
  Play,
  Pause,
  RotateCcw,
  Trophy,
  Target,
  Star,
  BookOpen,
  Award,
  Calendar,
  User,
  TrendingUp
} from 'lucide-react';

interface Step {
  stepId: string;
  title: string;
  description: string;
  type: 'video' | 'task' | 'article' | 'quiz' | 'interactive';
  contentRef: string;
  required: boolean;
  order: number;
  estimatedMinutes: number;
  rewards?: {
    points: number;
    badge?: string;
    unlockFeature?: string;
  };
}

interface Track {
  _id: string;
  title: string;
  description: string;
  icon: string;
  difficulty: string;
  category: string;
  steps: Step[];
  totalMinutes: number;
  completionRewards: {
    points: number;
    certificate: string;
    badge: string;
    unlockFeatures: string[];
  };
}

interface UserProgress {
  _id: string;
  trackId: string;
  status: 'not_started' | 'in_progress' | 'completed' | 'paused';
  currentStepId?: string;
  completedSteps: Array<{
    stepId: string;
    completedAt: string;
    timeSpentMinutes: number;
    score?: number;
  }>;
  completionPercentage: number;
  totalTimeSpentMinutes: number;
  totalPointsEarned: number;
  badges: string[];
  startedAt: string;
  lastActivityAt: string;
  completedAt?: string;
}

interface TrackProgressProps {
  trackId: string;
  userId: string;
  onBack?: () => void;
  onStepSelect?: (stepId: string) => void;
}

export default function TrackProgress({
  trackId,
  userId,
  onBack,
  onStepSelect
}: TrackProgressProps) {
  const [track, setTrack] = useState<Track | null>(null);
  const [progress, setProgress] = useState<UserProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    loadTrackData();
  }, [trackId, userId]);

  const loadTrackData = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/onboarding/tracks/${trackId}?userId=${userId}`);
      if (response.ok) {
        const data = await response.json();
        setTrack(data.track);
        setProgress(data.userProgress);
      }
    } catch (error) {
      console.error('Error cargando datos del track:', error);
    } finally {
      setLoading(false);
    }
  };

  const startTrack = async () => {
    setActionLoading(true);
    try {
      const response = await fetch('/api/onboarding/progress', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'start_track',
          userId,
          trackId
        })
      });

      if (response.ok) {
        const data = await response.json();
        setProgress(data.progress);
      }
    } catch (error) {
      console.error('Error iniciando track:', error);
    } finally {
      setActionLoading(false);
    }
  };

  const pauseTrack = async () => {
    setActionLoading(true);
    try {
      const response = await fetch('/api/onboarding/progress', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'pause_track',
          userId,
          trackId
        })
      });

      if (response.ok) {
        const data = await response.json();
        setProgress(data.progress);
      }
    } catch (error) {
      console.error('Error pausando track:', error);
    } finally {
      setActionLoading(false);
    }
  };

  const resumeTrack = async () => {
    setActionLoading(true);
    try {
      const response = await fetch('/api/onboarding/progress', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'resume_track',
          userId,
          trackId
        })
      });

      if (response.ok) {
        const data = await response.json();
        setProgress(data.progress);
      }
    } catch (error) {
      console.error('Error reanudando track:', error);
    } finally {
      setActionLoading(false);
    }
  };

  const isStepCompleted = (stepId: string) => {
    return progress?.completedSteps.some(step => step.stepId === stepId) || false;
  };

  const getStepProgress = (stepId: string) => {
    return progress?.completedSteps.find(step => step.stepId === stepId);
  };

  const isStepAvailable = (step: Step) => {
    if (!progress) return false;
    
    // El primer paso siempre está disponible
    if (step.order === 1) return true;
    
    // Verificar si pasos anteriores están completados
    const previousSteps = track?.steps.filter(s => s.order < step.order) || [];
    return previousSteps.every(prevStep => isStepCompleted(prevStep.stepId));
  };

  const formatTime = (minutes: number) => {
    if (minutes < 60) {
      return `${minutes} min`;
    }
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStepTypeIcon = (type: string) => {
    switch (type) {
      case 'video': return '🎥';
      case 'task': return '📋';
      case 'article': return '📖';
      case 'quiz': return '❓';
      case 'interactive': return '🎮';
      default: return '📄';
    }
  };

  const getStepTypeLabel = (type: string) => {
    switch (type) {
      case 'video': return 'Video';
      case 'task': return 'Tarea';
      case 'article': return 'Artículo';
      case 'quiz': return 'Quiz';
      case 'interactive': return 'Interactivo';
      default: return 'Contenido';
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner': return 'bg-green-100 text-green-800';
      case 'intermediate': return 'bg-yellow-100 text-yellow-800';
      case 'advanced': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-gray-600">Cargando curso...</div>
      </div>
    );
  }

  if (!track) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Curso no encontrado</p>
        <Button onClick={onBack} className="mt-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Volver
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Volver a la Academia
        </Button>
        
        <div className="flex gap-2">
          {progress?.status === 'in_progress' && (
            <Button
              variant="outline"
              onClick={pauseTrack}
              disabled={actionLoading}
            >
              <Pause className="h-4 w-4 mr-2" />
              Pausar
            </Button>
          )}
          
          {progress?.status === 'paused' && (
            <Button
              onClick={resumeTrack}
              disabled={actionLoading}
            >
              <Play className="h-4 w-4 mr-2" />
              Reanudar
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Información del curso */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-4">
                <div className="text-4xl">{track.icon}</div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <CardTitle className="text-2xl">{track.title}</CardTitle>
                    <Badge className={getDifficultyColor(track.difficulty)}>
                      {track.difficulty}
                    </Badge>
                  </div>
                  <CardDescription className="text-base">
                    {track.description}
                  </CardDescription>
                  <div className="flex items-center gap-4 mt-3 text-sm text-gray-600">
                    <span className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      {formatTime(track.totalMinutes)}
                    </span>
                    <span className="flex items-center gap-1">
                      <BookOpen className="h-4 w-4" />
                      {track.steps.length} pasos
                    </span>
                    <span className="flex items-center gap-1">
                      <Target className="h-4 w-4" />
                      {track.category}
                    </span>
                  </div>
                </div>
              </div>
            </CardHeader>
          </Card>

          {/* Lista de pasos */}
          <Card>
            <CardHeader>
              <CardTitle>Contenido del Curso</CardTitle>
              <CardDescription>
                Completa los pasos en orden para obtener el certificado
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {track.steps
                  .sort((a, b) => a.order - b.order)
                  .map((step, index) => {
                    const completed = isStepCompleted(step.stepId);
                    const available = isStepAvailable(step);
                    const stepProgress = getStepProgress(step.stepId);
                    const isCurrent = progress?.currentStepId === step.stepId;

                    return (
                      <div
                        key={step.stepId}
                        className={`border rounded-lg p-4 transition-all ${
                          completed ? 'border-green-200 bg-green-50' :
                          isCurrent ? 'border-blue-200 bg-blue-50' :
                          available ? 'border-gray-200 hover:border-gray-300 cursor-pointer' :
                          'border-gray-100 bg-gray-50 opacity-60'
                        }`}
                        onClick={() => available && onStepSelect?.(step.stepId)}
                      >
                        <div className="flex items-center gap-4">
                          <div className="flex-shrink-0">
                            {completed ? (
                              <CheckCircle className="h-8 w-8 text-green-600" />
                            ) : isCurrent ? (
                              <Play className="h-8 w-8 text-blue-600" />
                            ) : available ? (
                              <div className="h-8 w-8 rounded-full border-2 border-gray-300 flex items-center justify-center">
                                <span className="text-sm font-medium">{index + 1}</span>
                              </div>
                            ) : (
                              <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center">
                                <span className="text-sm text-gray-400">{index + 1}</span>
                              </div>
                            )}
                          </div>

                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className={`font-semibold ${!available ? 'text-gray-400' : ''}`}>
                                {step.title}
                              </h4>
                              <Badge variant="outline" className="text-xs">
                                {getStepTypeIcon(step.type)} {getStepTypeLabel(step.type)}
                              </Badge>
                              {step.required && (
                                <Badge variant="destructive" className="text-xs">
                                  Requerido
                                </Badge>
                              )}
                            </div>
                            <p className={`text-sm mb-2 ${!available ? 'text-gray-400' : 'text-gray-600'}`}>
                              {step.description}
                            </p>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-4 text-xs text-gray-500">
                                <span className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {formatTime(step.estimatedMinutes)}
                                </span>
                                {step.rewards && (
                                  <span className="flex items-center gap-1">
                                    <Star className="h-3 w-3 text-yellow-500" />
                                    {step.rewards.points} pts
                                  </span>
                                )}
                              </div>
                              {stepProgress && (
                                <div className="text-xs text-gray-500">
                                  Completado: {formatDate(stepProgress.completedAt)}
                                  {stepProgress.score !== undefined && (
                                    <span className="ml-2">• Puntuación: {stepProgress.score}%</span>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar con progreso */}
        <div className="space-y-6">
          {/* Estado del curso */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Tu Progreso</CardTitle>
            </CardHeader>
            <CardContent>
              {!progress ? (
                <div className="text-center">
                  <p className="text-gray-600 mb-4">¿Listo para comenzar este curso?</p>
                  <Button
                    onClick={startTrack}
                    disabled={actionLoading}
                    className="w-full"
                  >
                    <Play className="h-4 w-4 mr-2" />
                    Comenzar Curso
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-blue-600 mb-1">
                      {progress.completionPercentage}%
                    </div>
                    <p className="text-sm text-gray-600">Completado</p>
                  </div>
                  
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div
                      className="bg-blue-600 h-3 rounded-full transition-all duration-500"
                      style={{ width: `${progress.completionPercentage}%` }}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-center">
                    <div>
                      <div className="text-lg font-semibold">
                        {progress.completedSteps.length}
                      </div>
                      <div className="text-xs text-gray-600">Pasos completados</div>
                    </div>
                    <div>
                      <div className="text-lg font-semibold">
                        {formatTime(progress.totalTimeSpentMinutes)}
                      </div>
                      <div className="text-xs text-gray-600">Tiempo invertido</div>
                    </div>
                  </div>

                  {progress.status === 'completed' && (
                    <div className="text-center p-4 bg-green-50 rounded-lg border border-green-200">
                      <Trophy className="h-8 w-8 text-green-600 mx-auto mb-2" />
                      <p className="font-semibold text-green-800">¡Curso Completado!</p>
                      <p className="text-sm text-green-600">
                        Has ganado {progress.totalPointsEarned} puntos
                      </p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recompensas */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Award className="h-5 w-5" />
                Recompensas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Puntos totales</span>
                  <Badge variant="outline">
                    {track.completionRewards.points} pts
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Certificado</span>
                  <Badge variant="outline">
                    📜 {track.completionRewards.certificate}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Insignia</span>
                  <Badge variant="outline">
                    🏆 {track.completionRewards.badge}
                  </Badge>
                </div>
                {track.completionRewards.unlockFeatures.length > 0 && (
                  <div>
                    <p className="text-sm font-medium mb-2">Funciones desbloqueadas:</p>
                    <div className="space-y-1">
                      {track.completionRewards.unlockFeatures.map((feature, index) => (
                        <Badge key={index} variant="secondary" className="text-xs">
                          {feature}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Estadísticas */}
          {progress && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Estadísticas
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span>Iniciado:</span>
                    <span>{formatDate(progress.startedAt)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Última actividad:</span>
                    <span>{formatDate(progress.lastActivityAt)}</span>
                  </div>
                  {progress.completedAt && (
                    <div className="flex justify-between">
                      <span>Completado:</span>
                      <span>{formatDate(progress.completedAt)}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span>Puntos ganados:</span>
                    <span>{progress.totalPointsEarned}</span>
                  </div>
                  {progress.badges.length > 0 && (
                    <div className="flex justify-between">
                      <span>Insignias:</span>
                      <span>{progress.badges.length}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
