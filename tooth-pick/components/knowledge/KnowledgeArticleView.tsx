'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { 
  ArrowLeft, 
  Clock, 
  Eye, 
  ThumbsUp, 
  ThumbsDown, 
  BookOpen,
  Calendar,
  User,
  Tag,
  TrendingUp,
  Share2,
  Copy,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { es } from 'date-fns/locale';
import ReactMarkdown from 'react-markdown';

interface Article {
  _id: string;
  title: string;
  slug: string;
  content: string;
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
  updatedAt: string;
  author: {
    _id: string;
    name: string;
    email: string;
  };
  relatedArticles: Array<{
    _id: string;
    title: string;
    slug: string;
    excerpt: string;
    category: string;
    role: string;
  }>;
}

interface KnowledgeArticleViewProps {
  slug: string;
  onBack?: () => void;
  onRelatedArticleSelect?: (slug: string) => void;
}

export default function KnowledgeArticleView({
  slug,
  onBack,
  onRelatedArticleSelect
}: KnowledgeArticleViewProps) {
  const [article, setArticle] = useState<Article | null>(null);
  const [loading, setLoading] = useState(true);
  const [feedbackSent, setFeedbackSent] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (slug) {
      loadArticle();
    }
  }, [slug]);

  const loadArticle = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/help/articles/${slug}`);
      
      if (!response.ok) {
        if (response.status === 404) {
          setError('Artículo no encontrado');
        } else {
          setError('Error cargando el artículo');
        }
        return;
      }

      const data = await response.json();
      setArticle(data.article);

    } catch (error) {
      console.error('Error cargando artículo:', error);
      setError('Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  const handleFeedback = async (isHelpful: boolean) => {
    if (!article || feedbackSent) return;

    try {
      const response = await fetch(`/api/help/articles/${slug}/feedback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ isHelpful })
      });

      if (response.ok) {
        const data = await response.json();
        setArticle(prev => prev ? {
          ...prev,
          helpful: data.feedback.helpful,
          notHelpful: data.feedback.notHelpful,
          helpfulScore: data.feedback.helpfulScore
        } : null);
        setFeedbackSent(true);
      }

    } catch (error) {
      console.error('Error enviando feedback:', error);
    }
  };

  const handleShare = async () => {
    const url = window.location.href;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: article?.title,
          text: article?.excerpt,
          url: url
        });
      } catch (error) {
        // Fallback al clipboard
        copyToClipboard(url);
      }
    } else {
      copyToClipboard(url);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Error copiando al portapapeles:', error);
    }
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

  const getUserInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-3/4 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2 mb-6"></div>
          <div className="space-y-3">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-4 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error || !article) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {error || 'Artículo no encontrado'}
          </h3>
          <p className="text-gray-500 mb-6">
            El artículo que buscas no existe o no tienes permisos para verlo.
          </p>
          {onBack && (
            <Button variant="outline" onClick={onBack}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Volver al centro de ayuda
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Navegación */}
      {onBack && (
        <Button variant="ghost" onClick={onBack} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Volver al centro de ayuda
        </Button>
      )}

      {/* Header del artículo */}
      <div className="space-y-6">
        <div className="space-y-4">
          {/* Badges */}
          <div className="flex flex-wrap gap-2">
            <Badge variant="default">
              {article.category}
            </Badge>
            
            {article.role !== 'all' && (
              <Badge variant="outline">
                {getRoleLabel(article.role)}
              </Badge>
            )}

            {article.isFeatured && (
              <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                ⭐ Destacado
              </Badge>
            )}

            {article.tags.map(tag => (
              <Badge key={tag} variant="outline" className="text-xs">
                <Tag className="h-3 w-3 mr-1" />
                {tag}
              </Badge>
            ))}
          </div>

          {/* Título */}
          <h1 className="text-4xl font-bold text-gray-900 leading-tight">
            {article.title}
          </h1>

          {/* Excerpt */}
          {article.excerpt && (
            <p className="text-xl text-gray-600 leading-relaxed">
              {article.excerpt}
            </p>
          )}
        </div>

        {/* Metadata */}
        <div className="flex items-center justify-between py-4 border-t border-b border-gray-200">
          <div className="flex items-center gap-6">
            {/* Autor */}
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10">
                <AvatarFallback>
                  {getUserInitials(article.author.name)}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium text-gray-900">{article.author.name}</p>
                <p className="text-sm text-gray-500">Autor</p>
              </div>
            </div>

            {/* Stats */}
            <div className="flex items-center gap-4 text-sm text-gray-500">
              <div className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                {format(new Date(article.createdAt), 'dd/MM/yyyy')}
              </div>
              
              <div className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                {article.readTime} min de lectura
              </div>
              
              <div className="flex items-center gap-1">
                <Eye className="h-4 w-4" />
                {article.views} vistas
              </div>

              {article.helpful > 0 && (
                <div className="flex items-center gap-1">
                  <TrendingUp className="h-4 w-4" />
                  {article.helpfulScore}% útil
                </div>
              )}
            </div>
          </div>

          {/* Acciones */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleShare}
              className="flex items-center gap-2"
            >
              {copied ? (
                <>
                  <CheckCircle className="h-4 w-4" />
                  Copiado
                </>
              ) : (
                <>
                  <Share2 className="h-4 w-4" />
                  Compartir
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Contenido del artículo */}
      <Card>
        <CardContent className="prose prose-lg max-w-none p-8">
          <ReactMarkdown
            components={{
              h1: ({ children }: any) => <h1 className="text-3xl font-bold mt-8 mb-4 text-gray-900">{children}</h1>,
              h2: ({ children }: any) => <h2 className="text-2xl font-bold mt-6 mb-3 text-gray-900">{children}</h2>,
              h3: ({ children }: any) => <h3 className="text-xl font-bold mt-4 mb-2 text-gray-900">{children}</h3>,
              p: ({ children }: any) => <p className="text-gray-700 leading-relaxed mb-4">{children}</p>,
              ul: ({ children }: any) => <ul className="list-disc pl-6 mb-4 space-y-2">{children}</ul>,
              ol: ({ children }: any) => <ol className="list-decimal pl-6 mb-4 space-y-2">{children}</ol>,
              li: ({ children }: any) => <li className="text-gray-700">{children}</li>,
              blockquote: ({ children }: any) => (
                <blockquote className="border-l-4 border-blue-500 pl-4 py-2 bg-blue-50 mb-4 italic">
                  {children}
                </blockquote>
              ),
              code: ({ children }: any) => (
                <code className="bg-gray-100 px-2 py-1 rounded text-sm font-mono">{children}</code>
              ),
              pre: ({ children }: any) => (
                <pre className="bg-gray-900 text-white p-4 rounded-lg overflow-x-auto mb-4">{children}</pre>
              )
            }}
          >
            {article.content}
          </ReactMarkdown>
        </CardContent>
      </Card>

      {/* Feedback */}
      <Card>
        <CardContent className="p-6">
          <div className="text-center space-y-4">
            <h3 className="text-lg font-medium">¿Te fue útil este artículo?</h3>
            
            {feedbackSent ? (
              <div className="flex items-center justify-center gap-2 text-green-600">
                <CheckCircle className="h-5 w-5" />
                <span>¡Gracias por tu feedback!</span>
              </div>
            ) : (
              <div className="flex items-center justify-center gap-4">
                <Button
                  variant="outline"
                  onClick={() => handleFeedback(true)}
                  className="flex items-center gap-2"
                >
                  <ThumbsUp className="h-4 w-4" />
                  Sí ({article.helpful})
                </Button>
                
                <Button
                  variant="outline"
                  onClick={() => handleFeedback(false)}
                  className="flex items-center gap-2"
                >
                  <ThumbsDown className="h-4 w-4" />
                  No ({article.notHelpful})
                </Button>
              </div>
            )}

            <p className="text-sm text-gray-500">
              Tu feedback nos ayuda a mejorar nuestro contenido
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Artículos relacionados */}
      {article.relatedArticles && article.relatedArticles.length > 0 && (
        <div className="space-y-6">
          <h2 className="text-2xl font-bold">Artículos Relacionados</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {article.relatedArticles.map(relatedArticle => (
              <Card 
                key={relatedArticle._id}
                className="cursor-pointer transition-all duration-200 hover:shadow-md"
                onClick={() => {
                  if (onRelatedArticleSelect) {
                    onRelatedArticleSelect(relatedArticle.slug);
                  } else {
                    window.location.href = `/help/articles/${relatedArticle.slug}`;
                  }
                }}
              >
                <CardContent className="p-4">
                  <div className="space-y-3">
                    <Badge variant="secondary" className="text-xs">
                      {relatedArticle.category}
                    </Badge>
                    
                    <h3 className="font-semibold text-gray-900 line-clamp-2">
                      {relatedArticle.title}
                    </h3>
                    
                    <p className="text-gray-600 text-sm line-clamp-2">
                      {relatedArticle.excerpt}
                    </p>

                    {relatedArticle.role !== 'all' && (
                      <Badge variant="outline" className="text-xs">
                        {getRoleLabel(relatedArticle.role)}
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
