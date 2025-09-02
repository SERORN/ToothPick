import dbConnect from '@/lib/db';
import Organization, { IOrganization, PermissionKey } from '@/lib/models/Organization';
import RoleTemplate, { IRoleTemplate } from '@/lib/models/RoleTemplate';
import User from '@/lib/models/User';
import mongoose from 'mongoose';

export interface CreateOrganizationParams {
  name: string;
  description?: string;
  ownerId: string;
  type: 'clinic' | 'distributor';
  settings?: {
    allowSelfRegistration?: boolean;
    requireOwnerApproval?: boolean;
    maxMembers?: number;
    defaultRole?: string;
  };
}

export interface AddMemberParams {
  organizationId: string;
  userId: string;
  roleName: string;
  permissions: PermissionKey[];
  assignedBy: string;
}

export interface UpdateMemberPermissionsParams {
  organizationId: string;
  userId: string;
  permissions: PermissionKey[];
  updatedBy: string;
}

export interface OrganizationWithStats extends IOrganization {
  memberCount: number;
  activeMembers: number;
  recentActivity: Date;
}

class OrganizationService {
  
  private async ensureConnection() {
    await dbConnect();
  }

  /**
   * Crear una nueva organización
   */
  async createOrganization(params: CreateOrganizationParams): Promise<IOrganization> {
    await this.ensureConnection();

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // Verificar que el owner existe
      const owner = await User.findById(params.ownerId).session(session);
      if (!owner) {
        throw new Error('Usuario propietario no encontrado');
      }

      // Verificar que el usuario no tenga ya una organización del mismo tipo
      const existingOrg = await Organization.findOne({
        ownerId: params.ownerId,
        type: params.type,
        isActive: true
      }).session(session);

      if (existingOrg) {
        throw new Error(`El usuario ya tiene una organización de tipo ${params.type}`);
      }

      // Crear la organización
      const organization = new Organization({
        name: params.name,
        description: params.description,
        ownerId: params.ownerId,
        type: params.type,
        members: [params.ownerId], // El owner es el primer miembro
        roleAssignments: [{
          userId: params.ownerId,
          roleName: 'owner',
          permissions: Object.values(PermissionKey), // Owner tiene todos los permisos
          assignedAt: new Date(),
          assignedBy: params.ownerId
        }],
        settings: {
          allowSelfRegistration: params.settings?.allowSelfRegistration ?? false,
          requireOwnerApproval: params.settings?.requireOwnerApproval ?? true,
          maxMembers: params.settings?.maxMembers ?? 10,
          defaultRole: params.settings?.defaultRole ?? 'member'
        },
        isActive: true
      });

      await organization.save({ session });
      await session.commitTransaction();

      return organization;

    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  /**
   * Obtener organizaciones de un usuario
   */
  async getUserOrganizations(userId: string): Promise<IOrganization[]> {
    await this.ensureConnection();

    const userObjectId = new mongoose.Types.ObjectId(userId);
    
    return Organization.find({
      $or: [
        { ownerId: userObjectId },
        { members: userObjectId }
      ],
      isActive: true
    }).populate('ownerId', 'name email').exec();
  }

  /**
   * Obtener una organización por ID con detalles completos
   */
  async getOrganizationById(organizationId: string, requestUserId: string): Promise<IOrganization | null> {
    await this.ensureConnection();

    const organization = await Organization.findById(organizationId)
      .populate('ownerId', 'name email')
      .populate('members', 'name email role')
      .populate('roleAssignments.userId', 'name email')
      .populate('roleAssignments.assignedBy', 'name email')
      .exec();

    if (!organization) {
      return null;
    }

    // Verificar que el usuario tiene acceso a ver esta organización
    if (!organization.isMember(requestUserId) && !organization.isOwner(requestUserId)) {
      throw new Error('No tienes permisos para ver esta organización');
    }

    return organization;
  }

  /**
   * Agregar miembro a la organización
   */
  async addMember(params: AddMemberParams): Promise<IOrganization> {
    await this.ensureConnection();

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const organization = await Organization.findById(params.organizationId).session(session);
      if (!organization) {
        throw new Error('Organización no encontrada');
      }

      // Verificar permisos del usuario que asigna
      if (!organization.userHasPermission(params.assignedBy, PermissionKey.MANAGE_ROLES)) {
        throw new Error('No tienes permisos para agregar miembros');
      }

      // Verificar que el usuario a agregar existe
      const userToAdd = await User.findById(params.userId).session(session);
      if (!userToAdd) {
        throw new Error('Usuario no encontrado');
      }

      // Agregar el miembro
      await organization.addMember(
        params.userId,
        params.roleName,
        params.permissions,
        params.assignedBy
      );

      await session.commitTransaction();
      return organization;

    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  /**
   * Remover miembro de la organización
   */
  async removeMember(organizationId: string, userId: string, removedBy: string): Promise<IOrganization> {
    await this.ensureConnection();

    const organization = await Organization.findById(organizationId);
    if (!organization) {
      throw new Error('Organización no encontrada');
    }

    // Verificar permisos del usuario que remueve
    if (!organization.userHasPermission(removedBy, PermissionKey.MANAGE_ROLES)) {
      throw new Error('No tienes permisos para remover miembros');
    }

    return organization.removeMember(userId);
  }

  /**
   * Actualizar permisos de un miembro
   */
  async updateMemberPermissions(params: UpdateMemberPermissionsParams): Promise<IOrganization> {
    await this.ensureConnection();

    const organization = await Organization.findById(params.organizationId);
    if (!organization) {
      throw new Error('Organización no encontrada');
    }

    // Verificar permisos del usuario que actualiza
    if (!organization.userHasPermission(params.updatedBy, PermissionKey.ASSIGN_PERMISSIONS)) {
      throw new Error('No tienes permisos para actualizar permisos');
    }

    return organization.updateMemberPermissions(
      params.userId,
      params.permissions,
      params.updatedBy
    );
  }

  /**
   * Verificar si un usuario tiene un permiso específico en una organización
   */
  async checkUserPermission(
    userId: string,
    organizationId: string,
    permission: PermissionKey
  ): Promise<boolean> {
    await this.ensureConnection();

    const organization = await Organization.findById(organizationId);
    if (!organization) {
      return false;
    }
    
    return organization.userHasPermission(userId, permission);
  }

  /**
   * Obtener todos los permisos de un usuario en una organización
   */
  async getUserPermissions(userId: string, organizationId: string): Promise<PermissionKey[]> {
    await this.ensureConnection();

    const organization = await Organization.findById(organizationId);
    if (!organization) {
      return [];
    }

    return organization.getUserPermissions(userId);
  }

  /**
   * Obtener estadísticas de una organización
   */
  async getOrganizationStats(organizationId: string, requestUserId: string): Promise<{
    memberCount: number;
    activeMembers: number;
    roleDistribution: { [roleName: string]: number };
    permissionUsage: { [permission: string]: number };
    recentActivity: Date;
  }> {
    await this.ensureConnection();

    const organization = await Organization.findById(organizationId)
      .populate('members', 'lastLoginAt isActive')
      .exec();

    if (!organization) {
      throw new Error('Organización no encontrada');
    }

    // Verificar permisos
    if (!organization.userHasPermission(requestUserId, PermissionKey.VIEW_ANALYTICS)) {
      throw new Error('No tienes permisos para ver estadísticas');
    }

    // Calcular estadísticas
    const memberCount = organization.members.length;
    const activeMembers = organization.members.filter((member: any) => member.isActive).length;

    // Distribución de roles
    const roleDistribution: { [roleName: string]: number } = {};
    organization.roleAssignments.forEach((assignment: any) => {
      roleDistribution[assignment.roleName] = (roleDistribution[assignment.roleName] || 0) + 1;
    });

    // Uso de permisos
    const permissionUsage: { [permission: string]: number } = {};
    organization.roleAssignments.forEach((assignment: any) => {
      assignment.permissions.forEach((permission: string) => {
        permissionUsage[permission] = (permissionUsage[permission] || 0) + 1;
      });
    });

    // Actividad reciente
    const recentActivity = organization.roleAssignments.reduce((latest: Date, assignment: any) => {
      return assignment.assignedAt > latest ? assignment.assignedAt : latest;
    }, organization.createdAt);

    return {
      memberCount,
      activeMembers,
      roleDistribution,
      permissionUsage,
      recentActivity
    };
  }

  /**
   * Buscar organizaciones (solo para admins)
   */
  async searchOrganizations(
    searchTerm: string,
    type?: 'clinic' | 'distributor',
    page: number = 1,
    limit: number = 20
  ): Promise<{
    organizations: IOrganization[];
    total: number;
    hasMore: boolean;
  }> {
    await this.ensureConnection();

    const query: any = {
      $or: [
        { name: { $regex: searchTerm, $options: 'i' } },
        { description: { $regex: searchTerm, $options: 'i' } }
      ],
      isActive: true
    };

    if (type) {
      query.type = type;
    }

    const skip = (page - 1) * limit;

    const [organizations, total] = await Promise.all([
      Organization.find(query)
        .populate('ownerId', 'name email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      Organization.countDocuments(query)
    ]);

    return {
      organizations,
      total,
      hasMore: total > skip + organizations.length
    };
  }

  /**
   * Actualizar configuración de organización
   */
  async updateOrganizationSettings(
    organizationId: string,
    settings: Partial<IOrganization['settings']>,
    updatedBy: string
  ): Promise<IOrganization> {
    await this.ensureConnection();

    const organization = await OrganizationModel.findById(organizationId);
    if (!organization) {
      throw new Error('Organización no encontrada');
    }

    // Verificar permisos
    if (!organization.userHasPermission(updatedBy, PermissionKey.MANAGE_ORGANIZATION_SETTINGS)) {
      throw new Error('No tienes permisos para actualizar la configuración');
    }

    // Actualizar configuración
    organization.settings = { ...organization.settings, ...settings };
    return organization.save();
  }

  /**
   * Actualizar información básica de organización
   */
  async updateOrganization(
    organizationId: string,
    updates: { name?: string; description?: string },
    updatedBy: string
  ): Promise<IOrganization> {
    await this.ensureConnection();

    const organization = await OrganizationModel.findById(organizationId);
    if (!organization) {
      throw new Error('Organización no encontrada');
    }

    // Verificar permisos (propietario o permisos de gestión)
    if (organization.ownerId.toString() !== updatedBy && 
        !organization.userHasPermission(updatedBy, PermissionKey.MANAGE_ORGANIZATION_SETTINGS)) {
      throw new Error('No tienes permisos para actualizar esta organización');
    }

    // Actualizar campos
    if (updates.name) organization.name = updates.name;
    if (updates.description !== undefined) organization.description = updates.description;

    return organization.save();
  }

  /**
   * Eliminar organización (solo propietario)
   */
  async deleteOrganization(organizationId: string, deletedBy: string): Promise<void> {
    await this.ensureConnection();

    const organization = await OrganizationModel.findById(organizationId);
    if (!organization) {
      throw new Error('Organización no encontrada');
    }

    // Solo el propietario puede eliminar la organización
    if (organization.ownerId.toString() !== deletedBy) {
      throw new Error('Solo el propietario puede eliminar la organización');
    }

    // Verificar que no tenga miembros activos (además del propietario)
    const activeMembers = organization.members.filter(m => m.isActive && m.userId.toString() !== deletedBy);
    if (activeMembers.length > 0) {
      throw new Error('No se puede eliminar una organización con miembros activos');
    }

    await OrganizationModel.findByIdAndDelete(organizationId);
  }
}

// Singleton instance
export const organizationService = new OrganizationService();
export default organizationService;
