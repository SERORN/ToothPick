// 🔄 FASE 33: API para Sincronización Manual de Integraciones
// ✅ Endpoint para ejecutar sincronización a demanda

import { NextRequest, NextResponse } from 'next/server';
import IntegrationService from '@/lib/services/IntegrationService';

// POST: Ejecutar sincronización manual
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { credentialId, entityTypes, triggeredBy } = body;
    
    if (!credentialId || !entityTypes || !triggeredBy) {
      return NextResponse.json(
        { error: 'Se requiere credentialId, entityTypes y triggeredBy' },
        { status: 400 }
      );
    }
    
    // Validar tipos de entidad
    const validEntityTypes = ['PRODUCT', 'ORDER', 'INVENTORY', 'QUOTE', 'CUSTOMER'];
    const invalidTypes = entityTypes.filter((type: string) => !validEntityTypes.includes(type));
    
    if (invalidTypes.length > 0) {
      return NextResponse.json(
        { error: `Tipos de entidad inválidos: ${invalidTypes.join(', ')}` },
        { status: 400 }
      );
    }
    
    const integrationService = IntegrationService.getInstance();
    
    // Ejecutar sincronización
    const result = await integrationService.performManualSync(
      credentialId,
      entityTypes,
      triggeredBy
    );
    
    return NextResponse.json({
      success: result.success,
      message: result.success ? 'Sincronización completada exitosamente' : 'Sincronización completada con errores',
      syncResult: {
        success: result.success,
        itemsProcessed: result.itemsProcessed,
        itemsSucceeded: result.itemsSucceeded,
        itemsFailed: result.itemsFailed,
        duration: result.duration,
        errors: result.errors.slice(0, 10), // Mostrar solo los primeros 10 errores
        entityTypes,
        executedAt: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error('Error en POST /api/integrations/sync:', error);
    return NextResponse.json(
      { 
        error: 'Error al ejecutar sincronización',
        details: error instanceof Error ? error.message : 'Error desconocido',
        success: false
      },
      { status: 500 }
    );
  }
}
