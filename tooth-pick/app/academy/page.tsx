'use client';

import { useState, useEffect } from 'react';
import { useSession } from '@/lib/hooks/useSession';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import AcademyHome from '@/components/academy/AcademyHome';
import TrackProgress from '@/components/academy/TrackProgress';
import StepViewer from '@/components/academy/StepViewer';
import AnalyticsDashboard from '@/components/academy/AnalyticsDashboard';
import { 
  BookOpen,
  TrendingUp,
  Award,
  Target,
  Users,
  Settings,
  PlayCircle,
  CheckCircle,
  Clock
} from 'lucide-react';

interface UserStats {
  totalTracksStarted: number;
  totalTracksCompleted: number;
  totalTimeSpent: number;
  totalPointsEarned: number;
  certificates: string[];
  badges: string[];
  completionRate: number;
  currentStreak: number;
}

export default function AcademyPage() {
  const { data: session } = useSession();
  const [activeView, setActiveView] = useState<'home' | 'track' | 'step' | 'analytics'>('home');
  const [selectedTrackId, setSelectedTrackId] = useState<string | null>(null);
  const [selectedStepId, setSelectedStepId] = useState<string | null>(null);
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (session?.user?.id) {
      loadUserStats();
    }
  }, [session]);

  const loadUserStats = async () => {
    if (!session?.user?.id) return;
    
    try {
      const response = await fetch(`/api/onboarding/stats?userId=${session.user.id}`);
      if (response.ok) {
        const stats = await response.json();
        setUserStats(stats);
      }
    } catch (error) {
      console.error('Error cargando estadísticas:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTrackSelect = (trackId: string) => {
    setSelectedTrackId(trackId);
    setActiveView('track');
  };

  const handleStepSelect = (stepId: string) => {
    setSelectedStepId(stepId);
    setActiveView('step');
  };

  const handleBackToHome = () => {
    setActiveView('home');
    setSelectedTrackId(null);
    setSelectedStepId(null);
  };

  const handleBackToTrack = () => {
    setActiveView('track');
    setSelectedStepId(null);
  };

  const formatTime = (minutes: number) => {
    if (minutes < 60) {
      return `${minutes} min`;
    }
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  if (!session?.user) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Academia ToothPick</h1>
          <p className="text-gray-600">Inicia sesión para acceder a tu academia personalizada</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg text-gray-600">Cargando academia...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Academia ToothPick</h1>
              <p className="text-gray-600 mt-1">
                Aprende a usar ToothPick como un profesional
              </p>
            </div>
            
            {userStats && (
              <div className="flex items-center gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {userStats.totalPointsEarned}
                  </div>
                  <div className="text-xs text-gray-600">Puntos</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {userStats.certificates.length}
                  </div>
                  <div className="text-xs text-gray-600">Certificados</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">
                    {userStats.currentStreak}
                  </div>
                  <div className="text-xs text-gray-600">Racha</div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Quick Stats */}
        {userStats && activeView === 'home' && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <PlayCircle className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Cursos Iniciados</p>
                    <p className="text-2xl font-bold">{userStats.totalTracksStarted}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <CheckCircle className="h-6 w-6 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Completados</p>
                    <p className="text-2xl font-bold">{userStats.totalTracksCompleted}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <Clock className="h-6 w-6 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Tiempo Total</p>
                    <p className="text-2xl font-bold">{formatTime(userStats.totalTimeSpent)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="p-2 bg-yellow-100 rounded-lg">
                    <Target className="h-6 w-6 text-yellow-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Tasa de Éxito</p>
                    <p className="text-2xl font-bold">{Math.round(userStats.completionRate)}%</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Main Content */}
        {activeView === 'home' && (
          <Tabs defaultValue="courses" className="space-y-6">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="courses" className="flex items-center gap-2">
                <BookOpen className="h-4 w-4" />
                Cursos
              </TabsTrigger>
              <TabsTrigger value="achievements" className="flex items-center gap-2">
                <Award className="h-4 w-4" />
                Logros
              </TabsTrigger>
              <TabsTrigger value="analytics" className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Analytics
              </TabsTrigger>
            </TabsList>

            <TabsContent value="courses">
              <AcademyHome
                userId={session.user.id}
                userRole={session.user.role || 'patient'}
                onTrackSelect={handleTrackSelect}
              />
            </TabsContent>

            <TabsContent value="achievements">
              {userStats && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Certificados */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Award className="h-5 w-5" />
                        Certificados Obtenidos
                      </CardTitle>
                      <CardDescription>
                        Certificados que has ganado completando cursos
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {userStats.certificates.length > 0 ? (
                        <div className="space-y-3">
                          {userStats.certificates.map((cert, index) => (
                            <div key={index} className="flex items-center gap-3 p-3 border rounded-lg">
                              <div className="text-2xl">🏆</div>
                              <div>
                                <h4 className="font-semibold">{cert}</h4>
                                <p className="text-sm text-gray-600">Certificado completado</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-8 text-gray-500">
                          <Award className="h-12 w-12 mx-auto mb-4 opacity-50" />
                          <p>Completa cursos para obtener certificados</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Insignias */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Target className="h-5 w-5" />
                        Insignias Desbloqueadas
                      </CardTitle>
                      <CardDescription>
                        Insignias que has ganado por tus logros
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {userStats.badges.length > 0 ? (
                        <div className="grid grid-cols-2 gap-3">
                          {userStats.badges.map((badge, index) => (
                            <Badge key={index} variant="outline" className="p-3 justify-center">
                              🏅 {badge}
                            </Badge>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-8 text-gray-500">
                          <Target className="h-12 w-12 mx-auto mb-4 opacity-50" />
                          <p>Completa tareas para obtener insignias</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              )}
            </TabsContent>

            <TabsContent value="analytics">
              <AnalyticsDashboard
                userId={session.user.id}
                userRole={session.user.role || 'patient'}
              />
            </TabsContent>
          </Tabs>
        )}

        {activeView === 'track' && selectedTrackId && (
          <TrackProgress
            trackId={selectedTrackId}
            userId={session.user.id}
            onBack={handleBackToHome}
            onStepSelect={handleStepSelect}
          />
        )}

        {activeView === 'step' && selectedStepId && selectedTrackId && (
          <StepViewer
            step={{
              stepId: selectedStepId,
              title: 'Paso del Curso',
              description: 'Descripción del paso',
              type: 'article',
              contentRef: '',
              required: true,
              order: 1,
              estimatedMinutes: 10
            }}
            trackId={selectedTrackId}
            userId={session.user.id}
            onBack={handleBackToTrack}
            onComplete={() => {
              // Refrescar estadísticas y volver al track
              loadUserStats();
              handleBackToTrack();
            }}
          />
        )}

        {/* Initialize Default Tracks Button (Admin only) */}
        {session.user.role === 'admin' && activeView === 'home' && (
          <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h3 className="font-semibold mb-2">Configuración de Administrador</h3>
            <p className="text-sm text-gray-600 mb-4">
              Inicializar tracks por defecto para todos los roles de usuario
            </p>
            <Button
              onClick={async () => {
                try {
                  const response = await fetch('/api/onboarding/initialize', { method: 'POST' });
                  const result = await response.json();
                  if (result.success) {
                    alert('Tracks por defecto creados exitosamente');
                  } else {
                    alert('Error: ' + result.message);
                  }
                } catch (error) {
                  alert('Error creando tracks');
                }
              }}
              variant="outline"
            >
              <Settings className="h-4 w-4 mr-2" />
              Inicializar Tracks por Defecto
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
