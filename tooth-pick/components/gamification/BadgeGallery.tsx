'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Trophy, 
  Lock, 
  Star, 
  Calendar,
  Filter,
  Grid,
  List
} from 'lucide-react';
import { cn } from '@/lib/utils';
import BadgeTooltip from './BadgeTooltip';

interface BadgeData {
  id: string;
  title: string;
  description: string;
  iconEmoji: string;
  category: string;
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
  isSecret: boolean;
  earned?: boolean;
  earnedAt?: Date;
  pointsReward?: number;
  currentHolders?: number;
}

interface Achievement {
  badgeId: string;
  earnedAt: Date;
  pointsAwarded: number;
}

interface BadgeGalleryProps {
  userBadges: string[];
  achievements: Achievement[];
  limit?: number;
  showAll?: boolean;
  showFilter?: boolean;
  viewMode?: 'grid' | 'list';
  className?: string;
}

export default function BadgeGallery({
  userBadges,
  achievements,
  limit,
  showAll = true,
  showFilter = false,
  viewMode = 'grid',
  className
}: BadgeGalleryProps) {
  const [badges, setBadges] = useState<BadgeData[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const [view, setView] = useState<'grid' | 'list'>(viewMode);

  useEffect(() => {
    fetchBadges();
  }, []);

  const fetchBadges = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/gamification/badges');
      
      if (!response.ok) {
        throw new Error('Error al cargar insignias');
      }
      
      const data = await response.json();
      
      // Marcar insignias obtenidas
      const badgesWithStatus = data.badges.map((badge: BadgeData) => {
        const isEarned = userBadges.includes(badge.id);
        const achievement = achievements.find(a => a.badgeId === badge.id);
        
        return {
          ...badge,
          earned: isEarned,
          earnedAt: achievement?.earnedAt
        };
      });
      
      setBadges(badgesWithStatus);
    } catch (error) {
      console.error('Error fetching badges:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredBadges = badges.filter(badge => {
    if (filter === 'all') return true;
    if (filter === 'earned') return badge.earned;
    if (filter === 'locked') return !badge.earned;
    return badge.category === filter;
  });

  const displayBadges = limit && !showAll 
    ? filteredBadges.slice(0, limit)
    : filteredBadges;

  const categories = [...new Set(badges.map(b => b.category))];

  if (loading) {
    return <BadgeGallerySkeleton viewMode={view} />;
  }

  return (
    <div className={cn("space-y-4", className)}>
      {/* Controles */}
      {showFilter && (
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant={filter === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('all')}
            >
              Todas
            </Button>
            <Button
              variant={filter === 'earned' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('earned')}
            >
              Obtenidas
            </Button>
            <Button
              variant={filter === 'locked' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('locked')}
            >
              Bloqueadas
            </Button>
            {categories.map(category => (
              <Button
                key={category}
                variant={filter === category ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter(category)}
              >
                {category.charAt(0).toUpperCase() + category.slice(1)}
              </Button>
            ))}
          </div>
          
          <div className="flex items-center gap-1">
            <Button
              variant={view === 'grid' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setView('grid')}
            >
              <Grid className="h-4 w-4" />
            </Button>
            <Button
              variant={view === 'list' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setView('list')}
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Estadísticas */}
      <div className="flex items-center gap-4 text-sm text-muted-foreground">
        <span>{userBadges.length} obtenidas</span>
        <span>•</span>
        <span>{badges.length - userBadges.length} por desbloquear</span>
        <span>•</span>
        <span>{Math.round((userBadges.length / badges.length) * 100)}% completado</span>
      </div>

      {/* Galería de insignias */}
      {view === 'grid' ? (
        <div className={cn(
          "grid gap-4",
          limit && limit <= 6 
            ? "grid-cols-2 sm:grid-cols-3" 
            : "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6"
        )}>
          {displayBadges.map((badge) => (
            <BadgeCard key={badge.id} badge={badge} />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {displayBadges.map((badge) => (
            <BadgeListItem key={badge.id} badge={badge} />
          ))}
        </div>
      )}

      {/* Mostrar más */}
      {limit && filteredBadges.length > limit && !showAll && (
        <div className="text-center">
          <Button variant="outline" onClick={() => setFilter('all')}>
            Ver todas las insignias ({filteredBadges.length - limit} más)
          </Button>
        </div>
      )}
    </div>
  );
}

function BadgeCard({ badge }: { badge: BadgeData }) {
  const rarityColors = {
    common: 'border-gray-300 bg-gray-50',
    uncommon: 'border-green-300 bg-green-50',
    rare: 'border-blue-300 bg-blue-50',
    epic: 'border-purple-300 bg-purple-50',
    legendary: 'border-yellow-300 bg-yellow-50'
  };

  return (
    <BadgeTooltip badge={badge}>
      <Card className={cn(
        "p-4 text-center cursor-pointer transition-all duration-200 hover:shadow-md relative",
        badge.earned ? rarityColors[badge.rarity] : "bg-gray-100 border-gray-200 opacity-60",
        !badge.earned && "hover:opacity-80"
      )}>
        {badge.earned && (
          <div className="absolute top-2 right-2">
            <Trophy className="h-4 w-4 text-yellow-500" />
          </div>
        )}
        
        <div className="text-3xl mb-2">
          {badge.isSecret && !badge.earned ? '🔒' : badge.iconEmoji}
        </div>
        
        <h4 className={cn(
          "text-sm font-medium mb-1",
          badge.earned ? "text-foreground" : "text-muted-foreground"
        )}>
          {badge.isSecret && !badge.earned ? '???' : badge.title}
        </h4>
        
        <Badge 
          variant="secondary" 
          className={cn(
            "text-xs",
            badge.earned && `bg-${getRarityColor(badge.rarity)}-100 text-${getRarityColor(badge.rarity)}-700`
          )}
        >
          {badge.rarity}
        </Badge>
        
        {badge.earnedAt && (
          <p className="text-xs text-muted-foreground mt-1">
            {new Date(badge.earnedAt).toLocaleDateString('es-ES')}
          </p>
        )}
      </Card>
    </BadgeTooltip>
  );
}

function BadgeListItem({ badge }: { badge: BadgeData }) {
  return (
    <BadgeTooltip badge={badge}>
      <Card className={cn(
        "p-3 cursor-pointer transition-all duration-200 hover:shadow-sm",
        badge.earned ? "bg-white" : "bg-gray-50 opacity-70"
      )}>
        <div className="flex items-center gap-3">
          <div className="text-2xl">
            {badge.isSecret && !badge.earned ? '🔒' : badge.iconEmoji}
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h4 className={cn(
                "text-sm font-medium truncate",
                badge.earned ? "text-foreground" : "text-muted-foreground"
              )}>
                {badge.isSecret && !badge.earned ? 'Insignia Secreta' : badge.title}
              </h4>
              <Badge variant="secondary" className="text-xs shrink-0">
                {badge.rarity}
              </Badge>
              {badge.earned && (
                <Trophy className="h-4 w-4 text-yellow-500 shrink-0" />
              )}
            </div>
            
            <p className="text-xs text-muted-foreground">
              {badge.isSecret && !badge.earned 
                ? 'Completa acciones especiales para desbloquear'
                : badge.description}
            </p>
          </div>
          
          {badge.earnedAt && (
            <div className="text-right">
              <p className="text-xs text-muted-foreground">
                <Calendar className="h-3 w-3 inline mr-1" />
                {new Date(badge.earnedAt).toLocaleDateString('es-ES')}
              </p>
            </div>
          )}
        </div>
      </Card>
    </BadgeTooltip>
  );
}

function BadgeGallerySkeleton({ viewMode }: { viewMode: 'grid' | 'list' }) {
  const skeletonItems = Array.from({ length: 8 }, (_, i) => i);
  
  if (viewMode === 'grid') {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {skeletonItems.map((i) => (
          <Card key={i} className="p-4 text-center">
            <div className="w-8 h-8 bg-gray-200 rounded mx-auto mb-2" />
            <div className="h-4 bg-gray-200 rounded mb-2" />
            <div className="h-3 bg-gray-200 rounded w-16 mx-auto" />
          </Card>
        ))}
      </div>
    );
  }
  
  return (
    <div className="space-y-2">
      {skeletonItems.map((i) => (
        <Card key={i} className="p-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gray-200 rounded" />
            <div className="flex-1">
              <div className="h-4 bg-gray-200 rounded mb-1" />
              <div className="h-3 bg-gray-200 rounded w-3/4" />
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}

function getRarityColor(rarity: string): string {
  const colors = {
    common: 'gray',
    uncommon: 'green',
    rare: 'blue',
    epic: 'purple',
    legendary: 'yellow'
  };
  return colors[rarity as keyof typeof colors] || 'gray';
}
