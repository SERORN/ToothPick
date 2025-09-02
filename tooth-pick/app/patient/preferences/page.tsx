import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Bell,
  Mail,
  MessageSquare,
  Phone,
  Clock,
  CheckCircle,
  Settings
} from 'lucide-react';

interface UserPreferences {
  prefersReminderBy: 'email' | 'sms' | 'whatsapp';
  reminderHoursBefore: number;
  acceptsMarketingMessages: boolean;
}

export default function ReminderPreferencesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [preferences, setPreferences] = useState<UserPreferences>({
    prefersReminderBy: 'email',
    reminderHoursBefore: 24,
    acceptsMarketingMessages: true
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
      return;
    }

    if (session?.user) {
      fetchUserPreferences();
    }
  }, [session, status]);

  const fetchUserPreferences = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/user/preferences');
      
      if (response.ok) {
        const data = await response.json();
        setPreferences({
          prefersReminderBy: data.prefersReminderBy || 'email',
          reminderHoursBefore: data.reminderHoursBefore || 24,
          acceptsMarketingMessages: data.acceptsMarketingMessages !== false
        });
      }
    } catch (error) {
      console.error('Error fetching preferences:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setSaved(false);

      const response = await fetch('/api/user/preferences', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(preferences)
      });

      if (response.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      }
    } catch (error) {
      console.error('Error saving preferences:', error);
    } finally {
      setSaving(false);
    }
  };

  const handlePreferenceChange = (key: keyof UserPreferences, value: any) => {
    setPreferences(prev => ({
      ...prev,
      [key]: value
    }));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-200 rounded w-1/2"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <Settings className="h-8 w-8" />
            Configuración de Recordatorios
          </h1>
          <p className="text-gray-600 mt-2">
            Personaliza cómo y cuándo recibir recordatorios de tus citas dentales
          </p>
        </div>

        {/* Notification de éxito */}
        {saved && (
          <Card className="mb-6 border-green-200 bg-green-50">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-green-700">
                <CheckCircle className="h-4 w-4" />
                <span>Preferencias guardadas exitosamente</span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Método de recordatorio */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Método de Recordatorio Preferido
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="reminderMethod">¿Cómo te gustaría recibir los recordatorios?</Label>
              <Select 
                value={preferences.prefersReminderBy} 
                onValueChange={(value: 'email' | 'sms' | 'whatsapp') => 
                  handlePreferenceChange('prefersReminderBy', value)
                }
              >
                <SelectTrigger className="mt-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="email">
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      Email (Recomendado)
                    </div>
                  </SelectItem>
                  <SelectItem value="sms">
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4" />
                      SMS / Mensaje de Texto
                    </div>
                  </SelectItem>
                  <SelectItem value="whatsapp">
                    <div className="flex items-center gap-2">
                      <MessageSquare className="h-4 w-4" />
                      WhatsApp
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Información sobre cada método */}
            <div className="grid gap-3">
              <div className={`p-3 rounded-lg border ${
                preferences.prefersReminderBy === 'email' 
                  ? 'border-blue-200 bg-blue-50' 
                  : 'border-gray-200 bg-gray-50'
              }`}>
                <div className="flex items-center gap-2 mb-1">
                  <Mail className="h-4 w-4 text-blue-600" />
                  <span className="font-medium">Email</span>
                </div>
                <p className="text-sm text-gray-600">
                  Recordatorios detallados con información completa de la cita, 
                  mapa de ubicación y botones de acción.
                </p>
              </div>

              <div className={`p-3 rounded-lg border ${
                preferences.prefersReminderBy === 'sms' 
                  ? 'border-blue-200 bg-blue-50' 
                  : 'border-gray-200 bg-gray-50'
              }`}>
                <div className="flex items-center gap-2 mb-1">
                  <Phone className="h-4 w-4 text-green-600" />
                  <span className="font-medium">SMS</span>
                </div>
                <p className="text-sm text-gray-600">
                  Mensajes de texto cortos con la información esencial de tu cita.
                </p>
              </div>

              <div className={`p-3 rounded-lg border ${
                preferences.prefersReminderBy === 'whatsapp' 
                  ? 'border-blue-200 bg-blue-50' 
                  : 'border-gray-200 bg-gray-50'
              }`}>
                <div className="flex items-center gap-2 mb-1">
                  <MessageSquare className="h-4 w-4 text-green-600" />
                  <span className="font-medium">WhatsApp</span>
                </div>
                <p className="text-sm text-gray-600">
                  Mensajes por WhatsApp con formato enriquecido y emojis.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tiempo de recordatorio */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Tiempo de Anticipación
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div>
              <Label htmlFor="reminderTime">¿Con cuánta anticipación quieres recibir el recordatorio?</Label>
              <Select 
                value={preferences.reminderHoursBefore.toString()} 
                onValueChange={(value) => 
                  handlePreferenceChange('reminderHoursBefore', parseInt(value))
                }
              >
                <SelectTrigger className="mt-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="2">2 horas antes</SelectItem>
                  <SelectItem value="6">6 horas antes</SelectItem>
                  <SelectItem value="12">12 horas antes</SelectItem>
                  <SelectItem value="24">24 horas antes (Recomendado)</SelectItem>
                  <SelectItem value="48">48 horas antes</SelectItem>
                  <SelectItem value="72">3 días antes</SelectItem>
                </SelectContent>
              </Select>
              
              <p className="text-sm text-gray-600 mt-2">
                Actualmente: {preferences.reminderHoursBefore} horas antes de tu cita
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Mensajes de marketing */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Mensajes Promocionales</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-start space-x-3">
              <Checkbox
                id="marketing"
                checked={preferences.acceptsMarketingMessages}
                onCheckedChange={(checked) => 
                  handlePreferenceChange('acceptsMarketingMessages', checked)
                }
              />
              <div className="space-y-1">
                <Label 
                  htmlFor="marketing" 
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Recibir ofertas y promociones
                </Label>
                <p className="text-sm text-gray-600">
                  Ocasionalmente te enviaremos ofertas especiales, 
                  descuentos y noticias sobre nuevos tratamientos dentales.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Vista previa */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Vista Previa del Recordatorio</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-gray-50 p-4 rounded-lg">
              {preferences.prefersReminderBy === 'email' && (
                <div className="space-y-2">
                  <p className="font-medium">📧 Email de recordatorio</p>
                  <div className="text-sm text-gray-600 space-y-1">
                    <p><strong>Asunto:</strong> 🦷 Recordatorio: Tu cita dental es mañana</p>
                    <p><strong>Contenido:</strong> Recordatorio detallado con información completa de la cita...</p>
                  </div>
                </div>
              )}

              {preferences.prefersReminderBy === 'sms' && (
                <div className="space-y-2">
                  <p className="font-medium">📱 SMS</p>
                  <div className="text-sm text-gray-600">
                    <p>"Hola Juan, te recordamos tu cita dental con Dr. Smith mañana 15/03 a las 10:00 AM. Clínica Dental Plus. Si necesitas reprogramar, contáctanos."</p>
                  </div>
                </div>
              )}

              {preferences.prefersReminderBy === 'whatsapp' && (
                <div className="space-y-2">
                  <p className="font-medium">💬 WhatsApp</p>
                  <div className="text-sm text-gray-600">
                    <p>"🦷 <strong>Recordatorio de Cita</strong><br/>
                    Hola Juan, te recordamos tu cita dental...<br/>
                    📅 Mañana 15/03<br/>
                    🕐 10:00 AM<br/>
                    👨‍⚕️ Dr. Smith"</p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Botón de guardar */}
        <div className="flex justify-end">
          <Button 
            onClick={handleSave} 
            disabled={saving}
            size="lg"
          >
            {saving ? 'Guardando...' : 'Guardar Preferencias'}
          </Button>
        </div>
      </div>
    </div>
  );
}
