// 🌐 FASE 33: API para Gestión de Integraciones ERP/CRM
// ✅ Endpoints para conectar y gestionar sistemas externos

import { NextRequest, NextResponse } from 'next/server';
import IntegrationService from '@/lib/services/IntegrationService';
import IntegrationCredential from '@/lib/models/IntegrationCredential';

// GET: Obtener integraciones del proveedor
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const providerId = searchParams.get('providerId');
    const organizationId = searchParams.get('organizationId');
    
    if (!providerId && !organizationId) {
      return NextResponse.json(
        { error: 'Se requiere providerId o organizationId' },
        { status: 400 }
      );
    }
    
    const integrationService = IntegrationService.getInstance();
    
    if (providerId) {
      // Obtener integraciones específicas del proveedor
      const credentials = await integrationService.getProviderCredentials(providerId);
      
      return NextResponse.json({
        success: true,
        integrations: credentials,
        count: credentials.length
      });
    } else {
      // Obtener estadísticas para la organización
      const stats = await integrationService.getIntegrationStats(organizationId!, 7);
      
      return NextResponse.json({
        success: true,
        stats,
        period: '7 days'
      });
    }
    
  } catch (error) {
    console.error('Error en GET /api/integrations:', error);
    return NextResponse.json(
      { 
        error: 'Error interno del servidor',
        details: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    );
  }
}

// POST: Crear nueva integración
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const {
      providerId,
      organizationId,
      systemName,
      connectionName,
      credentials,
      syncConfig,
      createdBy
    } = body;
    
    // Validar campos requeridos
    if (!providerId || !organizationId || !systemName || !connectionName || !credentials || !createdBy) {
      return NextResponse.json(
        { error: 'Faltan campos requeridos' },
        { status: 400 }
      );
    }
    
    // Validar sistema soportado
    const supportedSystems = ['SAP', 'ODOO', 'ORACLE', 'ZOHO', 'SALESFORCE', 'HUBSPOT', 'PIPEDRIVE'];
    if (!supportedSystems.includes(systemName)) {
      return NextResponse.json(
        { error: `Sistema no soportado: ${systemName}` },
        { status: 400 }
      );
    }
    
    const integrationService = IntegrationService.getInstance();
    
    const credential = await integrationService.saveCredentials(
      providerId,
      organizationId,
      systemName,
      connectionName,
      credentials,
      syncConfig || {},
      createdBy
    );
    
    return NextResponse.json({
      success: true,
      message: 'Integración creada exitosamente',
      credential: {
        id: credential._id,
        connectionName: credential.connectionName,
        systemName: credential.systemName,
        isActive: credential.isActive,
        connectionStatus: credential.connectionStatus
      }
    }, { status: 201 });
    
  } catch (error) {
    console.error('Error en POST /api/integrations:', error);
    return NextResponse.json(
      { 
        error: 'Error al crear integración',
        details: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    );
  }
}

// PUT: Actualizar integración existente
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { credentialId, credentials, syncConfig, updatedBy } = body;
    
    if (!credentialId || !updatedBy) {
      return NextResponse.json(
        { error: 'Se requiere credentialId y updatedBy' },
        { status: 400 }
      );
    }
    
    const credential = await IntegrationCredential.findById(credentialId);
    if (!credential) {
      return NextResponse.json(
        { error: 'Integración no encontrada' },
        { status: 404 }
      );
    }
    
    // Actualizar campos si se proporcionan
    if (credentials) {
      credential.credentials = { ...credential.credentials, ...credentials };
    }
    
    if (syncConfig) {
      credential.syncConfig = { ...credential.syncConfig, ...syncConfig };
    }
    
    // Marcar como requerimiento nueva validación si se cambiaron credenciales
    if (credentials) {
      credential.connectionStatus.isConnected = false;
    }
    
    await credential.save();
    
    return NextResponse.json({
      success: true,
      message: 'Integración actualizada exitosamente',
      credential: {
        id: credential._id,
        connectionName: credential.connectionName,
        systemName: credential.systemName,
        syncConfig: credential.syncConfig,
        connectionStatus: credential.connectionStatus
      }
    });
    
  } catch (error) {
    console.error('Error en PUT /api/integrations:', error);
    return NextResponse.json(
      { 
        error: 'Error al actualizar integración',
        details: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    );
  }
}

// DELETE: Eliminar integración
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const credentialId = searchParams.get('credentialId');
    const deletedBy = searchParams.get('deletedBy');
    
    if (!credentialId || !deletedBy) {
      return NextResponse.json(
        { error: 'Se requiere credentialId y deletedBy' },
        { status: 400 }
      );
    }
    
    const integrationService = IntegrationService.getInstance();
    await integrationService.deleteCredentials(credentialId, deletedBy);
    
    return NextResponse.json({
      success: true,
      message: 'Integración eliminada exitosamente'
    });
    
  } catch (error) {
    console.error('Error en DELETE /api/integrations:', error);
    return NextResponse.json(
      { 
        error: 'Error al eliminar integración',
        details: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    );
  }
}
