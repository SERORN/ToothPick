import { NextRequest, NextResponse } from 'next/server';

interface PickupLocation {
  name: string;
  address: string;
  city: string;
  state: string;
  postalCode: string;
  phone: string;
  hours: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
}

// Ubicaciones de pickup predefinidas para ToothPick
const PICKUP_LOCATIONS: PickupLocation[] = [
  {
    name: "ToothPick Centro CDMX",
    address: "Av. Madero 123, Col. Centro",
    city: "Ciudad de México",
    state: "CDMX",
    postalCode: "06000",
    phone: "+52 55 1234-5678",
    hours: "Lunes a Viernes 9:00 - 18:00, Sábados 10:00 - 16:00",
    coordinates: {
      lat: 19.4326,
      lng: -99.1332
    }
  },
  {
    name: "ToothPick Polanco",
    address: "Av. Presidente Masaryk 407, Col. Polanco",
    city: "Ciudad de México",
    state: "CDMX", 
    postalCode: "11560",
    phone: "+52 55 2345-6789",
    hours: "Lunes a Domingo 10:00 - 20:00",
    coordinates: {
      lat: 19.4333,
      lng: -99.1903
    }
  },
  {
    name: "ToothPick Santa Fe",
    address: "Av. Santa Fe 482, Col. Cruz Manca",
    city: "Ciudad de México",
    state: "CDMX",
    postalCode: "05349",
    phone: "+52 55 3456-7890",
    hours: "Lunes a Sábado 9:00 - 19:00",
    coordinates: {
      lat: 19.3598,
      lng: -99.2577
    }
  },
  {
    name: "ToothPick Guadalajara Centro",
    address: "Av. Hidalgo 456, Col. Centro",
    city: "Guadalajara",
    state: "Jalisco",
    postalCode: "44100",
    phone: "+52 33 1234-5678",
    hours: "Lunes a Viernes 9:00 - 18:00, Sábados 10:00 - 15:00",
    coordinates: {
      lat: 20.6597,
      lng: -103.3496
    }
  },
  {
    name: "ToothPick Monterrey San Pedro",
    address: "Av. Ricardo Margáin 575, Col. Valle del Campestre",
    city: "San Pedro Garza García",
    state: "Nuevo León",
    postalCode: "66265",
    phone: "+52 81 2345-6789",
    hours: "Lunes a Domingo 10:00 - 20:00",
    coordinates: {
      lat: 25.6515,
      lng: -100.3691
    }
  },
  {
    name: "ToothPick Puebla Angelópolis",
    address: "Blvd. del Niño Poblano 2510, Reserva Territorial Atlixcáyotl",
    city: "Puebla",
    state: "Puebla",
    postalCode: "72453",
    phone: "+52 222 345-6789",
    hours: "Lunes a Sábado 10:00 - 19:00",
    coordinates: {
      lat: 19.0413,
      lng: -98.2062
    }
  },
  {
    name: "ToothPick Cancún Plaza Las Américas",
    address: "Av. Tulum 260, SM 7, Mza 2",
    city: "Cancún",
    state: "Quintana Roo",
    postalCode: "77500",
    phone: "+52 998 123-4567",
    hours: "Lunes a Domingo 10:00 - 21:00",
    coordinates: {
      lat: 21.1619,
      lng: -86.8515
    }
  },
  {
    name: "ToothPick Tijuana Zona Río",
    address: "Paseo de los Héroes 9350, Zona Urbana Río",
    city: "Tijuana",
    state: "Baja California",
    postalCode: "22010",
    phone: "+52 664 234-5678",
    hours: "Lunes a Sábado 9:00 - 18:00",
    coordinates: {
      lat: 32.5149,
      lng: -117.0382
    }
  }
];

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const state = searchParams.get('state');
    const city = searchParams.get('city');
    const postalCode = searchParams.get('postalCode');

    let filteredLocations = [...PICKUP_LOCATIONS];

    // Filtrar por estado si se proporciona
    if (state) {
      filteredLocations = filteredLocations.filter(
        location => location.state.toLowerCase().includes(state.toLowerCase())
      );
    }

    // Filtrar por ciudad si se proporciona
    if (city) {
      filteredLocations = filteredLocations.filter(
        location => location.city.toLowerCase().includes(city.toLowerCase())
      );
    }

    // Filtrar por código postal (buscar cercanos)
    if (postalCode && postalCode.length >= 2) {
      const postalPrefix = postalCode.substring(0, 2);
      filteredLocations = filteredLocations.filter(
        location => location.postalCode.startsWith(postalPrefix)
      );
    }

    // Si hay código postal específico, ordenar por proximidad
    if (postalCode && postalCode.length === 5) {
      filteredLocations.sort((a, b) => {
        const distanceA = Math.abs(parseInt(a.postalCode) - parseInt(postalCode));
        const distanceB = Math.abs(parseInt(b.postalCode) - parseInt(postalCode));
        return distanceA - distanceB;
      });
    }

    return NextResponse.json({
      locations: filteredLocations,
      total: filteredLocations.length
    });

  } catch (error) {
    console.error('Error fetching pickup locations:', error);
    return NextResponse.json({ 
      error: 'Error interno del servidor.',
      locations: [],
      total: 0
    }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    // Esta función permitiría a los admins agregar nuevas ubicaciones
    // Por ahora retornamos método no permitido ya que usamos ubicaciones fijas
    
    return NextResponse.json({ 
      error: 'La creación de nuevas ubicaciones de pickup no está disponible actualmente.' 
    }, { status: 405 });

  } catch (error) {
    console.error('Error creating pickup location:', error);
    return NextResponse.json({ 
      error: 'Error interno del servidor.' 
    }, { status: 500 });
  }
}
