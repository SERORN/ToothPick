'use client'

import { useState } from 'react'
import { toast } from 'react-hot-toast'

export default function SeedDataPage() {
  const [loading, setLoading] = useState(false)

  const sampleProducts = [
    {
      name: "Motor de Implante NSK Ti-Max X-SG20L",
      brand: "NSK",
      category: "Implantes",
      description: "Motor de implante de alta precisión con control de torque automático. Ideal para cirugías de implantología avanzada.",
      price: 45000,
      currency: "MXN",
      stock: 5,
      images: ["https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=400", "https://images.unsplash.com/photo-1551698618-1dfe5d97d256?w=400"],
      isActive: true
    },
    {
      name: "Kit de Fresas Diamantadas Premium",
      brand: "Dentex",
      category: "Instrumental", 
      description: "Set completo de 20 fresas diamantadas para preparación dental. Grano fino y super fino incluidas.",
      price: 2800,
      currency: "MXN",
      stock: 12,
      images: ["https://images.unsplash.com/photo-1612277795421-9bc7706a4a34?w=400"],
      isActive: true
    },
    {
      name: "Composite Filtek Supreme Ultra",
      brand: "3M ESPE",
      category: "Materiales",
      description: "Composite nanohíbrido de última generación. Excelente pulido y resistencia al desgaste.",
      price: 850,
      currency: "MXN", 
      stock: 25,
      images: ["https://images.unsplash.com/photo-1581594693702-fbdc51b2763b?w=400"],
      isActive: true
    },
    {
      name: "Escáner Intraoral iTero Element 5D",
      brand: "Align Technology",
      category: "Equipos",
      description: "Escáner intraoral de alta precisión con detección de caries por proximidad. Tecnología NIRI incluida.",
      price: 320000,
      currency: "MXN",
      stock: 2,
      images: ["https://images.unsplash.com/photo-1631815589968-fdb09a223b1e?w=400"],
      isActive: true
    },
    {
      name: "Brackets Metálicos Autoligado",
      brand: "Ormco",
      category: "Ortodoncia",
      description: "Sistema de brackets autoligado de bajo perfil. Reduce el tiempo de tratamiento hasta en 30%.",
      price: 1200,
      currency: "MXN",
      stock: 50,
      images: ["https://images.unsplash.com/photo-1606811971618-4486d14f3f99?w=400"],
      isActive: true
    },
    {
      name: "Limas EndoPilot K-Files",
      brand: "VDW",
      category: "Endodoncia",
      description: "Set de limas K-Files de níquel-titanio. Flexibilidad superior y resistencia a la fractura.",
      price: 680,
      currency: "MXN",
      stock: 18,
      images: ["https://images.unsplash.com/photo-1609840114035-3c981b782dfe?w=400"],
      isActive: true
    }
  ]

  const seedProducts = async () => {
    setLoading(true)
    
    try {
      const res = await fetch('/api/admin/seed-products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ products: sampleProducts })
      })

      if (res.ok) {
        toast.success('Productos de prueba creados exitosamente')
      } else {
        const error = await res.json()
        toast.error(error.message || 'Error al crear productos')
      }
    } catch (error) {
      toast.error('Error inesperado')
    }
    
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-2xl mx-auto px-4">
        <h1 className="text-3xl font-bold text-center mb-8">Datos de Prueba - Tooth Pick</h1>
        
        <div className="bg-white rounded-xl p-8 shadow-sm">
          <h2 className="text-xl font-semibold mb-4">Generar Productos de Muestra</h2>
          <p className="text-gray-600 mb-6">
            Esto creará 6 productos de ejemplo en diferentes categorías para probar el catálogo B2B.
          </p>
          
          <div className="space-y-4">
            {sampleProducts.map((product, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-4">
                <h3 className="font-medium">{product.name}</h3>
                <p className="text-sm text-gray-600">{product.brand} - {product.category}</p>
                <p className="text-sm text-green-600">${product.price} {product.currency}</p>
              </div>
            ))}
          </div>
          
          <button
            onClick={seedProducts}
            disabled={loading}
            className="w-full mt-6 bg-blue-600 hover:bg-blue-700 text-white py-3 px-6 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Creando productos...' : 'Crear Productos de Prueba'}
          </button>
        </div>
      </div>
    </div>
  )
}
