'use client';

import { useSession } from 'next-auth/react';
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Trophy, 
  Star, 
  TrendingUp, 
  Calendar,
  Settings,
  Share2,
  Download
} from 'lucide-react';
import GamificationDashboard from '@/components/gamification/GamificationDashboard';
import BadgeGallery from '@/components/gamification/BadgeGallery';
import GamificationEventFeed from '@/components/gamification/GamificationEventFeed';
import Leaderboard from '@/components/gamification/Leaderboard';

export default function GamificationProfilePage() {
  const { data: session } = useSession();
  const [activeTab, setActiveTab] = useState('overview');

  if (!session?.user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="text-center p-6">
            <Trophy className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Acceso Requerido</h2>
            <p className="text-muted-foreground mb-4">
              Inicia sesión para ver tu perfil de gamificación
            </p>
            <Button onClick={() => window.location.href = '/login'}>
              Iniciar Sesión
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold">🎮 Mi Perfil de Gamificación</h1>
              <p className="text-muted-foreground mt-1">
                Rastrea tu progreso y logros en ToothPick
              </p>
            </div>
            
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm">
                <Share2 className="h-4 w-4 mr-2" />
                Compartir
              </Button>
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Exportar
              </Button>
              <Button variant="outline" size="sm">
                <Settings className="h-4 w-4 mr-2" />
                Configuración
              </Button>
            </div>
          </div>
          
          {/* Quick Stats */}
          <QuickStatsBar userId={session.user.id} />
        </div>

        {/* Tabs Navigation */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <Star className="h-4 w-4" />
              Resumen
            </TabsTrigger>
            <TabsTrigger value="badges" className="flex items-center gap-2">
              <Trophy className="h-4 w-4" />
              Insignias
            </TabsTrigger>
            <TabsTrigger value="activity" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Actividad
            </TabsTrigger>
            <TabsTrigger value="rankings" className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Rankings
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <GamificationDashboard
              userId={session.user.id}
              embedded={false}
              showFeed={true}
              showBadges={true}
            />
          </TabsContent>

          {/* Badges Tab */}
          <TabsContent value="badges" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="h-5 w-5 text-yellow-500" />
                  Colección de Insignias
                </CardTitle>
              </CardHeader>
              <CardContent>
                <BadgeGallery
                  userBadges={[]} // Se cargará dinámicamente
                  achievements={[]}
                  showFilter={true}
                  showAll={true}
                  viewMode="grid"
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Activity Tab */}
          <TabsContent value="activity" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Calendar className="h-5 w-5 text-blue-500" />
                      Historial de Actividad
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <GamificationEventFeed
                      events={[]} // Se cargará dinámicamente
                      limit={20}
                      showExpanded={true}
                    />
                  </CardContent>
                </Card>
              </div>
              
              <div className="space-y-6">
                <ActivityStatsCard userId={session.user.id} />
                <StreakCalendarCard userId={session.user.id} />
              </div>
            </div>
          </TabsContent>

          {/* Rankings Tab */}
          <TabsContent value="rankings" className="space-y-6">
            <Leaderboard 
              userId={session.user.id}
              showFilters={true}
              embedded={false}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function QuickStatsBar({ userId }: { userId: string }) {
  // En una implementación real, esto cargaría datos de la API
  const stats = {
    points: 0,
    level: 1,
    badges: 0,
    streak: 0,
    position: null
  };

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
      <Card className="p-4 text-center bg-gradient-to-br from-yellow-50 to-orange-50 border-yellow-200">
        <div className="text-2xl font-bold text-yellow-700">
          {stats.points.toLocaleString()}
        </div>
        <div className="text-sm text-yellow-600">Puntos Totales</div>
      </Card>
      
      <Card className="p-4 text-center bg-gradient-to-br from-blue-50 to-purple-50 border-blue-200">
        <div className="text-2xl font-bold text-blue-700">
          {stats.level}
        </div>
        <div className="text-sm text-blue-600">Nivel Actual</div>
      </Card>
      
      <Card className="p-4 text-center bg-gradient-to-br from-green-50 to-teal-50 border-green-200">
        <div className="text-2xl font-bold text-green-700">
          {stats.badges}
        </div>
        <div className="text-sm text-green-600">Insignias</div>
      </Card>
      
      <Card className="p-4 text-center bg-gradient-to-br from-red-50 to-pink-50 border-red-200">
        <div className="text-2xl font-bold text-red-700">
          {stats.streak} 🔥
        </div>
        <div className="text-sm text-red-600">Racha Actual</div>
      </Card>
      
      <Card className="p-4 text-center bg-gradient-to-br from-purple-50 to-indigo-50 border-purple-200">
        <div className="text-2xl font-bold text-purple-700">
          {stats.position ? `#${stats.position}` : 'N/A'}
        </div>
        <div className="text-sm text-purple-600">Posición Global</div>
      </Card>
    </div>
  );
}

function ActivityStatsCard({ userId }: { userId: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Estadísticas del Mes</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex justify-between">
          <span className="text-sm text-muted-foreground">Puntos ganados</span>
          <span className="font-medium">0</span>
        </div>
        <div className="flex justify-between">
          <span className="text-sm text-muted-foreground">Eventos completados</span>
          <span className="font-medium">0</span>
        </div>
        <div className="flex justify-between">
          <span className="text-sm text-muted-foreground">Insignias nuevas</span>
          <span className="font-medium">0</span>
        </div>
        <div className="flex justify-between">
          <span className="text-sm text-muted-foreground">Días activos</span>
          <span className="font-medium">0</span>
        </div>
      </CardContent>
    </Card>
  );
}

function StreakCalendarCard({ userId }: { userId: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          🔥 Calendario de Racha
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-7 gap-1 text-center">
          {['D', 'L', 'M', 'M', 'J', 'V', 'S'].map((day, i) => (
            <div key={i} className="text-xs font-medium text-muted-foreground p-1">
              {day}
            </div>
          ))}
          {/* Aquí se generarían los días del calendario */}
          {Array.from({ length: 28 }).map((_, i) => (
            <div
              key={i}
              className="w-8 h-8 flex items-center justify-center text-xs rounded border"
            >
              {i + 1}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
