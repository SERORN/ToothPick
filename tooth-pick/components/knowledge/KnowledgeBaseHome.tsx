'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Search, 
  BookOpen, 
  Star, 
  TrendingUp, 
  Clock, 
  Eye,
  Filter,
  Grid3X3,
  List,
  ArrowRight,
  HelpCircle,
  Users,
  FileText,
  ChevronRight
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

interface Article {
  _id: string;
  title: string;
  slug: string;
  excerpt: string;
  category: string;
  role: string;
  tags: string[];
  views: number;
  helpful: number;
  notHelpful: number;
  helpfulScore: number;
  readTime: number;
  isFeatured: boolean;
  createdAt: string;
  author: {
    name: string;
  };
}

interface Category {
  name: string;
  count: number;
}

interface Tag {
  name: string;
  count: number;
}

interface KnowledgeBaseHomeProps {
  userRole?: string;
  onArticleSelect?: (slug: string) => void;
}

export default function KnowledgeBaseHome({ userRole = 'all', onArticleSelect }: KnowledgeBaseHomeProps) {
  const [featuredArticles, setFeaturedArticles] = useState<Article[]>([]);
  const [popularArticles, setPopularArticles] = useState<Article[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedRole, setSelectedRole] = useState(userRole);
  const [sortBy, setSortBy] = useState('relevance');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [loading, setLoading] = useState(true);
  const [searchResults, setSearchResults] = useState<Article[]>([]);
  const [searching, setSearching] = useState(false);

  // Cargar datos iniciales
  useEffect(() => {
    const loadInitialData = async () => {
      setLoading(true);
      try {
        await Promise.all([
          loadFeaturedArticles(),
          loadPopularArticles(),
          loadCategories(),
          loadTags()
        ]);
      } catch (error) {
        console.error('Error cargando datos iniciales:', error);
      } finally {
        setLoading(false);
      }
    };

    loadInitialData();
  }, [userRole]);

  // Búsqueda con debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchTerm.length >= 2) {
        performSearch();
      } else {
        setSearchResults([]);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm, selectedCategory, selectedRole, sortBy]);

  const loadFeaturedArticles = async () => {
    try {
      const response = await fetch(`/api/help/articles?role=${userRole}&featured=true&limit=6`);
      if (response.ok) {
        const data = await response.json();
        setFeaturedArticles(data.articles || []);
      }
    } catch (error) {
      console.error('Error cargando artículos destacados:', error);
    }
  };

  const loadPopularArticles = async () => {
    try {
      const response = await fetch(`/api/help/articles?role=${userRole}&sortBy=popular&limit=10`);
      if (response.ok) {
        const data = await response.json();
        setPopularArticles(data.articles || []);
      }
    } catch (error) {
      console.error('Error cargando artículos populares:', error);
    }
  };

  const loadCategories = async () => {
    try {
      const response = await fetch('/api/help/metadata?type=categories');
      if (response.ok) {
        const data = await response.json();
        setCategories(data.categories || []);
      }
    } catch (error) {
      console.error('Error cargando categorías:', error);
    }
  };

  const loadTags = async () => {
    try {
      const response = await fetch('/api/help/metadata?type=tags&limit=15');
      if (response.ok) {
        const data = await response.json();
        setTags(data.tags || []);
      }
    } catch (error) {
      console.error('Error cargando tags:', error);
    }
  };

  const performSearch = async () => {
    setSearching(true);
    try {
      const params = new URLSearchParams({
        q: searchTerm,
        role: selectedRole,
        sortBy: sortBy,
        limit: '20'
      });

      if (selectedCategory) {
        params.append('category', selectedCategory);
      }

      const response = await fetch(`/api/help/articles?${params}`);
      if (response.ok) {
        const data = await response.json();
        setSearchResults(data.articles || []);
      }
    } catch (error) {
      console.error('Error realizando búsqueda:', error);
    } finally {
      setSearching(false);
    }
  };

  const handleArticleClick = (slug: string) => {
    if (onArticleSelect) {
      onArticleSelect(slug);
    } else {
      window.location.href = `/help/articles/${slug}`;
    }
  };

  const handleCategoryClick = (category: string) => {
    setSelectedCategory(category);
    setSearchTerm('');
  };

  const handleTagClick = (tag: string) => {
    setSearchTerm(tag);
  };

  const getRoleLabel = (role: string) => {
    const roleLabels = {
      'patient': 'Pacientes',
      'dentist': 'Dentistas',
      'distributor': 'Distribuidores',
      'admin': 'Administradores',
      'all': 'Todos'
    };
    return roleLabels[role as keyof typeof roleLabels] || role;
  };

  const ArticleCard = ({ article, variant = 'default' }: { article: Article; variant?: 'default' | 'featured' | 'compact' }) => (
    <Card 
      className={`cursor-pointer transition-all duration-200 hover:shadow-md ${
        variant === 'featured' ? 'border-blue-200 bg-blue-50' : ''
      }`}
      onClick={() => handleArticleClick(article.slug)}
    >
      <CardContent className={`p-4 ${variant === 'compact' ? 'p-3' : ''}`}>
        <div className="space-y-3">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h3 className={`font-semibold text-gray-900 line-clamp-2 ${
                variant === 'featured' ? 'text-lg' : variant === 'compact' ? 'text-sm' : 'text-base'
              }`}>
                {article.title}
              </h3>
              
              {variant !== 'compact' && (
                <p className="text-gray-600 mt-2 text-sm line-clamp-2">
                  {article.excerpt}
                </p>
              )}
            </div>

            {article.isFeatured && variant !== 'featured' && (
              <Star className="h-4 w-4 text-yellow-500 fill-current flex-shrink-0 ml-2" />
            )}
          </div>

          {/* Badges */}
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary" className="text-xs">
              {article.category}
            </Badge>
            
            {article.role !== 'all' && (
              <Badge variant="outline" className="text-xs">
                {getRoleLabel(article.role)}
              </Badge>
            )}

            {variant !== 'compact' && article.tags.slice(0, 2).map(tag => (
              <Badge key={tag} variant="outline" className="text-xs">
                {tag}
              </Badge>
            ))}
          </div>

          {/* Metadata */}
          <div className="flex items-center justify-between text-xs text-gray-500">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1">
                <Eye className="h-3 w-3" />
                {article.views}
              </div>
              
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {article.readTime} min
              </div>

              {article.helpful > 0 && (
                <div className="flex items-center gap-1">
                  <TrendingUp className="h-3 w-3" />
                  {article.helpfulScore}%
                </div>
              )}
            </div>

            {variant !== 'compact' && (
              <span>{formatDistanceToNow(new Date(article.createdAt), { addSuffix: true, locale: es })}</span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <div className="space-y-8">
        <div className="text-center space-y-4">
          <Skeleton className="h-12 w-96 mx-auto" />
          <Skeleton className="h-6 w-80 mx-auto" />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center space-y-4">
        <div className="flex items-center justify-center gap-3">
          <BookOpen className="h-8 w-8 text-blue-600" />
          <h1 className="text-4xl font-bold">Centro de Ayuda</h1>
        </div>
        <p className="text-xl text-gray-600">
          Encuentra respuestas a tus preguntas y aprende a usar ToothPick
        </p>
      </div>

      {/* Búsqueda */}
      <div className="max-w-4xl mx-auto space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <Input
            placeholder="Buscar artículos, tutoriales, preguntas frecuentes..."
            value={searchTerm}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
            className="pl-10 text-lg py-6"
          />
        </div>

        {/* Filtros de búsqueda */}
        <div className="flex flex-wrap gap-4 items-center">
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Todas las categorías" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Todas las categorías</SelectItem>
              {categories.map(category => (
                <SelectItem key={category.name} value={category.name}>
                  {category.name} ({category.count})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedRole} onValueChange={setSelectedRole}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Todos los roles" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los roles</SelectItem>
              <SelectItem value="patient">Pacientes</SelectItem>
              <SelectItem value="dentist">Dentistas</SelectItem>
              <SelectItem value="distributor">Distribuidores</SelectItem>
            </SelectContent>
          </Select>

          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="relevance">Más relevante</SelectItem>
              <SelectItem value="popular">Más popular</SelectItem>
              <SelectItem value="recent">Más reciente</SelectItem>
              <SelectItem value="helpful">Más útil</SelectItem>
            </SelectContent>
          </Select>

          <div className="flex gap-2">
            <Button
              variant={viewMode === 'grid' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('grid')}
            >
              <Grid3X3 className="h-4 w-4" />
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
      </div>

      {/* Resultados de búsqueda */}
      {searchTerm.length >= 2 && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold">
              Resultados de búsqueda
              {!searching && ` (${searchResults.length})`}
            </h2>
            
            {searching && <div className="text-gray-500">Buscando...</div>}
          </div>

          {searchResults.length === 0 && !searching ? (
            <Card>
              <CardContent className="py-12 text-center">
                <HelpCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No se encontraron resultados
                </h3>
                <p className="text-gray-500">
                  Intenta con otros términos de búsqueda o explora las categorías disponibles
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className={`grid gap-4 ${
              viewMode === 'grid' 
                ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' 
                : 'grid-cols-1'
            }`}>
              {searchResults.map(article => (
                <ArticleCard 
                  key={article._id} 
                  article={article} 
                  variant={viewMode === 'list' ? 'compact' : 'default'}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Contenido principal (solo cuando no hay búsqueda activa) */}
      {searchTerm.length < 2 && (
        <>
          {/* Artículos destacados */}
          {featuredArticles.length > 0 && (
            <div className="space-y-6">
              <div className="flex items-center gap-2">
                <Star className="h-6 w-6 text-yellow-500" />
                <h2 className="text-2xl font-bold">Artículos Destacados</h2>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {featuredArticles.map(article => (
                  <ArticleCard key={article._id} article={article} variant="featured" />
                ))}
              </div>
            </div>
          )}

          {/* Categorías populares */}
          {categories.length > 0 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold">Explora por Categoría</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {categories.slice(0, 6).map(category => (
                  <Card 
                    key={category.name}
                    className="cursor-pointer transition-all duration-200 hover:shadow-md"
                    onClick={() => handleCategoryClick(category.name)}
                  >
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-semibold text-lg">{category.name}</h3>
                          <p className="text-gray-500 text-sm">
                            {category.count} artículo{category.count !== 1 ? 's' : ''}
                          </p>
                        </div>
                        <ChevronRight className="h-5 w-5 text-gray-400" />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Artículos populares */}
          {popularArticles.length > 0 && (
            <div className="space-y-6">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-6 w-6 text-green-500" />
                <h2 className="text-2xl font-bold">Más Populares</h2>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {popularArticles.slice(0, 6).map(article => (
                  <ArticleCard key={article._id} article={article} variant="compact" />
                ))}
              </div>

              {popularArticles.length > 6 && (
                <div className="text-center">
                  <Button variant="outline" onClick={() => setSearchTerm('popular')}>
                    Ver todos los artículos populares
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Tags populares */}
          {tags.length > 0 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold">Temas Populares</h2>
              
              <div className="flex flex-wrap gap-2">
                {tags.map(tag => (
                  <Badge
                    key={tag.name}
                    variant="outline"
                    className="cursor-pointer hover:bg-blue-50 transition-colors"
                    onClick={() => handleTagClick(tag.name)}
                  >
                    {tag.name} ({tag.count})
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
