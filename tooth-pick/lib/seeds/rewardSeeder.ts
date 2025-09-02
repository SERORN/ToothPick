import dbConnect from '@/lib/db'
import RewardItem from '@/lib/models/RewardItem'

// Datos iniciales para recompensas
const initialRewards = [
  // Descuentos
  {
    title: 'Descuento 10% en tu próxima compra',
    description: 'Obtén un 10% de descuento en cualquier producto de nuestra tienda',
    cost: 50,
    type: 'descuento',
    category: 'descuentos',
    imageUrl: 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=400',
    availableFor: ['client', 'dentist', 'distributor'],
    quantity: 100,
    isActive: true,
    metadata: {
      discountPercentage: 10,
      maxDiscount: 500,
      validDays: 30
    }
  },
  {
    title: 'Descuento 20% en instrumentos',
    description: 'Descuento especial del 20% en toda la categoría de instrumentos dentales',
    cost: 100,
    type: 'descuento',
    category: 'descuentos',
    imageUrl: 'https://images.unsplash.com/photo-1629909613654-28e377c37b09?w=400',
    availableFor: ['dentist', 'distributor'],
    quantity: 50,
    isActive: true,
    metadata: {
      discountPercentage: 20,
      category: 'instrumentos',
      validDays: 15
    }
  },
  {
    title: 'Envío gratis en tu próximo pedido',
    description: 'Obtén envío gratuito sin mínimo de compra',
    cost: 75,
    type: 'descuento',
    category: 'envio',
    imageUrl: 'https://images.unsplash.com/photo-1566576912321-d58ddd7a6088?w=400',
    availableFor: ['client', 'dentist', 'distributor'],
    quantity: 200,
    isActive: true,
    metadata: {
      freeShipping: true,
      validDays: 45
    }
  },

  // Productos físicos
  {
    title: 'Kit de limpieza dental profesional',
    description: 'Kit completo con cepillo eléctrico, hilo dental y enjuague bucal',
    cost: 200,
    type: 'producto',
    category: 'higiene',
    imageUrl: 'https://images.unsplash.com/photo-1606811841689-23dfddce3e95?w=400',
    availableFor: ['client'],
    quantity: 25,
    isActive: true,
    metadata: {
      brand: 'ToothPick Pro',
      includes: ['Cepillo eléctrico', 'Hilo dental', 'Enjuague bucal'],
      shipping: true
    }
  },
  {
    title: 'Set de instrumentos básicos',
    description: 'Set básico de instrumentos dentales para estudiantes',
    cost: 300,
    type: 'producto',
    category: 'instrumentos',
    imageUrl: 'https://images.unsplash.com/photo-1579952363873-27d3bfad9c0d?w=400',
    availableFor: ['dentist'],
    quantity: 15,
    isActive: true,
    metadata: {
      includes: ['Espejo', 'Sonda', 'Pinzas', 'Excavador'],
      material: 'Acero inoxidable',
      shipping: true
    }
  },
  {
    title: 'Lámpara de diagnóstico LED',
    description: 'Lámpara LED de alta calidad para diagnóstico dental',
    cost: 500,
    type: 'producto',
    category: 'equipos',
    imageUrl: 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=400',
    availableFor: ['dentist', 'distributor'],
    quantity: 5,
    isActive: true,
    metadata: {
      power: '20W LED',
      adjustable: true,
      warranty: '2 años',
      shipping: true
    }
  },

  // Productos digitales
  {
    title: 'Curso online: Técnicas de blanqueamiento',
    description: 'Curso completo sobre técnicas modernas de blanqueamiento dental',
    cost: 150,
    type: 'digital',
    category: 'educacion',
    imageUrl: 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=400',
    availableFor: ['dentist'],
    isActive: true,
    metadata: {
      duration: '8 horas',
      certificate: true,
      modules: 12,
      language: 'Español'
    }
  },
  {
    title: 'E-book: Guía de higiene dental',
    description: 'Guía completa para mantener una excelente salud bucal',
    cost: 30,
    type: 'digital',
    category: 'educacion',
    imageUrl: 'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=400',
    availableFor: ['client', 'dentist'],
    isActive: true,
    metadata: {
      pages: 45,
      format: 'PDF',
      language: 'Español',
      downloadable: true
    }
  },
  {
    title: 'Plantillas de consentimiento informado',
    description: 'Pack de plantillas legales para consentimiento de tratamientos',
    cost: 80,
    type: 'digital',
    category: 'documentos',
    imageUrl: 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=400',
    availableFor: ['dentist'],
    isActive: true,
    metadata: {
      templates: 25,
      format: 'Word + PDF',
      legallyValid: true,
      editable: true
    }
  },

  // Experiencias
  {
    title: 'Consulta gratuita con especialista',
    description: 'Consulta de 30 minutos con especialista en ortodoncia',
    cost: 120,
    type: 'experiencia',
    category: 'consultas',
    imageUrl: 'https://images.unsplash.com/photo-1609840114035-3c981b782dfe?w=400',
    availableFor: ['client'],
    quantity: 20,
    isActive: true,
    metadata: {
      duration: '30 minutos',
      specialty: 'Ortodoncia',
      online: true,
      scheduling: true
    }
  },
  {
    title: 'Webinar exclusivo: Nuevas tecnologías',
    description: 'Webinar sobre las últimas tecnologías en odontología',
    cost: 60,
    type: 'experiencia',
    category: 'educacion',
    imageUrl: 'https://images.unsplash.com/photo-1587825140708-dfaf72ae4b04?w=400',
    availableFor: ['dentist', 'distributor'],
    quantity: 100,
    isActive: true,
    metadata: {
      duration: '2 horas',
      live: true,
      recording: true,
      qa: true
    }
  },
  {
    title: 'Evaluación de clínica gratuita',
    description: 'Evaluación completa y personalizada de tu clínica dental',
    cost: 400,
    type: 'experiencia',
    category: 'consultoria',
    imageUrl: 'https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=400',
    availableFor: ['dentist'],
    quantity: 10,
    isActive: true,
    metadata: {
      duration: '2 horas',
      report: true,
      recommendations: true,
      followUp: true
    }
  }
]

