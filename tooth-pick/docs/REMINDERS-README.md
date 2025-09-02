# 🔔 Sistema de Recordatorios Automatizados - ToothPick

## 📋 Descripción General

Sistema completo de recordatorios automatizados para citas dentales que envía notificaciones a pacientes 24 horas antes de su cita programada mediante email, SMS o WhatsApp.

## ✨ Características Implementadas

### 🎯 **Funcionalidades Principales**
- ✅ **Recordatorios automáticos** 24 horas antes de las citas
- ✅ **Múltiples canales**: Email, SMS, WhatsApp
- ✅ **Preferencias personalizables** por paciente
- ✅ **Sistema de reintentos** para envíos fallidos
- ✅ **Dashboard de estadísticas** para dentistas
- ✅ **API de cron jobs** para automatización

### 📊 **Datos y Seguimiento**
- ✅ **Estado de recordatorios** por cita (pending/sent/failed/not_needed)
- ✅ **Contador de intentos** y registro de errores
- ✅ **Estadísticas agregadas** de envíos exitosos/fallidos
- ✅ **Preferencias del usuario** almacenadas en BD

## 🏗️ Arquitectura del Sistema

### **1. Modelos de Datos**

#### `Appointment` (Extendido)
```typescript
interface IAppointment {
  // ... campos existentes
  reminderStatus: 'pending' | 'sent' | 'failed' | 'not_needed';
  reminderType: 'email' | 'sms' | 'whatsapp';
  reminderTimestamp?: Date;
  reminderAttempts: number;
  lastReminderError?: string;
}
```

#### `User` (Extendido)
```typescript
interface IUser {
  // ... campos existentes
  prefersReminderBy: 'email' | 'sms' | 'whatsapp';
  reminderHoursBefore: number;
  acceptsMarketingMessages: boolean;
}
```

### **2. Servicios Core**

#### `ReminderService.ts`
- **Envío de recordatorios** automáticos diarios
- **Reintentos** de recordatorios fallidos
- **Estadísticas** y reportes
- **Limpieza** de citas pasadas

#### `EmailService.ts` (Extendido)
- **Plantillas HTML** profesionales para recordatorios
- **Información completa** de la cita
- **Branding** ToothPick

#### `SMSService.ts`
- **Integración Twilio** (configurable)
- **Mensajes cortos** optimizados
- **Normalización** de números telefónicos

#### `WhatsAppService.ts`
- **API de WhatsApp** via Twilio
- **Mensajes con formato** enriquecido
- **Plantillas** predefinidas

### **3. APIs Implementadas**

#### Automatización
- `POST /api/cron/reminders` - Ejecutar recordatorios
- `GET /api/admin/reminder-stats` - Estadísticas globales
- `GET /api/admin/cron` - Estado del servicio cron

#### Usuario
- `GET /api/user/preferences` - Obtener preferencias
- `PATCH /api/user/preferences` - Actualizar preferencias

## 🚀 Configuración e Instalación

### **1. Variables de Entorno**

```env
# Cron Jobs
CRON_SECRET=tu-cron-secret-key
ADMIN_SECRET=tu-admin-secret-key

# Email (ya configurado)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=tu-email@gmail.com
SMTP_PASS=tu-app-password

# Twilio (SMS y WhatsApp)
TWILIO_ACCOUNT_SID=ACxxxxxxxxxx
TWILIO_AUTH_TOKEN=tu-auth-token
TWILIO_PHONE_NUMBER=+15551234567
TWILIO_WHATSAPP_NUMBER=whatsapp:+14155238886

# Configuración del servicio
NODE_ENV=production
ENABLE_CRON=true
```

### **2. Dependencias**

```bash
# Instalar dependencias adicionales
npm install node-cron
npm install @types/node-cron

# Para Twilio (opcional)
npm install twilio
npm install @types/twilio
```

### **3. Deployment**

#### **Opción A: Cron Jobs del Sistema**
```bash
# Agregar al crontab del servidor
crontab -e

# Agregar línea:
0 8 * * * curl -X POST -H "Authorization: Bearer ${CRON_SECRET}" https://tudominio.com/api/cron/reminders
```

#### **Opción B: Servicio Interno (node-cron)**
```typescript
// En app.ts o server.ts
import cronService from '@/lib/services/CronService';

// Iniciar automáticamente en producción
if (process.env.NODE_ENV === 'production') {
  cronService.start();
}
```

