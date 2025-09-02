'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  GraduationCap, 
  Clock, 
  Trophy, 
  Star, 
  Play, 
  CheckCircle,
  BarChart3,
  Users,
  Target,
  Award,
  BookOpen,
  TrendingUp,
  Calendar,
  Filter
} from 'lucide-react';

interface Track {
  _id: string;
  title: string;
  description: string;
  icon: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  category: string;
  totalMinutes: number;
  steps: any[];
  completionRewards: {
    points: number;
    certificate: string;
    badge: string;
  };
}

interface UserProgress {
  _id: string;
  trackId: Track;
  status: 'not_started' | 'in_progress' | 'completed' | 'paused';
  completionPercentage: number;
  totalTimeSpentMinutes: number;
  totalPointsEarned: number;
  badges: string[];
  lastActivityAt: string;
}

interface UserStats {
  totalTracks: number;
  completedTracks: number;
  totalTimeSpent: number;
  totalPoints: number;
  totalBadges: number;
  avgCompletion: number;
  recentActivity: any[];
}

interface AcademyHomeProps {
  userRole: string;
  userId: string;
  onStartTrack?: (trackId: string) => void;
  onContinueTrack?: (trackId: string) => void;
  onViewTrack?: (trackId: string) => void;
  onTrackSelect?: (trackId: string) => void;
}

