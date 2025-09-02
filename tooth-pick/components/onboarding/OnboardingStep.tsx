'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { 
  CheckCircle2, 
  Building2, 
  CreditCard, 
  Package, 
  Settings,
  Users,
  FileText,
  ShoppingCart,
  Star,
  Gift,
  Zap,
  Info,
  Upload,
  ExternalLink,
  Plus,
  Trash2,
  Save
} from 'lucide-react';

interface OnboardingStepData {
  id: string;
  title: string;
  description: string;
  component: string;
  isCompleted: boolean;
  isOptional: boolean;
  estimatedTime: number;
  prerequisites?: string[];
  category: 'profile' | 'setup' | 'integration' | 'configuration' | 'launch';
  priority: 'high' | 'medium' | 'low';
}

interface OnboardingStepProps {
  step: OnboardingStepData;
  userRole: 'provider' | 'distributor' | 'clinic' | 'admin';
  onComplete: (stepData: any) => void;
  onSave: () => void;
}

// Componente Welcome Step
const WelcomeStep: React.FC<{
  userRole: string;
  onComplete: (data: any) => void;
}> = ({ userRole, onComplete }) => {
  const roleMessages = {
    provider: {
      title: '¡Bienvenido, Proveedor!',
      subtitle: 'Conecta tu empresa con distribuidores y clínicas de toda la región',
      benefits: [
        'Gestiona tu catálogo de productos de forma centralizada',
        'Conecta con distribuidores verificados',
        'Automatiza órdenes y facturación',
        'Accede a analytics de ventas en tiempo real'
      ]
    },
    distributor: {
      title: '¡Bienvenido, Distribuidor!',
      subtitle: 'Amplía tu alcance y gestiona tu red comercial eficientemente',
      benefits: [
        'Accede a catálogos de múltiples proveedores',
        'Gestiona precios y márgenes personalizados',
        'Automatiza la gestión de clientes',
        'Herramientas de CRM integradas'
      ]
    },
    clinic: {
      title: '¡Bienvenida, Clínica!',
      subtitle: 'Optimiza tus compras y gestión de inventario dental',
      benefits: [
        'Compara precios de múltiples distribuidores',
        'Gestiona tu inventario inteligentemente',
        'Solicita cotizaciones automatizadas',
        'Accede a programas de lealtad exclusivos'
      ]
    },
    admin: {
      title: '¡Bienvenido, Administrador!',
      subtitle: 'Configura y gestiona toda la plataforma ToothPick',
      benefits: [
        'Panel de control completo de la plataforma',
        'Gestión de usuarios y permisos',
        'Configuración de políticas globales',
        'Analytics avanzados del marketplace'
      ]
    }
  };

  const currentRole = roleMessages[userRole as keyof typeof roleMessages] || roleMessages.provider;

  return (
    <div className="space-y-6">
      <div className="text-center space-y-4">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
          <Building2 className="h-8 w-8 text-blue-600" />
        </div>
        <h2 className="text-3xl font-bold text-gray-900">{currentRole.title}</h2>
        <p className="text-xl text-gray-600 max-w-2xl mx-auto">
          {currentRole.subtitle}
        </p>
      </div>

      <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Star className="h-5 w-5 text-yellow-500" />
            Beneficios que obtendrás:
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {currentRole.benefits.map((benefit, index) => (
              <div key={index} className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                <span className="text-gray-700">{benefit}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          Este proceso te tomará aproximadamente 10-15 minutos. Puedes guardar tu progreso 
          en cualquier momento y continuar después.
        </AlertDescription>
      </Alert>

      <div className="text-center pt-4">
        <Button size="lg" onClick={() => onComplete({ welcomed: true })}>
          Comenzar Configuración
          <Zap className="h-4 w-4 ml-2" />
        </Button>
      </div>
    </div>
  );
};

// Componente Profile Step
const ProfileStep: React.FC<{
  userRole: string;
  onComplete: (data: any) => void;
}> = ({ userRole, onComplete }) => {
  const [formData, setFormData] = useState({
    companyName: '',
    businessType: '',
    rfc: '',
    address: '',
    phone: '',
    website: '',
    description: '',
    specialties: [] as string[],
    contactPerson: '',
    contactEmail: ''
  });

  const [newSpecialty, setNewSpecialty] = useState('');

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const addSpecialty = () => {
    if (newSpecialty.trim() && !formData.specialties.includes(newSpecialty.trim())) {
      setFormData(prev => ({
        ...prev,
        specialties: [...prev.specialties, newSpecialty.trim()]
      }));
      setNewSpecialty('');
    }
  };

  const removeSpecialty = (specialty: string) => {
    setFormData(prev => ({
      ...prev,
      specialties: prev.specialties.filter(s => s !== specialty)
    }));
  };

  const isFormValid = () => {
    return formData.companyName && formData.rfc && formData.address && formData.phone;
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">Información de la Empresa</h3>
        <p className="text-gray-600">
          Esta información aparecerá en tu perfil público y ayudará a otros usuarios a encontrarte.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label htmlFor="companyName">Nombre de la Empresa *</Label>
          <Input
            id="companyName"
            value={formData.companyName}
            onChange={(e) => handleInputChange('companyName', e.target.value)}
            placeholder="Nombre de tu empresa"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="businessType">Tipo de Negocio</Label>
          <Input
            id="businessType"
            value={formData.businessType}
            onChange={(e) => handleInputChange('businessType', e.target.value)}
            placeholder="Ej: Distribuidor dental, Clínica, etc."
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="rfc">RFC *</Label>
          <Input
            id="rfc"
            value={formData.rfc}
            onChange={(e) => handleInputChange('rfc', e.target.value)}
            placeholder="RFC de la empresa"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="phone">Teléfono *</Label>
          <Input
            id="phone"
            value={formData.phone}
            onChange={(e) => handleInputChange('phone', e.target.value)}
            placeholder="+52 55 1234 5678"
          />
        </div>

        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="address">Dirección *</Label>
          <Textarea
            id="address"
            value={formData.address}
            onChange={(e) => handleInputChange('address', e.target.value)}
            placeholder="Dirección completa de la empresa"
            rows={3}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="website">Sitio Web</Label>
          <Input
            id="website"
            value={formData.website}
            onChange={(e) => handleInputChange('website', e.target.value)}
            placeholder="https://tuempresa.com"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="contactEmail">Email de Contacto</Label>
          <Input
            id="contactEmail"
            type="email"
            value={formData.contactEmail}
            onChange={(e) => handleInputChange('contactEmail', e.target.value)}
            placeholder="contacto@tuempresa.com"
          />
        </div>
      </div>

      <Separator />

      <div className="space-y-4">
        <div>
          <Label htmlFor="description">Descripción de la Empresa</Label>
          <Textarea
            id="description"
            value={formData.description}
            onChange={(e) => handleInputChange('description', e.target.value)}
            placeholder="Describe tu empresa, servicios y experiencia..."
            rows={4}
          />
        </div>

        <div>
          <Label>Especialidades / Categorías</Label>
          <div className="flex gap-2 mt-2 mb-3">
            <Input
              value={newSpecialty}
              onChange={(e) => setNewSpecialty(e.target.value)}
              placeholder="Ej: Endodoncia, Implantes, etc."
              onKeyPress={(e) => e.key === 'Enter' && addSpecialty()}
            />
            <Button type="button" onClick={addSpecialty} variant="outline">
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          
          <div className="flex flex-wrap gap-2">
            {formData.specialties.map((specialty, index) => (
              <Badge key={index} variant="secondary" className="flex items-center gap-1">
                {specialty}
                <button
                  onClick={() => removeSpecialty(specialty)}
                  className="ml-1 text-red-500 hover:text-red-700"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        </div>
      </div>

      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          Los campos marcados con * son obligatorios. Esta información se puede editar después desde tu perfil.
        </AlertDescription>
      </Alert>

      <div className="flex justify-end pt-4">
        <Button 
          onClick={() => onComplete(formData)} 
          disabled={!isFormValid()}
        >
          Continuar
          <CheckCircle2 className="h-4 w-4 ml-2" />
        </Button>
      </div>
    </div>
  );
};

// Componente Completion Step
const CompletionStep: React.FC<{
  userRole: string;
  onComplete: (data: any) => void;
}> = ({ userRole, onComplete }) => {
  const nextSteps = {
    provider: [
      { icon: Package, title: 'Cargar Productos', desc: 'Agrega tu catálogo inicial' },
      { icon: CreditCard, title: 'Configurar Pagos', desc: 'Conecta tus métodos de cobro' },
      { icon: Settings, title: 'Integrar ERP', desc: 'Conecta tu sistema existente' }
    ],
    distributor: [
      { icon: Building2, title: 'Conectar Proveedores', desc: 'Busca y conecta con proveedores' },
      { icon: Users, title: 'Agregar Clientes', desc: 'Importa tu base de clientes' },
      { icon: FileText, title: 'Configurar Precios', desc: 'Define tus márgenes y descuentos' }
    ],
    clinic: [
      { icon: ShoppingCart, title: 'Primera Compra', desc: 'Explora el catálogo y haz tu primera orden' },
      { icon: Users, title: 'Agregar Equipo', desc: 'Invita a dentistas y asistentes' },
      { icon: Gift, title: 'Programa de Lealtad', desc: 'Activa recompensas y descuentos' }
    ],
    admin: [
      { icon: Settings, title: 'Configurar Plataforma', desc: 'Políticas y configuraciones globales' },
      { icon: Users, title: 'Gestionar Usuarios', desc: 'Revisar registros y permisos' },
      { icon: FileText, title: 'Reportes', desc: 'Configurar dashboards y analytics' }
    ]
  };

  const currentSteps = nextSteps[userRole as keyof typeof nextSteps] || nextSteps.provider;

  return (
    <div className="space-y-6 text-center">
      <div className="space-y-4">
        <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full mb-4">
          <CheckCircle2 className="h-10 w-10 text-green-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900">¡Configuración Completada!</h2>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          Tu cuenta está lista para usar. Ahora puedes aprovechar todas las funcionalidades 
          de ToothPick para hacer crecer tu negocio.
        </p>
      </div>

      <Card className="bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
        <CardHeader>
          <CardTitle>Próximos Pasos Recomendados</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {currentSteps.map((step, index) => (
              <div key={index} className="text-center p-4 bg-white rounded-lg shadow-sm">
                <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-100 rounded-full mb-3">
                  <step.icon className="h-6 w-6 text-blue-600" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-1">{step.title}</h3>
                <p className="text-sm text-gray-600">{step.desc}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Alert>
        <Star className="h-4 w-4" />
        <AlertDescription>
          ¡Consejo! Completa estos pasos en los próximos días para obtener el máximo beneficio de la plataforma.
        </AlertDescription>
      </Alert>

      <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
        <Button size="lg" onClick={() => onComplete({ completed: true })}>
          Ir al Dashboard
          <ExternalLink className="h-4 w-4 ml-2" />
        </Button>
        <Button variant="outline" size="lg" onClick={() => window.location.href = '/help'}>
          Ver Guías de Ayuda
        </Button>
      </div>
    </div>
  );
};

// Componente principal OnboardingStep
const OnboardingStep: React.FC<OnboardingStepProps> = ({ 
  step, 
  userRole, 
  onComplete, 
  onSave 
}) => {
  const renderStepComponent = () => {
    switch (step.component) {
      case 'WelcomeStep':
        return (
          <WelcomeStep
            userRole={userRole}
            onComplete={onComplete}
          />
        );
      
      case 'ProfileStep':
        return (
          <ProfileStep
            userRole={userRole}
            onComplete={onComplete}
          />
        );
      
      case 'CompletionStep':
        return (
          <CompletionStep
            userRole={userRole}
            onComplete={onComplete}
          />
        );
      
      default:
        return (
          <div className="text-center py-8">
            <Info className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Paso en Desarrollo
            </h3>
            <p className="text-gray-600 mb-4">
              Este paso está siendo desarrollado y estará disponible pronto.
            </p>
            <Button onClick={() => onComplete({ skipped: true })}>
              Continuar
            </Button>
          </div>
        );
    }
  };

  return (
    <div className="min-h-[400px]">
      {renderStepComponent()}
    </div>
  );
};

export default OnboardingStep;
