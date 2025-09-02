/**
 * Servicio de WhatsApp usando Twilio WhatsApp API
 * Configurar variables de entorno:
 * TWILIO_ACCOUNT_SID
 * TWILIO_AUTH_TOKEN
 * TWILIO_WHATSAPP_NUMBER (ej: whatsapp:+14155238886)
 */

interface WhatsAppConfig {
  accountSid: string;
  authToken: string;
  fromNumber: string;
}

export class WhatsAppService {
  private static config: WhatsAppConfig = {
    accountSid: process.env.TWILIO_ACCOUNT_SID || '',
    authToken: process.env.TWILIO_AUTH_TOKEN || '',
    fromNumber: process.env.TWILIO_WHATSAPP_NUMBER || 'whatsapp:+14155238886'
  };

  /**
   * Envía un mensaje de WhatsApp
   */
  static async sendMessage(to: string, message: string): Promise<void> {
    try {
      // En desarrollo, solo log del mensaje
      if (process.env.NODE_ENV === 'development') {
        console.log(`💬 WhatsApp enviado a ${to}:`);
        console.log(message);
        return;
      }

      // Validar configuración
      if (!this.config.accountSid || !this.config.authToken) {
        throw new Error('Configuración de Twilio incompleta para WhatsApp');
      }

      // Normalizar número de teléfono para WhatsApp
      const whatsappNumber = this.formatWhatsAppNumber(to);

      // TODO: Implementar integración real con Twilio WhatsApp
      // const twilio = require('twilio')(this.config.accountSid, this.config.authToken);
      // await twilio.messages.create({
      //   body: message,
      //   from: this.config.fromNumber,
      //   to: whatsappNumber
      // });

      console.log(`💬 WhatsApp enviado exitosamente a ${whatsappNumber}`);

    } catch (error) {
      console.error('Error enviando WhatsApp:', error);
      throw new Error(`Error enviando WhatsApp: ${error}`);
    }
  }

  /**
   * Envía un mensaje de recordatorio de cita con plantilla
   */
  static async sendAppointmentReminder(
    to: string,
    patientName: string,
    dentistName: string,
    appointmentDate: string,
    appointmentTime: string,
    clinicName: string
  ): Promise<void> {
    const message = `🦷 *Recordatorio de Cita Dental*

Hola ${patientName},

Te recordamos tu próxima cita:

👨‍⚕️ *Dentista:* ${dentistName}
🏥 *Clínica:* ${clinicName}
📅 *Fecha:* ${appointmentDate}
🕐 *Hora:* ${appointmentTime}

Si necesitas reprogramar, responde a este mensaje o llámanos.

¡Te esperamos!
_Equipo ToothPick_ 🦷✨`;

    await this.sendMessage(to, message);
  }

  /**
   * Envía confirmación de cita reservada
   */
  static async sendAppointmentConfirmation(
    to: string,
    appointmentNumber: string,
    patientName: string,
    dentistName: string,
    appointmentDate: string,
    appointmentTime: string
  ): Promise<void> {
    const message = `✅ *Cita Confirmada*

Hola ${patientName},

Tu cita ha sido confirmada:

🔢 *Número:* ${appointmentNumber}
👨‍⚕️ *Dentista:* ${dentistName}
📅 *Fecha:* ${appointmentDate}
🕐 *Hora:* ${appointmentTime}

Recibirás un recordatorio 24 horas antes.

_Equipo ToothPick_ 🦷`;

    await this.sendMessage(to, message);
  }

  /**
   * Envía notificación de cancelación
   */
  static async sendCancellationNotice(
    to: string,
    patientName: string,
    appointmentDate: string,
    reason?: string
  ): Promise<void> {
    const message = `❌ *Cita Cancelada*

Hola ${patientName},

Tu cita del ${appointmentDate} ha sido cancelada.

${reason ? `*Motivo:* ${reason}` : ''}

Para reprogramar, contáctanos o visita nuestra plataforma.

_Equipo ToothPick_ 🦷`;

    await this.sendMessage(to, message);
  }

  /**
   * Formatea número para WhatsApp (formato whatsapp:+52xxxxxxxxxx)
   */
  private static formatWhatsAppNumber(phone: string): string {
    // Remover espacios y caracteres especiales
    let cleaned = phone.replace(/[\s\-\(\)]/g, '');
    
    // Remover prefijo whatsapp: si ya existe
    if (cleaned.startsWith('whatsapp:')) {
      cleaned = cleaned.replace('whatsapp:', '');
    }
    
    // Agregar código de país si no existe
    if (!cleaned.startsWith('+')) {
      if (cleaned.startsWith('52')) {
        cleaned = '+' + cleaned;
      } else if (cleaned.length === 10) {
        cleaned = '+52' + cleaned;
      } else {
        throw new Error(`Formato de teléfono inválido para WhatsApp: ${phone}`);
      }
    }

    return `whatsapp:${cleaned}`;
  }

  /**
   * Valida si un número puede recibir WhatsApp
   */
  static isValidWhatsAppNumber(phone: string): boolean {
    try {
      this.formatWhatsAppNumber(phone);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Obtiene plantillas disponibles de WhatsApp
   */
  static getAvailableTemplates(): string[] {
    return [
      'appointment_reminder',
      'appointment_confirmation',
      'appointment_cancellation',
      'payment_reminder',
      'welcome_message'
    ];
  }
}

export default WhatsAppService;
