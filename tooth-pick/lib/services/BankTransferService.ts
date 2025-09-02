// 🏦 FASE 29: Servicio de Transferencias Bancarias Internacionales
// ✅ SPEI, SWIFT, Pix, y transferencias bancarias tradicionales

export interface BankTransferAccountData {
  bankName?: string;
  bankCode?: string;
  accountNumber?: string;
  routingNumber?: string;
  swiftCode?: string;
  iban?: string;
  clabe?: string; // SPEI México
  pixKey?: string; // Pix Brasil
  pixKeyType?: 'email' | 'phone' | 'cpf' | 'random';
  instructions?: string;
}

export interface BankTransferResult {
  success: boolean;
  paymentLink?: string;
  externalId?: string;
  instructions?: string;
  expiresAt?: Date;
  error?: string;
}

export class BankTransferService {
  
  /**
   * 🚀 Generar instrucciones de transferencia
   */
  async generateInstructions(
    method: 'bank_transfer' | 'swift' | 'spei' | 'pix',
    amount: number,
    currency: string,
    referenceCode: string,
    accountData: BankTransferAccountData
  ): Promise<BankTransferResult> {
    try {
      switch (method) {
        case 'spei':
          return this.generateSPEIInstructions(amount, currency, referenceCode, accountData);
        
        case 'pix':
          return this.generatePixInstructions(amount, currency, referenceCode, accountData);
        
        case 'swift':
          return this.generateSWIFTInstructions(amount, currency, referenceCode, accountData);
        
        case 'bank_transfer':
          return this.generateBankTransferInstructions(amount, currency, referenceCode, accountData);
        
        default:
          return {
            success: false,
            error: 'Método de transferencia no soportado'
          };
      }
    } catch (error) {
      console.error('Error generando instrucciones de transferencia:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error generando instrucciones'
      };
    }
  }

  /**
   * 💸 SPEI - Sistema de Pagos Electrónicos Interbancarios (México)
   */
  private async generateSPEIInstructions(
    amount: number,
    currency: string,
    referenceCode: string,
    accountData: BankTransferAccountData
  ): Promise<BankTransferResult> {
    if (currency !== 'MXN') {
      return {
        success: false,
        error: 'SPEI solo acepta pesos mexicanos (MXN)'
      };
    }

    if (!accountData.clabe) {
      return {
        success: false,
        error: 'CLABE es requerida para transferencias SPEI'
      };
    }

    // Validar CLABE (18 dígitos)
    if (!/^\d{18}$/.test(accountData.clabe)) {
      return {
        success: false,
        error: 'CLABE debe tener exactamente 18 dígitos'
      };
    }

    const instructions = `
**INSTRUCCIONES DE TRANSFERENCIA SPEI**

📧 Referencia: ${referenceCode}
💰 Monto: $${amount.toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN
🏦 Banco: ${accountData.bankName || 'No especificado'}
🔢 CLABE: ${accountData.clabe}
📝 Concepto: ToothPick - ${referenceCode}

**IMPORTANTE:**
- La transferencia debe realizarse en un plazo máximo de 24 horas
- Incluir la referencia "${referenceCode}" en el concepto
- El pago se acreditará automáticamente al confirmar la transferencia
- Conservar el comprobante de transferencia
- Horario SPEI: 24/7 todos los días del año

**PASOS:**
1. Ingresa a tu banca en línea o app móvil
2. Selecciona "Transferencia SPEI"
3. Captura la CLABE: ${accountData.clabe}
4. Monto exacto: $${amount.toFixed(2)} MXN
5. Concepto: ToothPick - ${referenceCode}
6. Confirma la transferencia

¿Problemas? Contacta soporte con tu referencia: ${referenceCode}
    `.trim();

    return {
      success: true,
      instructions,
      externalId: `SPEI-${referenceCode}`,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 horas
    };
  }

