// 🏛️ FASE 28: Servicio de Facturama para Timbrado CFDI 4.0
// ✅ Integración completa con Facturama para CFDI, timbrado y cancelación

// 🔑 Configuración de Facturama
export interface FacturamaConfig {
  proveedor: string;
  facturamaUsuario: string;
  facturamaPassword: string;
  facturamaApiUrl: string;
  esSandbox: boolean;
  urlSandbox?: string;
  timeoutMs: number;
  reintentos: number;
  habilitado: boolean;
}

// 🎯 Resultado de operación con Facturama
export interface FacturamaResult {
  success: boolean;
  uuid?: string;
  xml?: string;
  pdf?: string;
  pacData?: any;
  processingTime?: number;
  error?: string;
  errorCode?: string;
  details?: any;
}

// 📄 Datos para crear CFDI
export interface CFDIData {
  folio: string;
  serie: string;
  fecha: string;
  metodoPago: string;
  formaPago: string;
  condicionesDePago?: string;
  moneda: string;
  tipoCambio?: number;
  
  emisor: {
    rfc: string;
    nombre: string;
    regimenFiscal: string;
  };
  
  receptor: {
    rfc: string;
    nombre: string;
    usoCFDI: string;
    domicilioFiscalReceptor?: string;
    regimenFiscalReceptor?: string;
  };
  
  conceptos: Array<{
    claveProdServ: string;
    noIdentificacion?: string;
    cantidad: number;
    claveUnidad: string;
    unidad: string;
    descripcion: string;
    valorUnitario: number;
    importe: number;
    descuento?: number;
    objetoImp: string;
    impuestos?: {
      traslados?: any[];
      retenciones?: any[];
    };
  }>;
  
  impuestos?: {
    totalImpuestosTrasladados?: number;
    totalImpuestosRetenidos?: number;
    traslados?: any[];
    retenciones?: any[];
  };
  
  subtotal: number;
  descuento?: number;
  total: number;
}

export class FacturamaService {
  private config: FacturamaConfig | null = null;
  private authToken: string | null = null;
  private tokenExpiration: Date | null = null;

  // ⚙️ Configurar servicio
  configurar(config: FacturamaConfig): void {
    this.config = {
      ...config,
      facturamaApiUrl: config.esSandbox && config.urlSandbox 
        ? config.urlSandbox 
        : config.facturamaApiUrl
    };
    
    // Limpiar token al cambiar configuración
    this.authToken = null;
    this.tokenExpiration = null;
  }

