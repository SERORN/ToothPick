'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import KnowledgeBaseHome from '@/components/knowledge/KnowledgeBaseHome';
import KnowledgeArticleView from '@/components/knowledge/KnowledgeArticleView';
import { Button } from '@/components/ui/button';
import { ArrowLeft, HelpCircle } from 'lucide-react';

export default function HelpPage() {
  const searchParams = useSearchParams();
  const [viewMode, setViewMode] = useState<'home' | 'article'>('home');
  const [selectedSlug, setSelectedSlug] = useState<string>('');

  useEffect(() => {
    const slug = searchParams.get('article');
    if (slug) {
      setSelectedSlug(slug);
      setViewMode('article');
    } else {
      setViewMode('home');
      setSelectedSlug('');
    }
  }, [searchParams]);

  const handleArticleSelect = (slug: string) => {
    // Actualizar URL sin recargar la página
    const url = new URL(window.location.href);
    url.searchParams.set('article', slug);
    window.history.pushState({}, '', url.toString());
    
    setSelectedSlug(slug);
    setViewMode('article');
  };

  const handleBackToHome = () => {
    // Limpiar URL
    const url = new URL(window.location.href);
    url.searchParams.delete('article');
    window.history.pushState({}, '', url.toString());
    
    setViewMode('home');
    setSelectedSlug('');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <HelpCircle className="h-8 w-8 text-blue-600" />
              <div>
                <h1 className="text-xl font-bold text-gray-900">Centro de Ayuda</h1>
                <p className="text-sm text-gray-600">
                  {viewMode === 'home' 
                    ? 'Encuentra respuestas a tus preguntas' 
                    : 'Artículo de ayuda'
                  }
                </p>
              </div>
            </div>

            {viewMode === 'article' && (
              <Button
                variant="ghost"
                onClick={handleBackToHome}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Volver al inicio
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {viewMode === 'home' ? (
          <KnowledgeBaseHome onArticleSelect={handleArticleSelect} />
        ) : (
          <div className="max-w-4xl mx-auto">
            <KnowledgeArticleView 
              slug={selectedSlug}
              onRelatedArticleSelect={handleArticleSelect}
            />
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="bg-white border-t border-gray-200 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              ¿No encontraste lo que buscabas?
            </h3>
            <p className="text-gray-600 mb-6">
              Nuestro equipo de soporte está aquí para ayudarte
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                onClick={() => window.location.href = '/support'}
                className="flex items-center gap-2"
              >
                <HelpCircle className="h-4 w-4" />
                Crear Ticket de Soporte
              </Button>
              <Button
                variant="outline"
                onClick={() => window.location.href = 'mailto:soporte@toothpick.com'}
              >
                Contactar por Email
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
