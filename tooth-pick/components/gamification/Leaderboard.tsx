'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Trophy, 
  Medal, 
  Award, 
  Crown,
  Filter,
  Calendar,
  Users,
  TrendingUp,
  Star
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface LeaderboardEntry {
  userId: string;
  name: string;
  email: string;
  role: string;
  totalPoints: number;
  level: number;
  levelTitle: string;
  position: number;
  badges: string[];
  avatar?: string;
  monthlyPoints?: number;
  weeklyPoints?: number;
  streak?: number;
}

interface LeaderboardProps {
  userId?: string;
  showFilters?: boolean;
  limit?: number;
  embedded?: boolean;
}

export default function Leaderboard({ 
  userId, 
  showFilters = true, 
  limit = 50,
  embedded = false 
}: LeaderboardProps) {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [timeFilter, setTimeFilter] = useState<'all' | 'month' | 'week'>('all');
  const [userPosition, setUserPosition] = useState<LeaderboardEntry | null>(null);

  useEffect(() => {
    fetchLeaderboard();
  }, [roleFilter, timeFilter]);

  const fetchLeaderboard = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        limit: limit.toString(),
        ...(roleFilter !== 'all' && { role: roleFilter }),
        ...(timeFilter !== 'all' && { timeframe: timeFilter })
      });

      const response = await fetch(`/api/gamification/leaderboard?${params}`);
      
      if (!response.ok) {
        throw new Error('Error al cargar leaderboard');
      }
      
      const data = await response.json();
      setLeaderboard(data.leaderboard || []);
      
      // Encontrar posición del usuario actual
      if (userId) {
        const currentUser = data.leaderboard?.find((entry: LeaderboardEntry) => 
          entry.userId === userId
        );
        setUserPosition(currentUser || null);
      }
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRankIcon = (position: number) => {
    switch (position) {
      case 1:
        return <Crown className="h-6 w-6 text-yellow-500" />;
      case 2:
        return <Medal className="h-6 w-6 text-gray-400" />;
      case 3:
        return <Award className="h-6 w-6 text-amber-600" />;
      default:
        return <Trophy className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const getRankStyle = (position: number) => {
    switch (position) {
      case 1:
        return "bg-gradient-to-r from-yellow-50 to-orange-50 border-yellow-200";
      case 2:
        return "bg-gradient-to-r from-gray-50 to-slate-50 border-gray-200";
      case 3:
        return "bg-gradient-to-r from-amber-50 to-yellow-50 border-amber-200";
      default:
        return "bg-white border-gray-200";
    }
  };

  if (loading) {
    return <LeaderboardSkeleton embedded={embedded} />;
  }

  return (
    <div className={cn(
      "space-y-6",
      embedded ? "" : "w-full max-w-4xl mx-auto"
    )}>
      {/* Header */}
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2">🏆 Tabla de Líderes</h2>
        <p className="text-muted-foreground">
          Compite con otros usuarios y sube en el ranking
        </p>
      </div>

      {/* Filtros */}
      {showFilters && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Filtros:</span>
                
                {/* Filtro por rol */}
                <div className="flex gap-1">
                  {['all', 'patient', 'dentist', 'distributor'].map((role) => (
                    <Button
                      key={role}
                      variant={roleFilter === role ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setRoleFilter(role)}
                    >
                      {role === 'all' ? 'Todos' : 
                       role === 'patient' ? 'Pacientes' :
                       role === 'dentist' ? 'Dentistas' : 'Distribuidores'}
                    </Button>
                  ))}
                </div>
              </div>
              
              {/* Filtro por tiempo */}
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <div className="flex gap-1">
                  {[
                    { key: 'all', label: 'Histórico' },
                    { key: 'month', label: 'Este mes' },
                    { key: 'week', label: 'Esta semana' }
                  ].map(({ key, label }) => (
                    <Button
                      key={key}
                      variant={timeFilter === key ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setTimeFilter(key as any)}
                    >
                      {label}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Posición del usuario */}
      {userId && userPosition && userPosition.position > 3 && (
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <Badge variant="secondary" className="bg-blue-100 text-blue-700">
                Tu posición: #{userPosition.position}
              </Badge>
              <div className="flex items-center gap-2">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={userPosition.avatar} />
                  <AvatarFallback>
                    {userPosition.name.split(' ').map(n => n[0]).join('')}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium text-sm">{userPosition.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {userPosition.totalPoints.toLocaleString()} puntos • Nivel {userPosition.level}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Podio (Top 3) */}
      {leaderboard.length >= 3 && (
        <div className="grid grid-cols-3 gap-4 mb-6">
          {/* 2do lugar */}
          <PodiumCard entry={leaderboard[1]} position={2} />
          
          {/* 1er lugar */}
          <PodiumCard entry={leaderboard[0]} position={1} isWinner />
          
          {/* 3er lugar */}
          <PodiumCard entry={leaderboard[2]} position={3} />
        </div>
      )}

      {/* Lista del leaderboard */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Rankings
            <Badge variant="secondary" className="ml-auto">
              {leaderboard.length} usuarios
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y">
            {leaderboard.slice(embedded ? 0 : 3).map((entry, index) => (
              <LeaderboardRow 
                key={entry.userId} 
                entry={entry} 
                isCurrentUser={entry.userId === userId}
                showDetails={!embedded}
              />
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Estadísticas */}
      {!embedded && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="text-center p-4">
            <Users className="h-8 w-8 text-blue-500 mx-auto mb-2" />
            <div className="text-2xl font-bold">{leaderboard.length}</div>
            <div className="text-sm text-muted-foreground">Usuarios Activos</div>
          </Card>
          
          <Card className="text-center p-4">
            <Star className="h-8 w-8 text-yellow-500 mx-auto mb-2" />
            <div className="text-2xl font-bold">
              {leaderboard[0]?.totalPoints.toLocaleString() || 0}
            </div>
            <div className="text-sm text-muted-foreground">Puntos del Líder</div>
          </Card>
          
          <Card className="text-center p-4">
            <Trophy className="h-8 w-8 text-purple-500 mx-auto mb-2" />
            <div className="text-2xl font-bold">
              {leaderboard[0]?.level || 0}
            </div>
            <div className="text-sm text-muted-foreground">Nivel Máximo</div>
          </Card>
        </div>
      )}
    </div>
  );
}

function PodiumCard({ 
  entry, 
  position, 
  isWinner = false 
}: { 
  entry: LeaderboardEntry; 
  position: number; 
  isWinner?: boolean;
}) {
  return (
    <Card className={cn(
      "text-center p-4 relative",
      isWinner && "transform scale-105 shadow-lg",
      getRankStyle(position)
    )}>
      {position === 1 && (
        <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
          <Crown className="h-6 w-6 text-yellow-500" />
        </div>
      )}
      
      <div className="mb-3">
        {getRankIcon(position)}
      </div>
      
      <Avatar className={cn(
        "mx-auto mb-3",
        isWinner ? "h-16 w-16" : "h-12 w-12"
      )}>
        <AvatarImage src={entry.avatar} />
        <AvatarFallback>
          {entry.name.split(' ').map(n => n[0]).join('')}
        </AvatarFallback>
      </Avatar>
      
      <h3 className={cn(
        "font-semibold mb-1",
        isWinner ? "text-lg" : "text-sm"
      )}>
        {entry.name}
      </h3>
      
      <Badge 
        variant="secondary" 
        className={cn(
          "mb-2",
          position === 1 && "bg-yellow-100 text-yellow-800",
          position === 2 && "bg-gray-100 text-gray-800",
          position === 3 && "bg-amber-100 text-amber-800"
        )}
      >
        {entry.levelTitle}
      </Badge>
      
      <div className={cn(
        "font-bold",
        isWinner ? "text-xl text-yellow-700" : "text-lg"
      )}>
        {entry.totalPoints.toLocaleString()}
      </div>
      <div className="text-xs text-muted-foreground">puntos</div>
    </Card>
  );
}

function LeaderboardRow({ 
  entry, 
  isCurrentUser, 
  showDetails = true 
}: { 
  entry: LeaderboardEntry; 
  isCurrentUser: boolean;
  showDetails?: boolean;
}) {
  return (
    <div className={cn(
      "flex items-center gap-4 p-4 hover:bg-gray-50 transition-colors",
      isCurrentUser && "bg-blue-50 border-l-4 border-l-blue-500"
    )}>
      {/* Posición */}
      <div className="flex items-center justify-center w-8 text-center">
        {entry.position <= 3 ? (
          getRankIcon(entry.position)
        ) : (
          <span className="font-medium text-muted-foreground">
            #{entry.position}
          </span>
        )}
      </div>
      
      {/* Avatar y nombre */}
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <Avatar className="h-10 w-10">
          <AvatarImage src={entry.avatar} />
          <AvatarFallback>
            {entry.name.split(' ').map(n => n[0]).join('')}
          </AvatarFallback>
        </Avatar>
        
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h4 className="font-medium truncate">{entry.name}</h4>
            {isCurrentUser && (
              <Badge variant="secondary" className="text-xs">Tú</Badge>
            )}
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="capitalize">{entry.role}</span>
            <span>•</span>
            <span>Nivel {entry.level}</span>
            {showDetails && entry.badges.length > 0 && (
              <>
                <span>•</span>
                <span>{entry.badges.length} insignias</span>
              </>
            )}
          </div>
        </div>
      </div>
      
      {/* Puntos */}
      <div className="text-right">
        <div className="font-bold text-lg">
          {entry.totalPoints.toLocaleString()}
        </div>
        <div className="text-xs text-muted-foreground">puntos</div>
      </div>
    </div>
  );
}

function LeaderboardSkeleton({ embedded }: { embedded: boolean }) {
  return (
    <div className={cn(
      "space-y-6",
      embedded ? "" : "w-full max-w-4xl mx-auto"
    )}>
      <div className="text-center">
        <div className="h-8 bg-gray-200 rounded w-48 mx-auto mb-2" />
        <div className="h-4 bg-gray-200 rounded w-64 mx-auto" />
      </div>
      
      <Card>
        <CardContent className="p-0">
          <div className="divide-y">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 p-4">
                <div className="w-8 h-8 bg-gray-200 rounded" />
                <div className="h-10 w-10 bg-gray-200 rounded-full" />
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 rounded mb-1" />
                  <div className="h-3 bg-gray-200 rounded w-32" />
                </div>
                <div className="text-right">
                  <div className="h-6 bg-gray-200 rounded w-16 mb-1" />
                  <div className="h-3 bg-gray-200 rounded w-12" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function getRankStyle(position: number) {
  switch (position) {
    case 1:
      return "bg-gradient-to-r from-yellow-50 to-orange-50 border-yellow-200";
    case 2:
      return "bg-gradient-to-r from-gray-50 to-slate-50 border-gray-200";
    case 3:
      return "bg-gradient-to-r from-amber-50 to-yellow-50 border-amber-200";
    default:
      return "bg-white border-gray-200";
  }
}

function getRankIcon(position: number) {
  switch (position) {
    case 1:
      return <Crown className="h-6 w-6 text-yellow-500" />;
    case 2:
      return <Medal className="h-6 w-6 text-gray-400" />;
    case 3:
      return <Award className="h-6 w-6 text-amber-600" />;
    default:
      return <Trophy className="h-5 w-5 text-muted-foreground" />;
  }
}
