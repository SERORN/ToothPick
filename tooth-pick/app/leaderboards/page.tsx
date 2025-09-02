'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Trophy, 
  Medal, 
  Award,
  Users,
  Calendar,
  TrendingUp,
  Star,
  Crown,
  Target
} from 'lucide-react';
import Leaderboard from '@/components/gamification/Leaderboard';

export default function LeaderboardsPage() {
  const [globalStats, setGlobalStats] = useState({
    totalUsers: 0,
    topScore: 0,
    averageLevel: 0,
    totalBadges: 0
  });

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-4">
            🏆 Tabla de Líderes Global
          </h1>
          <p className="text-xl text-muted-foreground mb-6">
            Compite con otros usuarios de ToothPick y sube en el ranking
          </p>
          
          {/* Global Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
            <Card className="text-center p-4 bg-gradient-to-br from-yellow-50 to-orange-50 border-yellow-200">
              <Users className="h-8 w-8 text-yellow-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-yellow-700">
                {globalStats.totalUsers.toLocaleString()}
              </div>
              <div className="text-sm text-yellow-600">Usuarios Activos</div>
            </Card>
            
            <Card className="text-center p-4 bg-gradient-to-br from-blue-50 to-purple-50 border-blue-200">
              <Star className="h-8 w-8 text-blue-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-blue-700">
                {globalStats.topScore.toLocaleString()}
              </div>
              <div className="text-sm text-blue-600">Puntuación Máxima</div>
            </Card>
            
            <Card className="text-center p-4 bg-gradient-to-br from-green-50 to-teal-50 border-green-200">
              <TrendingUp className="h-8 w-8 text-green-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-green-700">
                {globalStats.averageLevel.toFixed(1)}
              </div>
              <div className="text-sm text-green-600">Nivel Promedio</div>
            </Card>
            
            <Card className="text-center p-4 bg-gradient-to-br from-purple-50 to-pink-50 border-purple-200">
              <Trophy className="h-8 w-8 text-purple-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-purple-700">
                {globalStats.totalBadges.toLocaleString()}
              </div>
              <div className="text-sm text-purple-600">Insignias Otorgadas</div>
            </Card>
          </div>
        </div>

        {/* Leaderboard Tabs */}
        <Tabs defaultValue="general" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 max-w-2xl mx-auto">
            <TabsTrigger value="general" className="flex items-center gap-2">
              <Trophy className="h-4 w-4" />
              General
            </TabsTrigger>
            <TabsTrigger value="patients" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Pacientes
            </TabsTrigger>
            <TabsTrigger value="dentists" className="flex items-center gap-2">
              <Medal className="h-4 w-4" />
              Dentistas
            </TabsTrigger>
            <TabsTrigger value="distributors" className="flex items-center gap-2">
              <Award className="h-4 w-4" />
              Distribuidores
            </TabsTrigger>
          </TabsList>

          {/* General Leaderboard */}
          <TabsContent value="general">
            <div className="space-y-6">
              <LeaderboardHeader 
                title="Ranking General"
                description="Todos los usuarios de ToothPick compitiendo por la cima"
                icon={<Crown className="h-6 w-6 text-yellow-500" />}
              />
              <Leaderboard 
                showFilters={true}
                embedded={false}
              />
            </div>
          </TabsContent>

          {/* Patients Leaderboard */}
          <TabsContent value="patients">
            <div className="space-y-6">
              <LeaderboardHeader 
                title="Ranking de Pacientes"
                description="Los pacientes más activos y comprometidos con su salud dental"
                icon={<Users className="h-6 w-6 text-blue-500" />}
              />
              <PatientLeaderboard />
            </div>
          </TabsContent>

          {/* Dentists Leaderboard */}
          <TabsContent value="dentists">
            <div className="space-y-6">
              <LeaderboardHeader 
                title="Ranking de Dentistas"
                description="Los profesionales más dedicados y mejor valorados"
                icon={<Medal className="h-6 w-6 text-green-500" />}
              />
              <DentistLeaderboard />
            </div>
          </TabsContent>

          {/* Distributors Leaderboard */}
          <TabsContent value="distributors">
            <div className="space-y-6">
              <LeaderboardHeader 
                title="Ranking de Distribuidores"
                description="Los distribuidores más exitosos en la plataforma"
                icon={<Award className="h-6 w-6 text-purple-500" />}
              />
              <DistributorLeaderboard />
            </div>
          </TabsContent>
        </Tabs>

        {/* Achievements Showcase */}
        <div className="mt-12">
          <AchievementsShowcase />
        </div>

        {/* Competition Calendar */}
        <div className="mt-12">
          <CompetitionCalendar />
        </div>
      </div>
    </div>
  );
}