  // 🔐 Autenticación con Facturama
  private async autenticar(): Promise<boolean> {
    try {
      if (!this.config) {
        throw new Error('Configuración de Facturama no establecida');
      }

      // Verificar si el token actual sigue válido
      if (this.authToken && this.tokenExpiration && this.tokenExpiration > new Date()) {
        return true;
      }

      const credentials = Buffer.from(
        `${this.config.facturamaUsuario}:${this.config.facturamaPassword}`
      ).toString('base64');

      const response = await fetch(`${this.config.facturamaApiUrl}/api/login`, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${credentials}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`Error de autenticación Facturama: ${response.status} - ${errorData}`);
      }

      const data = await response.json();
      
      this.authToken = data.access_token;
      
      // El token de Facturama típicamente expira en 24 horas
      this.tokenExpiration = new Date();
      this.tokenExpiration.setHours(this.tokenExpiration.getHours() + 23); // 23 horas para estar seguros

      return true;

    } catch (error: any) {
      console.error('Error en autenticación Facturama:', error);
      this.authToken = null;
      this.tokenExpiration = null;
      throw error;
    }
  }

  // 🧾 Timbrar factura en Facturama
  async timbrarFactura(factura: any): Promise<FacturamaResult> {
    const startTime = Date.now();

    try {
      if (!this.config || !this.config.habilitado) {
        return {
          success: false,
          error: 'Servicio de Facturama no configurado o deshabilitado'
        };
      }

      // Autenticar
      await this.autenticar();

      // Construir datos del CFDI
      const cfdiData = this.construirCFDIData(factura);

      // Validar datos antes de enviar
      const validationErrors = this.validarCFDIData(cfdiData);
      if (validationErrors.length > 0) {
        return {
          success: false,
          error: 'Datos del CFDI inválidos',
          details: validationErrors
        };
      }

      // Enviar a Facturama
      const resultado = await this.enviarAFacturama(cfdiData);
      
      resultado.processingTime = Date.now() - startTime;
      return resultado;

    } catch (error: any) {
      console.error('Error al timbrar factura:', error);
      
      return {
        success: false,
        error: error.message,
        errorCode: error.code || 'UNKNOWN_ERROR',
        processingTime: Date.now() - startTime
      };
    }
  }

  // 📤 Enviar CFDI a Facturama
  private async enviarAFacturama(cfdiData: CFDIData): Promise<FacturamaResult> {
    try {
      if (!this.authToken) {
        throw new Error('Token de autenticación no disponible');
      }

      const response = await fetch(`${this.config!.facturamaApiUrl}/api/cfdi`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.authToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(cfdiData)
      });

      const responseData = await response.json();

      if (response.ok) {
        // Timbrado exitoso
        return {
          success: true,
          uuid: responseData.Uuid,
          xml: responseData.Xml,
          pdf: responseData.Pdf,
          pacData: {
            nombre: 'Facturama',
            certificadoSAT: responseData.NoCertificadoSAT,
            noCertificadoSAT: responseData.NoCertificadoSAT,
            fechaTimbrado: new Date(responseData.FechaTimbrado),
            selloCFD: responseData.SelloCFD,
            selloSAT: responseData.SelloSAT,
            cadenaOriginalSAT: responseData.CadenaOriginalSAT
          }
        };
      } else {
        // Error en timbrado
        const errorMessage = this.procesarErrorFacturama(responseData);
        
        return {
          success: false,
          error: errorMessage,
          errorCode: responseData.ErrorCode || response.status.toString(),
          details: responseData
        };
      }

    } catch (error: any) {
      console.error('Error enviando a Facturama:', error);
      
      return {
        success: false,
        error: `Error de comunicación con Facturama: ${error.message}`,
        errorCode: 'NETWORK_ERROR'
      };
    }
  }

  // 🗑️ Cancelar CFDI en Facturama
  async cancelarFactura(uuid: string, motivo: string = '02'): Promise<FacturamaResult> {
    try {
      if (!this.config || !this.config.habilitado) {
        return {
          success: false,
          error: 'Servicio de Facturama no configurado'
        };
      }

      await this.autenticar();

      const cancelData = {
        Uuid: uuid,
        Motivo: motivo // 02 = Comprobante emitido con errores con relación
      };

      const response = await fetch(`${this.config.facturamaApiUrl}/api/cfdi/cancel`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.authToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(cancelData)
      });

      const responseData = await response.json();

      if (response.ok) {
        return {
          success: true,
          details: responseData
        };
      } else {
        return {
          success: false,
          error: this.procesarErrorFacturama(responseData),
          errorCode: responseData.ErrorCode || response.status.toString()
        };
      }

    } catch (error: any) {
      console.error('Error cancelando factura:', error);
      
      return {
        success: false,
        error: error.message,
        errorCode: 'CANCEL_ERROR'
      };
    }
  }

  // 🔍 Consultar estado de CFDI
  async consultarEstado(uuid: string): Promise<FacturamaResult> {
    try {
      await this.autenticar();

      const response = await fetch(`${this.config!.facturamaApiUrl}/api/cfdi/${uuid}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.authToken}`,
          'Content-Type': 'application/json'
        }
      });

      const responseData = await response.json();

      if (response.ok) {
        return {
          success: true,
          details: responseData
        };
      } else {
        return {
          success: false,
          error: this.procesarErrorFacturama(responseData)
        };
      }

    } catch (error: any) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  // 🏗️ Construir datos del CFDI desde factura
  private construirCFDIData(factura: any): CFDIData {
    return {
      folio: factura.folio,
      serie: factura.serie,
      fecha: factura.fechaEmision.toISOString(),
      metodoPago: factura.metodoPago || 'PUE',
      formaPago: factura.formaPago || '99',
      condicionesDePago: factura.condicionesDePago,
      moneda: factura.moneda,
      tipoCambio: factura.tipoCambio !== 1 ? factura.tipoCambio : undefined,
      
      emisor: {
        rfc: factura.emisor.rfc,
        nombre: factura.emisor.nombre,
        regimenFiscal: factura.emisor.regimenFiscal
      },
      
      receptor: {
        rfc: factura.receptor.rfc,
        nombre: factura.receptor.nombre,
        usoCFDI: factura.receptor.usoCFDI,
        domicilioFiscalReceptor: factura.receptor.codigoPostal,
        regimenFiscalReceptor: factura.receptor.regimenFiscalReceptor || '616'
      },
      
      conceptos: factura.conceptos.map((concepto: any) => ({
        claveProdServ: concepto.claveProdServ || '01010101',
        noIdentificacion: concepto.noIdentificacion,
        cantidad: concepto.cantidad,
        claveUnidad: concepto.claveUnidad || 'H87',
        unidad: concepto.unidad || 'Pieza',
        descripcion: concepto.descripcion,
        valorUnitario: concepto.valorUnitario,
        importe: concepto.importe,
        descuento: concepto.descuento || 0,
        objetoImp: concepto.objetoImp || '02',
        impuestos: concepto.impuestos
      })),
      
      impuestos: factura.impuestos ? {
        totalImpuestosTrasladados: factura.impuestos.totalImpuestosTrasladados,
        totalImpuestosRetenidos: factura.impuestos.totalImpuestosRetenidos
      } : undefined,
      
      subtotal: factura.subtotal,
      descuento: factura.descuento || 0,
      total: factura.total
    };
  }

  // ✅ Validar datos del CFDI
  private validarCFDIData(cfdiData: CFDIData): string[] {
    const errores: string[] = [];

    // Validaciones básicas
    if (!cfdiData.folio) errores.push('Folio requerido');
    if (!cfdiData.serie) errores.push('Serie requerida');
    if (!cfdiData.emisor.rfc) errores.push('RFC del emisor requerido');
    if (!cfdiData.receptor.rfc) errores.push('RFC del receptor requerido');
    if (!cfdiData.conceptos || cfdiData.conceptos.length === 0) {
      errores.push('Al menos un concepto requerido');
    }

    // Validar RFC format (básico)
    const rfcRegex = /^[A-ZÑ&]{3,4}[0-9]{6}[A-Z0-9]{3}$/;
    if (cfdiData.emisor.rfc && !rfcRegex.test(cfdiData.emisor.rfc)) {
      errores.push('RFC del emisor inválido');
    }
    if (cfdiData.receptor.rfc && !rfcRegex.test(cfdiData.receptor.rfc)) {
      errores.push('RFC del receptor inválido');
    }

    // Validar importes
    if (cfdiData.total <= 0) errores.push('Total debe ser mayor a 0');
    if (cfdiData.subtotal <= 0) errores.push('Subtotal debe ser mayor a 0');

    // Validar conceptos
    cfdiData.conceptos.forEach((concepto, index) => {
      if (!concepto.descripcion) errores.push(`Descripción requerida en concepto ${index + 1}`);
      if (concepto.cantidad <= 0) errores.push(`Cantidad inválida en concepto ${index + 1}`);
      if (concepto.valorUnitario <= 0) errores.push(`Valor unitario inválido en concepto ${index + 1}`);
    });

    return errores;
  }

  // ❌ Procesar errores de Facturama
  private procesarErrorFacturama(errorData: any): string {
    if (typeof errorData === 'string') {
      return errorData;
    }

    // Errores específicos de Facturama
    const errorMessages: Record<string, string> = {
      'CFDI33001': 'RFC del emisor no válido',
      'CFDI33002': 'RFC del receptor no válido',
      'CFDI33003': 'Fecha de emisión no válida',
      'CFDI33004': 'Forma de pago no válida',
      'CFDI33005': 'Método de pago no válido',
      'CFDI33006': 'Uso de CFDI no válido',
      'CFDI33007': 'Moneda no válida',
      'CFDI33008': 'Tipo de cambio no válido',
      'CFDI33009': 'Régimen fiscal no válido',
      'CFDI33010': 'Código postal no válido'
    };

    const errorCode = errorData.ErrorCode || errorData.Code;
    if (errorCode && errorMessages[errorCode]) {
      return errorMessages[errorCode];
    }

    // Fallback a mensaje genérico
    return errorData.Message || 
           errorData.ErrorMessage || 
           errorData.error || 
           'Error desconocido de Facturama';
  }

  // 🔄 Reintentar operación
  async reintentarConReintento<T>(
    operacion: () => Promise<T>,
    maxReintentos: number = 3,
    delayMs: number = 1000
  ): Promise<T> {
    let ultimoError: Error;

    for (let intento = 0; intento < maxReintentos; intento++) {
      try {
        return await operacion();
      } catch (error: any) {
        ultimoError = error;
        
        if (intento < maxReintentos - 1) {
          // Delay antes del siguiente intento
          await new Promise(resolve => setTimeout(resolve, delayMs * Math.pow(2, intento)));
        }
      }
    }

    throw ultimoError!;
  }

  // 📊 Validar conexión con Facturama
  async validarConexion(): Promise<{ success: boolean; message: string }> {
    try {
      if (!this.config) {
        return { success: false, message: 'Configuración no establecida' };
      }

      const resultado = await this.autenticar();
      
      if (resultado) {
        return { success: true, message: 'Conexión exitosa con Facturama' };
      } else {
        return { success: false, message: 'Error de autenticación' };
      }

    } catch (error: any) {
      return { 
        success: false, 
        message: `Error de conexión: ${error.message}` 
      };
    }
  }

  // 🧹 Limpiar tokens (útil para logout)
  limpiarSesion(): void {
    this.authToken = null;
    this.tokenExpiration = null;
  }
}

export default FacturamaService;