  /**
   * 🇧🇷 Pix - Sistema de Pagos Instantáneos de Brasil
   */
  private async generatePixInstructions(
    amount: number,
    currency: string,
    referenceCode: string,
    accountData: BankTransferAccountData
  ): Promise<BankTransferResult> {
    if (currency !== 'BRL') {
      return {
        success: false,
        error: 'Pix solo acepta reales brasileños (BRL)'
      };
    }

    if (!accountData.pixKey || !accountData.pixKeyType) {
      return {
        success: false,
        error: 'Chave Pix y tipo son requeridos'
      };
    }

    const pixKeyTypeNames = {
      email: 'E-mail',
      phone: 'Telefone',
      cpf: 'CPF',
      random: 'Chave Aleatória'
    };

    const instructions = `
**INSTRUÇÕES DE PAGAMENTO PIX**

📧 Referência: ${referenceCode}
💰 Valor: R$ ${amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
🔑 Chave Pix: ${accountData.pixKey}
📱 Tipo: ${pixKeyTypeNames[accountData.pixKeyType]}
📝 Descrição: ToothPick - ${referenceCode}

**IMPORTANTE:**
- Pagamento deve ser realizado em até 30 minutos
- Incluir a referência "${referenceCode}" na descrição
- Pix funciona 24h por dia, 7 dias por semana
- Transferência instantânea
- Guardar comprovante do pagamento

**COMO PAGAR:**
1. Abra seu app bancário ou carteira digital
2. Selecione "Pix"
3. Escolha "Pagar com chave"
4. Digite a chave: ${accountData.pixKey}
5. Valor exato: R$ ${amount.toFixed(2)}
6. Descrição: ToothPick - ${referenceCode}
7. Confirme o pagamento

**Ou escaneie o QR Code no app do seu banco**

Problemas? Entre em contato com sua referência: ${referenceCode}
    `.trim();

    return {
      success: true,
      instructions,
      externalId: `PIX-${referenceCode}`,
      expiresAt: new Date(Date.now() + 30 * 60 * 1000) // 30 minutos
    };
  }

