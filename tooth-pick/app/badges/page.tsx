'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Trophy, 
  Search,
  Filter,
  Grid,
  List,
  Star,
  Lock,
  Users,
  TrendingUp,
  Award,
  Crown
} from 'lucide-react';
import BadgeGallery from '@/components/gamification/BadgeGallery';

interface BadgeData {
  id: string;
  title: string;
  description: string;
  iconEmoji: string;
  category: string;
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
  isSecret: boolean;
  currentHolders: number;
  pointsReward: number;
  criteria?: {
    type: string;
    description?: string;
    minCount?: number;
    minStreak?: number;
    minLevel?: number;
  };
}

export default function BadgesPage() {
  const [badges, setBadges] = useState<BadgeData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [rarityFilter, setRarityFilter] = useState('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

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
      setBadges(data.badges || []);
    } catch (error) {
      console.error('Error fetching badges:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredBadges = badges.filter(badge => {
    const matchesSearch = badge.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         badge.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || badge.category === categoryFilter;
    const matchesRarity = rarityFilter === 'all' || badge.rarity === rarityFilter;
    
    return matchesSearch && matchesCategory && matchesRarity;
  });

  const categories = [...new Set(badges.map(b => b.category))];
  const rarities = ['common', 'uncommon', 'rare', 'epic', 'legendary'];

  const badgeStats = {
    total: badges.length,
    secretCount: badges.filter(b => b.isSecret).length,
    totalHolders: badges.reduce((sum, badge) => sum + badge.currentHolders, 0),
    averageHolders: badges.length > 0 ? Math.round(badges.reduce((sum, badge) => sum + badge.currentHolders, 0) / badges.length) : 0
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-4">
            🏆 Galería de Insignias
          </h1>
          <p className="text-xl text-muted-foreground mb-6">
            Descubre todos los logros disponibles en ToothPick
          </p>
          
          {/* Badge Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
            <Card className="text-center p-4 bg-gradient-to-br from-blue-50 to-purple-50 border-blue-200">
              <Trophy className="h-8 w-8 text-blue-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-blue-700">
                {badgeStats.total}
              </div>
              <div className="text-sm text-blue-600">Total de Insignias</div>
            </Card>
            
            <Card className="text-center p-4 bg-gradient-to-br from-purple-50 to-pink-50 border-purple-200">
              <Lock className="h-8 w-8 text-purple-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-purple-700">
                {badgeStats.secretCount}
              </div>
              <div className="text-sm text-purple-600">Insignias Secretas</div>
            </Card>
            
            <Card className="text-center p-4 bg-gradient-to-br from-green-50 to-teal-50 border-green-200">
              <Users className="h-8 w-8 text-green-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-green-700">
                {badgeStats.totalHolders.toLocaleString()}
              </div>
              <div className="text-sm text-green-600">Total Obtenidas</div>
            </Card>
            
            <Card className="text-center p-4 bg-gradient-to-br from-yellow-50 to-orange-50 border-yellow-200">
              <TrendingUp className="h-8 w-8 text-yellow-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-yellow-700">
                {badgeStats.averageHolders}
              </div>
              <div className="text-sm text-yellow-600">Promedio por Insignia</div>
            </Card>
          </div>
        </div>

        {/* Search and Filters */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              {/* Search */}
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar insignias..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              {/* Category Filter */}
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="px-3 py-2 border rounded-md bg-background"
                >
                  <option value="all">Todas las categorías</option>
                  {categories.map(category => (
                    <option key={category} value={category}>
                      {category.charAt(0).toUpperCase() + category.slice(1)}
                    </option>
                  ))}
                </select>
              </div>
              
              {/* Rarity Filter */}
              <div className="flex items-center gap-2">
                <Star className="h-4 w-4 text-muted-foreground" />
                <select
                  value={rarityFilter}
                  onChange={(e) => setRarityFilter(e.target.value)}
                  className="px-3 py-2 border rounded-md bg-background"
                >
                  <option value="all">Todas las rarezas</option>
                  {rarities.map(rarity => (
                    <option key={rarity} value={rarity}>
                      {rarity.charAt(0).toUpperCase() + rarity.slice(1)}
                    </option>
                  ))}
                </select>
              </div>
              
              {/* View Toggle */}
              <div className="flex items-center gap-1">
                <Button
                  variant={viewMode === 'grid' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('grid')}
                >
                  <Grid className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === 'list' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('list')}
                >
                  <List className="h-4 w-4" />
                </Button>
              </div>
            </div>
            
            {/* Results count */}
            <div className="mt-4 text-sm text-muted-foreground">
              Mostrando {filteredBadges.length} de {badges.length} insignias
            </div>
          </CardContent>
        </Card>

        {/* Badge Categories */}
        <Tabs defaultValue="all" className="space-y-6">
          <TabsList className="grid w-full grid-cols-6 max-w-4xl mx-auto">
            <TabsTrigger value="all">Todas</TabsTrigger>
            <TabsTrigger value="onboarding">Inicio</TabsTrigger>
            <TabsTrigger value="engagement">Actividad</TabsTrigger>
            <TabsTrigger value="marketplace">Compras</TabsTrigger>
            <TabsTrigger value="social">Social</TabsTrigger>
            <TabsTrigger value="special">Especiales</TabsTrigger>
          </TabsList>

          <TabsContent value="all">
            <BadgesByRarity badges={filteredBadges} viewMode={viewMode} loading={loading} />
          </TabsContent>

          <TabsContent value="onboarding">
            <CategoryBadges 
              badges={filteredBadges.filter(b => b.category === 'onboarding')} 
              categoryName="Onboarding"
              description="Insignias por completar el proceso de incorporación"
              viewMode={viewMode}
            />
          </TabsContent>

          <TabsContent value="engagement">
            <CategoryBadges 
              badges={filteredBadges.filter(b => b.category === 'engagement')} 
              categoryName="Compromiso"
              description="Insignias por mantener actividad consistente"
              viewMode={viewMode}
            />
          </TabsContent>

          <TabsContent value="marketplace">
            <CategoryBadges 
              badges={filteredBadges.filter(b => b.category === 'marketplace')} 
              categoryName="Marketplace"
              description="Insignias por actividad de compras y reseñas"
              viewMode={viewMode}
            />
          </TabsContent>

          <TabsContent value="social">
            <CategoryBadges 
              badges={filteredBadges.filter(b => b.category === 'social')} 
              categoryName="Social"
              description="Insignias por invitar usuarios y interacciones sociales"
              viewMode={viewMode}
            />
          </TabsContent>

          <TabsContent value="special">
            <CategoryBadges 
              badges={filteredBadges.filter(b => b.category === 'special')} 
              categoryName="Especiales"
              description="Insignias únicas y eventos especiales"
              viewMode={viewMode}
            />
          </TabsContent>
        </Tabs>

        {/* Rarest Badges Showcase */}
        <div className="mt-12">
          <RarestBadgesShowcase badges={badges} />
        </div>
      </div>
    </div>
  );
}

