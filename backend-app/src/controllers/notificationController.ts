import { Request, Response } from 'express';
import notificationPushService from '../services/notificationPushService';

export const sendChatMessageNotificationController = async (req: Request, res: Response) => {
  try {
    const { recipientId,senderName, message, chatId } = req.body;
    if (!recipientId || !message || !chatId) {
      return res.status(400).json({ success: false, error: 'Paramètres manquants' });
    }
    const result = await notificationPushService.sendGenericNotification(
      recipientId,
      {
        title: "💬 Nouveau message",
        body: `${senderName} : ${message}`,
        type: "chat_message",
        action: "view_chat",
        additionalData: {
          chatId: chatId,
        },
      }
    );
    if (result) {
      return res.json({ success: true });
    } else {
      return res.status(500).json({ success: false, error: 'Échec de l\'envoi de la notification' });
    }
  } catch (error) {
    console.error('Erreur notification chat:', error);
    return res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
}; 