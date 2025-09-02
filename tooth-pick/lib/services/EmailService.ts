import nodemailer from 'nodemailer';
import { calculatePlatformFee, getFeePercentageString, calculateSellerAmount } from '@/lib/config/fees';

export interface EmailData {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

class EmailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    // Configurar el transportador de email
    this.transporter = nodemailer.createTransporter({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: false, // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  /**
   * Enviar email individual
   */
  async sendEmail(emailData: EmailData): Promise<boolean> {
    try {
      if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
        console.warn('Email credentials not configured, email not sent');
        return false;
      }

      const info = await this.transporter.sendMail({
        from: `"ToothPick Platform" <${process.env.SMTP_USER}>`,
        to: emailData.to,
        subject: emailData.subject,
        text: emailData.text,
        html: emailData.html,
      });

      console.log('Email sent:', info.messageId);
      return true;
    } catch (error) {
      console.error('Error sending email:', error);
      return false;
    }
  }

  /**
   * Template para confirmación de orden (Distribuidor)
   */
  getOrderConfirmationTemplate(
    buyerName: string,
    orderNumber: string,
    orderTotal: number,
    items: any[]
  ): string {
    const formatCurrency = (amount: number) => 
      new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(amount);

    return `
      <!DOCTYPE html>
      <html>
      <head>
          <meta charset="utf-8">
          <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: #2563eb; color: white; padding: 20px; text-align: center; }
              .content { padding: 20px; background: #f9f9f9; }
              .order-details { background: white; padding: 15px; margin: 20px 0; border-radius: 5px; }
              .item { border-bottom: 1px solid #eee; padding: 10px 0; }
              .total { font-size: 18px; font-weight: bold; color: #2563eb; }
              .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
          </style>
      </head>
      <body>
          <div class="container">
              <div class="header">
                  <h1>¡Orden Confirmada!</h1>
                  <p>ToothPick - Plataforma Dental B2B</p>
              </div>
              
              <div class="content">
                  <h2>Hola ${buyerName},</h2>
                  <p>Tu orden ha sido confirmada y enviada al proveedor correspondiente.</p>
                  
                  <div class="order-details">
                      <h3>Detalles de la Orden #${orderNumber}</h3>
                      
                      ${items.map(item => `
                          <div class="item">
                              <strong>${item.name}</strong><br>
                              Cantidad: ${item.quantity} x ${formatCurrency(item.price)} = ${formatCurrency(item.quantity * item.price)}
                          </div>
                      `).join('')}
                      
                      <div style="margin-top: 15px; padding-top: 15px; border-top: 2px solid #2563eb;">
                          <div class="total">Total: ${formatCurrency(orderTotal)}</div>
                      </div>
                  </div>
                  
                  <p>El proveedor procesará tu pedido y te mantendremos informado sobre cualquier actualización.</p>
                  
                  <p>Puedes seguir el estado de tu orden en tu dashboard de ToothPick.</p>
              </div>
              
              <div class="footer">
                  <p>© 2024 ToothPick. Todos los derechos reservados.</p>
                  <p>Este es un email automático, por favor no responder.</p>
              </div>
          </div>
      </body>
      </html>
    `;
  }

  /**
   * Template para nueva orden (Proveedor) con comisiones actualizadas
   */
  getNewOrderTemplate(
    sellerName: string,
    buyerName: string,
    orderNumber: string,
    orderTotal: number,
    items: any[],
    orderType: 'b2b' | 'b2c' = 'b2b'
  ): string {
    const formatCurrency = (amount: number) => 
      new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(amount);

    // Calculamos la comisión y lo que recibe el proveedor
    const subtotal = orderTotal; // Asumimos que orderTotal ya incluye comisión
    const platformFee = calculatePlatformFee(subtotal, orderType);
    const sellerReceives = calculateSellerAmount(subtotal, orderType);
    const feePercentage = getFeePercentageString(orderType);

    return `
      <!DOCTYPE html>
      <html>
      <head>
          <meta charset="utf-8">
          <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: #059669; color: white; padding: 20px; text-align: center; }
              .content { padding: 20px; background: #f9f9f9; }
              .order-details { background: white; padding: 15px; margin: 20px 0; border-radius: 5px; }
              .payment-breakdown { background: #f0f9ff; padding: 15px; margin: 20px 0; border-radius: 5px; border-left: 4px solid #3b82f6; }
              .item { border-bottom: 1px solid #eee; padding: 10px 0; }
              .total { font-size: 18px; font-weight: bold; color: #059669; }
              .fee-info { color: #3b82f6; font-size: 14px; }
              .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
              .action-button { 
                  background: #059669; 
                  color: white; 
                  padding: 12px 24px; 
                  text-decoration: none; 
                  border-radius: 5px; 
                  display: inline-block; 
                  margin: 20px 0; 
              }
          </style>
      </head>
      <body>
          <div class="container">
              <div class="header">
                  <h1>📥 Nueva Orden Recibida</h1>
                  <p>ToothPick - Plataforma Dental B2B</p>
              </div>
              
              <div class="content">
                  <h2>Hola ${sellerName},</h2>
                  <p>Has recibido una nueva orden de <strong>${buyerName}</strong>.</p>
                  
                  <div class="order-details">
                      <h3>Orden #${orderNumber}</h3>
                      
                      ${items.map(item => `
                          <div class="item">
                              <strong>${item.name}</strong><br>
                              Cantidad: ${item.quantity} x ${formatCurrency(item.price)} = ${formatCurrency(item.quantity * item.price)}
                          </div>
                      `).join('')}
                      
                      <div style="margin-top: 15px; padding-top: 15px; border-top: 2px solid #059669;">
                          <div class="total">Total Orden: ${formatCurrency(orderTotal)}</div>
                      </div>
                  </div>

                  <div class="payment-breakdown">
                      <h4>💰 Desglose de Pagos</h4>
                      <p><strong>Recibirás:</strong> ${formatCurrency(sellerReceives)}</p>
                      <p class="fee-info">Comisión ToothPick (${feePercentage}): ${formatCurrency(platformFee)}</p>
                      <p style="font-size: 12px; color: #666;">El pago se transferirá directamente a tu cuenta bancaria via Stripe Connect.</p>
                  </div>
                  
                  <p>Por favor, revisa la orden en tu dashboard y actualiza el estado según el proceso de envío.</p>
                  
                  <a href="${process.env.NEXTAUTH_URL}/provider/dashboard" class="action-button">
                      Ver Dashboard
                  </a>
              </div>
              
              <div class="footer">
                  <p>© 2024 ToothPick. Todos los derechos reservados.</p>
                  <p>Este es un email automático, por favor no responder.</p>
              </div>
          </div>
      </body>
      </html>
    `;
  }

  /**
   * Enviar confirmación de orden al distribuidor
   */
  async sendOrderConfirmation(
    buyerEmail: string,
    buyerName: string,
    orderNumber: string,
    orderTotal: number,
    items: any[]
  ): Promise<boolean> {
    const html = this.getOrderConfirmationTemplate(buyerName, orderNumber, orderTotal, items);
    
    return this.sendEmail({
      to: buyerEmail,
      subject: `✅ Orden Confirmada #${orderNumber} - ToothPick`,
      html,
      text: `Tu orden #${orderNumber} por $${orderTotal} ha sido confirmada.`
    });
  }

  /**
   * Enviar notificación de nueva orden al proveedor
   */
  async sendNewOrderNotification(
    sellerEmail: string,
    sellerName: string,
    buyerName: string,
    orderNumber: string,
    orderTotal: number,
    items: any[],
    orderType: 'b2b' | 'b2c' = 'b2b'
  ): Promise<boolean> {
    const html = this.getNewOrderTemplate(sellerName, buyerName, orderNumber, orderTotal, items, orderType);
    
    return this.sendEmail({
      to: sellerEmail,
      subject: `📥 Nueva Orden Recibida #${orderNumber} - ToothPick`,
      html,
      text: `Has recibido una nueva orden #${orderNumber} de ${buyerName} por $${orderTotal}.`
    });
  }

  /**
   * Enviar recordatorio de cita dental
   */
  async sendAppointmentReminder(
    patientEmail: string,
    patientName: string,
    message: string,
    appointment: any
  ): Promise<boolean> {
    const html = this.getAppointmentReminderTemplate(patientName, appointment);
    
    return this.sendEmail({
      to: patientEmail,
      subject: `🦷 Recordatorio: Tu cita dental es mañana - ToothPick`,
      html,
      text: message
    });
  }

  /**
   * Template para recordatorio de cita dental
   */
  private getAppointmentReminderTemplate(patientName: string, appointment: any): string {
    const appointmentDate = new Date(appointment.date).toLocaleDateString('es-MX', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    return `
      <!DOCTYPE html>
      <html>
      <head>
          <meta charset="utf-8">
          <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: #059669; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
              .content { padding: 30px; background: #f8fafc; border-radius: 0 0 8px 8px; }
              .appointment-card { background: white; padding: 20px; margin: 20px 0; border-radius: 8px; border-left: 4px solid #059669; }
              .info-row { display: flex; margin: 10px 0; }
              .icon { font-size: 18px; margin-right: 10px; width: 25px; }
              .footer { text-align: center; padding: 20px; color: #666; font-size: 14px; }
              .button { background: #059669; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin: 10px 0; }
          </style>
      </head>
      <body>
          <div class="container">
              <div class="header">
                  <h1>🦷 Recordatorio de Cita</h1>
                  <p>ToothPick - Tu salud dental es nuestra prioridad</p>
              </div>
              
              <div class="content">
                  <h2>¡Hola ${patientName}!</h2>
                  <p>Te recordamos que tienes una cita dental programada para <strong>mañana</strong>.</p>
                  
                  <div class="appointment-card">
                      <h3>📅 Detalles de tu cita:</h3>
                      
                      <div class="info-row">
                          <span class="icon">👨‍⚕️</span>
                          <div><strong>Dentista:</strong> ${appointment.dentist?.name || 'Por confirmar'}</div>
                      </div>
                      
                      <div class="info-row">
                          <span class="icon">🏥</span>
                          <div><strong>Clínica:</strong> ${appointment.dentist?.clinicName || 'Por confirmar'}</div>
                      </div>
                      
                      <div class="info-row">
                          <span class="icon">📅</span>
                          <div><strong>Fecha:</strong> ${appointmentDate}</div>
                      </div>
                      
                      <div class="info-row">
                          <span class="icon">🕐</span>
                          <div><strong>Hora:</strong> ${appointment.startTime}</div>
                      </div>
                      
                      <div class="info-row">
                          <span class="icon">💼</span>
                          <div><strong>Tratamiento:</strong> ${appointment.service}</div>
                      </div>
                      
                      <div class="info-row">
                          <span class="icon">🔢</span>
                          <div><strong>Número de cita:</strong> ${appointment.appointmentNumber}</div>
                      </div>
                  </div>
                  
                  <h3>📋 Recordatorios importantes:</h3>
                  <ul>
                      <li>Llega 15 minutos antes de tu cita</li>
                      <li>Trae una identificación oficial</li>
                      <li>Si tienes seguro dental, no olvides tu tarjeta</li>
                      <li>Comunica cualquier cambio en tu estado de salud</li>
                  </ul>
                  
                  <div style="text-align: center; margin: 30px 0;">
                      <a href="tel:${appointment.dentist?.phone || ''}" class="button">📞 Contactar Clínica</a>
                  </div>
                  
                  <p><strong>¿Necesitas reprogramar?</strong> Contáctanos lo antes posible para reagendar tu cita.</p>
              </div>
              
              <div class="footer">
                  <p>Este es un recordatorio automático de ToothPick</p>
                  <p>Si tienes preguntas, contáctanos en: soporte@toothpick.mx</p>
              </div>
          </div>
      </body>
      </html>
    `;
  }
}

export default new EmailService();
