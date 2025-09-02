import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Search, 
  MapPin, 
  Clock, 
  Star, 
  Calendar,
  Filter,
  User,
  Stethoscope,
  DollarSign
} from 'lucide-react';

interface Dentist {
  id: string;
  name: string;
  clinicName: string;
  clinicAddress: string;
  specialties: string[];
  consultationFee: number;
  yearsExperience: number;
  bio: string;
  profileImageUrl?: string;
  nextAvailable?: {
    date: string;
    time: string;
    service: string;
  };
  availableSlotsThisWeek: number;
  createdAt: string;
}

interface FilterOptions {
  specialties: string[];
  cities: string[];
  priceRange: {
    minPrice: number;
    maxPrice: number;
    avgPrice: number;
  };
}

export default function DentistsDirectoryPage() {
  const [dentists, setDentists] = useState<Dentist[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSpecialty, setSelectedSpecialty] = useState('');
  const [selectedCity, setSelectedCity] = useState('');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [sortBy, setSortBy] = useState('name');
  const [availableToday, setAvailableToday] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filterOptions, setFilterOptions] = useState<FilterOptions>({
    specialties: [],
    cities: [],
    priceRange: { minPrice: 0, maxPrice: 2000, avgPrice: 500 }
  });

  useEffect(() => {
    fetchDentists();
  }, [currentPage, selectedSpecialty, selectedCity, minPrice, maxPrice, sortBy, availableToday]);

  const fetchDentists = async () => {
    try {
      setLoading(true);
      
      const params = new URLSearchParams();
      if (selectedSpecialty) params.append('specialty', selectedSpecialty);
      if (selectedCity) params.append('city', selectedCity);
      if (minPrice) params.append('minPrice', minPrice);
      if (maxPrice) params.append('maxPrice', maxPrice);
      if (sortBy) params.append('sortBy', sortBy);
      if (availableToday) params.append('availableToday', 'true');
      params.append('page', currentPage.toString());

      const response = await fetch(`/api/dentists?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setDentists(data.dentists);
        setTotalPages(data.pagination.totalPages);
        setFilterOptions(data.filterOptions);
      }
    } catch (error) {
      console.error('Error fetching dentists:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    setCurrentPage(1);
    fetchDentists();
  };

  const clearFilters = () => {
    setSelectedSpecialty('');
    setSelectedCity('');
    setMinPrice('');
    setMaxPrice('');
    setSortBy('name');
    setAvailableToday(false);
    setCurrentPage(1);
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(price);
  };

  const formatSpecialty = (specialty: string) => {
    const specialtyNames: Record<string, string> = {
      'ortodoncista': 'Ortodoncista',
      'endodoncista': 'Endodoncista',
      'periodoncista': 'Periodoncista',
      'cirujano_oral': 'Cirujano Oral',
      'prostodoncista': 'Prostodoncista',
      'odontopediatra': 'Odontopediatra',
      'implantes': 'Implantes',
      'estetica_dental': 'Estética Dental'
    };
    return specialtyNames[specialty] || specialty;
  };

  const formatNextAvailable = (nextAvailable: Dentist['nextAvailable']) => {
    if (!nextAvailable) return 'No disponible';
    
    const date = new Date(nextAvailable.date);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    if (date.toDateString() === today.toDateString()) {
      return `Hoy ${nextAvailable.time}`;
    } else if (date.toDateString() === tomorrow.toDateString()) {
      return `Mañana ${nextAvailable.time}`;
    } else {
      return `${date.toLocaleDateString('es-MX')} ${nextAvailable.time}`;
    }
  };

  if (loading && dentists.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-200 rounded w-1/3"></div>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-64 bg-gray-200 rounded-lg"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Encuentra tu Dentista Ideal
          </h1>
          <p className="text-gray-600 max-w-2xl">
            Descubre dentistas profesionales en tu área. Agenda citas fácilmente y 
            accede a financiamiento para tus tratamientos.
          </p>
        </div>

        {/* Filtros */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filtros de Búsqueda
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
              {/* Búsqueda por nombre */}
              <div className="xl:col-span-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Buscar por nombre o clínica..."
                    value={searchTerm}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
                    className="pl-10"
                    onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                  />
                </div>
              </div>

              {/* Especialidad */}
              <Select value={selectedSpecialty} onValueChange={setSelectedSpecialty}>
                <SelectTrigger>
                  <SelectValue placeholder="Especialidad" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Todas las especialidades</SelectItem>
                  {filterOptions.specialties.map((specialty) => (
                    <SelectItem key={specialty} value={specialty}>
                      {formatSpecialty(specialty)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Ciudad */}
              <Select value={selectedCity} onValueChange={setSelectedCity}>
                <SelectTrigger>
                  <SelectValue placeholder="Ciudad" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Todas las ciudades</SelectItem>
                  {filterOptions.cities.map((city) => (
                    <SelectItem key={city} value={city}>
                      {city}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Precio mínimo */}
              <Input
                type="number"
                placeholder="Precio mín."
                value={minPrice}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setMinPrice(e.target.value)}
              />

              {/* Precio máximo */}
              <Input
                type="number"
                placeholder="Precio máx."
                value={maxPrice}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setMaxPrice(e.target.value)}
              />
            </div>

            <div className="flex flex-wrap gap-4 mt-4">
              {/* Ordenar por */}
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Ordenar por" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="name">Nombre</SelectItem>
                  <SelectItem value="price">Precio</SelectItem>
                  <SelectItem value="experience">Experiencia</SelectItem>
                  <SelectItem value="rating">Calificación</SelectItem>
                </SelectContent>
              </Select>

              {/* Disponible hoy */}
              <Button
                variant={availableToday ? "default" : "outline"}
                onClick={() => setAvailableToday(!availableToday)}
                className="flex items-center gap-2"
              >
                <Clock className="h-4 w-4" />
                Disponible hoy
              </Button>

              {/* Limpiar filtros */}
              <Button variant="ghost" onClick={clearFilters}>
                Limpiar filtros
              </Button>

              {/* Buscar */}
              <Button onClick={handleSearch} className="ml-auto">
                <Search className="h-4 w-4 mr-2" />
                Buscar
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Resultados */}
        {loading ? (
          <div className="text-center py-8">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="mt-2 text-gray-600">Buscando dentistas...</p>
          </div>
        ) : dentists.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <Stethoscope className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No se encontraron dentistas
              </h3>
              <p className="text-gray-600 mb-4">
                Prueba ajustando los filtros de búsqueda.
              </p>
              <Button onClick={clearFilters} variant="outline">
                Limpiar filtros
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Grid de dentistas */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-8">
              {dentists.map((dentist) => (
                <Card key={dentist.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-start gap-4">
                      {dentist.profileImageUrl ? (
                        <img
                          src={dentist.profileImageUrl}
                          alt={dentist.name}
                          className="w-16 h-16 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center">
                          <User className="h-8 w-8 text-blue-600" />
                        </div>
                      )}
                      
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg">{dentist.name}</h3>
                        <p className="text-gray-600 text-sm">{dentist.clinicName}</p>
                        <div className="flex items-center gap-1 text-sm text-gray-500 mt-1">
                          <MapPin className="h-3 w-3" />
                          {dentist.clinicAddress}
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="space-y-4">
                    {/* Especialidades */}
                    <div className="flex flex-wrap gap-1">
                      {dentist.specialties.slice(0, 3).map((specialty) => (
                        <Badge key={specialty} variant="secondary" className="text-xs">
                          {formatSpecialty(specialty)}
                        </Badge>
                      ))}
                      {dentist.specialties.length > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{dentist.specialties.length - 3}
                        </Badge>
                      )}
                    </div>

                    {/* Información clave */}
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600">Consulta:</span>
                        <span className="font-medium flex items-center gap-1">
                          <DollarSign className="h-3 w-3" />
                          {formatPrice(dentist.consultationFee)}
                        </span>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600">Experiencia:</span>
                        <span className="font-medium">{dentist.yearsExperience} años</span>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600">Próxima cita:</span>
                        <span className="font-medium text-green-600">
                          {formatNextAvailable(dentist.nextAvailable)}
                        </span>
                      </div>
                    </div>

                    {/* Bio truncada */}
                    {dentist.bio && (
                      <p className="text-sm text-gray-600 line-clamp-2">
                        {dentist.bio}
                      </p>
                    )}

                    {/* Acciones */}
                    <div className="flex gap-2 pt-2">
                      <Link href={`/dentists/${dentist.id}`} className="flex-1">
                        <Button variant="outline" className="w-full">
                          Ver Perfil
                        </Button>
                      </Link>
                      <Link href={`/book/${dentist.id}`} className="flex-1">
                        <Button className="w-full">
                          <Calendar className="h-4 w-4 mr-2" />
                          Agendar
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Paginación */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2">
                <Button
                  variant="outline"
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                >
                  Anterior
                </Button>
                
                <span className="px-4 py-2 text-sm">
                  Página {currentPage} de {totalPages}
                </span>
                
                <Button
                  variant="outline"
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                >
                  Siguiente
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