#### **Opción C: Vercel Cron Jobs**
```json
// vercel.json
{
  "crons": [{
    "path": "/api/cron/reminders",
    "schedule": "0 8 * * *"
  }]
}
```

## 📱 Uso del Sistema

### **1. Para Pacientes**

#### Configurar Preferencias
```
/patient/preferences
```
- Seleccionar método preferido (Email/SMS/WhatsApp)
- Configurar horas de anticipación (2-168 horas)
- Optar por mensajes promocionales

### **2. Para Dentistas**

#### Dashboard de Recordatorios
```
/dentist/dashboard → Pestaña "Recordatorios"
```
- Ver estadísticas de envíos
- Estado por cita individual
- Configuración del sistema

### **3. Para Administradores**

#### Monitoreo del Sistema
```bash
# Obtener estadísticas
GET /api/admin/reminder-stats

# Estado del cron service
GET /api/admin/cron

# Ejecutar recordatorios manualmente
POST /api/cron/reminders
```

## 🔧 Personalización

### **1. Plantillas de Mensajes**

#### Email (EmailService.ts)
```typescript
private getAppointmentReminderTemplate(patientName: string, appointment: any): string {
  // Personalizar HTML template
}
```

#### SMS (SMSService.ts)
```typescript
// Mensaje personalizable en ReminderService.ts
private generateReminderMessage(): string {
  return `🦷 Hola ${name}, tu cita dental...`;
}
```

#### WhatsApp (WhatsAppService.ts)
```typescript
static async sendAppointmentReminder(): Promise<void> {
  // Mensaje con formato enriquecido
}
```

### **2. Horarios de Envío**

#### Modificar CronService.ts
```typescript
// Cambiar horario (actualmente 8:00 AM)
const dailyReminders = cron.schedule('0 8 * * *', async () => {
  // Lógica de recordatorios
});

// Cambiar frecuencia de reintentos (actualmente cada 2 horas)
const retryReminders = cron.schedule('0 */2 * * *', async () => {
  // Lógica de reintentos
});
```

### **3. Lógica de Negocio**

#### Horas de Anticipación
```typescript
// Modificar en ReminderService.ts
const DEFAULT_CONFIG: ReminderConfig = {
  maxAttempts: 3,
  retryDelayHours: 2,
  defaultHoursBefore: 24  // Cambiar valor por defecto
};
```

## 📊 Monitoreo y Estadísticas

### **1. Métricas Disponibles**
- **Recordatorios enviados** vs fallidos
- **Tasa de éxito** por método (email/SMS/WhatsApp)
- **Intentos promedio** por recordatorio
- **Distribución por tipo** de recordatorio

### **2. Logs del Sistema**
```bash
# Ver logs de recordatorios
tail -f logs/reminders.log

# Logs de errores
tail -f logs/errors.log
```

## 🔍 Troubleshooting

### **Problemas Comunes**

#### 1. Recordatorios no se envían
```bash
# Verificar configuración
GET /api/admin/cron

# Ejecutar manualmente
POST /api/cron/reminders
```

#### 2. Emails no llegan
- Verificar variables SMTP_*
- Revisar bandeja de spam
- Comprobar límites del proveedor

#### 3. SMS/WhatsApp fallan
- Verificar credenciales de Twilio
- Validar formato de números telefónicos
- Revisar saldo de la cuenta Twilio

### **Debug Mode**
```env
# En desarrollo
NODE_ENV=development

# Los servicios solo mostrarán logs sin enviar realmente
```

## 🚦 Estado Actual

### ✅ **Completado**
- [x] Modelos de datos extendidos
- [x] Servicio core de recordatorios
- [x] APIs de automatización
- [x] Dashboard para dentistas
- [x] Configuración de preferencias
- [x] Sistema de reintentos
- [x] Estadísticas y monitoreo

### 🔄 **En Progreso**
- [ ] Integración real con Twilio (SMS/WhatsApp)
- [ ] Testing automatizado
- [ ] Optimización de rendimiento

### 📋 **Pendiente**
- [ ] Notificaciones push móviles
- [ ] A/B testing de plantillas
- [ ] Analytics avanzados
- [ ] Multi-idioma

## 📞 Soporte

Para soporte técnico o preguntas sobre el sistema de recordatorios:
- 📧 Email: dev@toothpick.mx
- 📱 WhatsApp: +52 xxx xxx xxxx
- 🎫 Tickets: GitHub Issues

---

**¡El sistema de recordatorios automatizados está listo para mantener a tus pacientes informados y reducir las faltas a citas! 🦷✨**