function BadgesByRarity({ 
  badges, 
  viewMode, 
  loading 
}: { 
  badges: BadgeData[]; 
  viewMode: 'grid' | 'list';
  loading: boolean;
}) {
  if (loading) {
    return <div className="text-center py-8">Cargando insignias...</div>;
  }

  const rarityOrder = ['legendary', 'epic', 'rare', 'uncommon', 'common'];
  
  return (
    <div className="space-y-8">
      {rarityOrder.map(rarity => {
        const rarityBadges = badges.filter(b => b.rarity === rarity);
        if (rarityBadges.length === 0) return null;

        return (
          <div key={rarity}>
            <RaritySection
              rarity={rarity as any}
              badges={rarityBadges}
              viewMode={viewMode}
            />
          </div>
        );
      })}
    </div>
  );
}

function RaritySection({ 
  rarity, 
  badges, 
  viewMode 
}: { 
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
  badges: BadgeData[];
  viewMode: 'grid' | 'list';
}) {
  const rarityConfig = {
    legendary: { 
      color: 'from-yellow-400 to-orange-500', 
      icon: <Crown className="h-5 w-5" />,
      name: 'Legendarias'
    },
    epic: { 
      color: 'from-purple-400 to-pink-500', 
      icon: <Award className="h-5 w-5" />,
      name: 'Épicas'
    },
    rare: { 
      color: 'from-blue-400 to-cyan-500', 
      icon: <Star className="h-5 w-5" />,
      name: 'Raras'
    },
    uncommon: { 
      color: 'from-green-400 to-emerald-500', 
      icon: <Trophy className="h-5 w-5" />,
      name: 'Poco Comunes'
    },
    common: { 
      color: 'from-gray-400 to-slate-500', 
      icon: <Trophy className="h-5 w-5" />,
      name: 'Comunes'
    }
  };

  const config = rarityConfig[rarity];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-3">
          <div className={`bg-gradient-to-r ${config.color} text-white p-2 rounded`}>
            {config.icon}
          </div>
          <div>
            <h3 className="text-xl font-bold">{config.name}</h3>
            <p className="text-sm text-muted-foreground font-normal">
              {badges.length} insignia{badges.length !== 1 ? 's' : ''}
            </p>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <BadgeGallery
          userBadges={[]}
          achievements={[]}
          showFilter={false}
          viewMode={viewMode}
          showAll={true}
        />
      </CardContent>
    </Card>
  );
}

function CategoryBadges({ 
  badges, 
  categoryName, 
  description, 
  viewMode 
}: {
  badges: BadgeData[];
  categoryName: string;
  description: string;
  viewMode: 'grid' | 'list';
}) {
  return (
    <div className="space-y-6">
      <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
        <CardContent className="text-center p-6">
          <h2 className="text-2xl font-bold mb-2">{categoryName}</h2>
          <p className="text-muted-foreground mb-4">{description}</p>
          <Badge variant="secondary">
            {badges.length} insignia{badges.length !== 1 ? 's' : ''}
          </Badge>
        </CardContent>
      </Card>

      <BadgeGallery
        userBadges={[]}
        achievements={[]}
        showFilter={false}
        viewMode={viewMode}
        showAll={true}
      />
    </div>
  );
}

function RarestBadgesShowcase({ badges }: { badges: BadgeData[] }) {
  const rarestBadges = badges
    .filter(badge => badge.currentHolders > 0)
    .sort((a, b) => a.currentHolders - b.currentHolders)
    .slice(0, 6);

  if (rarestBadges.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Crown className="h-5 w-5 text-yellow-500" />
          Las Insignias Más Raras
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {rarestBadges.map((badge, index) => (
            <Card key={badge.id} className="text-center p-4 bg-gradient-to-br from-yellow-50 to-orange-50 border-yellow-200">
              <div className="text-3xl mb-2">{badge.iconEmoji}</div>
              <h4 className="font-semibold mb-1">{badge.title}</h4>
              <p className="text-xs text-muted-foreground mb-2">{badge.description}</p>
              <div className="flex items-center justify-center gap-2">
                <Badge className="bg-yellow-100 text-yellow-800">
                  #{index + 1} más rara
                </Badge>
                <Badge variant="secondary" className="text-xs">
                  {badge.currentHolders} {badge.currentHolders === 1 ? 'persona' : 'personas'}
                </Badge>
              </div>
            </Card>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
