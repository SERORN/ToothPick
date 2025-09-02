'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { 
  Save, 
  X, 
  Plus,
  Eye,
  FileText,
  AlertCircle,
  CheckCircle,
  Tag
} from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface Category {
  name: string;
  count: number;
}

interface Tag {
  name: string;
  count: number;
}

interface KnowledgeArticleFormProps {
  articleId?: string;
  initialData?: any;
  onSave?: (article: any) => void;
  onCancel?: () => void;
  isLoading?: boolean;
}

export default function KnowledgeArticleForm({
  articleId,
  initialData,
  onSave,
  onCancel,
  isLoading = false
}: KnowledgeArticleFormProps) {
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    excerpt: '',
    role: 'all',
    category: '',
    tags: [] as string[],
    isFeatured: false,
    isPublished: false,
    seoTitle: '',
    seoDescription: ''
  });

  const [categories, setCategories] = useState<Category[]>([]);
  const [popularTags, setPopularTags] = useState<Tag[]>([]);
  const [newTag, setNewTag] = useState('');
  const [errors, setErrors] = useState<any>({});
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);

  // Cargar datos iniciales
  useEffect(() => {
    loadCategories();
    loadPopularTags();
    
    if (initialData) {
      setFormData({
        title: initialData.title || '',
        content: initialData.content || '',
        excerpt: initialData.excerpt || '',
        role: initialData.role || 'all',
        category: initialData.category || '',
        tags: initialData.tags || [],
        isFeatured: initialData.isFeatured || false,
        isPublished: initialData.isPublished || false,
        seoTitle: initialData.seoTitle || '',
        seoDescription: initialData.seoDescription || ''
      });
    }
  }, [initialData]);

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

  const loadPopularTags = async () => {
    try {
      const response = await fetch('/api/help/metadata?type=tags&limit=20');
      if (response.ok) {
        const data = await response.json();
        setPopularTags(data.tags || []);
      }
    } catch (error) {
      console.error('Error cargando tags:', error);
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));

    // Limpiar error del campo
    if (errors[field]) {
      setErrors((prev: any) => ({
        ...prev,
        [field]: undefined
      }));
    }

    // Auto-generar SEO fields si están vacíos
    if (field === 'title' && !formData.seoTitle) {
      const seoTitle = value.length > 60 ? value.substring(0, 57) + '...' : value;
      setFormData(prev => ({ ...prev, seoTitle }));
    }

    if (field === 'excerpt' && !formData.seoDescription) {
      const seoDescription = value.length > 160 ? value.substring(0, 157) + '...' : value;
      setFormData(prev => ({ ...prev, seoDescription }));
    }
  };

  const addTag = () => {
    if (newTag.trim() && !formData.tags.includes(newTag.trim().toLowerCase())) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, newTag.trim().toLowerCase()]
      }));
      setNewTag('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  const addPopularTag = (tag: string) => {
    if (!formData.tags.includes(tag)) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, tag]
      }));
    }
  };

  const validateForm = () => {
    const newErrors: any = {};

    if (!formData.title.trim()) {
      newErrors.title = 'El título es requerido';
    } else if (formData.title.length > 200) {
      newErrors.title = 'El título no puede exceder 200 caracteres';
    }

    if (!formData.content.trim()) {
      newErrors.content = 'El contenido es requerido';
    } else if (formData.content.length < 50) {
      newErrors.content = 'El contenido debe tener al menos 50 caracteres';
    }

    if (!formData.category.trim()) {
      newErrors.category = 'La categoría es requerida';
    }

    if (formData.excerpt && formData.excerpt.length > 300) {
      newErrors.excerpt = 'El resumen no puede exceder 300 caracteres';
    }

    if (formData.seoTitle && formData.seoTitle.length > 60) {
      newErrors.seoTitle = 'El título SEO no puede exceder 60 caracteres';
    }

    if (formData.seoDescription && formData.seoDescription.length > 160) {
      newErrors.seoDescription = 'La descripción SEO no puede exceder 160 caracteres';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setSubmitting(true);
    setSuccess(false);

    try {
      const url = articleId 
        ? `/api/help/articles/${articleId}` 
        : '/api/help/articles';
      
      const method = articleId ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error guardando artículo');
      }

      const data = await response.json();
      setSuccess(true);

      if (onSave) {
        onSave(data.article);
      }

      // Resetear formulario si es creación
      if (!articleId) {
        setFormData({
          title: '',
          content: '',
          excerpt: '',
          role: 'all',
          category: '',
          tags: [],
          isFeatured: false,
          isPublished: false,
          seoTitle: '',
          seoDescription: ''
        });
      }

    } catch (error) {
      console.error('Error guardando artículo:', error);
      setErrors({
        submit: error instanceof Error ? error.message : 'Error guardando artículo'
      });
    } finally {
      setSubmitting(false);
    }
  };

  const estimateReadTime = (content: string) => {
    const wordsPerMinute = 200;
    const wordCount = content.split(/\s+/).length;
    return Math.max(Math.ceil(wordCount / wordsPerMinute), 1);
  };

  const roles = [
    { value: 'all', label: 'Todos los usuarios' },
    { value: 'patient', label: 'Pacientes' },
    { value: 'dentist', label: 'Dentistas' },
    { value: 'distributor', label: 'Distribuidores' },
    { value: 'admin', label: 'Administradores' }
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">
            {articleId ? 'Editar Artículo' : 'Crear Nuevo Artículo'}
          </h1>
          <p className="text-gray-600 mt-1">
            {articleId ? 'Modifica la información del artículo' : 'Crea un nuevo artículo para el centro de ayuda'}
          </p>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setPreviewMode(!previewMode)}
          >
            <Eye className="h-4 w-4 mr-2" />
            {previewMode ? 'Editar' : 'Vista previa'}
          </Button>
        </div>
      </div>

      {/* Alertas */}
      {success && (
        <Alert>
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>
            Artículo {articleId ? 'actualizado' : 'creado'} exitosamente
          </AlertDescription>
        </Alert>
      )}

      {errors.submit && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{errors.submit}</AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Columna principal */}
          <div className="lg:col-span-2 space-y-6">
            {/* Información básica */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Información Básica
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Título */}
                <div className="space-y-2">
                  <Label htmlFor="title">Título *</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => handleInputChange('title', e.target.value)}
                    placeholder="Título del artículo"
                    className={errors.title ? 'border-red-500' : ''}
                    disabled={submitting || isLoading}
                  />
                  {errors.title && (
                    <p className="text-sm text-red-500">{errors.title}</p>
                  )}
                  <p className="text-xs text-gray-500">
                    {formData.title.length}/200 caracteres
                  </p>
                </div>

                {/* Resumen */}
                <div className="space-y-2">
                  <Label htmlFor="excerpt">Resumen</Label>
                  <Textarea
                    id="excerpt"
                    value={formData.excerpt}
                    onChange={(e) => handleInputChange('excerpt', e.target.value)}
                    placeholder="Breve descripción del artículo (se auto-genera del contenido si se deja vacío)"
                    rows={3}
                    className={errors.excerpt ? 'border-red-500' : ''}
                    disabled={submitting || isLoading}
                  />
                  {errors.excerpt && (
                    <p className="text-sm text-red-500">{errors.excerpt}</p>
                  )}
                  <p className="text-xs text-gray-500">
                    {formData.excerpt.length}/300 caracteres
                  </p>
                </div>

                {/* Contenido */}
                <div className="space-y-2">
                  <Label htmlFor="content">Contenido * (Markdown)</Label>
                  <Textarea
                    id="content"
                    value={formData.content}
                    onChange={(e) => handleInputChange('content', e.target.value)}
                    placeholder="Contenido del artículo en formato Markdown..."
                    rows={15}
                    className={`font-mono ${errors.content ? 'border-red-500' : ''}`}
                    disabled={submitting || isLoading}
                  />
                  {errors.content && (
                    <p className="text-sm text-red-500">{errors.content}</p>
                  )}
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>Soporta Markdown: **negrita**, *cursiva*, `código`, etc.</span>
                    <span>~{estimateReadTime(formData.content)} min de lectura</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* SEO */}
            <Card>
              <CardHeader>
                <CardTitle>Optimización SEO</CardTitle>
                <CardDescription>
                  Mejora la visibilidad del artículo en motores de búsqueda
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="seoTitle">Título SEO</Label>
                  <Input
                    id="seoTitle"
                    value={formData.seoTitle}
                    onChange={(e) => handleInputChange('seoTitle', e.target.value)}
                    placeholder="Título optimizado para SEO"
                    className={errors.seoTitle ? 'border-red-500' : ''}
                    disabled={submitting || isLoading}
                  />
                  {errors.seoTitle && (
                    <p className="text-sm text-red-500">{errors.seoTitle}</p>
                  )}
                  <p className="text-xs text-gray-500">
                    {formData.seoTitle.length}/60 caracteres
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="seoDescription">Descripción SEO</Label>
                  <Textarea
                    id="seoDescription"
                    value={formData.seoDescription}
                    onChange={(e) => handleInputChange('seoDescription', e.target.value)}
                    placeholder="Descripción optimizada para SEO"
                    rows={3}
                    className={errors.seoDescription ? 'border-red-500' : ''}
                    disabled={submitting || isLoading}
                  />
                  {errors.seoDescription && (
                    <p className="text-sm text-red-500">{errors.seoDescription}</p>
                  )}
                  <p className="text-xs text-gray-500">
                    {formData.seoDescription.length}/160 caracteres
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Configuración */}
            <Card>
              <CardHeader>
                <CardTitle>Configuración</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Rol objetivo */}
                <div className="space-y-2">
                  <Label htmlFor="role">Dirigido a *</Label>
                  <Select
                    value={formData.role}
                    onValueChange={(value) => handleInputChange('role', value)}
                    disabled={submitting || isLoading}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {roles.map(role => (
                        <SelectItem key={role.value} value={role.value}>
                          {role.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Categoría */}
                <div className="space-y-2">
                  <Label htmlFor="category">Categoría *</Label>
                  <Select
                    value={formData.category}
                    onValueChange={(value) => handleInputChange('category', value)}
                    disabled={submitting || isLoading}
                  >
                    <SelectTrigger className={errors.category ? 'border-red-500' : ''}>
                      <SelectValue placeholder="Seleccionar categoría" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map(category => (
                        <SelectItem key={category.name} value={category.name}>
                          {category.name} ({category.count})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.category && (
                    <p className="text-sm text-red-500">{errors.category}</p>
                  )}
                </div>

                {/* Switches */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="isFeatured">Artículo destacado</Label>
                    <Switch
                      id="isFeatured"
                      checked={formData.isFeatured}
                      onCheckedChange={(checked) => handleInputChange('isFeatured', checked)}
                      disabled={submitting || isLoading}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label htmlFor="isPublished">Publicado</Label>
                    <Switch
                      id="isPublished"
                      checked={formData.isPublished}
                      onCheckedChange={(checked) => handleInputChange('isPublished', checked)}
                      disabled={submitting || isLoading}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Tags */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Tag className="h-4 w-4" />
                  Tags
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Tags actuales */}
                {formData.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {formData.tags.map(tag => (
                      <Badge
                        key={tag}
                        variant="secondary"
                        className="cursor-pointer"
                        onClick={() => removeTag(tag)}
                      >
                        {tag}
                        <X className="h-3 w-3 ml-1" />
                      </Badge>
                    ))}
                  </div>
                )}

                {/* Agregar nuevo tag */}
                <div className="flex gap-2">
                  <Input
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    placeholder="Nuevo tag"
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                    disabled={submitting || isLoading}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addTag}
                    disabled={!newTag.trim() || submitting || isLoading}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>

                {/* Tags populares */}
                {popularTags.length > 0 && (
                  <div className="space-y-2">
                    <Label className="text-sm">Tags populares:</Label>
                    <div className="flex flex-wrap gap-1">
                      {popularTags.slice(0, 10).map(tag => (
                        <Badge
                          key={tag.name}
                          variant="outline"
                          className="cursor-pointer text-xs"
                          onClick={() => addPopularTag(tag.name)}
                        >
                          {tag.name}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Botones de acción */}
        <div className="flex gap-3 pt-6 border-t">
          <Button
            type="submit"
            disabled={submitting || isLoading}
            className="flex-1"
          >
            <Save className="h-4 w-4 mr-2" />
            {submitting ? 'Guardando...' : articleId ? 'Actualizar Artículo' : 'Crear Artículo'}
          </Button>
          
          {onCancel && (
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={submitting || isLoading}
            >
              Cancelar
            </Button>
          )}
        </div>
      </form>
    </div>
  );
}
