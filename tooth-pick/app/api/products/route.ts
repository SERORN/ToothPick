import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Product from '@/lib/models/Product';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

export async function POST(req: Request) {
  await dbConnect();
  const session = await getServerSession(authOptions);

  if (!session || session.user.role !== 'provider') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const {
      name,
      brand,
      category,
      description,
      price,
      currency,
      stock,
      images,
    } = body;

    if (!name || !brand || !category || !price || !stock) {
      return NextResponse.json({ error: 'Faltan campos obligatorios' }, { status: 400 });
    }

    const product = await Product.create({
      name,
      brand,
      category,
      description,
      price,
      currency: currency || 'MXN',
      stock,
      images: images?.filter((img: string) => img),
      providerId: session.user.id,
    });

    return NextResponse.json(product, { status: 201 });
  } catch (error) {
    console.error('Error creando producto:', error);
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 });
  }
}

export async function GET(req: Request) {
  await dbConnect();
  const session = await getServerSession(authOptions);

  if (!session || session.user.role !== 'provider') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  try {
    const products = await Product.find({ providerId: session.user.id }).sort({ createdAt: -1 });
    return NextResponse.json(products, { status: 200 });
  } catch (error) {
    console.error('Error obteniendo productos:', error);
    return NextResponse.json({ error: 'Error al obtener los productos' }, { status: 500 });
  }
}
