import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Calendar,
  Clock,
  User,
  MapPin,
  Phone,
  Mail,
  DollarSign,
  CreditCard,
  AlertCircle,
  CheckCircle,
  ArrowLeft
} from 'lucide-react';

interface Dentist {
  id: string;
  name: string;
  clinicName: string;
  clinicAddress: string;
  specialties: string[];
  consultationFee: number;
  profileImageUrl?: string;
  bio: string;
}

interface TimeSlot {
  id: string;
  startTime: string;
  endTime: string;
  service: string;
  duration: number;
  price: number;
}

interface Treatment {
  id: string;
  name: string;
  description: string;
  estimatedPrice: number;
  duration: number;
  requiresFinancing: boolean;
}

interface BookingData {
  dentist: Dentist;
  availability: Record<string, TimeSlot[]>;
  treatments: Treatment[];
}

export default function BookAppointmentPage() {
  const router = useRouter();
  const { dentistId } = router.query;
  const { data: session } = useSession();

  // Estados principales
  const [bookingData, setBookingData] = useState<BookingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Estados del formulario
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [selectedTreatment, setSelectedTreatment] = useState<Treatment | null>(null);
  const [reasonForVisit, setReasonForVisit] = useState('');
  const [symptoms, setSymptoms] = useState('');
  const [previousTreatments, setPreviousTreatments] = useState('');
  const [requiresFinancing, setRequiresFinancing] = useState(false);

  // Datos del paciente (para usuarios no logueados)
  const [patientData, setPatientData] = useState({
    name: '',
    email: '',
    phone: '',
    age: '',
    emergencyContactName: '',
    emergencyContactPhone: '',
    emergencyContactRelation: ''
  });

  // Resultado de la reserva
  const [appointmentResult, setAppointmentResult] = useState<any>(null);

  useEffect(() => {
    if (dentistId) {
      fetchBookingData();
    }
  }, [dentistId]);

  useEffect(() => {
    // Autocompletar datos si está logueado como paciente
    if (session?.user && bookingData) {
      // TODO: Fetch user data and populate patientData
    }
  }, [session, bookingData]);

  const fetchBookingData = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/book/${dentistId}`);
      if (response.ok) {
        const data = await response.json();
        setBookingData(data);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Error al cargar información del dentista');
      }
    } catch (err) {
      setError('Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  const handleDateSelect = (date: string) => {
    setSelectedDate(date);
    setSelectedSlot(null); // Reset slot selection
  };

  const handleSlotSelect = (slot: TimeSlot) => {
    setSelectedSlot(slot);
  };

  const handleTreatmentSelect = (treatmentId: string) => {
    const treatment = bookingData?.treatments.find(t => t.id === treatmentId);
    setSelectedTreatment(treatment || null);
    
    // Auto-enable financing for expensive treatments
    if (treatment && treatment.requiresFinancing) {
      setRequiresFinancing(true);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedSlot || !selectedTreatment || !reasonForVisit.trim()) {
      setError('Por favor completa todos los campos requeridos');
      return;
    }

    // Validar datos del paciente si no está logueado
    if (!session?.user) {
      if (!patientData.name || !patientData.email || !patientData.phone) {
        setError('Por favor completa tu información de contacto');
        return;
      }
    }

    try {
      setSubmitting(true);
      setError(null);

      const requestData = {
        slotId: selectedSlot.id,
        treatmentType: selectedTreatment.id,
        estimatedCost: selectedTreatment.estimatedPrice,
        reasonForVisit,
        symptoms: symptoms.split(',').map(s => s.trim()).filter(Boolean),
        previousTreatments,
        requiresFinancing,
        patientDetails: session?.user ? null : {
          name: patientData.name,
          email: patientData.email,
          phone: patientData.phone,
          age: patientData.age ? parseInt(patientData.age) : undefined
        },
        emergencyContact: {
          name: patientData.emergencyContactName,
          phone: patientData.emergencyContactPhone,
          relationship: patientData.emergencyContactRelation
        }
      };

      const response = await fetch(`/api/book/${dentistId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestData)
      });

      if (response.ok) {
        const result = await response.json();
        setAppointmentResult(result);
        setSuccess(true);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Error al reservar la cita');
      }
    } catch (err) {
      setError('Error de conexión al reservar la cita');
    } finally {
      setSubmitting(false);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(price);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-MX', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getDatesWithAvailability = () => {
    if (!bookingData) return [];
    return Object.keys(bookingData.availability).sort();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-200 rounded w-1/3"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error && !bookingData) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <Card>
            <CardContent className="text-center py-12">
              <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Error</h3>
              <p className="text-gray-600 mb-4">{error}</p>
              <Button onClick={() => router.push('/dentists')} variant="outline">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Volver al directorio
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (success && appointmentResult) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <Card>
            <CardContent className="text-center py-12">
              <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
              <h3 className="text-2xl font-bold text-gray-900 mb-4">
                ¡Cita Reservada Exitosamente!
              </h3>
              
              <div className="bg-green-50 p-6 rounded-lg mb-6 text-left max-w-md mx-auto">
                <h4 className="font-semibold mb-3">Detalles de tu cita:</h4>
                <div className="space-y-2 text-sm">
                  <p><strong>Número:</strong> {appointmentResult.appointment.appointmentNumber}</p>
                  <p><strong>Dentista:</strong> {appointmentResult.appointment.dentist.name}</p>
                  <p><strong>Clínica:</strong> {appointmentResult.appointment.dentist.clinicName}</p>
                  <p><strong>Fecha:</strong> {formatDate(appointmentResult.appointment.date)}</p>
                  <p><strong>Hora:</strong> {appointmentResult.appointment.time}</p>
                  <p><strong>Tratamiento:</strong> {appointmentResult.appointment.service}</p>
                  <p><strong>Costo estimado:</strong> {formatPrice(appointmentResult.appointment.estimatedCost)}</p>
                </div>
              </div>

              {appointmentResult.financing && (
                <div className="bg-blue-50 p-6 rounded-lg mb-6 text-left max-w-md mx-auto">
                  <h4 className="font-semibold mb-3 flex items-center gap-2">
                    <CreditCard className="h-4 w-4" />
                    ToothPay - Financiamiento
                  </h4>
                  <div className="space-y-2 text-sm">
                    <p><strong>Monto:</strong> {formatPrice(appointmentResult.financing.amount)}</p>
                    <p><strong>Plazo:</strong> {appointmentResult.financing.term} meses</p>
                    <p><strong>Estado:</strong> En revisión</p>
                  </div>
                </div>
              )}

              <p className="text-gray-600 mb-6">
                {appointmentResult.message}
              </p>

              <div className="flex gap-4 justify-center">
                <Button onClick={() => router.push('/patient/appointments')} className="flex-1 max-w-xs">
                  Ver mis citas
                </Button>
                <Button onClick={() => router.push('/dentists')} variant="outline" className="flex-1 max-w-xs">
                  Buscar más dentistas
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6">
          <Button 
            onClick={() => router.push('/dentists')} 
            variant="ghost" 
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver al directorio
          </Button>
          
          <h1 className="text-3xl font-bold text-gray-900">
            Reservar Cita
          </h1>
        </div>

        {/* Información del dentista */}
        {bookingData && (
          <Card className="mb-6">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                {bookingData.dentist.profileImageUrl ? (
                  <img
                    src={bookingData.dentist.profileImageUrl}
                    alt={bookingData.dentist.name}
                    className="w-20 h-20 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-20 h-20 rounded-full bg-blue-100 flex items-center justify-center">
                    <User className="h-10 w-10 text-blue-600" />
                  </div>
                )}
                
                <div className="flex-1">
                  <h2 className="text-2xl font-semibold">{bookingData.dentist.name}</h2>
                  <p className="text-gray-600">{bookingData.dentist.clinicName}</p>
                  <div className="flex items-center gap-1 text-sm text-gray-500 mt-1">
                    <MapPin className="h-3 w-3" />
                    {bookingData.dentist.clinicAddress}
                  </div>
                  
                  <div className="flex flex-wrap gap-1 mt-2">
                    {bookingData.dentist.specialties.map((specialty) => (
                      <Badge key={specialty} variant="secondary" className="text-xs">
                        {specialty}
                      </Badge>
                    ))}
                  </div>
                  
                  <p className="text-sm text-gray-600 mt-2 line-clamp-2">
                    {bookingData.dentist.bio}
                  </p>
                </div>
                
                <div className="text-right">
                  <p className="text-sm text-gray-600">Consulta desde</p>
                  <p className="text-xl font-semibold text-green-600">
                    {formatPrice(bookingData.dentist.consultationFee)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {error && (
          <Card className="mb-6 border-red-200 bg-red-50">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-red-700">
                <AlertCircle className="h-4 w-4" />
                <span>{error}</span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Formulario de reserva */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Selección de fecha */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                1. Selecciona una fecha
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 md:grid-cols-4 lg:grid-cols-7">
                {getDatesWithAvailability().map((date) => (
                  <Button
                    key={date}
                    type="button"
                    variant={selectedDate === date ? "default" : "outline"}
                    onClick={() => handleDateSelect(date)}
                    className="p-3 h-auto flex-col"
                  >
                    <span className="text-xs text-gray-500">
                      {new Date(date).toLocaleDateString('es-MX', { weekday: 'short' })}
                    </span>
                    <span className="font-medium">
                      {new Date(date).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })}
                    </span>
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Selección de horario */}
          {selectedDate && bookingData && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  2. Selecciona un horario
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-2 md:grid-cols-4 lg:grid-cols-6">
                  {bookingData.availability[selectedDate]?.map((slot) => (
                    <Button
                      key={slot.id}
                      type="button"
                      variant={selectedSlot?.id === slot.id ? "default" : "outline"}
                      onClick={() => handleSlotSelect(slot)}
                      className="p-3 h-auto flex-col"
                    >
                      <span className="font-medium">
                        {slot.startTime} - {slot.endTime}
                      </span>
                      <span className="text-xs text-gray-500">
                        {slot.duration} min
                      </span>
                      <span className="text-xs text-green-600">
                        {formatPrice(slot.price)}
                      </span>
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Selección de tratamiento */}
          {selectedSlot && bookingData && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  3. Selecciona el tratamiento
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Select value={selectedTreatment?.id || ''} onValueChange={handleTreatmentSelect}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona el tipo de tratamiento" />
                  </SelectTrigger>
                  <SelectContent>
                    {bookingData.treatments.map((treatment) => (
                      <SelectItem key={treatment.id} value={treatment.id}>
                        <div className="flex justify-between items-center w-full">
                          <div>
                            <div className="font-medium">{treatment.name}</div>
                            <div className="text-sm text-gray-500">{treatment.description}</div>
                          </div>
                          <div className="text-right ml-4">
                            <div className="font-medium">{formatPrice(treatment.estimatedPrice)}</div>
                            {treatment.requiresFinancing && (
                              <Badge variant="secondary" className="text-xs">ToothPay disponible</Badge>
                            )}
                          </div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>
          )}

          {/* Información del paciente */}
          {selectedTreatment && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  4. Información del paciente
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {!session?.user && (
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <Label htmlFor="name">Nombre completo *</Label>
                      <Input
                        id="name"
                        value={patientData.name}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                          setPatientData({...patientData, name: e.target.value})
                        }
                        required
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="email">Email *</Label>
                      <Input
                        id="email"
                        type="email"
                        value={patientData.email}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                          setPatientData({...patientData, email: e.target.value})
                        }
                        required
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="phone">Teléfono *</Label>
                      <Input
                        id="phone"
                        type="tel"
                        value={patientData.phone}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                          setPatientData({...patientData, phone: e.target.value})
                        }
                        required
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="age">Edad</Label>
                      <Input
                        id="age"
                        type="number"
                        value={patientData.age}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                          setPatientData({...patientData, age: e.target.value})
                        }
                      />
                    </div>
                  </div>
                )}

                <div>
                  <Label htmlFor="reason">Motivo de la consulta *</Label>
                  <Textarea
                    id="reason"
                    placeholder="Describe brevemente el motivo de tu visita..."
                    value={reasonForVisit}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setReasonForVisit(e.target.value)}
                    required
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Label htmlFor="symptoms">Síntomas (opcional)</Label>
                    <Input
                      id="symptoms"
                      placeholder="Separados por comas"
                      value={symptoms}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSymptoms(e.target.value)}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="previousTreatments">Tratamientos previos (opcional)</Label>
                    <Input
                      id="previousTreatments"
                      placeholder="Tratamientos dentales anteriores"
                      value={previousTreatments}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPreviousTreatments(e.target.value)}
                    />
                  </div>
                </div>

                {/* Contacto de emergencia */}
                <div className="border-t pt-4">
                  <h4 className="font-medium mb-3">Contacto de emergencia</h4>
                  <div className="grid gap-4 md:grid-cols-3">
                    <div>
                      <Label htmlFor="emergencyName">Nombre</Label>
                      <Input
                        id="emergencyName"
                        value={patientData.emergencyContactName}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                          setPatientData({...patientData, emergencyContactName: e.target.value})
                        }
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="emergencyPhone">Teléfono</Label>
                      <Input
                        id="emergencyPhone"
                        type="tel"
                        value={patientData.emergencyContactPhone}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                          setPatientData({...patientData, emergencyContactPhone: e.target.value})
                        }
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="emergencyRelation">Relación</Label>
                      <Input
                        id="emergencyRelation"
                        placeholder="ej: Padre, Esposo"
                        value={patientData.emergencyContactRelation}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                          setPatientData({...patientData, emergencyContactRelation: e.target.value})
                        }
                      />
                    </div>
                  </div>
                </div>

                {/* ToothPay */}
                {selectedTreatment.requiresFinancing && (
                  <div className="border-t pt-4">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="financing"
                        checked={requiresFinancing}
                        onCheckedChange={setRequiresFinancing}
                      />
                      <Label htmlFor="financing" className="flex items-center gap-2">
                        <CreditCard className="h-4 w-4" />
                        Solicitar financiamiento con ToothPay
                      </Label>
                    </div>
                    <p className="text-sm text-gray-600 mt-2">
                      Financia tu tratamiento hasta en 24 meses sin intereses. 
                      Se revisará tu solicitud y recibirás una respuesta en 24-48 horas.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Resumen y confirmación */}
          {selectedTreatment && (
            <Card>
              <CardHeader>
                <CardTitle>5. Confirmar reserva</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-gray-50 p-4 rounded-lg mb-4">
                  <h4 className="font-semibold mb-2">Resumen de tu cita:</h4>
                  <div className="space-y-1 text-sm">
                    <p><strong>Fecha:</strong> {selectedDate && formatDate(selectedDate)}</p>
                    <p><strong>Hora:</strong> {selectedSlot && `${selectedSlot.startTime} - ${selectedSlot.endTime}`}</p>
                    <p><strong>Tratamiento:</strong> {selectedTreatment.name}</p>
                    <p><strong>Duración:</strong> {selectedTreatment.duration} minutos</p>
                    <p><strong>Costo estimado:</strong> {formatPrice(selectedTreatment.estimatedPrice)}</p>
                    {requiresFinancing && (
                      <p><strong>Financiamiento:</strong> ✅ ToothPay solicitado</p>
                    )}
                  </div>
                </div>

                <Button 
                  type="submit" 
                  className="w-full" 
                  size="lg"
                  disabled={submitting}
                >
                  {submitting ? 'Reservando...' : 'Confirmar Reserva'}
                </Button>

                <p className="text-xs text-gray-500 text-center mt-3">
                  Al confirmar aceptas nuestros términos y condiciones. 
                  Recibirás un email de confirmación con los detalles de tu cita.
                </p>
              </CardContent>
            </Card>
          )}
        </form>
      </div>
    </div>
  );
}
