import MarketingCampaign, { IMarketingCampaign } from '@/lib/models/MarketingCampaign';
import PromoHighlight, { IPromoHighlight } from '@/lib/models/PromoHighlight';
import User from '@/lib/models/User';
import { EmailService } from '@/lib/services/EmailService';
import { NotificationService } from '@/lib/services/NotificationService';
import connectDB from '@/lib/db';

export class MarketingService {
  /**
   * Crear una nueva campaña de marketing
   */
  static async createCampaign(campaignData: Partial<IMarketingCampaign>): Promise<IMarketingCampaign> {
    try {
      await connectDB();

      // Obtener pacientes objetivo según la audiencia
      const targetPatients = await this.getTargetAudience(
        campaignData.clinicId!,
        campaignData.audience!,
        campaignData.customFilters
      );

      const campaign = new MarketingCampaign({
        ...campaignData,
        targetPatients: targetPatients.map(p => p._id),
        metrics: {
          totalSent: 0,
          totalOpened: 0,
          totalClicked: 0,
          totalBounced: 0,
          openRate: 0,
          clickRate: 0
        }
      });

      await campaign.save();
      return campaign;

    } catch (error: any) {
      console.error('Error creating marketing campaign:', error);
      throw new Error(`Error al crear campaña: ${error.message}`);
    }
  }

  /**
   * Obtener audiencia objetivo para una campaña
   */
  static async getTargetAudience(
    clinicId: string,
    audience: string,
    customFilters?: Record<string, any>
  ): Promise<any[]> {
    try {
      await connectDB();

      let query: any = {};

      // Filtros base según tipo de audiencia
      switch (audience) {
        case 'all':
          // Todos los pacientes que han tenido citas con esta clínica
          query = {
            role: 'patient',
            'appointments.dentistId': clinicId
          };
          break;

        case 'active':
          // Pacientes con citas en los últimos 6 meses
          const sixMonthsAgo = new Date();
          sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
          query = {
            role: 'patient',
            'appointments.dentistId': clinicId,
            'appointments.appointmentDate': { $gte: sixMonthsAgo }
          };
          break;

        case 'inactive':
          // Pacientes sin citas en los últimos 6 meses
          const sixMonthsAgoInactive = new Date();
          sixMonthsAgoInactive.setMonth(sixMonthsAgoInactive.getMonth() - 6);
          query = {
            role: 'patient',
            'appointments.dentistId': clinicId,
            'appointments.appointmentDate': { $lt: sixMonthsAgoInactive }
          };
          break;

        case 'custom':
          // Aplicar filtros personalizados
          query = {
            role: 'patient',
            'appointments.dentistId': clinicId,
            ...customFilters
          };
          break;

        default:
          query = {
            role: 'patient',
            'appointments.dentistId': clinicId
          };
      }

      const patients = await User.find(query)
        .select('_id name email phone')
        .limit(1000); // Límite de seguridad

      return patients;

    } catch (error) {
      console.error('Error getting target audience:', error);
      return [];
    }
  }

  /**
   * Ejecutar campaña de marketing
   */
  static async executeCampaign(campaignId: string): Promise<boolean> {
    try {
      await connectDB();

      const campaign = await MarketingCampaign.findById(campaignId)
        .populate('targetPatients', 'name email phone')
        .populate('clinicId', 'name email');

      if (!campaign) {
        throw new Error('Campaña no encontrada');
      }

      if (campaign.status !== 'pending') {
        throw new Error('La campaña ya fue procesada');
      }

      // Marcar como enviando
      campaign.status = 'sending';
      await campaign.save();

      let successCount = 0;
      let failureCount = 0;

      // Ejecutar según el canal
      for (const patient of campaign.targetPatients as any[]) {
        try {
          switch (campaign.channel) {
            case 'email':
              await this.sendCampaignEmail(campaign, patient);
              break;
            case 'notification':
              await this.sendCampaignNotification(campaign, patient);
              break;
            case 'sms':
              await this.sendCampaignSMS(campaign, patient);
              break;
          }
          successCount++;
        } catch (error) {
          console.error(`Error sending to patient ${patient._id}:`, error);
          failureCount++;
        }
      }

      // Actualizar métricas y estado
      campaign.metrics.totalSent = successCount;
      campaign.status = failureCount === 0 ? 'sent' : 'failed';
      campaign.sentAt = new Date();
      
      if (failureCount > 0) {
        campaign.errorMessage = `${failureCount} envíos fallaron de ${successCount + failureCount} total`;
      }

      campaign.updateMetrics();
      await campaign.save();

      return true;

    } catch (error: any) {
      console.error('Error executing campaign:', error);
      
      // Marcar campaña como fallida
      await MarketingCampaign.findByIdAndUpdate(campaignId, {
        status: 'failed',
        errorMessage: error.message
      });

      return false;
    }
  }

