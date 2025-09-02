'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Plus, 
  Search, 
  Edit3, 
  Trash2,
  Eye,
  ThumbsUp,
  ThumbsDown,
  Calendar,
  User,
  TrendingUp,
  FileText,
  BarChart3,
  Filter,
  MoreHorizontal
} from 'lucide-react';

interface Article {
  _id: string;
  title: string;
  slug: string;
  excerpt: string;
  role: string;
  category: string;
  tags: string[];
  author: {
    name: string;
    email: string;
  };
  views: number;
  helpfulCount: number;
  notHelpfulCount: number;
  helpfulPercentage: number;
  isPublished: boolean;
  isFeatured: boolean;
  createdAt: string;
  updatedAt: string;
}

interface Stats {
  totalArticles: number;
  publishedArticles: number;
  totalViews: number;
  averageHelpfulness: number;
  articlesThisMonth: number;
  topCategories: Array<{ name: string; count: number }>;
  topTags: Array<{ name: string; count: number }>;
}

interface KnowledgeBaseDashboardProps {
  onCreateArticle?: () => void;
  onEditArticle?: (article: Article) => void;
  onViewArticle?: (slug: string) => void;
}

export default function KnowledgeBaseDashboard({
  onCreateArticle,
  onEditArticle,
  onViewArticle
}: KnowledgeBaseDashboardProps) {
  const [articles, setArticles] = useState<Article[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [sortBy, setSortBy] = useState('recent');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadArticles(),
        loadStats()
      ]);
    } catch (error) {
      console.error('Error cargando datos:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadArticles = async () => {
    try {
      const params = new URLSearchParams({
        search: searchTerm,
        role: filterRole,
        category: filterCategory,
        sort: sortBy,
        limit: '50'
      });

      const response = await fetch(`/api/help/articles?${params}`);
      if (response.ok) {
        const data = await response.json();
        setArticles(data.articles || []);
      }
    } catch (error) {
      console.error('Error cargando artículos:', error);
    }
  };

  const loadStats = async () => {
    try {
      const response = await fetch('/api/help/metadata?type=stats');
      if (response.ok) {
        const data = await response.json();
        setStats(data.stats);
      }
    } catch (error) {
      console.error('Error cargando estadísticas:', error);
    }
  };

  const handleDeleteArticle = async (articleId: string) => {
    if (!confirm('¿Estás seguro de que quieres eliminar este artículo?')) {
      return;
    }

    try {
      const article = articles.find(a => a._id === articleId);
      if (!article) return;

      const response = await fetch(`/api/help/articles/${article.slug}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        setArticles(prev => prev.filter(a => a._id !== articleId));
        await loadStats(); // Recargar estadísticas
      } else {
        alert('Error eliminando el artículo');
      }
    } catch (error) {
      console.error('Error eliminando artículo:', error);
      alert('Error eliminando el artículo');
    }
  };

  const togglePublishStatus = async (article: Article) => {
    try {
      const response = await fetch(`/api/help/articles/${article.slug}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...article,
          isPublished: !article.isPublished
        })
      });

      if (response.ok) {
        setArticles(prev => prev.map(a => 
          a._id === article._id 
            ? { ...a, isPublished: !a.isPublished }
            : a
        ));
      }
    } catch (error) {
      console.error('Error actualizando estado:', error);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getRoleLabel = (role: string) => {
    const roles: Record<string, string> = {
      all: 'Todos',
      patient: 'Pacientes',
      dentist: 'Dentistas',
      distributor: 'Distribuidores',
      admin: 'Administradores'
    };
    return roles[role] || role;
  };

  // Aplicar filtros en tiempo real
  useEffect(() => {
    loadArticles();
  }, [searchTerm, filterRole, filterCategory, filterStatus, sortBy]);

  const filteredArticles = articles.filter(article => {
    if (filterStatus === 'published' && !article.isPublished) return false;
    if (filterStatus === 'draft' && article.isPublished) return false;
    if (filterStatus === 'featured' && !article.isFeatured) return false;
    return true;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-gray-600">Cargando...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Centro de Conocimientos</h1>
          <p className="text-gray-600 mt-1">Gestiona artículos de ayuda y documentación</p>
        </div>
        
        <Button onClick={onCreateArticle} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Nuevo Artículo
        </Button>
      </div>

      {/* Estadísticas */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Artículos</p>
                  <p className="text-2xl font-bold">{stats.totalArticles}</p>
                </div>
                <FileText className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Publicados</p>
                  <p className="text-2xl font-bold">{stats.publishedArticles}</p>
                </div>
                <Eye className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Vistas</p>
                  <p className="text-2xl font-bold">{stats.totalViews.toLocaleString()}</p>
                </div>
                <TrendingUp className="h-8 w-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">% Útiles</p>
                  <p className="text-2xl font-bold">{stats.averageHelpfulness.toFixed(1)}%</p>
                </div>
                <ThumbsUp className="h-8 w-8 text-orange-600" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filtros y búsqueda */}
      <Card>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="lg:col-span-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Buscar artículos..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <select
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
              className="rounded-md border border-gray-300 px-3 py-2 text-sm"
            >
              <option value="all">Todos los roles</option>
              <option value="patient">Pacientes</option>
              <option value="dentist">Dentistas</option>
              <option value="distributor">Distribuidores</option>
              <option value="admin">Administradores</option>
            </select>

            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="rounded-md border border-gray-300 px-3 py-2 text-sm"
            >
              <option value="all">Todos los estados</option>
              <option value="published">Publicados</option>
              <option value="draft">Borradores</option>
              <option value="featured">Destacados</option>
            </select>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="rounded-md border border-gray-300 px-3 py-2 text-sm"
            >
              <option value="recent">Más recientes</option>
              <option value="views">Más vistos</option>
              <option value="helpful">Más útiles</option>
              <option value="title">Alfabético</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Lista de artículos */}
      <Card>
        <CardHeader>
          <CardTitle>Artículos ({filteredArticles.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredArticles.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No se encontraron artículos</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredArticles.map(article => (
                <div
                  key={article._id}
                  className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold text-lg">{article.title}</h3>
                        <div className="flex gap-2">
                          <Badge variant={article.isPublished ? 'default' : 'secondary'}>
                            {article.isPublished ? 'Publicado' : 'Borrador'}
                          </Badge>
                          {article.isFeatured && (
                            <Badge variant="outline">Destacado</Badge>
                          )}
                          <Badge variant="outline">{getRoleLabel(article.role)}</Badge>
                        </div>
                      </div>

                      <p className="text-gray-600 mb-3">{article.excerpt}</p>

                      <div className="flex items-center gap-6 text-sm text-gray-500">
                        <span className="flex items-center gap-1">
                          <User className="h-4 w-4" />
                          {article.author.name}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          {formatDate(article.createdAt)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Eye className="h-4 w-4" />
                          {article.views} vistas
                        </span>
                        <span className="flex items-center gap-1">
                          <ThumbsUp className="h-4 w-4" />
                          {article.helpfulPercentage.toFixed(1)}% útil
                        </span>
                      </div>

                      <div className="flex gap-2 mt-3">
                        <Badge variant="outline">{article.category}</Badge>
                        {article.tags.slice(0, 3).map(tag => (
                          <Badge key={tag} variant="secondary" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                        {article.tags.length > 3 && (
                          <Badge variant="secondary" className="text-xs">
                            +{article.tags.length - 3}
                          </Badge>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 ml-4">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onViewArticle?.(article.slug)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onEditArticle?.(article)}
                      >
                        <Edit3 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => togglePublishStatus(article)}
                      >
                        {article.isPublished ? '📝' : '👁️'}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteArticle(article._id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Categorías y tags populares */}
      {stats && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Categorías Populares</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {stats.topCategories.slice(0, 5).map((category, index) => (
                  <div key={category.name} className="flex items-center justify-between">
                    <span className="font-medium">{index + 1}. {category.name}</span>
                    <Badge variant="outline">{category.count} artículos</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Tags Populares</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {stats.topTags.slice(0, 5).map((tag, index) => (
                  <div key={tag.name} className="flex items-center justify-between">
                    <span className="font-medium">{index + 1}. {tag.name}</span>
                    <Badge variant="outline">{tag.count} usos</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
