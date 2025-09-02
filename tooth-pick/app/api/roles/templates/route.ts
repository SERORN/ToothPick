import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import RoleTemplate from '@/lib/models/RoleTemplate';

/**
 * GET /api/roles/templates
 * Obtener plantillas de roles
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const scope = searchParams.get('scope') as 'clinic' | 'distributor' | 'both' | undefined;
    const category = searchParams.get('category');

    const query: any = { isActive: true };
    
    if (scope) {
      query.scope = { $in: [scope, 'both'] };
    }
    
    if (category) {
      query['metadata.category'] = category;
    }

    const templates = await RoleTemplate.find(query)
      .sort({ 'metadata.category': 1, name: 1 })
      .exec();

    return NextResponse.json(templates);
  } catch (error) {
    console.error('Error getting role templates:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/roles/templates
 * Crear nueva plantilla de rol
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { name, description, permissions, scope, metadata } = body;

    // Validaciones básicas
    if (!name || !permissions || !scope) {
      return NextResponse.json(
        { error: 'name, permissions y scope son requeridos' },
        { status: 400 }
      );
    }

    if (!['clinic', 'distributor', 'both'].includes(scope)) {
      return NextResponse.json(
        { error: 'scope debe ser clinic, distributor o both' },
        { status: 400 }
      );
    }

    const template = new RoleTemplate({
      name,
      description,
      permissions,
      scope,
      metadata: metadata || {},
      createdBy: session.user.id
    });

    await template.save();

    return NextResponse.json(template, { status: 201 });
  } catch (error) {
    console.error('Error creating role template:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
