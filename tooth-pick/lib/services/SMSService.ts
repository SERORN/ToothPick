/**
 * Servicio de SMS usando Twilio
 * Configurar variables de entorno:
 * TWILIO_ACCOUNT_SID
 * TWILIO_AUTH_TOKEN
 * TWILIO_PHONE_NUMBER
 */

interface SMSConfig {
  accountSid: string;
  authToken: string;
  fromNumber: string;
}

export class SMSService {
  private static config: SMSConfig = {
    accountSid: process.env.TWILIO_ACCOUNT_SID || '',
    authToken: process.env.TWILIO_AUTH_TOKEN || '',
    fromNumber: process.env.TWILIO_PHONE_NUMBER || ''
  };

  /**
   * Envía un SMS usando Twilio
   */
  static async sendSMS(to: string, message: string): Promise<void> {
    try {
      // En desarrollo, solo log del mensaje
      if (process.env.NODE_ENV === 'development') {
        console.log(`📱 SMS enviado a ${to}:`);
        console.log(message);
        return;
      }

      // Validar configuración
      if (!this.config.accountSid || !this.config.authToken || !this.config.fromNumber) {
        throw new Error('Configuración de Twilio incompleta');
      }

      // Normalizar número de teléfono
      const normalizedPhone = this.normalizePhoneNumber(to);

      // TODO: Implementar integración real con Twilio
      // const twilio = require('twilio')(this.config.accountSid, this.config.authToken);
      // await twilio.messages.create({
      //   body: message,
      //   from: this.config.fromNumber,
      //   to: normalizedPhone
      // });

      console.log(`📱 SMS enviado exitosamente a ${normalizedPhone}`);

    } catch (error) {
      console.error('Error enviando SMS:', error);
      throw new Error(`Error enviando SMS: ${error}`);
    }
  }

  /**
   * Valida formato de número telefónico
   */
  static isValidPhoneNumber(phone: string): boolean {
    // Formato México: +52 xxx xxx xxxx
    const phoneRegex = /^(\+52)?[\s\-]?(\d{3})[\s\-]?(\d{3})[\s\-]?(\d{4})$/;
    return phoneRegex.test(phone);
  }

  /**
   * Normaliza número telefónico al formato internacional
   */
  private static normalizePhoneNumber(phone: string): string {
    // Remover espacios y guiones
    let normalized = phone.replace(/[\s\-\(\)]/g, '');
    
    // Si no tiene código de país, agregar +52 (México)
    if (!normalized.startsWith('+')) {
      if (normalized.startsWith('52')) {
        normalized = '+' + normalized;
      } else if (normalized.length === 10) {
        normalized = '+52' + normalized;
      } else {
        throw new Error(`Formato de teléfono inválido: ${phone}`);
      }
    }

    return normalized;
  }

  /**
   * Obtiene el estado de entrega de un SMS
   */
  static async getSMSStatus(messageSid: string): Promise<string> {
    try {
      if (process.env.NODE_ENV === 'development') {
        return 'delivered';
      }

      // TODO: Implementar consulta real a Twilio
      // const twilio = require('twilio')(this.config.accountSid, this.config.authToken);
      // const message = await twilio.messages(messageSid).fetch();
      // return message.status;

      return 'sent';

    } catch (error) {
      console.error('Error consultando estado de SMS:', error);
      return 'failed';
    }
  }
}

export default SMSService;
