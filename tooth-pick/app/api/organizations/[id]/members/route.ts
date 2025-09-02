import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import organizationService from '@/lib/services/OrganizationService';

/**
 * POST /api/organizations/[id]/members
 * Agregar miembro a organización
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { userId, roleName, permissions, note } = body;

    // Validaciones básicas
    if (!userId || !roleName || !permissions) {
      return NextResponse.json(
        { error: 'userId, roleName y permissions son requeridos' },
        { status: 400 }
      );
    }

    const organization = await organizationService.addMember({
      organizationId: params.id,
      userId,
      roleName,
      permissions,
      assignedBy: session.user.id
    });

    return NextResponse.json(organization);
  } catch (error) {
    console.error('Error adding member:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/organizations/[id]/members
 * Obtener miembros de la organización
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

    // Retornar solo la información de miembros
    const members = organization.members.map(memberId => {
      const roleAssignment = organization.roleAssignments.find(ra => ra.userId.toString() === memberId.toString());
      return {
        userId: memberId,
        role: roleAssignment || null,
        isActive: organization.members.includes(memberId)
      };
    });

    return NextResponse.json({ members });
  } catch (error) {
    console.error('Error getting members:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