  /**
   * Enviar email de campaña
   */
  private static async sendCampaignEmail(campaign: any, patient: any): Promise<void> {
    const subject = campaign.content.subject || campaign.title;
    const trackingId = `${campaign._id}_${patient._id}`;
    
    // Generar enlaces de tracking
    const trackingPixel = `${process.env.NEXTAUTH_URL}/api/marketing/track/open/${trackingId}`;
    const trackedCTA = campaign.content.ctaLink ? 
      `${process.env.NEXTAUTH_URL}/api/marketing/track/click/${trackingId}?redirect=${encodeURIComponent(campaign.content.ctaLink)}` :
      undefined;

    let emailBody = campaign.content.body;
    
    // Personalizar el contenido
    emailBody = emailBody.replace(/\{nombre\}/g, patient.name);
    emailBody = emailBody.replace(/\{clinica\}/g, campaign.clinicId.name);
    
    // Agregar imagen si existe
    if (campaign.content.imageUrl) {
      emailBody = `<img src="${campaign.content.imageUrl}" alt="Promoción" style="max-width: 100%; height: auto; margin-bottom: 20px;" />\n${emailBody}`;
    }
    
    // Agregar CTA si existe
    if (campaign.content.ctaText && trackedCTA) {
      emailBody += `\n\n<div style="text-align: center; margin: 20px 0;">
        <a href="${trackedCTA}" style="background-color: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
          ${campaign.content.ctaText}
        </a>
      </div>`;
    }
    
    // Agregar pixel de tracking
    emailBody += `\n<img src="${trackingPixel}" alt="" width="1" height="1" style="display: none;" />`;

    await EmailService.sendEmail({
      to: patient.email,
      subject,
      html: emailBody,
      from: campaign.clinicId.email
    });
  }

  /**
   * Enviar notificación de campaña
   */
  private static async sendCampaignNotification(campaign: any, patient: any): Promise<void> {
    await NotificationService.createNotification(patient._id, {
      title: campaign.title,
      message: campaign.content.body,
      type: 'marketing',
      metadata: {
        campaignId: campaign._id,
        clinicId: campaign.clinicId._id
      }
    });
  }

  /**
   * Enviar SMS de campaña
   */
  private static async sendCampaignSMS(campaign: any, patient: any): Promise<void> {
    // TODO: Implementar servicio SMS
    console.log(`SMS to ${patient.phone}: ${campaign.content.body}`);
  }

  /**
   * Crear promoción destacada
   */
  static async createPromoHighlight(promoData: Partial<IPromoHighlight>): Promise<IPromoHighlight> {
    try {
      await connectDB();

      const promo = new PromoHighlight({
        ...promoData,
        metrics: {
          views: 0,
          clicks: 0,
          conversions: 0,
          ctr: 0
        }
      });

      await promo.save();
      return promo;

    } catch (error: any) {
      console.error('Error creating promo highlight:', error);
      throw new Error(`Error al crear promoción: ${error.message}`);
    }
  }

  /**
   * Obtener estadísticas de marketing de una clínica
   */
  static async getClinicMarketingStats(clinicId: string) {
    try {
      await connectDB();

      const [campaignStats, promoStats] = await Promise.all([
        MarketingCampaign.getClinicStats(clinicId),
        PromoHighlight.getClinicPromoStats(clinicId)
      ]);

      return {
        campaigns: campaignStats,
        promotions: promoStats,
        totalReach: campaignStats.totalSent + promoStats.totalViews,
        overallEngagement: {
          emailEngagement: campaignStats.avgOpenRate,
          promoEngagement: promoStats.avgCTR,
          totalConversions: promoStats.totalConversions
        }
      };

    } catch (error) {
      console.error('Error getting marketing stats:', error);
      return null;
    }
  }

  /**
   * Registrar tracking de apertura de email
   */
  static async trackEmailOpen(trackingId: string): Promise<void> {
    try {
      const [campaignId, patientId] = trackingId.split('_');
      
      await MarketingCampaign.findByIdAndUpdate(campaignId, {
        $inc: { 'metrics.totalOpened': 1 }
      });

      // Actualizar rate
      const campaign = await MarketingCampaign.findById(campaignId);
      if (campaign) {
        campaign.updateMetrics();
        await campaign.save();
      }

    } catch (error) {
      console.error('Error tracking email open:', error);
    }
  }

  /**
   * Registrar tracking de clic
   */
  static async trackClick(trackingId: string): Promise<void> {
    try {
      const [campaignId, patientId] = trackingId.split('_');
      
      await MarketingCampaign.findByIdAndUpdate(campaignId, {
        $inc: { 'metrics.totalClicked': 1 }
      });

      // Actualizar rate
      const campaign = await MarketingCampaign.findById(campaignId);
      if (campaign) {
        campaign.updateMetrics();
        await campaign.save();
      }

    } catch (error) {
      console.error('Error tracking click:', error);
    }
  }
}
