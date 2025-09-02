import mongoose, { Schema, Document } from 'mongoose';

// Definición de permisos del sistema
export enum PermissionKey {
  // Gestión de órdenes
  VIEW_ORDERS = 'view_orders',
  EDIT_ORDERS = 'edit_orders',
  CREATE_ORDERS = 'create_orders',
  DELETE_ORDERS = 'delete_orders',
  MANAGE_ORDER_STATUS = 'manage_order_status',

  // Gestión de productos
  VIEW_PRODUCTS = 'view_products',
  EDIT_PRODUCTS = 'edit_products',
  CREATE_PRODUCTS = 'create_products',
  DELETE_PRODUCTS = 'delete_products',
  MANAGE_INVENTORY = 'manage_inventory',

  // Gestión de citas (clínicas)
  VIEW_APPOINTMENTS = 'view_appointments',
  EDIT_APPOINTMENTS = 'edit_appointments',
  CREATE_APPOINTMENTS = 'create_appointments',
  DELETE_APPOINTMENTS = 'delete_appointments',
  MANAGE_CALENDAR = 'manage_calendar',

  // Gestión financiera
  VIEW_FINANCES = 'view_finances',
  EDIT_FINANCES = 'edit_finances',
  VIEW_REVENUE_REPORTS = 'view_revenue_reports',
  MANAGE_BILLING = 'manage_billing',
  ACCESS_ACCOUNTING = 'access_accounting',

  // Gestión de personal/miembros
  VIEW_STAFF = 'view_staff',
  EDIT_STAFF = 'edit_staff',
  CREATE_STAFF = 'create_staff',
  DELETE_STAFF = 'delete_staff',
  MANAGE_ROLES = 'manage_roles',
  ASSIGN_PERMISSIONS = 'assign_permissions',

  // Gamificación
  ACCESS_GAMIFICATION = 'access_gamification',
  VIEW_LEADERBOARDS = 'view_leaderboards',
  MANAGE_REWARDS = 'manage_rewards',
  VIEW_ANALYTICS = 'view_analytics',

  // Soporte y tickets
  VIEW_SUPPORT_TICKETS = 'view_support_tickets',
  CREATE_SUPPORT_TICKETS = 'create_support_tickets',
  MANAGE_SUPPORT_TICKETS = 'manage_support_tickets',

  // Configuración y administración
  MANAGE_ORGANIZATION_SETTINGS = 'manage_organization_settings',
  VIEW_SYSTEM_LOGS = 'view_system_logs',
  MANAGE_SUBSCRIPTIONS = 'manage_subscriptions',
  ACCESS_ADMIN_PANEL = 'access_admin_panel',

  // Distribuidores específicos
  MANAGE_DISTRIBUTORS = 'manage_distributors',
  VIEW_DISTRIBUTION_NETWORK = 'view_distribution_network',
  MANAGE_COMMISSIONS = 'manage_commissions',

  // Clínicas específicas
  MANAGE_PATIENT_DATA = 'manage_patient_data',
  VIEW_PATIENT_HISTORY = 'view_patient_history',
  MANAGE_TREATMENTS = 'manage_treatments',
  ACCESS_CLINICAL_TOOLS = 'access_clinical_tools'
}

export interface IOrganization extends Document {
  name: string;
  description?: string;
  ownerId: mongoose.Types.ObjectId;
  type: 'clinic' | 'distributor' | 'admin';
  members: mongoose.Types.ObjectId[];
  roleAssignments: {
    userId: mongoose.Types.ObjectId;
    roleName: string;
    permissions: PermissionKey[];
    assignedAt: Date;
    assignedBy: mongoose.Types.ObjectId;
  }[];
  settings: {
    allowSelfRegistration: boolean;
    requireOwnerApproval: boolean;
    maxMembers: number;
    defaultRole?: string;
  };
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const OrganizationSchema: Schema = new Schema<IOrganization>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100
    },
    description: {
      type: String,
      trim: true,
      maxlength: 500
    },
    ownerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    type: {
      type: String,
      enum: ['clinic', 'distributor', 'admin'],
      required: true,
      index: true
    },
    members: [{
      type: Schema.Types.ObjectId,
      ref: 'User'
    }],
    roleAssignments: [{
      userId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
      },
      roleName: {
        type: String,
        required: true
      },
      permissions: [{
        type: String,
        enum: Object.values(PermissionKey)
      }],
      assignedAt: {
        type: Date,
        default: Date.now
      },
      assignedBy: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
      }
    }],
    settings: {
      allowSelfRegistration: {
        type: Boolean,
        default: false
      },
      requireOwnerApproval: {
        type: Boolean,
        default: true
      },
      maxMembers: {
        type: Number,
        default: 10,
        min: 1,
        max: 100
      },
      defaultRole: {
        type: String,
        default: 'member'
      }
    },
    isActive: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Índices para consultas eficientes
OrganizationSchema.index({ ownerId: 1, type: 1 });
OrganizationSchema.index({ 'members': 1 });
OrganizationSchema.index({ 'roleAssignments.userId': 1 });
OrganizationSchema.index({ name: 1, type: 1 });

// Virtual para obtener el número de miembros
OrganizationSchema.virtual('memberCount').get(function(this: IOrganization) {
  return this.members.length;
});

