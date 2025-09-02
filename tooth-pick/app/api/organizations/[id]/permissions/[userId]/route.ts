import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import organizationService from '@/lib/services/OrganizationService';

/**
 * GET /api/organizations/[id]/permissions/[userId]
 * Obtener permisos de un usuario en una organización
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string; userId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { id: organizationId, userId } = params;

    // Verificar que el usuario que consulta tenga permisos para ver esta información
    const organization = await organizationService.getOrganizationById(organizationId, session.user.id);
    if (!organization) {
      return NextResponse.json({ error: 'Organización no encontrada' }, { status: 404 });
    }

    // Obtener permisos del usuario
    const permissions = await organizationService.getUserPermissions(userId, organizationId);
    
    // Verificar si es el propietario
    const isOwner = organization.ownerId.toString() === userId;
    
    // Obtener rol del usuario
    const roleAssignment = organization.roleAssignments.find(
      ra => ra.userId.toString() === userId
    );

    const response = {
      organizationId,
      permissions,
      role: roleAssignment?.roleName || '',
      isOwner
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error getting user permissions:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
