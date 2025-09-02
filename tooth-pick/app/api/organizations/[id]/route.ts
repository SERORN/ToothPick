import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import organizationService from '@/lib/services/OrganizationService';

/**
 * GET /api/organizations/[id]
 * Obtener organización por ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const organization = await organizationService.getOrganizationById(params.id, session.user.id);
    if (!organization) {
      return NextResponse.json({ error: 'Organización no encontrada' }, { status: 404 });
    }

    return NextResponse.json(organization);
  } catch (error) {
    console.error('Error getting organization:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/organizations/[id]
 * Actualizar organización
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { name, description, settings } = body;

    const organization = await organizationService.updateOrganization(
      params.id,
      { name, description },
      session.user.id
    );

    // Si hay configuraciones, actualizarlas por separado
    if (settings) {
      await organizationService.updateOrganizationSettings(
        params.id,
        settings,
        session.user.id
      );
    }

    return NextResponse.json(organization);
  } catch (error) {
    console.error('Error updating organization:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/organizations/[id]
 * Eliminar organización
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    await organizationService.deleteOrganization(params.id, session.user.id);

    return NextResponse.json({ message: 'Organización eliminada exitosamente' });
  } catch (error) {
    console.error('Error deleting organization:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
