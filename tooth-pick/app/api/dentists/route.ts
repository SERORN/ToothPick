import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import User from '@/lib/models/User';
import ClinicAppointmentSlot from '@/lib/models/ClinicAppointmentSlot';

export async function GET(req: NextRequest) {
  await dbConnect();

  try {
    const { searchParams } = new URL(req.url);
    
    // Parámetros de filtro
    const specialty = searchParams.get('specialty');
    const city = searchParams.get('city');
    const state = searchParams.get('state');
    const availableToday = searchParams.get('availableToday') === 'true';
    const minPrice = searchParams.get('minPrice');
    const maxPrice = searchParams.get('maxPrice');
    const sortBy = searchParams.get('sortBy') || 'name'; // name, price, experience, rating
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '12');

    // Construir filtro base
    const filter: any = {
      role: 'dentist',
      isActive: true,
      subscriptionStatus: { $in: ['active', 'trial'] } // Solo dentistas con suscripción activa
    };

    // Filtrar por especialidad
    if (specialty) {
      filter.specialties = { $in: [specialty] };
    }

    // Filtrar por ubicación
    if (city || state) {
      const locationFilter: any = {};
      if (city) {
        locationFilter.clinicAddress = new RegExp(city, 'i');
      }
      if (state) {
        locationFilter.clinicAddress = new RegExp(state, 'i');
      }
      Object.assign(filter, locationFilter);
    }

    // Filtrar por rango de precios
    if (minPrice || maxPrice) {
      const priceFilter: any = {};
      if (minPrice) priceFilter.$gte = parseFloat(minPrice);
      if (maxPrice) priceFilter.$lte = parseFloat(maxPrice);
      filter.consultationFee = priceFilter;
    }

    // Configurar ordenamiento
    let sortOptions: any = {};
    switch (sortBy) {
      case 'price':
        sortOptions.consultationFee = 1;
        break;
      case 'experience':
        sortOptions.yearsExperience = -1;
        break;
      case 'rating':
        // TODO: Implementar sistema de calificaciones
        sortOptions.name = 1;
        break;
      default:
        sortOptions.name = 1;
    }

    // Ejecutar consulta principal
    const skip = (page - 1) * limit;
    
    let dentists = await User.find(filter)
      .select('name email clinicName clinicAddress specialties consultationFee yearsExperience bio profileImageUrl workingHours createdAt')
      .sort(sortOptions)
      .skip(skip)
      .limit(limit)
      .lean();

    // Si se requiere filtrar por disponibilidad hoy
    if (availableToday) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      // Obtener IDs de dentistas con slots disponibles hoy
      const availableDentistIds = await ClinicAppointmentSlot.distinct('dentistId', {
        date: { $gte: today, $lt: tomorrow },
        status: 'available'
      });

      // Filtrar solo dentistas con disponibilidad
      dentists = dentists.filter(dentist => 
        availableDentistIds.some(id => id.toString() === dentist._id.toString())
      );
    }

    // Enriquecer datos con información adicional
    const enrichedDentists = await Promise.all(
      dentists.map(async (dentist) => {
        // Obtener próxima disponibilidad
        const nextAvailableSlot = await ClinicAppointmentSlot.findOne({
          dentistId: dentist._id,
          date: { $gte: new Date() },
          status: 'available'
        })
        .sort({ date: 1, startTime: 1 })
        .select('date startTime service');

        // Contar total de slots disponibles esta semana
        const weekFromNow = new Date();
        weekFromNow.setDate(weekFromNow.getDate() + 7);
        
        const availableSlotsThisWeek = await ClinicAppointmentSlot.countDocuments({
          dentistId: dentist._id,
          date: { $gte: new Date(), $lte: weekFromNow },
          status: 'available'
        });

        // TODO: Obtener calificación promedio cuando se implemente
        // const averageRating = await Review.aggregate([...])

        return {
          id: dentist._id,
          name: dentist.name,
          clinicName: dentist.clinicName,
          clinicAddress: dentist.clinicAddress,
          specialties: dentist.specialties,
          consultationFee: dentist.consultationFee,
          yearsExperience: dentist.yearsExperience,
          bio: dentist.bio,
          profileImageUrl: dentist.profileImageUrl,
          nextAvailable: nextAvailableSlot ? {
            date: nextAvailableSlot.date,
            time: nextAvailableSlot.startTime,
            service: nextAvailableSlot.service
          } : null,
          availableSlotsThisWeek,
          // averageRating: averageRating || 0,
          // totalReviews: totalReviews || 0,
          createdAt: dentist.createdAt
        };
      })
    );

    // Obtener total para paginación
    const total = await User.countDocuments(filter);
    const totalPages = Math.ceil(total / limit);

    // Obtener opciones de filtro para frontend
    const filterOptions = await getFilterOptions();

    return NextResponse.json({
      dentists: enrichedDentists,
      pagination: {
        currentPage: page,
        totalPages,
        totalDentists: total,
        hasNext: page < totalPages,
        hasPrev: page > 1
      },
      filterOptions
    });

  } catch (error) {
    console.error('Error fetching dentists:', error);
    return NextResponse.json({ 
      error: 'Error interno del servidor.' 
    }, { status: 500 });
  }
}

// Función auxiliar para obtener opciones de filtro
async function getFilterOptions() {
  const [specialties, cities, priceRange] = await Promise.all([
    // Obtener especialidades únicas
    User.distinct('specialties', { 
      role: 'dentist', 
      isActive: true,
      subscriptionStatus: { $in: ['active', 'trial'] }
    }),
    
    // Obtener ciudades únicas (extraer de clinicAddress)
    User.aggregate([
      { 
        $match: { 
          role: 'dentist', 
          isActive: true,
          subscriptionStatus: { $in: ['active', 'trial'] },
          clinicAddress: { $exists: true, $ne: '' }
        }
      },
      {
        $project: {
          city: {
            $trim: {
              input: {
                $arrayElemAt: [
                  { $split: ['$clinicAddress', ','] },
                  -2 // Penúltimo elemento (ciudad)
                ]
              }
            }
          }
        }
      },
      {
        $group: {
          _id: '$city'
        }
      },
      {
        $sort: { _id: 1 }
      }
    ]),
    
    // Obtener rango de precios
    User.aggregate([
      { 
        $match: { 
          role: 'dentist', 
          isActive: true,
          subscriptionStatus: { $in: ['active', 'trial'] },
          consultationFee: { $exists: true, $gt: 0 }
        }
      },
      {
        $group: {
          _id: null,
          minPrice: { $min: '$consultationFee' },
          maxPrice: { $max: '$consultationFee' },
          avgPrice: { $avg: '$consultationFee' }
        }
      }
    ])
  ]);

  return {
    specialties: specialties.flat().filter(Boolean),
    cities: cities.map(c => c._id).filter(Boolean),
    priceRange: priceRange[0] || { minPrice: 0, maxPrice: 2000, avgPrice: 500 }
  };
}