export async function seedRewards() {
  try {
    await dbConnect()
    
    console.log('🌱 Iniciando seeding de recompensas...')

    // Verificar si ya existen recompensas
    const existingCount = await RewardItem.countDocuments()
    if (existingCount > 0) {
      console.log(`ℹ️ Ya existen ${existingCount} recompensas en la base de datos`)
      console.log('💡 Para recrear las recompensas, elimina la colección primero')
      return
    }

    // Insertar recompensas iniciales
    const inserted = await RewardItem.insertMany(initialRewards)
    
    console.log(`✅ Se insertaron ${inserted.length} recompensas exitosamente`)
    
    // Mostrar resumen por tipo
    const summary = await RewardItem.aggregate([
      {
        $group: {
          _id: '$type',
          count: { $sum: 1 },
          totalCost: { $sum: '$cost' }
        }
      },
      { $sort: { _id: 1 } }
    ])
    
    console.log('\n📊 Resumen de recompensas creadas:')
    summary.forEach(item => {
      console.log(`   ${item._id}: ${item.count} recompensas (costo promedio: ${Math.round(item.totalCost / item.count)} puntos)`)
    })

    return { success: true, count: inserted.length }

  } catch (error) {
    console.error('❌ Error durante el seeding:', error)
    throw error
  }
}

// Función para limpiar recompensas (solo en desarrollo)
export async function clearRewards() {
  try {
    await dbConnect()
    
    const deletedCount = await RewardItem.deleteMany({})
    console.log(`🗑️ Se eliminaron ${deletedCount.deletedCount} recompensas`)
    
    return { success: true, deletedCount: deletedCount.deletedCount }

  } catch (error) {
    console.error('❌ Error al limpiar recompensas:', error)
    throw error
  }
}

// Ejecutar seeding si el archivo se ejecuta directamente
if (require.main === module) {
  seedRewards()
    .then(() => {
      console.log('🎉 Seeding completado')
      process.exit(0)
    })
    .catch((error) => {
      console.error('💥 Error en seeding:', error)
      process.exit(1)
    })
}
