import mongoose, { Schema, Document } from 'mongoose';
import { PermissionKey } from './Organization';

export interface IRoleTemplate extends Document {
  name: string;
  description: string;
  scope: 'clinic' | 'distributor' | 'both';
  defaultPermissions: PermissionKey[];
  isSystemTemplate: boolean;
  createdBy?: mongoose.Types.ObjectId;
  usageCount: number;
  isActive: boolean;
  metadata: {
    category: string;
    level: 'basic' | 'intermediate' | 'advanced';
    recommendedFor: string[];
  };
  createdAt: Date;
  updatedAt: Date;
}

const RoleTemplateSchema: Schema = new Schema<IRoleTemplate>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 50,
      unique: true
    },
    description: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200
    },
    scope: {
      type: String,
      enum: ['clinic', 'distributor', 'both'],
      required: true,
      index: true
    },
    defaultPermissions: [{
      type: String,
      enum: Object.values(PermissionKey),
      required: true
    }],
    isSystemTemplate: {
      type: Boolean,
      default: false
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    },
    usageCount: {
      type: Number,
      default: 0,
      min: 0
    },
    isActive: {
      type: Boolean,
      default: true
    },
    metadata: {
      category: {
        type: String,
        required: true,
        enum: ['administrative', 'clinical', 'sales', 'support', 'management', 'technical']
      },
      level: {
        type: String,
        enum: ['basic', 'intermediate', 'advanced'],
        default: 'basic'
      },
      recommendedFor: [{
        type: String,
        enum: ['new_employees', 'experienced_staff', 'managers', 'specialists', 'part_time', 'full_time']
      }]
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Índices para consultas eficientes
RoleTemplateSchema.index({ scope: 1, isActive: 1 });
RoleTemplateSchema.index({ 'metadata.category': 1 });
RoleTemplateSchema.index({ usageCount: -1 });
RoleTemplateSchema.index({ name: 'text', description: 'text' });

// Virtual para obtener el conteo de permisos
RoleTemplateSchema.virtual('permissionCount').get(function(this: IRoleTemplate) {
  return this.defaultPermissions.length;
});

// Método para incrementar el contador de uso
RoleTemplateSchema.methods.incrementUsage = async function() {
  this.usageCount += 1;
  return this.save();
};

// Método para verificar compatibilidad con organización
RoleTemplateSchema.methods.isCompatibleWith = function(organizationType: 'clinic' | 'distributor'): boolean {
  return this.scope === 'both' || this.scope === organizationType;
};

// Método estático para obtener plantillas populares
RoleTemplateSchema.statics.getPopularTemplates = async function(
  scope?: 'clinic' | 'distributor',
  limit: number = 5
) {
  const query: any = { isActive: true };
  if (scope) {
    query.$or = [
      { scope: scope },
      { scope: 'both' }
    ];
  }

  return this.find(query)
    .sort({ usageCount: -1 })
    .limit(limit)
    .exec();
};

// Método estático para obtener plantillas por categoría
RoleTemplateSchema.statics.getByCategory = async function(
  category: string,
  scope?: 'clinic' | 'distributor'
) {
  const query: any = { 
    'metadata.category': category,
    isActive: true 
  };
  
  if (scope) {
    query.$or = [
      { scope: scope },
      { scope: 'both' }
    ];
  }

  return this.find(query)
    .sort({ usageCount: -1 })
    .exec();
};

// Método estático para buscar plantillas
RoleTemplateSchema.statics.searchTemplates = async function(
  searchTerm: string,
  scope?: 'clinic' | 'distributor'
) {
  const query: any = {
    $text: { $search: searchTerm },
    isActive: true
  };

  if (scope) {
    query.$or = [
      { scope: scope },
      { scope: 'both' }
    ];
  }

  return this.find(query, { score: { $meta: 'textScore' } })
    .sort({ score: { $meta: 'textScore' } })
    .exec();
};

// Middleware para validar permisos según el scope
RoleTemplateSchema.pre('save', function(this: IRoleTemplate) {
  // Validar que los permisos sean apropiados para el scope
  if (this.scope === 'clinic') {
    const invalidPermissions = this.defaultPermissions.filter(permission => 
      permission.includes('distributor') || permission.includes('distribution')
    );
    if (invalidPermissions.length > 0) {
      throw new Error(`Permisos no válidos para clínica: ${invalidPermissions.join(', ')}`);
    }
  } else if (this.scope === 'distributor') {
    const invalidPermissions = this.defaultPermissions.filter(permission => 
      permission.includes('patient') || permission.includes('clinical') || permission.includes('treatment')
    );
    if (invalidPermissions.length > 0) {
      throw new Error(`Permisos no válidos para distribuidor: ${invalidPermissions.join(', ')}`);
    }
  }
});

export default mongoose.models.RoleTemplate || 
  mongoose.model<IRoleTemplate>('RoleTemplate', RoleTemplateSchema);
