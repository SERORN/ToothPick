import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, MapPin, Truck, Package } from 'lucide-react';

interface ShippingOption {
  _id: string;
  name: string;
  type: 'standard' | 'express' | 'overnight';
  basePrice: number;
  coverageZones: string[];
  estimatedDays: string;
  logo?: string;
}

interface PickupLocation {
  name: string;
  address: string;
  city: string;
  state: string;
  postalCode: string;
  phone: string;
  hours: string;
}

interface ShippingSelectionProps {
  orderTotal: number;
  buyerPostalCode?: string;
  onShippingChange: (method: 'pickup' | 'delivery', cost: number, details?: any) => void;
  disabled?: boolean;
}

export default function ShippingSelection({
  orderTotal,
  buyerPostalCode,
  onShippingChange,
  disabled = false
}: ShippingSelectionProps) {
  const [shippingMethod, setShippingMethod] = useState<'pickup' | 'delivery'>('pickup');
  const [selectedOption, setSelectedOption] = useState<string>('');
  const [customPostalCode, setCustomPostalCode] = useState(buyerPostalCode || '');
  const [availableOptions, setAvailableOptions] = useState<ShippingOption[]>([]);
  const [pickupLocations, setPickupLocations] = useState<PickupLocation[]>([]);
  const [selectedPickupLocation, setSelectedPickupLocation] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [calculatingCost, setCalculatingCost] = useState(false);

  // Fetch shipping options when postal code changes
  useEffect(() => {
    if (shippingMethod === 'delivery' && customPostalCode) {
      fetchShippingOptions();
    }
  }, [customPostalCode, shippingMethod]);

  // Fetch pickup locations on mount
  useEffect(() => {
    fetchPickupLocations();
  }, []);

  const fetchShippingOptions = async () => {
    if (!customPostalCode || customPostalCode.length < 5) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/shipping-options?postalCode=${customPostalCode}&orderTotal=${orderTotal}`);
      if (response.ok) {
        const data = await response.json();
        setAvailableOptions(data.options || []);
      }
    } catch (error) {
      console.error('Error fetching shipping options:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPickupLocations = async () => {
    try {
      const response = await fetch('/api/pickup-locations');
      if (response.ok) {
        const data = await response.json();
        setPickupLocations(data.locations || []);
      }
    } catch (error) {
      console.error('Error fetching pickup locations:', error);
    }
  };

  const calculateShippingCost = async (optionId: string) => {
    setCalculatingCost(true);
    try {
      const response = await fetch('/api/shipping-options/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          optionId,
          postalCode: customPostalCode,
          orderTotal,
          weight: 1 // Peso estimado en kg
        })
      });

      if (response.ok) {
        const data = await response.json();
        return data.cost || 0;
      }
    } catch (error) {
      console.error('Error calculating shipping cost:', error);
    } finally {
      setCalculatingCost(false);
    }
    return 0;
  };

  const handleMethodChange = (method: 'pickup' | 'delivery') => {
    setShippingMethod(method);
    setSelectedOption('');
    setSelectedPickupLocation('');
    
    if (method === 'pickup') {
      onShippingChange('pickup', 0);
    }
  };

  const handleOptionSelect = async (optionId: string) => {
    setSelectedOption(optionId);
    
    if (shippingMethod === 'delivery') {
      const cost = await calculateShippingCost(optionId);
      const selectedShippingOption = availableOptions.find(opt => opt._id === optionId);
      
      onShippingChange('delivery', cost, {
        provider: selectedShippingOption?.name,
        type: selectedShippingOption?.type,
        estimatedDays: selectedShippingOption?.estimatedDays,
        postalCode: customPostalCode
      });
    }
  };

  const handlePickupLocationSelect = (locationIndex: number) => {
    setSelectedPickupLocation(locationIndex.toString());
    const location = pickupLocations[locationIndex];
    
    onShippingChange('pickup', 0, {
      pickupLocation: location
    });
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(price);
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Package className="h-5 w-5" />
          Método de Entrega
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Selección de método */}
        <RadioGroup 
          value={shippingMethod} 
          onValueChange={handleMethodChange}
          disabled={disabled}
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="pickup" id="pickup" />
            <Label htmlFor="pickup" className="flex items-center gap-2 cursor-pointer">
              <MapPin className="h-4 w-4" />
              Recoger en tienda (Gratis)
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="delivery" id="delivery" />
            <Label htmlFor="delivery" className="flex items-center gap-2 cursor-pointer">
              <Truck className="h-4 w-4" />
              Envío a domicilio
            </Label>
          </div>
        </RadioGroup>

        {/* Opciones de pickup */}
        {shippingMethod === 'pickup' && (
          <div className="space-y-4">
            <h4 className="font-medium">Selecciona una tienda:</h4>
            <RadioGroup 
              value={selectedPickupLocation} 
              onValueChange={handlePickupLocationSelect}
              disabled={disabled}
            >
              {pickupLocations.map((location, index) => (
                <div key={index} className="flex items-start space-x-2 p-3 border rounded-lg">
                  <RadioGroupItem value={index.toString()} id={`location-${index}`} className="mt-1" />
                  <Label htmlFor={`location-${index}`} className="flex-1 cursor-pointer">
                    <div className="space-y-1">
                      <div className="font-medium">{location.name}</div>
                      <div className="text-sm text-gray-600">
                        {location.address}, {location.city}, {location.state} {location.postalCode}
                      </div>
                      <div className="text-sm text-gray-500">
                        Tel: {location.phone} | Horario: {location.hours}
                      </div>
                    </div>
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>
        )}

        {/* Opciones de envío */}
        {shippingMethod === 'delivery' && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="postalCode">Código Postal de Entrega</Label>
              <Input
                id="postalCode"
                value={customPostalCode}
                onChange={(e) => setCustomPostalCode(e.target.value)}
                placeholder="Ej: 03100"
                maxLength={5}
                disabled={disabled}
              />
            </div>

            {loading && (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-6 w-6 animate-spin" />
                <span className="ml-2">Consultando opciones de envío...</span>
              </div>
            )}

            {availableOptions.length > 0 && (
              <div className="space-y-3">
                <h4 className="font-medium">Opciones de envío disponibles:</h4>
                <RadioGroup 
                  value={selectedOption} 
                  onValueChange={handleOptionSelect}
                  disabled={disabled || calculatingCost}
                >
                  {availableOptions.map((option) => (
                    <div key={option._id} className="flex items-center space-x-2 p-3 border rounded-lg">
                      <RadioGroupItem value={option._id} id={option._id} />
                      <Label htmlFor={option._id} className="flex-1 cursor-pointer">
                        <div className="flex justify-between items-start">
                          <div className="space-y-1">
                            <div className="font-medium flex items-center gap-2">
                              {option.logo && (
                                <img src={option.logo} alt={option.name} className="h-6 w-auto" />
                              )}
                              {option.name}
                            </div>
                            <div className="text-sm text-gray-600">
                              Entrega en {option.estimatedDays}
                            </div>
                            <div className="text-xs text-gray-500 capitalize">
                              {option.type === 'standard' && 'Estándar'}
                              {option.type === 'express' && 'Exprés'}
                              {option.type === 'overnight' && 'Día siguiente'}
                            </div>
                          </div>
                          <div className="text-right">
                            {calculatingCost && selectedOption === option._id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <div className="font-medium">
                                Desde {formatPrice(option.basePrice)}
                              </div>
                            )}
                          </div>
                        </div>
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>
            )}

            {customPostalCode && !loading && availableOptions.length === 0 && (
              <div className="text-center py-4 text-gray-500">
                No hay opciones de envío disponibles para este código postal.
                <br />
                <Button 
                  variant="link" 
                  onClick={() => setShippingMethod('pickup')}
                  className="p-0 h-auto"
                >
                  Considera recoger en tienda
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
