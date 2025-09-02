import { NextResponse } from 'next/server'
import dbConnect from '@/lib/db'
import Product from '@/lib/models/Product'
import User from '@/lib/models/User'

export async function POST(req: Request) {
  try {
    await dbConnect()
    
    const { products } = await req.json()

    // Buscar un usuario provider para asignar los productos
    const provider = await User.findOne({ role: 'provider' })
    
    if (!provider) {
      return NextResponse.json({ 
        error: 'No se encontró un proveedor. Crea un usuario con rol "provider" primero.' 
      }, { status: 400 })
    }

    // Verificar si ya existen productos
    const existingProducts = await Product.find()
    
    if (existingProducts.length > 0) {
      return NextResponse.json({ 
        message: 'Ya existen productos en la base de datos',
        count: existingProducts.length
      }, { status: 200 })
    }

    // Crear productos de muestra
    const createdProducts = []
    
    for (const productData of products) {
      const product = await Product.create({
        ...productData,
        providerId: provider._id
      })
      createdProducts.push(product)
    }

    return NextResponse.json({ 
      message: `${createdProducts.length} productos creados exitosamente`,
      products: createdProducts
    }, { status: 201 })
    
  } catch (error) {
    console.error('Error creando productos de prueba:', error)
    return NextResponse.json({ 
      error: 'Error al crear productos de prueba' 
    }, { status: 500 })
  }
}
