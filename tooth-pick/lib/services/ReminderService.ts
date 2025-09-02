import connectDB from '@/lib/db';
import Appointment from '@/lib/models/Appointment';
import User from '@/lib/models/User';
import EmailService from './EmailService';
// import { SMSService } from './SMSService';
// import { WhatsAppService } from './WhatsAppService';

export interface ReminderConfig {
  maxAttempts: number;
  retryDelayHours: number;
  defaultHoursBefore: number;
}

const DEFAULT_CONFIG: ReminderConfig = {
  maxAttempts: 3,
  retryDelayHours: 2,
  defaultHoursBefore: 24
};

export class ReminderService {
  private config: ReminderConfig;

  constructor(config: ReminderConfig = DEFAULT_CONFIG) {
    this.config = config;
  }

  /**
   * Envía recordatorios para citas del día siguiente
   */
  async sendUpcomingAppointmentReminders(): Promise<{
    sent: number;
    failed: number;
    skipped: number;
  }> {
    await connectDB();

    const tomorrow = this.getTomorrow();
    const stats = { sent: 0, failed: 0, skipped: 0 };

    try {
      // Obtener citas que necesitan recordatorio
      const appointments = await this.getAppointmentsNeedingReminder(tomorrow);
      
      console.log(`📅 Procesando ${appointments.length} citas para recordatorios`);

      for (const appointment of appointments) {
        try {
          await this.sendReminderForAppointment(appointment);
          stats.sent++;
        } catch (error) {
          console.error(`❌ Error enviando recordatorio para cita ${appointment.appointmentNumber}:`, error);
          await this.markReminderFailed(appointment, error as Error);
          stats.failed++;
        }
      }

      console.log(`✅ Recordatorios procesados: ${stats.sent} enviados, ${stats.failed} fallidos, ${stats.skipped} omitidos`);
      return stats;

    } catch (error) {
      console.error('💥 Error en el servicio de recordatorios:', error);
      throw error;
    }
  }

  /**
   * Envía recordatorio para una cita específica
   */
  async sendReminderForAppointment(appointment: any): Promise<void> {
    // Obtener información del paciente y dentista
    const patient = await User.findById(appointment.patientId);
    const dentist = await User.findById(appointment.dentistId);

    if (!patient || !dentist) {
      throw new Error('Paciente o dentista no encontrado');
    }

    // Determinar método de recordatorio preferido
    const reminderType = patient.prefersReminderBy || 'email';
    const contactInfo = this.getPatientContactInfo(patient, appointment);

    // Generar mensaje personalizado
    const message = this.generateReminderMessage(appointment, patient, dentist);

    // Enviar recordatorio según el tipo
    await this.sendReminder(reminderType, contactInfo, message, appointment);

    // Actualizar estado del recordatorio
    await this.markReminderSent(appointment, reminderType);
  }

  /**
   * Reintenta enviar recordatorios fallidos
   */
  async retryFailedReminders(): Promise<{ retried: number; failed: number }> {
    await connectDB();

    const stats = { retried: 0, failed: 0 };
    const cutoffTime = new Date(Date.now() - this.config.retryDelayHours * 60 * 60 * 1000);

    const failedAppointments = await Appointment.find({
      reminderStatus: 'failed',
      reminderAttempts: { $lt: this.config.maxAttempts },
      reminderTimestamp: { $lt: cutoffTime },
      date: { $gte: new Date() } // Solo citas futuras
    }).populate('patientId dentistId');

    for (const appointment of failedAppointments) {
      try {
        await this.sendReminderForAppointment(appointment);
        stats.retried++;
      } catch (error) {
        await this.markReminderFailed(appointment, error as Error);
        stats.failed++;
      }
    }

    return stats;
  }

  /**
   * Obtiene citas que necesitan recordatorio
   */
  private async getAppointmentsNeedingReminder(targetDate: Date) {
    return await Appointment.find({
      date: {
        $gte: new Date(targetDate.setHours(0, 0, 0, 0)),
        $lt: new Date(targetDate.setHours(23, 59, 59, 999))
      },
      status: { $in: ['confirmed', 'pending'] },
      reminderStatus: 'pending'
    }).populate('patientId dentistId');
  }

