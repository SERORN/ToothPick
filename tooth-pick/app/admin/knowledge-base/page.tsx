'use client';

import { useState } from 'react';
import KnowledgeBaseDashboard from '@/components/knowledge/KnowledgeBaseDashboard';
import KnowledgeArticleForm from '@/components/knowledge/KnowledgeArticleForm';
import KnowledgeArticleView from '@/components/knowledge/KnowledgeArticleView';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

type ViewMode = 'dashboard' | 'create' | 'edit' | 'view';

interface DashboardArticle {
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

interface FormArticle {
  _id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
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
  seoTitle: string;
  seoDescription: string;
  createdAt: string;
  updatedAt: string;
}

export default function KnowledgeBaseAdminPage() {
  const [viewMode, setViewMode] = useState<ViewMode>('dashboard');
  const [selectedArticle, setSelectedArticle] = useState<FormArticle | null>(null);
  const [selectedSlug, setSelectedSlug] = useState<string>('');

  const handleCreateArticle = () => {
    setSelectedArticle(null);
    setViewMode('create');
  };

  const handleEditArticle = async (article: DashboardArticle) => {
    // Cargar el artículo completo para edición
    try {
      const response = await fetch(`/api/help/articles/${article.slug}`);
      if (response.ok) {
        const data = await response.json();
        setSelectedArticle(data.article);
        setViewMode('edit');
      }
    } catch (error) {
      console.error('Error cargando artículo:', error);
    }
  };

  const handleViewArticle = (slug: string) => {
    setSelectedSlug(slug);
    setViewMode('view');
  };

  const handleBackToDashboard = () => {
    setViewMode('dashboard');
    setSelectedArticle(null);
    setSelectedSlug('');
  };

  const handleArticleSaved = (article: any) => {
    // Regresar al dashboard después de guardar
    handleBackToDashboard();
  };

  const renderNavigation = () => {
    if (viewMode === 'dashboard') return null;

    const titles = {
      create: 'Crear Nuevo Artículo',
      edit: `Editar: ${selectedArticle?.title || ''}`,
      view: 'Ver Artículo'
    };

    return (
      <div className="mb-6">
        <Button
          variant="ghost"
          onClick={handleBackToDashboard}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Volver al Dashboard
        </Button>
        <h1 className="text-2xl font-bold text-gray-900">
          {titles[viewMode as keyof typeof titles]}
        </h1>
      </div>
    );
  };

  const renderContent = () => {
    switch (viewMode) {
      case 'dashboard':
        return (
          <KnowledgeBaseDashboard
            onCreateArticle={handleCreateArticle}
            onEditArticle={handleEditArticle}
            onViewArticle={handleViewArticle}
          />
        );

      case 'create':
        return (
          <KnowledgeArticleForm
            onSave={handleArticleSaved}
            onCancel={handleBackToDashboard}
          />
        );

      case 'edit':
        return (
          <KnowledgeArticleForm
            articleId={selectedArticle?._id}
            initialData={selectedArticle}
            onSave={handleArticleSaved}
            onCancel={handleBackToDashboard}
          />
        );

      case 'view':
        return (
          <div className="max-w-4xl mx-auto">
            <KnowledgeArticleView slug={selectedSlug} />
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {renderNavigation()}
      {renderContent()}
    </div>
  );
}
