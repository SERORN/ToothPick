import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import organizationService from '@/lib/services/OrganizationService';

/**
 * GET /api/organizations
 * Listar organizaciones con paginación y filtros
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';
    const type = searchParams.get('type') as 'clinic' | 'distributor' | undefined;

    const result = await organizationService.searchOrganizations(
      search,
      type,
      page,
      limit
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error searching organizations:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/organizations
 * Crear nueva organización
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { name, organizationType, description, settings } = body;

    // Validaciones básicas
    if (!name || !organizationType) {
      return NextResponse.json(
        { error: 'Nombre y tipo de organización son requeridos' },
        { status: 400 }
      );
    }

    if (!['clinic', 'distributor'].includes(organizationType)) {
      return NextResponse.json(
        { error: 'Tipo de organización inválido' },
        { status: 400 }
      );
    }

    const organization = await organizationService.createOrganization({
      name,
      type: organizationType,
      description,
      ownerId: session.user.id,
      settings: settings || {}
    });

    return NextResponse.json(organization, { status: 201 });
  } catch (error) {
    console.error('Error creating organization:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
