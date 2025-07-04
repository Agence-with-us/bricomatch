// services/notificationService.ts
import admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import { Appointment, PushNotificationsActionsEnum, UserRole } from '../types';

// Types pour la notification générique
interface GenericNotificationData {
  title: string;
  body: string;
  type: string;
  data?: Record<string, any>;
}

interface GenericNotificationOptions {
  priority?: 'high' | 'normal' | 'low';
  sound?: string | 'default';
  clickAction?: string;
  badge?: number;
  icon?: string;
  image?: string;
  ttl?: number; // Time to live en secondes
}

// Types pour les notifications d'annulation
interface NotificationConfig {
  clientNotification?: {
    title: string;
    body: string;
  };
  proNotification?: {
    title: string;
    body: string;
  };
}

class ServerNotificationPushService {
  private db: FirebaseFirestore.Firestore;

  constructor() {
    this.db = getFirestore();
  }

  /**
   * Récupère tous les tokens FCM d'un utilisateur
   */
  async getUserTokens(userId: string): Promise<string[]> {
    try {
      const userTokenDoc = await this.db.collection('fcmTokens').doc(userId).get();

      if (!userTokenDoc.exists) {
        console.log(`Aucun token trouvé pour l'utilisateur: ${userId}`);
        return [];
      }

      const userData = userTokenDoc.data();
      const tokens = userData?.tokens || [];

      // Extraire seulement les tokens actifs
      const activeTokens = tokens
        .filter((tokenData: any) => tokenData.isActive)
        .map((tokenData: any) => tokenData.token);

      console.log(`${activeTokens.length} token(s) actif(s) trouvé(s) pour l'utilisateur: ${userId}`);
      return activeTokens;
    } catch (error) {
      console.error('Erreur lors de la récupération des tokens:', error);
      return [];
    }
  }

  /**
   * Envoie une notification à un utilisateur spécifique
   */
  async sendNotificationToUser(
    userId: string,
    notification: GenericNotificationData,
    options: GenericNotificationOptions = {}
  ): Promise<boolean> {
    try {
      const tokens = await this.getUserTokens(userId);

      if (tokens.length === 0) {
        console.log(`Aucun token disponible pour l'utilisateur: ${userId}`);
        return false;
      }

      return await this.sendNotificationToTokens(tokens, notification, options);
    } catch (error) {
      console.error('Erreur lors de l\'envoi de notification à l\'utilisateur:', error);
      return false;
    }
  }

  /**
   * Envoie une notification à plusieurs tokens
   */
  async sendNotificationToTokens(
    tokens: string[],
    notification: GenericNotificationData,
    options: GenericNotificationOptions = {}
  ): Promise<boolean> {
    try {
      if (tokens.length === 0) {
        console.log('Aucun token fourni pour l\'envoi');
        return false;
      }

      const message = {
        notification: {
          title: notification.title,
          body: notification.body,
        },
        data: notification.data || {},
        apns: {
          payload: {
            aps: {
              sound: options.sound || 'default',
              badge: options.badge,
            },
          },
        },
        tokens: tokens,
      };

      console.log(`Envoi de notification à ${tokens.length} token(s)...`);
      const response = await admin.messaging().sendEachForMulticast(message as any);

      console.log(`Notifications envoyées: ${response.successCount}/${tokens.length}`);

      // Nettoyer les tokens invalides
      if (response.failureCount > 0) {
        await this.handleFailedTokens(tokens, response.responses);
      }

      return response.successCount > 0;
    } catch (error) {
      console.error('Erreur lors de l\'envoi de notifications:', error);
      return false;
    }
  }

  /**
   * Nettoie les tokens invalides après un échec d'envoi
   */
  private async handleFailedTokens(tokens: string[], responses: any[]) {
    try {
      const invalidTokens: string[] = [];

      responses.forEach((response, index) => {
        if (!response.success && response.error) {
          const errorCode = response.error.code;
          // Codes d'erreur indiquant que le token est invalide
          if (errorCode === 'messaging/invalid-registration-token' ||
            errorCode === 'messaging/registration-token-not-registered') {
            invalidTokens.push(tokens[index]);
          }
        }
      });

      if (invalidTokens.length > 0) {
        console.log(`Suppression de ${invalidTokens.length} token(s) invalide(s)`);
        await this.removeInvalidTokens(invalidTokens);
      }
    } catch (error) {
      console.error('Erreur lors du nettoyage des tokens invalides:', error);
    }
  }