// Virtual para verificar si está dentro del límite de miembros
OrganizationSchema.virtual('canAddMembers').get(function(this: IOrganization) {
  return this.members.length < this.settings.maxMembers;
});

// Método para verificar si un usuario es miembro
OrganizationSchema.methods.isMember = function(userId: string | mongoose.Types.ObjectId): boolean {
  const userObjectId = typeof userId === 'string' ? new mongoose.Types.ObjectId(userId) : userId;
  return this.members.some((memberId: mongoose.Types.ObjectId) => memberId.equals(userObjectId));
};

// Método para verificar si un usuario es el propietario
OrganizationSchema.methods.isOwner = function(userId: string | mongoose.Types.ObjectId): boolean {
  const userObjectId = typeof userId === 'string' ? new mongoose.Types.ObjectId(userId) : userId;
  return this.ownerId.equals(userObjectId);
};

// Método para obtener permisos de un usuario
OrganizationSchema.methods.getUserPermissions = function(userId: string | mongoose.Types.ObjectId): PermissionKey[] {
  const userObjectId = typeof userId === 'string' ? new mongoose.Types.ObjectId(userId) : userId;
  
  // Si es el propietario, tiene todos los permisos
  if (this.isOwner(userObjectId)) {
    return Object.values(PermissionKey);
  }

  // Buscar asignación de rol del usuario
  const roleAssignment = this.roleAssignments.find((assignment: any) => 
    assignment.userId.equals(userObjectId)
  );

  return roleAssignment ? roleAssignment.permissions : [];
};

// Método para verificar si un usuario tiene un permiso específico
OrganizationSchema.methods.userHasPermission = function(
  userId: string | mongoose.Types.ObjectId, 
  permission: PermissionKey
): boolean {
  const userPermissions = this.getUserPermissions(userId);
  return userPermissions.includes(permission);
};

// Método para agregar miembro
OrganizationSchema.methods.addMember = async function(
  userId: string | mongoose.Types.ObjectId,
  roleName: string,
  permissions: PermissionKey[],
  assignedBy: string | mongoose.Types.ObjectId
) {
  const userObjectId = typeof userId === 'string' ? new mongoose.Types.ObjectId(userId) : userId;
  const assignedByObjectId = typeof assignedBy === 'string' ? new mongoose.Types.ObjectId(assignedBy) : assignedBy;

  if (this.isMember(userObjectId)) {
    throw new Error('El usuario ya es miembro de esta organización');
  }

  if (!this.canAddMembers) {
    throw new Error('Se ha alcanzado el límite máximo de miembros');
  }

  // Agregar a la lista de miembros
  this.members.push(userObjectId);

  // Crear asignación de rol
  this.roleAssignments.push({
    userId: userObjectId,
    roleName,
    permissions,
    assignedAt: new Date(),
    assignedBy: assignedByObjectId
  });

  return this.save();
};

// Método para remover miembro
OrganizationSchema.methods.removeMember = async function(userId: string | mongoose.Types.ObjectId) {
  const userObjectId = typeof userId === 'string' ? new mongoose.Types.ObjectId(userId) : userId;

  if (this.isOwner(userObjectId)) {
    throw new Error('No se puede remover al propietario de la organización');
  }

  // Remover de la lista de miembros
  this.members = this.members.filter((memberId: mongoose.Types.ObjectId) => 
    !memberId.equals(userObjectId)
  );

  // Remover asignación de rol
  this.roleAssignments = this.roleAssignments.filter((assignment: any) => 
    !assignment.userId.equals(userObjectId)
  );

  return this.save();
};

// Método para actualizar permisos de un miembro
OrganizationSchema.methods.updateMemberPermissions = async function(
  userId: string | mongoose.Types.ObjectId,
  newPermissions: PermissionKey[],
  updatedBy: string | mongoose.Types.ObjectId
) {
  const userObjectId = typeof userId === 'string' ? new mongoose.Types.ObjectId(userId) : userId;

  const roleAssignment = this.roleAssignments.find((assignment: any) => 
    assignment.userId.equals(userObjectId)
  );

  if (!roleAssignment) {
    throw new Error('El usuario no es miembro de esta organización');
  }

  roleAssignment.permissions = newPermissions;
  roleAssignment.assignedAt = new Date();
  roleAssignment.assignedBy = typeof updatedBy === 'string' ? new mongoose.Types.ObjectId(updatedBy) : updatedBy;

  return this.save();
};

// Método estático para obtener organizaciones de un usuario
OrganizationSchema.statics.getUserOrganizations = async function(userId: string | mongoose.Types.ObjectId) {
  const userObjectId = typeof userId === 'string' ? new mongoose.Types.ObjectId(userId) : userId;
  
  return this.find({
    $or: [
      { ownerId: userObjectId },
      { members: userObjectId }
    ],
    isActive: true
  }).populate('ownerId', 'name email').exec();
};

// Método estático para verificar permisos de usuario en organización
OrganizationSchema.statics.checkUserPermission = async function(
  userId: string | mongoose.Types.ObjectId,
  organizationId: string | mongoose.Types.ObjectId,
  permission: PermissionKey
): Promise<boolean> {
  const organization = await this.findById(organizationId);
  if (!organization) return false;
  
  return organization.userHasPermission(userId, permission);
};

export default mongoose.models.Organization || 
  mongoose.model<IOrganization>('Organization', OrganizationSchema);