  /**
   * Envía el recordatorio usando el método especificado
   */
  private async sendReminder(
    type: 'email' | 'sms' | 'whatsapp',
    contactInfo: any,
    message: string,
    appointment: any
  ): Promise<void> {
    switch (type) {
      case 'email':
        await EmailService.sendAppointmentReminder(
          contactInfo.email,
          contactInfo.name,
          message,
          appointment
        );
        break;

      case 'sms':
        // TODO: Implementar SMS service
        // await SMSService.sendSMS(contactInfo.phone, message);
        console.log(`📱 SMS (simulado) enviado a ${contactInfo.phone}: ${message}`);
        break;

      case 'whatsapp':
        // TODO: Implementar WhatsApp service
        // await WhatsAppService.sendMessage(contactInfo.phone, message);
        console.log(`💬 WhatsApp (simulado) enviado a ${contactInfo.phone}: ${message}`);
        break;

      default:
        throw new Error(`Tipo de recordatorio no soportado: ${type}`);
    }
  }

  /**
   * Genera mensaje personalizado de recordatorio
   */
  private generateReminderMessage(appointment: any, patient: any, dentist: any): string {
    const appointmentDate = new Date(appointment.date).toLocaleDateString('es-MX', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    const appointmentTime = appointment.startTime;

    return `🦷 Hola ${patient.name}, te recordamos tu cita dental con ${dentist.name} el ${appointmentDate} a las ${appointmentTime}.

📍 Clínica: ${dentist.clinicName}
🕐 Hora: ${appointmentTime}
💼 Tratamiento: ${appointment.service}
📞 Teléfono: ${dentist.phone}

Si necesitas reprogramar o tienes alguna pregunta, contáctanos.

¡Te esperamos!
- Equipo ToothPick`;
  }

  /**
   * Obtiene información de contacto del paciente
   */
  private getPatientContactInfo(patient: any, appointment: any) {
    return {
      name: patient.name || appointment.patientDetails.name,
      email: patient.email || appointment.patientDetails.email,
      phone: patient.phone || appointment.patientDetails.phone
    };
  }

  /**
   * Marca recordatorio como enviado
   */
  private async markReminderSent(appointment: any, reminderType: string): Promise<void> {
    appointment.reminderStatus = 'sent';
    appointment.reminderType = reminderType;
    appointment.reminderTimestamp = new Date();
    appointment.reminderAttempts += 1;
    appointment.reminderSent = true;
    appointment.reminderSentAt = new Date();
    await appointment.save();
  }

  /**
   * Marca recordatorio como fallido
   */
  private async markReminderFailed(appointment: any, error: Error): Promise<void> {
    appointment.reminderStatus = 'failed';
    appointment.reminderAttempts += 1;
    appointment.lastReminderError = error.message;
    appointment.reminderTimestamp = new Date();
    await appointment.save();
  }

  /**
   * Obtiene la fecha de mañana
   */
  private getTomorrow(): Date {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow;
  }

  /**
   * Marca citas pasadas como no necesitan recordatorio
   */
  async markPastAppointmentsAsNotNeeded(): Promise<number> {
    await connectDB();

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    const result = await Appointment.updateMany(
      {
        date: { $lt: yesterday },
        reminderStatus: 'pending'
      },
      {
        reminderStatus: 'not_needed'
      }
    );

    return result.modifiedCount;
  }

  /**
   * Obtiene estadísticas de recordatorios
   */
  async getReminderStats(dateFrom?: Date, dateTo?: Date) {
    await connectDB();

    const matchQuery: any = {};
    
    if (dateFrom || dateTo) {
      matchQuery.reminderTimestamp = {};
      if (dateFrom) matchQuery.reminderTimestamp.$gte = dateFrom;
      if (dateTo) matchQuery.reminderTimestamp.$lte = dateTo;
    }

    const stats = await Appointment.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: '$reminderStatus',
          count: { $sum: 1 },
          avgAttempts: { $avg: '$reminderAttempts' }
        }
      }
    ]);

    const typeStats = await Appointment.aggregate([
      { 
        $match: { 
          ...matchQuery,
          reminderStatus: 'sent' 
        } 
      },
      {
        $group: {
          _id: '$reminderType',
          count: { $sum: 1 }
        }
      }
    ]);

    return {
      byStatus: stats,
      byType: typeStats,
      summary: {
        total: stats.reduce((sum, s) => sum + s.count, 0),
        sent: stats.find(s => s._id === 'sent')?.count || 0,
        failed: stats.find(s => s._id === 'failed')?.count || 0,
        pending: stats.find(s => s._id === 'pending')?.count || 0
      }
    };
  }
}

export default new ReminderService();