  /**
   * Supprime les tokens invalides de la base de données
   */
  private async removeInvalidTokens(invalidTokens: string[]) {
    try {
      const batch = this.db.batch();

      // Chercher tous les documents qui contiennent ces tokens
      const tokensCollection = this.db.collection('fcmTokens');
      const snapshot = await tokensCollection.get();

      snapshot.forEach((doc) => {
        const userData = doc.data();
        const tokens = userData.tokens || [];

        // Filtrer les tokens invalides
        const validTokens = tokens.filter((tokenData: any) =>
          !invalidTokens.includes(tokenData.token)
        );

        if (validTokens.length !== tokens.length) {
          batch.update(doc.ref, { tokens: validTokens });
        }
      });

      await batch.commit();
      console.log('Tokens invalides supprimés de la base de données');
    } catch (error) {
      console.error('Erreur lors de la suppression des tokens invalides:', error);
    }
  }

  /**
   * Envoie une notification générique à un utilisateur
   */
  async sendGenericNotification(
    userId: string,
    notificationData: GenericNotificationData,
    options: GenericNotificationOptions = {}
  ): Promise<boolean> {
    const notification: GenericNotificationData = {
      title: notificationData.title,
      body: notificationData.body,
      type: notificationData.type,
      data: notificationData.data,
    };

    const notificationOptions: GenericNotificationOptions = {
      priority: 'high',
      sound: options.sound || 'default',
      clickAction: options.clickAction || PushNotificationsActionsEnum.default_action,
      badge: options.badge,
      icon: options.icon,
      image: options.image,
      ttl: 30, // 30 secondes
    };

    return await this.sendNotificationToUser(userId, notification, notificationOptions);
  }

  /**
   * Service centralisé pour les notifications d'annulation
   */
  async sendCancellationNotifications(
    appointment: Appointment,
    config: NotificationConfig
  ): Promise<void> {
    const baseNotificationData = {
      type: "appointment_cancelled" as const,
      data: {
        appointmentId: appointment.id,
        action: PushNotificationsActionsEnum.view_appointment
      },
    };

    const promises: Promise<boolean>[] = [];

    // Notification au client
    if (config.clientNotification) {
      promises.push(
        this.sendGenericNotification(appointment.clientId, {
          ...config.clientNotification,
          ...baseNotificationData,
        })
      );
    }

    // Notification au professionnel
    if (config.proNotification) {
      promises.push(
        this.sendGenericNotification(appointment.proId, {
          ...config.proNotification,
          ...baseNotificationData,
        })
      );
    }

    await Promise.all(promises);
  }

  /**
   * Générateur de messages de notification
   */
  getNotificationMessages(
    appointment: Appointment,
    scenario: 'payment_authorized' | 'client_partial' | 'client_full' | 'pro_cancellation',
    initiatedBy?: UserRole
  ): NotificationConfig | undefined {
    const appointmentDate = appointment.dateTime.toDate().toLocaleDateString('fr-FR');
    const appointmentTime = appointment.timeSlot;

    switch (scenario) {
      case 'payment_authorized':
        if (initiatedBy === UserRole.PRO) {
          return {
            clientNotification: {
              title: "❌ Rendez‑vous refusé",
              body: `Votre rendez‑vous du ${appointmentDate} à ${appointmentTime} a été refusé par le professionnel, vous ne serez pas débité.`,
            }
          };
        } else if (initiatedBy === UserRole.PARTICULIER) {
          return {
            proNotification: {
              title: "❌ Rendez‑vous annulé",
              body: `Le client a annulé son rendez‑vous du ${appointmentDate} à ${appointmentTime}.`,
            }
          };
        }
        break;

      case 'client_partial':
        return {
          clientNotification: {
            title: "❌ Rendez‑vous annulé",
            body: `Votre rendez‑vous du ${appointmentDate} à ${appointmentTime} a été annulé avec succès, une frais de 10€ a été conservé. Vous recevrez un remboursement du reste dans les jours à venir.`,
          },
          proNotification: {
            title: "❌ Rendez‑vous annulé",
            body: `Le rendez‑vous du ${appointmentDate} à ${appointmentTime} a été annulé par le client.`,
          }
        };

      case 'client_full':
        return {
          clientNotification: {
            title: "❌ Rendez‑vous annulé",
            body: `Votre rendez‑vous du ${appointmentDate} à ${appointmentTime} a été annulé avec succès, vous recevrez un remboursement total dans les jours à venir.`,
          },
          proNotification: {
            title: "❌ Rendez‑vous annulé",
            body: `Le rendez‑vous du ${appointmentDate} à ${appointmentTime} a été annulé par le client.`,
          }
        };

      case 'pro_cancellation':
        return {
          clientNotification: {
            title: "❌ Rendez‑vous annulé",
            body: `Votre rendez‑vous du ${appointmentDate} à ${appointmentTime} a été annulé par le professionnel, vous recevrez un remboursement total dans les jours à venir.`,
          },
          proNotification: {
            title: "❌ Rendez‑vous annulé",
            body: `Votre rendez‑vous du ${appointmentDate} à ${appointmentTime} a été annulé avec succès.`,
          }
        };

      default:
        return undefined;
    }
  }