  /**
   * 🌍 SWIFT - Transferencias Internacionales
   */
  private async generateSWIFTInstructions(
    amount: number,
    currency: string,
    referenceCode: string,
    accountData: BankTransferAccountData
  ): Promise<BankTransferResult> {
    if (!accountData.swiftCode || !accountData.accountNumber) {
      return {
        success: false,
        error: 'Código SWIFT y número de cuenta son requeridos'
      };
    }

    const instructions = `
**INTERNATIONAL WIRE TRANSFER INSTRUCTIONS**

📧 Reference: ${referenceCode}
💰 Amount: ${amount.toLocaleString('en-US', { minimumFractionDigits: 2 })} ${currency}
🏦 Bank: ${accountData.bankName || 'Not specified'}
🔢 SWIFT Code: ${accountData.swiftCode}
💳 Account Number: ${accountData.accountNumber}
${accountData.iban ? `💶 IBAN: ${accountData.iban}` : ''}
📝 Payment Reference: ToothPick - ${referenceCode}

**BENEFICIARY DETAILS:**
- Name: ToothPick Services
- Address: [To be provided]
- Account Number: ${accountData.accountNumber}
${accountData.iban ? `- IBAN: ${accountData.iban}` : ''}

**INTERMEDIARY BANK (if required):**
- Will be provided upon request

**IMPORTANT NOTES:**
- Transfer must be completed within 5 business days
- Include reference "${referenceCode}" in payment details
- Wire transfer fees may apply (sender's responsibility)
- Processing time: 1-3 business days
- Provide confirmation once transfer is sent

**REQUIRED INFORMATION FOR YOUR BANK:**
1. Beneficiary Bank: ${accountData.bankName}
2. SWIFT Code: ${accountData.swiftCode}
3. Account Number: ${accountData.accountNumber}
4. Amount: ${amount} ${currency}
5. Purpose: Payment for services - ${referenceCode}

Contact support with reference: ${referenceCode}
    `.trim();

    return {
      success: true,
      instructions,
      externalId: `SWIFT-${referenceCode}`,
      expiresAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000) // 5 días
    };
  }

  /**
   * 🏦 Transferencia Bancaria Local
   */
  private async generateBankTransferInstructions(
    amount: number,
    currency: string,
    referenceCode: string,
    accountData: BankTransferAccountData
  ): Promise<BankTransferResult> {
    if (!accountData.accountNumber || !accountData.bankName) {
      return {
        success: false,
        error: 'Número de cuenta y nombre del banco son requeridos'
      };
    }

    const instructions = `
**INSTRUCCIONES DE TRANSFERENCIA BANCARIA**

📧 Referencia: ${referenceCode}
💰 Monto: ${amount.toLocaleString()} ${currency}
🏦 Banco: ${accountData.bankName}
🔢 Número de Cuenta: ${accountData.accountNumber}
${accountData.routingNumber ? `📍 Código de Ruta: ${accountData.routingNumber}` : ''}
📝 Concepto: ToothPick - ${referenceCode}

**DATOS DEL BENEFICIARIO:**
- Nombre: ToothPick Services
- Cuenta: ${accountData.accountNumber}
${accountData.routingNumber ? `- Routing: ${accountData.routingNumber}` : ''}

**IMPORTANTE:**
- Realizar la transferencia en un plazo máximo de 3 días hábiles
- Incluir la referencia "${referenceCode}" en el concepto
- Conservar el comprobante de transferencia
- Tiempo de procesamiento: 1-2 días hábiles
- Comisiones bancarias pueden aplicar

**PASOS PARA TRANSFERIR:**
1. Contacta tu banco o visita sucursal
2. Solicita transferencia bancaria
3. Proporciona los datos del beneficiario
4. Monto exacto: ${amount} ${currency}
5. Concepto: ToothPick - ${referenceCode}
6. Envía comprobante de transferencia

${accountData.instructions ? `\n**INSTRUCCIONES ADICIONALES:**\n${accountData.instructions}` : ''}

Soporte: Contacta con referencia ${referenceCode}
    `.trim();

    return {
      success: true,
      instructions,
      externalId: `BANK-${referenceCode}`,
      expiresAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000) // 3 días
    };
  }

  /**
   * ✅ Verificar pago de transferencia bancaria
   */
  async verifyPayment(
    externalId: string,
    metadata?: any
  ): Promise<{ success: boolean; error?: string }> {
    // Las transferencias bancarias requieren verificación manual o integración
    // con sistemas bancarios específicos
    
    // Por ahora, retornamos false indicando que requiere verificación manual
    return {
      success: false,
      error: 'Verificación manual requerida para transferencias bancarias'
    };
  }

  /**
   * 💸 Iniciar reembolso de transferencia bancaria
   */
  async initiateRefund(
    externalId: string,
    amount: number,
    reason: string
  ): Promise<{ success: boolean; refundId?: string; error?: string }> {
    // Los reembolsos de transferencias bancarias requieren proceso manual
    const refundId = `REFUND-${externalId}-${Date.now()}`;
    
    return {
      success: true,
      refundId,
      error: 'Reembolso de transferencia bancaria requiere procesamiento manual'
    };
  }

  /**
   * 🔍 Validar datos de cuenta bancaria
   */
  validateAccountData(
    method: string,
    accountData: BankTransferAccountData
  ): { valid: boolean; error?: string } {
    switch (method) {
      case 'spei':
        if (!accountData.clabe) {
          return { valid: false, error: 'CLABE es requerida para SPEI' };
        }
        if (!/^\d{18}$/.test(accountData.clabe)) {
          return { valid: false, error: 'CLABE debe tener 18 dígitos' };
        }
        break;

      case 'pix':
        if (!accountData.pixKey || !accountData.pixKeyType) {
          return { valid: false, error: 'Chave Pix y tipo son requeridos' };
        }
        if (!['email', 'phone', 'cpf', 'random'].includes(accountData.pixKeyType)) {
          return { valid: false, error: 'Tipo de chave Pix inválido' };
        }
        break;

      case 'swift':
        if (!accountData.swiftCode) {
          return { valid: false, error: 'Código SWIFT es requerido' };
        }
        if (!/^[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?$/.test(accountData.swiftCode)) {
          return { valid: false, error: 'Formato de código SWIFT inválido' };
        }
        if (!accountData.accountNumber) {
          return { valid: false, error: 'Número de cuenta es requerido' };
        }
        break;

      case 'bank_transfer':
        if (!accountData.accountNumber || !accountData.bankName) {
          return { valid: false, error: 'Número de cuenta y banco son requeridos' };
        }
        break;

      default:
        return { valid: false, error: 'Método de transferencia no soportado' };
    }

    return { valid: true };
  }

  /**
   * 🌍 Obtener métodos disponibles por país
   */
  getAvailableMethodsByCountry(country: string): string[] {
    const methodsByCountry: Record<string, string[]> = {
      'MX': ['spei', 'bank_transfer'],
      'BR': ['pix', 'bank_transfer'],
      'US': ['bank_transfer', 'swift'],
      'CA': ['bank_transfer', 'swift'],
      'GB': ['bank_transfer', 'swift'],
      'DE': ['bank_transfer', 'swift'],
      'FR': ['bank_transfer', 'swift'],
      'ES': ['bank_transfer', 'swift'],
      'IT': ['bank_transfer', 'swift'],
      'NL': ['bank_transfer', 'swift'],
      'AU': ['bank_transfer', 'swift'],
      'JP': ['bank_transfer', 'swift'],
      'AR': ['bank_transfer', 'swift'],
      'CO': ['bank_transfer', 'swift'],
      'PE': ['bank_transfer', 'swift'],
      'CL': ['bank_transfer', 'swift'],
      'UY': ['bank_transfer', 'swift'],
    };

    return methodsByCountry[country] || ['bank_transfer', 'swift'];
  }

  /**
   * ⏰ Obtener tiempo de procesamiento estimado
   */
  getProcessingTime(method: string): string {
    const processingTimes: Record<string, string> = {
      'spei': 'Inmediato (24/7)',
      'pix': 'Inmediato (24/7)',
      'swift': '1-3 días hábiles',
      'bank_transfer': '1-2 días hábiles'
    };

    return processingTimes[method] || '1-3 días hábiles';
  }

  /**
   * 💰 Obtener límites por método
   */
  getMethodLimits(method: string, currency: string): { min: number; max: number } {
    const limits: Record<string, Record<string, { min: number; max: number }>> = {
      'spei': {
        'MXN': { min: 1, max: 999999 }
      },
      'pix': {
        'BRL': { min: 0.01, max: 1000000 }
      },
      'swift': {
        'USD': { min: 1, max: 1000000 },
        'EUR': { min: 1, max: 1000000 },
        'GBP': { min: 1, max: 1000000 }
      },
      'bank_transfer': {
        'USD': { min: 1, max: 500000 },
        'MXN': { min: 1, max: 500000 },
        'EUR': { min: 1, max: 500000 }
      }
    };

    return limits[method]?.[currency] || { min: 1, max: 100000 };
  }

  /**
   * 📊 Generar QR Code para Pix (placeholder)
   */
  generatePixQRCode(
    pixKey: string,
    amount: number,
    description: string
  ): { success: boolean; qrCode?: string; error?: string } {
    // Placeholder para generación de QR Code Pix
    // Requiere implementación específica según especificación Banco Central do Brasil
    
    return {
      success: false,
      error: 'Generación de QR Code Pix requiere implementación específica'
    };
  }
}

export default BankTransferService;