function LeaderboardHeader({ 
  title, 
  description, 
  icon 
}: { 
  title: string; 
  description: string; 
  icon: React.ReactNode;
}) {
  return (
    <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
      <CardContent className="text-center p-6">
        <div className="flex items-center justify-center mb-4">
          {icon}
        </div>
        <h2 className="text-2xl font-bold mb-2">{title}</h2>
        <p className="text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}

function PatientLeaderboard() {
  return (
    <div className="space-y-4">
      {/* Patient-specific metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="text-center p-4">
          <Calendar className="h-6 w-6 text-blue-500 mx-auto mb-2" />
          <div className="text-lg font-bold">Citas Atendidas</div>
          <div className="text-sm text-muted-foreground">
            Puntos por asistir a citas médicas
          </div>
        </Card>
        
        <Card className="text-center p-4">
          <Target className="h-6 w-6 text-green-500 mx-auto mb-2" />
          <div className="text-lg font-bold">Tratamientos Completados</div>
          <div className="text-sm text-muted-foreground">
            Seguimiento de planes de tratamiento
          </div>
        </Card>
        
        <Card className="text-center p-4">
          <Star className="h-6 w-6 text-yellow-500 mx-auto mb-2" />
          <div className="text-lg font-bold">Reseñas Escritas</div>
          <div className="text-sm text-muted-foreground">
            Compartir experiencias con otros
          </div>
        </Card>
      </div>
      
      <Leaderboard 
        showFilters={false}
        embedded={false}
      />
    </div>
  );
}

function DentistLeaderboard() {
  return (
    <div className="space-y-4">
      {/* Dentist-specific metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="text-center p-4">
          <Users className="h-6 w-6 text-blue-500 mx-auto mb-2" />
          <div className="text-lg font-bold">Pacientes Atendidos</div>
          <div className="text-sm text-muted-foreground">
            Número de pacientes únicos
          </div>
        </Card>
        
        <Card className="text-center p-4">
          <Medal className="h-6 w-6 text-green-500 mx-auto mb-2" />
          <div className="text-lg font-bold">Valoración Promedio</div>
          <div className="text-sm text-muted-foreground">
            Basada en reseñas de pacientes
          </div>
        </Card>
        
        <Card className="text-center p-4">
          <Trophy className="h-6 w-6 text-yellow-500 mx-auto mb-2" />
          <div className="text-lg font-bold">Casos Exitosos</div>
          <div className="text-sm text-muted-foreground">
            Tratamientos completados con éxito
          </div>
        </Card>
      </div>
      
      <Leaderboard 
        showFilters={false}
        embedded={false}
      />
    </div>
  );
}

function DistributorLeaderboard() {
  return (
    <div className="space-y-4">
      {/* Distributor-specific metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="text-center p-4">
          <TrendingUp className="h-6 w-6 text-blue-500 mx-auto mb-2" />
          <div className="text-lg font-bold">Ventas Totales</div>
          <div className="text-sm text-muted-foreground">
            Volumen de productos distribuidos
          </div>
        </Card>
        
        <Card className="text-center p-4">
          <Users className="h-6 w-6 text-green-500 mx-auto mb-2" />
          <div className="text-lg font-bold">Clientes Activos</div>
          <div className="text-sm text-muted-foreground">
            Red de clientes recurrentes
          </div>
        </Card>
        
        <Card className="text-center p-4">
          <Star className="h-6 w-6 text-yellow-500 mx-auto mb-2" />
          <div className="text-lg font-bold">Satisfacción</div>
          <div className="text-sm text-muted-foreground">
            Calificación de servicio
          </div>
        </Card>
      </div>
      
      <Leaderboard 
        showFilters={false}
        embedded={false}
      />
    </div>
  );
}

function AchievementsShowcase() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-yellow-500" />
          Logros Destacados del Mes
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <AchievementCard 
            icon="🏆"
            title="Primer Lugar General"
            winner="Juan Pérez"
            description="Líder en puntuación total este mes"
            points={15420}
          />
          
          <AchievementCard 
            icon="🔥"
            title="Racha Más Larga"
            winner="María González"
            description="85 días consecutivos de actividad"
            points={8500}
          />
          
          <AchievementCard 
            icon="⭐"
            title="Más Insignias"
            winner="Carlos Rodríguez"
            description="Desbloqueó 12 insignias este mes"
            points={6890}
          />
        </div>
      </CardContent>
    </Card>
  );
}

function AchievementCard({ 
  icon, 
  title, 
  winner, 
  description, 
  points 
}: {
  icon: string;
  title: string;
  winner: string;
  description: string;
  points: number;
}) {
  return (
    <Card className="text-center p-4 bg-gradient-to-br from-yellow-50 to-orange-50 border-yellow-200">
      <div className="text-3xl mb-2">{icon}</div>
      <h3 className="font-semibold mb-1">{title}</h3>
      <p className="text-sm font-medium text-yellow-700 mb-1">{winner}</p>
      <p className="text-xs text-muted-foreground mb-2">{description}</p>
      <Badge className="bg-yellow-100 text-yellow-800">
        {points.toLocaleString()} puntos
      </Badge>
    </Card>
  );
}

function CompetitionCalendar() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-blue-500" />
          Próximas Competencias
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <CompetitionEvent 
            date="15 Agosto"
            title="Torneo de Citas"
            description="Competencia especial para pacientes que más citas atiendan"
            reward="Insignia exclusiva + 500 puntos bonus"
            participants={28}
          />
          
          <CompetitionEvent 
            date="30 Agosto"
            title="Desafío de Reseñas"
            description="Escribe las mejores reseñas y gana puntos extra"
            reward="Triple puntos por reseñas"
            participants={45}
          />
          
          <CompetitionEvent 
            date="15 Septiembre"
            title="Champions League Dental"
            description="Competencia general entre todos los usuarios"
            reward="Premio mayor: 2000 puntos + insignia legendaria"
            participants={156}
          />
        </div>
      </CardContent>
    </Card>
  );
}

function CompetitionEvent({ 
  date, 
  title, 
  description, 
  reward, 
  participants 
}: {
  date: string;
  title: string;
  description: string;
  reward: string;
  participants: number;
}) {
  return (
    <div className="flex items-start gap-4 p-4 border rounded-lg hover:bg-gray-50 transition-colors">
      <div className="text-center min-w-[80px]">
        <div className="text-sm font-medium text-blue-600">{date}</div>
        <div className="text-xs text-muted-foreground">2024</div>
      </div>
      
      <div className="flex-1">
        <h4 className="font-semibold mb-1">{title}</h4>
        <p className="text-sm text-muted-foreground mb-2">{description}</p>
        <div className="flex items-center justify-between">
          <div className="text-xs text-green-600 font-medium">{reward}</div>
          <Badge variant="secondary" className="text-xs">
            {participants} participantes
          </Badge>
        </div>
      </div>
      
      <Button variant="outline" size="sm">
        Participar
      </Button>
    </div>
  );
}
