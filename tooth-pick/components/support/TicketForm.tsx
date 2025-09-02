'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Upload, File, X, AlertCircle, Send } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface Category {
  value: string;
  label: string;
  description: string;
}

interface TicketFormProps {
  onSubmit?: (ticket: any) => void;
  onCancel?: () => void;
  isLoading?: boolean;
}

export default function TicketForm({
  onSubmit,
  onCancel,
  isLoading = false
}: TicketFormProps) {
  const [formData, setFormData] = useState({
    subject: '',
    description: '',
    priority: 'medium',
    category: '',
    attachments: [] as File[]
  });

  const [categories, setCategories] = useState<Category[]>([]);
  const [errors, setErrors] = useState<any>({});
  const [submitting, setSubmitting] = useState(false);

  // Cargar categorías disponibles
  useEffect(() => {
    const loadCategories = async () => {
      try {
        const response = await fetch('/api/support/categories');
        if (response.ok) {
          const data = await response.json();
          setCategories(data.categories || []);
        }
      } catch (error) {
        console.error('Error cargando categorías:', error);
      }
    };

    loadCategories();
  }, []);

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
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    const maxSize = 10 * 1024 * 1024; // 10MB
    const maxFiles = 5;

    if (formData.attachments.length + files.length > maxFiles) {
      setErrors(prev => ({
        ...prev,
        attachments: `Máximo ${maxFiles} archivos permitidos`
      }));
      return;
    }

    const validFiles = files.filter(file => {
      if (file.size > maxSize) {
        setErrors(prev => ({
          ...prev,
          attachments: 'Archivos deben ser menores a 10MB'
        }));
        return false;
      }
      return true;
    });

    setFormData(prev => ({
      ...prev,
      attachments: [...prev.attachments, ...validFiles]
    }));
  };

  const removeFile = (index: number) => {
    setFormData(prev => ({
      ...prev,
      attachments: prev.attachments.filter((_, i) => i !== index)
    }));
  };

  const validateForm = () => {
    const newErrors: any = {};

    if (!formData.subject.trim()) {
      newErrors.subject = 'El asunto es requerido';
    }

    if (!formData.description.trim()) {
      newErrors.description = 'La descripción es requerida';
    } else if (formData.description.length < 10) {
      newErrors.description = 'La descripción debe tener al menos 10 caracteres';
    }

    if (!formData.category) {
      newErrors.category = 'La categoría es requerida';
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

    try {
      // Crear FormData para incluir archivos
      const submitData = new FormData();
      submitData.append('subject', formData.subject);
      submitData.append('description', formData.description);
      submitData.append('priority', formData.priority);
      submitData.append('category', formData.category);

      formData.attachments.forEach((file, index) => {
        submitData.append(`attachment_${index}`, file);
      });

      const response = await fetch('/api/support/tickets', {
        method: 'POST',
        body: submitData
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error creando ticket');
      }

      const ticket = await response.json();
      
      if (onSubmit) {
        onSubmit(ticket);
      }

      // Resetear formulario
      setFormData({
        subject: '',
        description: '',
        priority: 'medium',
        category: '',
        attachments: []
      });

    } catch (error) {
      console.error('Error enviando ticket:', error);
      setErrors({
        submit: error instanceof Error ? error.message : 'Error enviando ticket'
      });
    } finally {
      setSubmitting(false);
    }
  };

  const selectedCategory = categories.find(cat => cat.value === formData.category);

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Send className="h-5 w-5" />
          Crear Nuevo Ticket de Soporte
        </CardTitle>
        <CardDescription>
          Describe tu problema o consulta y nuestro equipo te ayudará lo antes posible.
        </CardDescription>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Asunto */}
          <div className="space-y-2">
            <Label htmlFor="subject">Asunto *</Label>
            <Input
              id="subject"
              value={formData.subject}
              onChange={(e) => handleInputChange('subject', e.target.value)}
              placeholder="Describe brevemente tu problema"
              className={errors.subject ? 'border-red-500' : ''}
              disabled={submitting || isLoading}
            />
            {errors.subject && (
              <p className="text-sm text-red-500">{errors.subject}</p>
            )}
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
                <SelectValue placeholder="Selecciona una categoría" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((category) => (
                  <SelectItem key={category.value} value={category.value}>
                    <div>
                      <div className="font-medium">{category.label}</div>
                      <div className="text-sm text-gray-500">{category.description}</div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.category && (
              <p className="text-sm text-red-500">{errors.category}</p>
            )}
            {selectedCategory && (
              <p className="text-sm text-gray-600">{selectedCategory.description}</p>
            )}
          </div>

          {/* Prioridad */}
          <div className="space-y-2">
            <Label htmlFor="priority">Prioridad</Label>
            <Select
              value={formData.priority}
              onValueChange={(value) => handleInputChange('priority', value)}
              disabled={submitting || isLoading}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">Baja</Badge>
                    <span className="text-sm">- Consulta general (respuesta en 72h)</span>
                  </div>
                </SelectItem>
                <SelectItem value="medium">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">Media</Badge>
                    <span className="text-sm">- Problema que afecta el trabajo (respuesta en 24h)</span>
                  </div>
                </SelectItem>
                <SelectItem value="high">
                  <div className="flex items-center gap-2">
                    <Badge variant="destructive">Alta</Badge>
                    <span className="text-sm">- Problema crítico que bloquea operaciones (respuesta en 4h)</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Descripción */}
          <div className="space-y-2">
            <Label htmlFor="description">Descripción detallada *</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="Describe detalladamente tu problema, incluye pasos para reproducir el error, capturas de pantalla, etc."
              rows={6}
              className={errors.description ? 'border-red-500' : ''}
              disabled={submitting || isLoading}
            />
            {errors.description && (
              <p className="text-sm text-red-500">{errors.description}</p>
            )}
            <p className="text-sm text-gray-500">
              Mínimo 10 caracteres. Entre más detalles proporciones, mejor podremos ayudarte.
            </p>
          </div>

          {/* Archivos adjuntos */}
          <div className="space-y-2">
            <Label>Archivos adjuntos (opcional)</Label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
              <input
                type="file"
                multiple
                onChange={handleFileUpload}
                className="hidden"
                id="file-upload"
                accept=".jpg,.jpeg,.png,.gif,.pdf,.doc,.docx,.txt"
                disabled={submitting || isLoading}
              />
              <label
                htmlFor="file-upload"
                className="cursor-pointer flex flex-col items-center justify-center space-y-2"
              >
                <Upload className="h-8 w-8 text-gray-400" />
                <p className="text-sm text-gray-600">
                  Haz clic para subir archivos o arrastra y suelta
                </p>
                <p className="text-xs text-gray-500">
                  PNG, JPG, PDF, DOC hasta 10MB. Máximo 5 archivos.
                </p>
              </label>
            </div>

            {/* Lista de archivos */}
            {formData.attachments.length > 0 && (
              <div className="space-y-2">
                {formData.attachments.map((file, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-2 bg-gray-50 rounded-lg"
                  >
                    <div className="flex items-center gap-2">
                      <File className="h-4 w-4 text-gray-500" />
                      <span className="text-sm truncate">{file.name}</span>
                      <span className="text-xs text-gray-500">
                        ({(file.size / 1024 / 1024).toFixed(2)} MB)
                      </span>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeFile(index)}
                      disabled={submitting || isLoading}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {errors.attachments && (
              <p className="text-sm text-red-500">{errors.attachments}</p>
            )}
          </div>

          {/* Error de envío */}
          {errors.submit && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{errors.submit}</AlertDescription>
            </Alert>
          )}

          {/* Botones */}
          <div className="flex gap-3 pt-4">
            <Button
              type="submit"
              disabled={submitting || isLoading}
              className="flex-1"
            >
              {submitting ? 'Enviando...' : 'Crear Ticket'}
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
      </CardContent>
    </Card>
  );
}
