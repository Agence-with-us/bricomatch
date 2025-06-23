// services/notificationService.ts
import admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';

// Types pour les notifications
interface NotificationData {
  title: string;
  body: string;
  data?: { [key: string]: string };
  imageUrl?: string;
}

interface NotificationOptions {
  priority?: 'high' | 'normal';
  sound?: string;
  badge?: number;
  clickAction?: string;
  tag?: string;
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
    notification: NotificationData, 
    options: NotificationOptions = {}
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
    notification: NotificationData, 
    options: NotificationOptions = {}
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
          imageUrl: notification.imageUrl,
        },
        data: notification.data || {},
        android: {
          priority: options.priority || 'high' as const,
          notification: {
            sound: options.sound || 'default',
            clickAction: options.clickAction,
            tag: options.tag,
          },
        },
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
      const response = await admin.messaging().sendEachForMulticast(message);

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
   * Envoie une notification de rendez-vous confirmé
   */
  async sendAppointmentConfirmationNotification(
    clientId: string, 
    appointmentDetails: {
      proName: string;
      date: string;
      time: string;
    }
  ): Promise<boolean> {
    const notification: NotificationData = {
      title: '✅ Rendez-vous confirmé !',
      body: `Votre rendez-vous avec ${appointmentDetails.proName}, le ${appointmentDetails.date} à ${appointmentDetails.time} est confirmé.`,
      data: {
        type: 'appointment_confirmed',
        action: 'view_appointment',
      },
    };

    const options: NotificationOptions = {
      priority: 'high',
      sound: 'default',
      clickAction: 'APPOINTMENT_CONFIRMED',
    };

    return await this.sendNotificationToUser(clientId, notification, options);
  }

  /**
   * Envoie une notification de nouveau message de chat
   */
  async sendChatMessageNotification(
    recipientId: string,
    senderName: string,
    message: string,
    chatId: string
  ): Promise<boolean> {
    const notification: NotificationData = {
      title: `💬 Nouveau message de ${senderName}`,
      body: message.length > 100 ? message.substring(0, 100) + '...' : message,
      data: {
        type: 'chat_message',
        chatId: chatId,
        senderId: recipientId,
        action: 'open_chat',
      },
    };

    const options: NotificationOptions = {
      priority: 'high',
      sound: 'default',
      clickAction: 'CHAT_MESSAGE',
      tag: `chat_${chatId}`,
    };

    return await this.sendNotificationToUser(recipientId, notification, options);
  }

  /**
   * Envoie une notification de nouveau rendez-vous (pour les pros)
   */
  async sendNewAppointmentNotification(
    proId: string,
    appointmentDetails: {
      clientName: string;
      date: string;
      time: string;
      appointmentId: string;
    }
  ): Promise<boolean> {
    const notification: NotificationData = {
      title: '📅 Nouveau rendez-vous !',
      body: `${appointmentDetails.clientName} a réservé un RDV le ${appointmentDetails.date} à ${appointmentDetails.time}`,
      data: {
        type: 'new_appointment',
        appointmentId: appointmentDetails.appointmentId,
        action: 'view_appointment',
      },
    };

    const options: NotificationOptions = {
      priority: 'high',
      sound: 'default',
      clickAction: 'NEW_APPOINTMENT',
      tag: `new_appointment_${appointmentDetails.appointmentId}`,
    };

    return await this.sendNotificationToUser(proId, notification, options);
  }

  /**
   * Envoie une notification de rappel de rendez-vous
   */
  async sendAppointmentReminderNotification(
    userId: string,
    appointmentDetails: {
      otherPartyName: string;
      service: string;
      date: string;
      time: string;
      appointmentId: string;
      isForPro: boolean;
    }
  ): Promise<boolean> {
    const notification: NotificationData = {
      title: '⏰ Rappel de rendez-vous',
      body: `N'oubliez pas votre rendez-vous ${appointmentDetails.isForPro ? 'avec' : 'chez'} ${appointmentDetails.otherPartyName} pour ${appointmentDetails.service} demain à ${appointmentDetails.time}`,
      data: {
        type: 'appointment_reminder',
        appointmentId: appointmentDetails.appointmentId,
        action: 'view_appointment',
      },
    };

    const options: NotificationOptions = {
      priority: 'normal',
      sound: 'default',
      clickAction: 'APPOINTMENT_REMINDER',
      tag: `reminder_${appointmentDetails.appointmentId}`,
    };

    return await this.sendNotificationToUser(userId, notification, options);
  }
}

export default new ServerNotificationPushService();