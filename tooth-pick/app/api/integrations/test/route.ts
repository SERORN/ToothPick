// 🧪 FASE 33: API para Pruebas de Conexión de Integraciones
// ✅ Endpoint para validar credenciales de sistemas externos

import { NextRequest, NextResponse } from 'next/server';
import IntegrationService from '@/lib/services/IntegrationService';

// POST: Probar conexión con sistema externo
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { credentialId } = body;
    
    if (!credentialId) {
      return NextResponse.json(
        { error: 'Se requiere credentialId' },
        { status: 400 }
      );
    }
    
    const integrationService = IntegrationService.getInstance();
    
    // Realizar prueba de conexión
    const result = await integrationService.testConnection(credentialId);
    
    return NextResponse.json({
      success: result.success,
      message: result.message,
      connectionTest: {
        success: result.success,
        responseTime: result.responseTime,
        apiVersion: result.apiVersion,
        systemInfo: result.systemInfo,
        testedAt: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error('Error en POST /api/integrations/test:', error);
    return NextResponse.json(
      { 
        error: 'Error al probar conexión',
        details: error instanceof Error ? error.message : 'Error desconocido',
        success: false
      },
      { status: 500 }
    );
  }
}