  /**
   * Méthode utilitaire pour gérer l'annulation complète avec notification
   */
  async handleAppointmentCancellation(
    appointment: Appointment,
    scenario: 'payment_authorized' | 'client_partial' | 'client_full' | 'pro_cancellation',
    initiatedBy?: UserRole
  ): Promise<void> {
    try {
      const notificationConfig = this.getNotificationMessages(appointment, scenario, initiatedBy);
      if (notificationConfig) {
        await this.sendCancellationNotifications(appointment, notificationConfig);
      }
      console.log(`Notifications d'annulation envoyées pour le rendez-vous ${appointment.id}`);
    } catch (error) {
      console.error('Erreur lors de l\'envoi des notifications d\'annulation:', error);
    }
  }

  /**
   * Notification 15 min avant le RDV
   */
  async sendAppointmentReminder15min(userId: string, proName: string, date: string, time: string, isForPro: boolean) {
    return this.sendNotificationToUser(userId, {
      title: '⏰ RDV dans 15 min',
      body: `Votre rdv est dans 15 min, prévenez votre ${isForPro ? 'client' : 'pro'} ou annulez si vous n'êtes plus disponible.`,
      type: 'appointment_reminder_15min',
      data: {
        action: PushNotificationsActionsEnum.view_appointment
      }
    });
  }

  /**
   * Notification 5 min avant le RDV
   */
  async sendAppointmentReminder5min(userId: string, proName: string, date: string, time: string, isForPro: boolean) {
    return this.sendNotificationToUser(userId, {
      title: '⏰ RDV dans 5 min',
      body: `Votre rdv va commencer, ${isForPro ? 'vous etes prêt ?' : 'avez-vous rempli le brief ?'}`,
      type: 'appointment_reminder_5min',
      data: {
        action: PushNotificationsActionsEnum.view_appointment
      }
    });
  }

  /**
   * Notification 2 min avant le RDV
   */
  async sendAppointmentReminder2min(userId: string, proName: string, date: string, time: string) {
    return this.sendNotificationToUser(userId, {
      title: '🚀 Connectez-vous à la visio !',
      body: `Connectez-vous à votre visio dans 2min !`,
      type: 'appointment_reminder_2min',
      data: {
        action: PushNotificationsActionsEnum.view_appointment
      }
    });
  }

  /**
   * Notification 5 min avant la fin du RDV
   */
  async sendAppointmentEndingSoon(userId: string, proName: string, date: string, time: string) {
    return this.sendNotificationToUser(userId, {
      title: '⏳ Fin de visio dans 5 min',
      body: 'Votre visio se termine dans 5 min, reprenez rdv si vous avez besoin de plus de temps !',
      type: 'appointment_ending_soon',
      data: {
        action: PushNotificationsActionsEnum.view_appointment
      }
    });
  }

  /**
   * Notification 2 jours avant le RDV (pour client et pro)
   */
  async sendAppointment2DaysReminder(userId: string, otherName: string, service: string, date: string, time: string, isForPro: boolean) {
    return this.sendNotificationToUser(userId, {
      title: '⏰ RDV dans 2 jours',
      body: `N'oubliez pas votre rdv avec ${otherName} (${service}) dans 2 jours, pensez à annuler si vous n'êtes plus disponible.`,
      type: 'appointment_2days_reminder',
      data: {
        action: PushNotificationsActionsEnum.view_appointment
      }
    });
  }
}

export default new ServerNotificationPushService();