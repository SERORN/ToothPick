'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Upload, FileText, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';

interface VerificationFormData {
  companyType: 'persona_fisica' | 'persona_moral' | '';
  businessName: string;
  legalName: string;
  rfc: string;
  phone: string;
  email: string;
  address: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  businessCategory: 'dental_supplies' | 'equipment' | 'technology' | 'services' | 'other' | '';
  businessJustification: string;
  yearsInBusiness: string;
  estimatedMonthlyVolume: string;
}

interface VerificationFiles {
  ineFront: File | null;
  ineBack: File | null;
  rfc: File | null;
  constitutiveAct: File | null;
  addressProof: File | null;
  additionalDocs: File[];
}

interface VerificationFormProps {
  onSuccess?: (requestId: string) => void;
}

export default function VerificationForm({ onSuccess }: VerificationFormProps) {
  const { data: session } = useSession();
  const [formData, setFormData] = useState<VerificationFormData>({
    companyType: '',
    businessName: '',
    legalName: '',
    rfc: '',
    phone: '',
    email: session?.user?.email || '',
    address: {
      street: '',
      city: '',
      state: '',
      zipCode: '',
      country: 'México'
    },
    businessCategory: '',
    businessJustification: '',
    yearsInBusiness: '',
    estimatedMonthlyVolume: ''
  });

  const [files, setFiles] = useState<VerificationFiles>({
    ineFront: null,
    ineBack: null,
    rfc: null,
    constitutiveAct: null,
    addressProof: null,
    additionalDocs: []
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleInputChange = (field: string, value: string) => {
    if (field.startsWith('address.')) {
      const addressField = field.split('.')[1];
      setFormData(prev => ({
        ...prev,
        address: {
          ...prev.address,
          [addressField]: value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [field]: value
      }));
    }
  };

  const handleFileChange = (field: keyof VerificationFiles, file: File | null) => {
    if (field === 'additionalDocs') return; // Handle separately
    
    setFiles(prev => ({
      ...prev,
      [field]: file
    }));
  };

  const handleAdditionalDocsChange = (newFiles: FileList | null) => {
    if (!newFiles) return;
    
    const fileArray = Array.from(newFiles);
    setFiles(prev => ({
      ...prev,
      additionalDocs: [...prev.additionalDocs, ...fileArray]
    }));
  };

  const removeAdditionalDoc = (index: number) => {
    setFiles(prev => ({
      ...prev,
      additionalDocs: prev.additionalDocs.filter((_, i) => i !== index)
    }));
  };

  const validateForm = (): string | null => {
    // Validar campos requeridos
    const requiredFields = [
      'companyType', 'businessName', 'legalName', 'rfc', 
      'phone', 'email', 'businessCategory'
    ];
    
    for (const field of requiredFields) {
      if (!formData[field as keyof VerificationFormData]) {
        return `El campo ${field} es requerido`;
      }
    }

    // Validar dirección
    if (!formData.address.street || !formData.address.city || 
        !formData.address.state || !formData.address.zipCode) {
      return 'La dirección completa es requerida';
    }

    // Validar RFC
    const rfcRegex = /^[A-ZÑ&]{3,4}[0-9]{2}(0[1-9]|1[0-2])(0[1-9]|[12][0-9]|3[01])[A-Z0-9]{2}[0-9A]$/;
    if (!rfcRegex.test(formData.rfc.toUpperCase())) {
      return 'El RFC no tiene un formato válido';
    }

    // Validar archivos requeridos
    const requiredFiles = ['ineFront', 'ineBack', 'rfc', 'addressProof'];
    for (const field of requiredFiles) {
      if (!files[field as keyof VerificationFiles]) {
        return `El archivo ${field} es requerido`;
      }
    }

    // Para personas morales, validar acta constitutiva
    if (formData.companyType === 'persona_moral' && !files.constitutiveAct) {
      return 'El acta constitutiva es requerida para personas morales';
    }

    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    // Validar formulario
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsSubmitting(true);

    try {
      // Crear FormData
      const submitData = new FormData();

      // Agregar datos del formulario
      Object.entries(formData).forEach(([key, value]) => {
        if (key === 'address') {
          Object.entries(value).forEach(([addressKey, addressValue]) => {
            submitData.append(`address.${addressKey}`, addressValue);
          });
        } else {
          submitData.append(key, value);
        }
      });

      // Agregar archivos
      Object.entries(files).forEach(([key, value]) => {
        if (key === 'additionalDocs') {
          value.forEach((file: File) => {
            submitData.append('additionalDocs', file);
          });
        } else if (value) {
          submitData.append(key, value as File);
        }
      });

      // Enviar solicitud
      const response = await fetch('/api/verification/submit', {
        method: 'POST',
        body: submitData
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Error al enviar solicitud');
      }

      setSuccess(`¡Solicitud enviada exitosamente! ID: ${result.requestId}`);
      onSuccess?.(result.requestId);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-6 h-6" />
            Solicitud de Verificación
          </CardTitle>
          <CardDescription>
            Completa todos los campos y sube los documentos requeridos para verificar tu cuenta como proveedor/distribuidor.
          </CardDescription>
        </CardHeader>

        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-6">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert className="mb-6 border-green-500 bg-green-50">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">{success}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Información Básica */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Información Básica</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="companyType">Tipo de Empresa *</Label>
                  <Select 
                    value={formData.companyType} 
                    onValueChange={(value) => handleInputChange('companyType', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona el tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="persona_fisica">Persona Física</SelectItem>
                      <SelectItem value="persona_moral">Persona Moral</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="businessCategory">Categoría de Negocio *</Label>
                  <Select 
                    value={formData.businessCategory} 
                    onValueChange={(value) => handleInputChange('businessCategory', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona la categoría" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="dental_supplies">Insumos Dentales</SelectItem>
                      <SelectItem value="equipment">Equipamiento</SelectItem>
                      <SelectItem value="technology">Tecnología</SelectItem>
                      <SelectItem value="services">Servicios</SelectItem>
                      <SelectItem value="other">Otro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="businessName">Nombre Comercial *</Label>
                  <Input
                    id="businessName"
                    value={formData.businessName}
                    onChange={(e) => handleInputChange('businessName', e.target.value)}
                    placeholder="Nombre del negocio"
                  />
                </div>

                <div>
                  <Label htmlFor="legalName">Razón Social *</Label>
                  <Input
                    id="legalName"
                    value={formData.legalName}
                    onChange={(e) => handleInputChange('legalName', e.target.value)}
                    placeholder="Nombre legal de la empresa"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="rfc">RFC *</Label>
                  <Input
                    id="rfc"
                    value={formData.rfc}
                    onChange={(e) => handleInputChange('rfc', e.target.value.toUpperCase())}
                    placeholder="RFC"
                    maxLength={13}
                  />
                </div>

                <div>
                  <Label htmlFor="phone">Teléfono *</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                    placeholder="Teléfono de contacto"
                  />
                </div>

                <div>
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    placeholder="Email de contacto"
                  />
                </div>
              </div>
            </div>

            {/* Dirección */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Dirección</h3>
              
              <div>
                <Label htmlFor="street">Calle y Número *</Label>
                <Input
                  id="street"
                  value={formData.address.street}
                  onChange={(e) => handleInputChange('address.street', e.target.value)}
                  placeholder="Calle y número"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <Label htmlFor="city">Ciudad *</Label>
                  <Input
                    id="city"
                    value={formData.address.city}
                    onChange={(e) => handleInputChange('address.city', e.target.value)}
                    placeholder="Ciudad"
                  />
                </div>

                <div>
                  <Label htmlFor="state">Estado *</Label>
                  <Input
                    id="state"
                    value={formData.address.state}
                    onChange={(e) => handleInputChange('address.state', e.target.value)}
                    placeholder="Estado"
                  />
                </div>

                <div>
                  <Label htmlFor="zipCode">Código Postal *</Label>
                  <Input
                    id="zipCode"
                    value={formData.address.zipCode}
                    onChange={(e) => handleInputChange('address.zipCode', e.target.value)}
                    placeholder="CP"
                  />
                </div>

                <div>
                  <Label htmlFor="country">País *</Label>
                  <Input
                    id="country"
                    value={formData.address.country}
                    onChange={(e) => handleInputChange('address.country', e.target.value)}
                    placeholder="País"
                  />
                </div>
              </div>
            </div>

            {/* Información Comercial */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Información Comercial</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="yearsInBusiness">Años en el Negocio</Label>
                  <Input
                    id="yearsInBusiness"
                    type="number"
                    value={formData.yearsInBusiness}
                    onChange={(e) => handleInputChange('yearsInBusiness', e.target.value)}
                    placeholder="Años de experiencia"
                    min="0"
                  />
                </div>

                <div>
                  <Label htmlFor="estimatedMonthlyVolume">Volumen Mensual Estimado</Label>
                  <Select 
                    value={formData.estimatedMonthlyVolume} 
                    onValueChange={(value) => handleInputChange('estimatedMonthlyVolume', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona el rango" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0-10k">$0 - $10,000 MXN</SelectItem>
                      <SelectItem value="10k-50k">$10,000 - $50,000 MXN</SelectItem>
                      <SelectItem value="50k-100k">$50,000 - $100,000 MXN</SelectItem>
                      <SelectItem value="100k-500k">$100,000 - $500,000 MXN</SelectItem>
                      <SelectItem value="500k+">Más de $500,000 MXN</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="businessJustification">Justificación Comercial</Label>
                <Textarea
                  id="businessJustification"
                  value={formData.businessJustification}
                  onChange={(e) => handleInputChange('businessJustification', e.target.value)}
                  placeholder="Describe tu actividad comercial, productos/servicios que ofreces, experiencia en el sector dental, etc."
                  rows={4}
                />
              </div>
            </div>

            {/* Documentos */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Documentos Requeridos</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* INE Frente */}
                <div>
                  <Label>INE - Frente *</Label>
                  <div className="mt-2">
                    <input
                      type="file"
                      accept=".jpg,.jpeg,.png,.pdf"
                      onChange={(e) => handleFileChange('ineFront', e.target.files?.[0] || null)}
                      className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                    />
                    {files.ineFront && (
                      <p className="mt-1 text-sm text-green-600">✓ {files.ineFront.name}</p>
                    )}
                  </div>
                </div>

                {/* INE Reverso */}
                <div>
                  <Label>INE - Reverso *</Label>
                  <div className="mt-2">
                    <input
                      type="file"
                      accept=".jpg,.jpeg,.png,.pdf"
                      onChange={(e) => handleFileChange('ineBack', e.target.files?.[0] || null)}
                      className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                    />
                    {files.ineBack && (
                      <p className="mt-1 text-sm text-green-600">✓ {files.ineBack.name}</p>
                    )}
                  </div>
                </div>

                {/* RFC */}
                <div>
                  <Label>Constancia de RFC *</Label>
                  <div className="mt-2">
                    <input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={(e) => handleFileChange('rfc', e.target.files?.[0] || null)}
                      className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                    />
                    {files.rfc && (
                      <p className="mt-1 text-sm text-green-600">✓ {files.rfc.name}</p>
                    )}
                  </div>
                </div>

                {/* Comprobante de Domicilio */}
                <div>
                  <Label>Comprobante de Domicilio *</Label>
                  <div className="mt-2">
                    <input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={(e) => handleFileChange('addressProof', e.target.files?.[0] || null)}
                      className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                    />
                    {files.addressProof && (
                      <p className="mt-1 text-sm text-green-600">✓ {files.addressProof.name}</p>
                    )}
                  </div>
                </div>

                {/* Acta Constitutiva (solo para personas morales) */}
                {formData.companyType === 'persona_moral' && (
                  <div className="md:col-span-2">
                    <Label>Acta Constitutiva *</Label>
                    <div className="mt-2">
                      <input
                        type="file"
                        accept=".pdf"
                        onChange={(e) => handleFileChange('constitutiveAct', e.target.files?.[0] || null)}
                        className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                      />
                      {files.constitutiveAct && (
                        <p className="mt-1 text-sm text-green-600">✓ {files.constitutiveAct.name}</p>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Documentos Adicionales */}
              <div>
                <Label>Documentos Adicionales (Opcional)</Label>
                <div className="mt-2">
                  <input
                    type="file"
                    multiple
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={(e) => handleAdditionalDocsChange(e.target.files)}
                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                  />
                  {files.additionalDocs.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {files.additionalDocs.map((file, index) => (
                        <div key={index} className="flex items-center justify-between text-sm">
                          <span className="text-green-600">✓ {file.name}</span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeAdditionalDoc(index)}
                            className="text-red-500 hover:text-red-700"
                          >
                            Eliminar
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Botón de Envío */}
            <div className="flex justify-end">
              <Button 
                type="submit" 
                disabled={isSubmitting}
                className="w-full md:w-auto"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Enviando Solicitud...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    Enviar Solicitud de Verificación
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