export default function AcademyHome({
  userRole,
  userId,
  onStartTrack,
  onContinueTrack,
  onViewTrack,
  onTrackSelect
}: AcademyHomeProps) {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [userProgress, setUserProgress] = useState<UserProgress[]>([]);
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [recommendations, setRecommendations] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({
    difficulty: 'all',
    category: 'all',
    status: 'all'
  });

  useEffect(() => {
    loadData();
  }, [userRole, userId]);

  const loadData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadTracks(),
        loadUserProgress(),
        loadUserStats(),
        loadRecommendations()
      ]);
    } catch (error) {
      console.error('Error cargando datos:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadTracks = async () => {
    try {
      const response = await fetch(`/api/onboarding/tracks?role=${userRole}`);
      if (response.ok) {
        const data = await response.json();
        setTracks(data.tracks || []);
      }
    } catch (error) {
      console.error('Error cargando tracks:', error);
    }
  };

  const loadUserProgress = async () => {
    try {
      const response = await fetch(`/api/onboarding/progress?userId=${userId}`);
      if (response.ok) {
        const data = await response.json();
        setUserProgress(data.progress || []);
      }
    } catch (error) {
      console.error('Error cargando progreso:', error);
    }
  };

  const loadUserStats = async () => {
    try {
      const response = await fetch(`/api/onboarding/stats?userId=${userId}`);
      if (response.ok) {
        const data = await response.json();
        setUserStats(data);
      }
    } catch (error) {
      console.error('Error cargando estadísticas:', error);
    }
  };

  const loadRecommendations = async () => {
    try {
      const response = await fetch(`/api/onboarding/recommendations?userId=${userId}&role=${userRole}`);
      if (response.ok) {
        const data = await response.json();
        setRecommendations(data);
      }
    } catch (error) {
      console.error('Error cargando recomendaciones:', error);
    }
  };

  const getTrackProgress = (trackId: string) => {
    return userProgress.find(p => p.trackId._id === trackId);
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner': return 'bg-green-100 text-green-800';
      case 'intermediate': return 'bg-yellow-100 text-yellow-800';
      case 'advanced': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'in_progress': return 'bg-blue-100 text-blue-800';
      case 'paused': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const handleTrackAction = (track: Track) => {
    const progress = getTrackProgress(track._id);
    
    // Usar onTrackSelect si está disponible, sino usar los handlers específicos
    if (onTrackSelect) {
      onTrackSelect(track._id);
    } else if (!progress) {
      onStartTrack?.(track._id);
    } else if (progress.status === 'completed') {
      onViewTrack?.(track._id);
    } else {
      onContinueTrack?.(track._id);
    }
  };

  const formatTime = (minutes: number) => {
    if (minutes < 60) {
      return `${minutes} min`;
    }
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  const getRoleLabel = (role: string) => {
    const labels: Record<string, string> = {
      patient: 'Paciente',
      dentist: 'Dentista',
      distributor: 'Distribuidor',
      admin: 'Administrador'
    };
    return labels[role] || role;
  };

  const filteredTracks = tracks.filter(track => {
    if (filter.difficulty !== 'all' && track.difficulty !== filter.difficulty) return false;
    if (filter.category !== 'all' && track.category !== filter.category) return false;
    
    if (filter.status !== 'all') {
      const progress = getTrackProgress(track._id);
      const status = progress?.status || 'not_started';
      if (filter.status !== status) return false;
    }
    
    return true;
  });

  const categories = [...new Set(tracks.map(t => t.category))];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-gray-600">Cargando Academia...</div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center">
        <div className="flex items-center justify-center gap-3 mb-4">
          <GraduationCap className="h-10 w-10 text-blue-600" />
          <h1 className="text-4xl font-bold text-gray-900">Academia ToothPick</h1>
        </div>
        <p className="text-xl text-gray-600 max-w-2xl mx-auto">
          Aprende a dominar ToothPick con cursos interactivos diseñados para {getRoleLabel(userRole).toLowerCase()}s
        </p>
      </div>

      {/* Estadísticas del usuario */}
      {userStats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Cursos Completados</p>
                  <p className="text-2xl font-bold">{userStats.completedTracks}/{userStats.totalTracks}</p>
                </div>
                <Trophy className="h-8 w-8 text-yellow-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Tiempo Total</p>
                  <p className="text-2xl font-bold">{formatTime(userStats.totalTimeSpent)}</p>
                </div>
                <Clock className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Puntos Totales</p>
                  <p className="text-2xl font-bold">{userStats.totalPoints.toLocaleString()}</p>
                </div>
                <Star className="h-8 w-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Insignias</p>
                  <p className="text-2xl font-bold">{userStats.totalBadges}</p>
                </div>
                <Award className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Recomendaciones */}
      {recommendations && (
        <div className="space-y-6">
          {/* Continuar cursos */}
          {recommendations.continueTracks && recommendations.continueTracks.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Play className="h-5 w-5" />
                  Continúa donde lo dejaste
                </CardTitle>
                <CardDescription>
                  Completa estos cursos que tienes en progreso
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {recommendations.continueTracks.map((item: any) => (
                    <Card key={item.trackId} className="border-l-4 border-l-blue-500">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-semibold">{item.trackTitle}</h4>
                          <Badge variant="secondary">{item.progress}%</Badge>
                        </div>
                        <p className="text-sm text-gray-600 mb-3">
                          Próximo paso: {item.step.title}
                        </p>
                        <Button
                          size="sm"
                          onClick={() => onTrackSelect ? onTrackSelect(item.trackId._id) : onContinueTrack?.(item.trackId._id)}
                          className="w-full"
                        >
                          Continuar
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Nuevos cursos recomendados */}
          {recommendations.newTracks && recommendations.newTracks.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Cursos recomendados para ti
                </CardTitle>
                <CardDescription>
                  Basado en tu progreso y rol como {getRoleLabel(userRole).toLowerCase()}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {recommendations.newTracks.slice(0, 3).map((track: Track) => (
                    <Card key={track._id} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="text-2xl">{track.icon}</div>
                          <div>
                            <h4 className="font-semibold text-sm">{track.title}</h4>
                            <p className="text-xs text-gray-500">{track.category}</p>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onTrackSelect ? onTrackSelect(track._id) : onStartTrack?.(track._id)}
                          className="w-full"
                        >
                          Comenzar
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Filtros */}
      <Card>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Dificultad
              </label>
              <select
                value={filter.difficulty}
                onChange={(e) => setFilter(prev => ({ ...prev, difficulty: e.target.value }))}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              >
                <option value="all">Todas las dificultades</option>
                <option value="beginner">Principiante</option>
                <option value="intermediate">Intermedio</option>
                <option value="advanced">Avanzado</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Categoría
              </label>
              <select
                value={filter.category}
                onChange={(e) => setFilter(prev => ({ ...prev, category: e.target.value }))}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              >
                <option value="all">Todas las categorías</option>
                {categories.map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Estado
              </label>
              <select
                value={filter.status}
                onChange={(e) => setFilter(prev => ({ ...prev, status: e.target.value }))}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              >
                <option value="all">Todos los estados</option>
                <option value="not_started">No iniciado</option>
                <option value="in_progress">En progreso</option>
                <option value="completed">Completado</option>
                <option value="paused">Pausado</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lista de cursos */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredTracks.map(track => {
          const progress = getTrackProgress(track._id);
          const status = progress?.status || 'not_started';
          
          return (
            <Card key={track._id} className="hover:shadow-lg transition-all duration-200">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="text-3xl">{track.icon}</div>
                  <div className="flex gap-2">
                    <Badge className={getDifficultyColor(track.difficulty)}>
                      {track.difficulty}
                    </Badge>
                    {progress && (
                      <Badge className={getStatusColor(status)}>
                        {status === 'completed' ? 'Completado' : 
                         status === 'in_progress' ? 'En progreso' :
                         status === 'paused' ? 'Pausado' : 'No iniciado'}
                      </Badge>
                    )}
                  </div>
                </div>
                <CardTitle className="text-lg">{track.title}</CardTitle>
                <CardDescription>{track.description}</CardDescription>
              </CardHeader>
              
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between text-sm text-gray-600">
                    <span className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      {formatTime(track.totalMinutes)}
                    </span>
                    <span className="flex items-center gap-1">
                      <BookOpen className="h-4 w-4" />
                      {track.steps.length} pasos
                    </span>
                  </div>

                  {progress && (
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Progreso</span>
                        <span>{progress.completionPercentage}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${progress.completionPercentage}%` }}
                        />
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1 text-sm text-gray-600">
                      <Star className="h-4 w-4 text-yellow-500" />
                      {track.completionRewards.points} pts
                    </div>
                    <Button
                      onClick={() => handleTrackAction(track)}
                      className="flex items-center gap-2"
                    >
                      {status === 'completed' ? (
                        <>
                          <CheckCircle className="h-4 w-4" />
                          Ver detalles
                        </>
                      ) : status === 'in_progress' || status === 'paused' ? (
                        <>
                          <Play className="h-4 w-4" />
                          Continuar
                        </>
                      ) : (
                        <>
                          <Play className="h-4 w-4" />
                          Comenzar
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {filteredTracks.length === 0 && (
        <div className="text-center py-12">
          <BookOpen className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500 text-lg">No se encontraron cursos con los filtros seleccionados</p>
        </div>
      )}
    </div>
  );
}
