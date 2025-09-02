import cron from 'node-cron';
import ReminderService from './ReminderService';

/**
 * Servicio de tareas programadas para recordatorios
 * Ejecuta automáticamente los recordatorios sin necesidad de cron externo
 */
export class CronService {
  private static instance: CronService;
  private tasks: Map<string, cron.ScheduledTask> = new Map();

  private constructor() {
    this.initializeTasks();
  }

  static getInstance(): CronService {
    if (!CronService.instance) {
      CronService.instance = new CronService();
    }
    return CronService.instance;
  }

  /**
   * Inicializa todas las tareas programadas
   */
  private initializeTasks(): void {
    // Recordatorios diarios a las 8:00 AM
    const dailyReminders = cron.schedule('0 8 * * *', async () => {
      console.log('🔔 Ejecutando recordatorios diarios automáticos...');
      try {
        const stats = await ReminderService.sendUpcomingAppointmentReminders();
        console.log('✅ Recordatorios completados:', stats);
      } catch (error) {
        console.error('❌ Error en recordatorios diarios:', error);
      }
    }, {
      scheduled: false,
      timezone: 'America/Mexico_City'
    });

    // Limpieza y reintentos cada 2 horas
    const retryReminders = cron.schedule('0 */2 * * *', async () => {
      console.log('🔄 Ejecutando reintentos de recordatorios...');
      try {
        const retryStats = await ReminderService.retryFailedReminders();
        const cleanupCount = await ReminderService.markPastAppointmentsAsNotNeeded();
        
        console.log('🔄 Reintentos completados:', { ...retryStats, cleanupCount });
      } catch (error) {
        console.error('❌ Error en reintentos:', error);
      }
    }, {
      scheduled: false,
      timezone: 'America/Mexico_City'
    });

    this.tasks.set('daily-reminders', dailyReminders);
    this.tasks.set('retry-reminders', retryReminders);

    console.log('⏰ Tareas de recordatorios configuradas:');
    console.log('   - Recordatorios diarios: 8:00 AM (Mexico City)');
    console.log('   - Reintentos: Cada 2 horas');
  }

  /**
   * Inicia todas las tareas programadas
   */
  start(): void {
    this.tasks.forEach((task, name) => {
      task.start();
      console.log(`▶️  Tarea iniciada: ${name}`);
    });
  }

  /**
   * Detiene todas las tareas programadas
   */
  stop(): void {
    this.tasks.forEach((task, name) => {
      task.stop();
      console.log(`⏸️  Tarea detenida: ${name}`);
    });
  }

  /**
   * Inicia una tarea específica
   */
  startTask(taskName: string): boolean {
    const task = this.tasks.get(taskName);
    if (task) {
      task.start();
      console.log(`▶️  Tarea iniciada: ${taskName}`);
      return true;
    }
    return false;
  }

  /**
   * Detiene una tarea específica
   */
  stopTask(taskName: string): boolean {
    const task = this.tasks.get(taskName);
    if (task) {
      task.stop();
      console.log(`⏸️  Tarea detenida: ${taskName}`);
      return true;
    }
    return false;
  }

  /**
   * Ejecuta recordatorios manualmente (para testing)
   */
  async runRemindersNow(): Promise<any> {
    console.log('🧪 Ejecutando recordatorios manualmente...');
    try {
      const stats = await ReminderService.sendUpcomingAppointmentReminders();
      console.log('✅ Recordatorios manuales completados:', stats);
      return stats;
    } catch (error) {
      console.error('❌ Error en recordatorios manuales:', error);
      throw error;
    }
  }

  /**
   * Obtiene el estado de todas las tareas
   */
  getTasksStatus(): { [key: string]: boolean } {
    const status: { [key: string]: boolean } = {};
    this.tasks.forEach((task, name) => {
      status[name] = task.running;
    });
    return status;
  }

  /**
   * Configura una nueva tarea personalizada
   */
  addCustomTask(
    name: string, 
    cronExpression: string, 
    callback: () => Promise<void>
  ): boolean {
    try {
      const task = cron.schedule(cronExpression, callback, {
        scheduled: false,
        timezone: 'America/Mexico_City'
      });
      
      this.tasks.set(name, task);
      console.log(`✅ Tarea personalizada agregada: ${name} (${cronExpression})`);
      return true;
    } catch (error) {
      console.error(`❌ Error agregando tarea ${name}:`, error);
      return false;
    }
  }
}

// Inicializar el servicio automáticamente
const cronService = CronService.getInstance();

// Auto-iniciar en producción
if (process.env.NODE_ENV === 'production' && process.env.ENABLE_CRON !== 'false') {
  cronService.start();
  console.log('🚀 Servicio de recordatorios iniciado automáticamente en producción');
}

export default cronService;
